import path from 'node:path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} from 'electron';
import type { IpcMainInvokeEvent, OpenDialogOptions, Rectangle } from 'electron';
import fs from 'fs-extra';
import { IPC_CHANNELS } from '../shared/ipc';
import type {
  ApplyActivationCodeInput,
  ApplyRewardCodeInput,
  AddProfileInput,
  DeleteProfileInput,
  IssueLicenseCodeInput,
  LoginInput,
  PasswordResetInput,
  ProfilesState,
  RedeemInviteCodeInput,
  RegisterInput,
  SwitchProgressEvent,
  SwitchProfileInput,
  TrayCardState,
  UpdateAppSettingsInput,
  UpdateProfileInput,
  WindowState,
} from '../shared/types';
import { AuthService } from './auth/auth-service';
import { LicenseHostService } from './auth/license-host-service';
import {
  activateProfile,
  addProfile,
  deleteProfile,
  getProfilesState,
  importCurrentAuthProfile,
  refreshProfilesState,
  setProfilesRootDir,
  syncProfilesUsage,
  updateAppSettings,
  updateProfile,
} from './profile-service';
import { UpdateService } from './update/update-service';

let mainWindow: BrowserWindow | null = null;
let licenseHostWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayCardWindow: BrowserWindow | null = null;
let latestTrayCardState: TrayCardState | null = null;
let trayHoverPollTimer: NodeJS.Timeout | null = null;
let isQuitting = false;
let updateService: UpdateService | null = null;
let unsubscribeUpdateState: (() => void) | null = null;
let authService: AuthService | null = null;
let unsubscribeAuthState: (() => void) | null = null;
let licenseHostService: LicenseHostService | null = null;

const LICENSE_HOST_ARG = '--license-host';
const LICENSE_HOST_MODE_ARG = 'license-host-mode';
const LICENSE_HOST_APP_NAME = 'codex-workspace-switcher-license-host';
const DEV_RESTART_EXIT_CODE = 75;
const APP_USER_MODEL_ID = 'com.openai.codex.workspace-switcher';
const APP_ICON_RELATIVE_PATH = path.join('assets', 'icons', 'openai.png');
const ROOT_APP_ICON_FILE_NAME = 'openai.png';
const RUNTIME_ICON_DIR_NAME = 'runtime-icons';
const RUNTIME_ICON_FILE_NAME = 'openai.png';
const TRAY_CARD_WIDTH = 392;
const TRAY_CARD_HEIGHT = 316;
const TRAY_CARD_GAP = 12;

let cachedAppIconPath = null as string | null;

const getPreloadPath = (): string => path.join(__dirname, 'preload.js');
const getIndexHtmlPath = (): string => path.join(__dirname, '../dist/index.html');
const launchInLicenseHostMode =
  process.argv.includes(LICENSE_HOST_ARG) ||
  process.argv.includes(LICENSE_HOST_MODE_ARG) ||
  process.env.CODEX_WORKSPACE_LICENSE_HOST === '1';
if (launchInLicenseHostMode) {
  app.setName(LICENSE_HOST_APP_NAME);
}
const hasSingleInstanceLock = app.requestSingleInstanceLock();

const isUsableIconFile = async (targetPath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
};

const resolveBundledAppIconPath = async (): Promise<string> => {
  const candidatePaths = [
    app.isPackaged
      ? path.join(__dirname, '../dist', APP_ICON_RELATIVE_PATH)
      : path.join(process.cwd(), 'public', APP_ICON_RELATIVE_PATH),
    path.join(process.cwd(), ROOT_APP_ICON_FILE_NAME),
  ];

  for (const candidatePath of candidatePaths) {
    if (await isUsableIconFile(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(`未找到可用的 OpenAI 图标文件：${candidatePaths.join(' | ')}`);
};

const ensureAppIconPath = async (): Promise<string> => {
  if (cachedAppIconPath && (await isUsableIconFile(cachedAppIconPath))) {
    return cachedAppIconPath;
  }

  const sourceIconPath = await resolveBundledAppIconPath();
  const iconDir = path.join(app.getPath('userData'), RUNTIME_ICON_DIR_NAME);
  const iconPath = path.join(iconDir, RUNTIME_ICON_FILE_NAME);
  await fs.ensureDir(iconDir);
  await fs.copyFile(sourceIconPath, iconPath);
  cachedAppIconPath = iconPath;
  return iconPath;
};

const getRuntimeAppIcon = async (
  size?: { width: number; height: number },
): Promise<Electron.NativeImage> => {
  const iconPath = await ensureAppIconPath();
  const fileBackedIcon = nativeImage.createFromPath(iconPath);
  const fallbackIcon = nativeImage.createFromPath(await resolveBundledAppIconPath());
  const baseIcon = fileBackedIcon.isEmpty() ? fallbackIcon : fileBackedIcon;
  if (baseIcon.isEmpty()) {
    throw new Error(`无法加载 OpenAI 图标：${iconPath}`);
  }
  return size ? baseIcon.resize(size) : baseIcon;
};

const isWindowAlive = (windowRef: BrowserWindow | null): windowRef is BrowserWindow =>
  Boolean(windowRef && !windowRef.isDestroyed());

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const expandBounds = (bounds: Rectangle, padding: number): Rectangle => ({
  x: bounds.x - padding,
  y: bounds.y - padding,
  width: bounds.width + padding * 2,
  height: bounds.height + padding * 2,
});

const pointInBounds = (
  point: Electron.Point,
  bounds: Pick<Rectangle, 'x' | 'y' | 'width' | 'height'>,
): boolean =>
  point.x >= bounds.x &&
  point.x <= bounds.x + bounds.width &&
  point.y >= bounds.y &&
  point.y <= bounds.y + bounds.height;

const getProfileDisplayName = (
  profile?: { name?: string | null; workspaceName?: string | null } | null,
): string => {
  const primary = typeof profile?.name === 'string' ? profile.name.trim() : '';
  if (primary) {
    return primary;
  }

  const fallback = typeof profile?.workspaceName === 'string' ? profile.workspaceName.trim() : '';
  return fallback || '未识别';
};

const getWindowState = (windowRef: BrowserWindow | null): WindowState => ({
  maximized: Boolean(isWindowAlive(windowRef) && windowRef.isMaximized()),
  visible: Boolean(isWindowAlive(windowRef) && windowRef.isVisible()),
});

const emitWindowState = (windowRef: BrowserWindow | null): void => {
  if (!isWindowAlive(windowRef)) {
    return;
  }

  windowRef.webContents.send(IPC_CHANNELS.windowStateChanged, getWindowState(windowRef));
};

const buildTrayCardState = (state: ProfilesState): TrayCardState => ({
  activeProfile: state.profiles.find((profile) => profile.isActive) ?? null,
  currentAuthExists: state.summary.currentAuthExists,
  authRecognized: state.summary.authRecognized,
  currentAuthSuggestedName: state.summary.currentAuthSuggestedName ?? null,
  currentAuthSuggestedWorkspaceName: state.summary.currentAuthSuggestedWorkspaceName ?? null,
  currentAuthSuggestedPlanType: state.summary.currentAuthSuggestedPlanType ?? 'Unknown',
  profilesCount: state.summary.profilesCount,
  overallRemainingPercent: state.summary.overallRemainingPercent,
  lastScannedAt: state.lastScannedAt,
});

const quotaIsKnown = (
  quota?: { configured?: boolean; source?: string | null; resetAt?: string | null } | null,
): boolean =>
  Boolean(
    quota &&
      (quota.configured ||
        quota.source === 'detected' ||
        quota.source === 'live' ||
        quota.resetAt),
  );

const trayStateNeedsUsageRefresh = (state: TrayCardState): boolean => {
  if (state.overallRemainingPercent !== null) {
    return false;
  }

  const activeProfile = state.activeProfile;
  if (!activeProfile) {
    return false;
  }

  return !quotaIsKnown(activeProfile.fiveHourQuota) || !quotaIsKnown(activeProfile.weeklyQuota);
};

const updateTrayToolTip = (): void => {
  if (!tray) {
    return;
  }

  tray.setToolTip('');
};

const publishTrayCardState = (state: TrayCardState): TrayCardState => {
  latestTrayCardState = state;
  updateTrayToolTip();

  if (isWindowAlive(trayCardWindow)) {
    trayCardWindow.webContents.send(IPC_CHANNELS.trayCardStateChanged, state);
  }

  return state;
};

const refreshTrayCardState = async (): Promise<TrayCardState> => {
  const initialState = buildTrayCardState(await getProfilesState());

  if (!trayStateNeedsUsageRefresh(initialState)) {
    return publishTrayCardState(initialState);
  }

  return publishTrayCardState(buildTrayCardState(await refreshProfilesState()));
};

const hideTrayCard = (): void => {
  if (trayHoverPollTimer) {
    clearInterval(trayHoverPollTimer);
    trayHoverPollTimer = null;
  }

  if (isWindowAlive(trayCardWindow)) {
    trayCardWindow.hide();
  }
};

const destroyTrayUi = (): void => {
  hideTrayCard();

  if (isWindowAlive(trayCardWindow)) {
    trayCardWindow.destroy();
  }
  trayCardWindow = null;

  if (tray) {
    tray.destroy();
    tray = null;
  }
};

const showMainWindow = async (): Promise<void> => {
  if (!isWindowAlive(mainWindow)) {
    await createMainWindow();
    if (!tray) {
      await createTray();
      await createTrayCardWindow();
      await refreshTrayCardState();
    }
  }

  if (!isWindowAlive(mainWindow)) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  hideTrayCard();
  emitWindowState(mainWindow);
};

const showLicenseHostWindow = async (): Promise<void> => {
  if (!isWindowAlive(licenseHostWindow)) {
    await createLicenseHostWindow();
  }

  if (!isWindowAlive(licenseHostWindow)) {
    return;
  }

  if (licenseHostWindow.isMinimized()) {
    licenseHostWindow.restore();
  }

  licenseHostWindow.show();
  licenseHostWindow.focus();
  emitWindowState(licenseHostWindow);
};

const hideMainWindow = (): void => {
  if (!isWindowAlive(mainWindow)) {
    return;
  }

  mainWindow.hide();
  hideTrayCard();
  emitWindowState(mainWindow);
};

const getPreferredDevServerUrl = (): string | null => {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  if (!app.isPackaged) {
    return 'http://127.0.0.1:5173';
  }

  return null;
};

const getViewUrl = (view?: string): string | null => {
  const devServerUrl = getPreferredDevServerUrl();
  if (!devServerUrl) {
    return null;
  }

  if (!view) {
    return devServerUrl;
  }

  const url = new URL(devServerUrl);
  url.searchParams.set('view', view);
  return url.toString();
};

const buildMissingDevServerPage = (view?: string): string => {
  const viewName =
    view === 'license-host' ? '本地授权主机' : view === 'tray-card' ? '托盘卡片' : '主窗口';
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>开发服务未就绪</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, rgba(39, 72, 132, 0.45), transparent 42%), #060912;
        color: #eef4ff;
        font-family: "Segoe UI", "Microsoft YaHei UI", sans-serif;
      }
      .card {
        width: min(560px, calc(100vw - 48px));
        padding: 28px 30px;
        border-radius: 24px;
        background: rgba(10, 16, 29, 0.84);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 28px 80px rgba(2, 8, 18, 0.48);
        backdrop-filter: blur(24px);
      }
      .eyebrow {
        margin: 0 0 10px;
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #8fb1ff;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 30px;
        line-height: 1.15;
      }
      p {
        margin: 0 0 12px;
        color: rgba(234, 242, 255, 0.78);
        line-height: 1.7;
      }
      code {
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(86, 117, 180, 0.18);
        color: #d8e4ff;
      }
    </style>
  </head>
  <body>
    <section class="card">
      <p class="eyebrow">Dev Guard</p>
      <h1>${viewName}未连接到当前开发前端</h1>
      <p>为了避免开发态误回退到旧的 <code>dist</code> 或 <code>release</code> 产物，这个窗口已阻止加载旧界面。</p>
      <p>请先启动当前项目的前端开发服务，再重新打开这个窗口。推荐命令：<code>npm run dev</code> 或 <code>npm run dev:host</code>。</p>
    </section>
  </body>
</html>`;

  return `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`;
};

const loadRendererView = async (windowRef: BrowserWindow, view?: string): Promise<void> => {
  const devServerUrl = getViewUrl(view);
  if (devServerUrl) {
    try {
      await windowRef.loadURL(devServerUrl);
      return;
    } catch (error) {
      if (app.isPackaged) {
        throw error;
      }
    }
  }

  if (!app.isPackaged) {
    await windowRef.loadURL(buildMissingDevServerPage(view));
    return;
  }

  if (view) {
    await windowRef.loadFile(getIndexHtmlPath(), {
      query: { view },
    });
    return;
  }

  await windowRef.loadFile(getIndexHtmlPath());
};

async function createTrayCardWindow(): Promise<BrowserWindow> {
  if (isWindowAlive(trayCardWindow)) {
    return trayCardWindow;
  }

  trayCardWindow = new BrowserWindow({
    width: TRAY_CARD_WIDTH,
    height: TRAY_CARD_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    movable: false,
    hasShadow: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  trayCardWindow.setAlwaysOnTop(true, 'pop-up-menu');

  await loadRendererView(trayCardWindow, 'tray-card');

  trayCardWindow.on('closed', () => {
    trayCardWindow = null;
    hideTrayCard();
  });

  return trayCardWindow;
}

async function createLicenseHostWindow(): Promise<void> {
  const appIconPath = await ensureAppIconPath();
  const appIcon = await getRuntimeAppIcon();
  licenseHostWindow = new BrowserWindow({
    width: 1320,
    height: 940,
    minWidth: 1040,
    minHeight: 760,
    show: false,
    frame: false,
    thickFrame: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#090b0f',
    autoHideMenuBar: true,
    title: 'Auth API Switcher License Host',
    icon: appIconPath,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  licenseHostWindow.removeMenu();
  licenseHostWindow.setIcon(appIcon);
  licenseHostWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  licenseHostWindow.once('ready-to-show', () => {
    if (!isWindowAlive(licenseHostWindow)) {
      return;
    }

    licenseHostWindow.show();
    emitWindowState(licenseHostWindow);
  });

  licenseHostWindow.on('maximize', () => emitWindowState(licenseHostWindow));
  licenseHostWindow.on('unmaximize', () => emitWindowState(licenseHostWindow));
  licenseHostWindow.on('show', () => emitWindowState(licenseHostWindow));
  licenseHostWindow.on('hide', () => emitWindowState(licenseHostWindow));
  licenseHostWindow.on('closed', () => {
    licenseHostWindow = null;
  });

  await loadRendererView(licenseHostWindow, 'license-host');
}

const inferTrayEdge = (trayBounds: Rectangle, workArea: Rectangle): 'top' | 'right' | 'bottom' | 'left' => {
  const distances = [
    { edge: 'top' as const, value: Math.abs(trayBounds.y - workArea.y) },
    {
      edge: 'right' as const,
      value: Math.abs(workArea.x + workArea.width - (trayBounds.x + trayBounds.width)),
    },
    {
      edge: 'bottom' as const,
      value: Math.abs(workArea.y + workArea.height - (trayBounds.y + trayBounds.height)),
    },
    { edge: 'left' as const, value: Math.abs(trayBounds.x - workArea.x) },
  ];

  distances.sort((left, right) => left.value - right.value);
  return distances[0]?.edge ?? 'bottom';
};

const positionTrayCardWindow = (windowRef: BrowserWindow, trayBounds: Rectangle): void => {
  const anchor = {
    x: trayBounds.x + Math.round(trayBounds.width / 2),
    y: trayBounds.y + Math.round(trayBounds.height / 2),
  };
  const display = screen.getDisplayNearestPoint(anchor);
  const workArea = display.workArea;
  const windowBounds = windowRef.getBounds();
  const edge = inferTrayEdge(trayBounds, workArea);

  let nextX = trayBounds.x + Math.round((trayBounds.width - windowBounds.width) / 2);
  let nextY = trayBounds.y - windowBounds.height - TRAY_CARD_GAP;

  if (edge === 'top') {
    nextY = trayBounds.y + trayBounds.height + TRAY_CARD_GAP;
  } else if (edge === 'left') {
    nextX = trayBounds.x + trayBounds.width + TRAY_CARD_GAP;
    nextY = trayBounds.y + Math.round((trayBounds.height - windowBounds.height) / 2);
  } else if (edge === 'right') {
    nextX = trayBounds.x - windowBounds.width - TRAY_CARD_GAP;
    nextY = trayBounds.y + Math.round((trayBounds.height - windowBounds.height) / 2);
  }

  nextX = clamp(nextX, workArea.x + 6, workArea.x + workArea.width - windowBounds.width - 6);
  nextY = clamp(nextY, workArea.y + 6, workArea.y + workArea.height - windowBounds.height - 6);
  windowRef.setPosition(Math.round(nextX), Math.round(nextY), false);
};

const shouldKeepTrayCardVisible = (): boolean => {
  const cursorPoint = screen.getCursorScreenPoint();

  if (tray) {
    const trayBounds = tray.getBounds();
    if (trayBounds.width > 0 && trayBounds.height > 0) {
      if (pointInBounds(cursorPoint, expandBounds(trayBounds, 10))) {
        return true;
      }
    }
  }

  if (isWindowAlive(trayCardWindow) && trayCardWindow.isVisible()) {
    if (pointInBounds(cursorPoint, expandBounds(trayCardWindow.getBounds(), 10))) {
      return true;
    }
  }

  return false;
};

const startTrayHoverPolling = (): void => {
  if (trayHoverPollTimer) {
    clearInterval(trayHoverPollTimer);
  }

  trayHoverPollTimer = setInterval(() => {
    if (!shouldKeepTrayCardVisible()) {
      hideTrayCard();
    }
  }, 120);
};

const showTrayCard = async (): Promise<void> => {
  if (!tray) {
    return;
  }

  const trayBounds = tray.getBounds();
  if (trayBounds.width <= 0 || trayBounds.height <= 0) {
    return;
  }

  const windowRef = await createTrayCardWindow();
  positionTrayCardWindow(windowRef, trayBounds);

  if (latestTrayCardState) {
    windowRef.webContents.send(IPC_CHANNELS.trayCardStateChanged, latestTrayCardState);
  }

  if (!windowRef.isVisible()) {
    windowRef.showInactive();
  }

  startTrayHoverPolling();

  if (latestTrayCardState) {
    void refreshTrayCardState().catch(() => {
      // Keep the cached tray card visible when a background refresh fails.
    });
    return;
  }

  try {
    const nextState = await refreshTrayCardState();
    windowRef.webContents.send(IPC_CHANNELS.trayCardStateChanged, nextState);
  } catch {
    hideTrayCard();
  }
};

const quitApplication = (): void => {
  isQuitting = true;
  destroyTrayUi();
  app.quit();
};

const createMainWindow = async (): Promise<void> => {
  const appIconPath = await ensureAppIconPath();
  const appIcon = await getRuntimeAppIcon();
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 800,
    minHeight: 620,
    show: false,
    frame: false,
    thickFrame: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#090b0f',
    autoHideMenuBar: true,
    title: 'Codex Workspace Switcher',
    icon: appIconPath,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.setIcon(appIcon);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.once('ready-to-show', () => {
    if (!isWindowAlive(mainWindow)) {
      return;
    }

    mainWindow.show();
    emitWindowState(mainWindow);
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideMainWindow();
  });

  mainWindow.on('maximize', () => emitWindowState(mainWindow));
  mainWindow.on('unmaximize', () => emitWindowState(mainWindow));
  mainWindow.on('show', () => emitWindowState(mainWindow));
  mainWindow.on('hide', () => emitWindowState(mainWindow));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await loadRendererView(mainWindow);
};

const registerHandler = <TArgs extends unknown[], TResult>(
  channel: string,
  handler: (_event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult,
): void => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...(args as TArgs));
    } catch (error) {
      const message = error instanceof Error ? error.message : '发生未知错误。';
      throw new Error(message);
    }
  });
};

const getSenderWindow = (event: IpcMainInvokeEvent): BrowserWindow | null =>
  BrowserWindow.fromWebContents(event.sender);

const publishStateForTray = (state: ProfilesState): void => {
  publishTrayCardState(buildTrayCardState(state));
};

const getUpdateService = (): UpdateService => {
  if (!updateService) {
    throw new Error('更新服务尚未初始化。');
  }

  return updateService;
};

const getAuthService = (): AuthService => {
  if (!authService) {
    throw new Error('授权服务尚未初始化。');
  }

  return authService;
};

const getLicenseHostService = (): LicenseHostService => {
  if (!licenseHostService) {
    throw new Error('授权主机服务尚未初始化。');
  }

  return licenseHostService;
};

const publishUpdateState = async (): Promise<void> => {
  if (!isWindowAlive(mainWindow) || !updateService) {
    return;
  }

  mainWindow.webContents.send(IPC_CHANNELS.updateStateChanged, await updateService.getState());
};

const restartApplication = (): void => {
  isQuitting = true;
  destroyTrayUi();

  if (process.env.VITE_DEV_SERVER_URL) {
    app.exit(DEV_RESTART_EXIT_CODE);
    return;
  }

  app.relaunch();
  setTimeout(() => {
    app.quit();
  }, 150);
};

const restartLicenseHost = async (): Promise<void> => {
  if (launchInLicenseHostMode) {
    restartApplication();
    return;
  }

  const previousWindow = isWindowAlive(licenseHostWindow) ? licenseHostWindow : null;
  const shouldRestoreMaximized = Boolean(previousWindow?.isMaximized());

  if (previousWindow) {
    previousWindow.destroy();
  }

  await showLicenseHostWindow();

  if (shouldRestoreMaximized && isWindowAlive(licenseHostWindow) && !licenseHostWindow.isMaximized()) {
    licenseHostWindow.maximize();
  }
};

const rebuildTrayMenu = (): void => {
  if (!tray) {
    return;
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '打开主窗口',
        click: () => {
          void showMainWindow();
        },
      },
      { type: 'separator' },
      {
        label: '退出应用',
        click: () => {
          quitApplication();
        },
      },
    ]),
  );
};

const createTray = async (): Promise<void> => {
  if (tray) {
    return;
  }

  const appIconPath = await ensureAppIconPath();
  const trayIcon = await getRuntimeAppIcon({ width: 18, height: 18 });
  tray = new Tray(appIconPath);
  tray.setImage(trayIcon);
  updateTrayToolTip();
  rebuildTrayMenu();

  tray.on('click', () => {
    void showMainWindow();
  });

  tray.on('double-click', () => {
    void showMainWindow();
  });

  tray.on('right-click', () => {
    hideTrayCard();
  });

  tray.on('mouse-enter', () => {
    void showTrayCard();
  });

  tray.on('mouse-leave', () => {
    startTrayHoverPolling();
  });

  tray.on('mouse-move', () => {
    if (!isWindowAlive(trayCardWindow) || !trayCardWindow.isVisible()) {
      void showTrayCard();
    }
  });
};

const registerIpcHandlers = (): void => {
  registerHandler(IPC_CHANNELS.getAppState, async () => {
    const state = await getProfilesState();
    publishStateForTray(state);
    return state;
  });

  ipcMain.on(IPC_CHANNELS.restartApp, () => {
    restartApplication();
  });

  registerHandler(IPC_CHANNELS.restartLicenseHost, async (event) => {
    const senderWindow = getSenderWindow(event);
    if (senderWindow !== licenseHostWindow) {
      throw new Error('只有本地授权主机窗口可以执行主机重启。');
    }

    await restartLicenseHost();
    return { ok: true as const };
  });

  registerHandler(IPC_CHANNELS.importCurrentAuth, async () => {
    const result = await importCurrentAuthProfile();
    publishStateForTray(result.state);
    return result;
  });

  registerHandler(IPC_CHANNELS.syncUsage, async () => {
    const result = await syncProfilesUsage();
    publishStateForTray(result.state);
    return result;
  });

  registerHandler(IPC_CHANNELS.listProfiles, async () => {
    const state = await getProfilesState();
    publishStateForTray(state);
    return state.profiles;
  });

  registerHandler(IPC_CHANNELS.refreshProfiles, async () => {
    const state = await refreshProfilesState();
    publishStateForTray(state);
    return state;
  });

  registerHandler(IPC_CHANNELS.addProfile, async (_event, input: AddProfileInput) => {
    const state = await addProfile(input);
    publishStateForTray(state);
    return state;
  });

  registerHandler(IPC_CHANNELS.updateProfile, async (_event, input: UpdateProfileInput) => {
    const state = await updateProfile(input);
    publishStateForTray(state);
    return state;
  });

  registerHandler(IPC_CHANNELS.deleteProfile, async (_event, input: DeleteProfileInput) => {
    const state = await deleteProfile(input);
    publishStateForTray(state);
    return state;
  });

  registerHandler(IPC_CHANNELS.switchProfile, async (event, input: SwitchProfileInput) => {
    const result = await activateProfile(input, (progress: SwitchProgressEvent) => {
      event.sender.send(IPC_CHANNELS.switchProgress, progress);
    });
    publishStateForTray(result.state);
    return result;
  });

  registerHandler(IPC_CHANNELS.setProfilesRootDir, async (_event, rootDir: string) => {
    const state = await setProfilesRootDir(rootDir);
    publishStateForTray(state);
    return state;
  });

  registerHandler(IPC_CHANNELS.updateSettings, async (_event, input: UpdateAppSettingsInput) => {
    const state = await updateAppSettings(input);
    publishStateForTray(state);
    return state;
  });

  registerHandler(IPC_CHANNELS.openPath, async (_event, targetPath: string) => {
    const result = await shell.openPath(targetPath);
    return result ? { ok: false, error: result } : { ok: true };
  });

  registerHandler(IPC_CHANNELS.openExternal, async (_event, targetUrl: string) => {
    await shell.openExternal(targetUrl);
    return { ok: true };
  });

  registerHandler(IPC_CHANNELS.windowMinimize, (event) => {
    const targetWindow = getSenderWindow(event);
    if (isWindowAlive(targetWindow)) {
      targetWindow.minimize();
    }
    return getWindowState(targetWindow);
  });

  registerHandler(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const targetWindow = getSenderWindow(event);
    if (isWindowAlive(targetWindow)) {
      if (targetWindow.isMaximized()) {
        targetWindow.unmaximize();
      } else {
        targetWindow.maximize();
      }
    }
    return getWindowState(targetWindow);
  });

  registerHandler(IPC_CHANNELS.windowClose, (event) => {
    const targetWindow = getSenderWindow(event);
    if (isWindowAlive(targetWindow)) {
      targetWindow.close();
    }
    return { maximized: false, visible: false };
  });

  registerHandler(IPC_CHANNELS.windowHide, (event) => {
    const targetWindow = getSenderWindow(event);
    if (targetWindow === mainWindow) {
      hideMainWindow();
      return getWindowState(mainWindow);
    }
    if (isWindowAlive(targetWindow)) {
      targetWindow.hide();
    }
    return getWindowState(targetWindow);
  });

  registerHandler(IPC_CHANNELS.windowGetState, (event) => getWindowState(getSenderWindow(event)));

  registerHandler(IPC_CHANNELS.trayCardGetState, async () => {
    if (latestTrayCardState) {
      return latestTrayCardState;
    }

    return refreshTrayCardState();
  });

  registerHandler(IPC_CHANNELS.openLicenseHostWindow, async () => {
    await showLicenseHostWindow();
    return { ok: true as const };
  });

  registerHandler(IPC_CHANNELS.updateGetState, async () => getUpdateService().getState());

  registerHandler(IPC_CHANNELS.updateCheck, async () => {
    const result = await getUpdateService().checkForUpdates();
    await publishUpdateState();
    return result;
  });

  registerHandler(IPC_CHANNELS.updateDownloadAndInstall, async () => {
    const result = await getUpdateService().downloadAndInstallUpdate();
    await publishUpdateState();
    return result;
  });

  registerHandler(IPC_CHANNELS.updateOpenNotes, async () => getUpdateService().openUpdateNotes());

  registerHandler(IPC_CHANNELS.authGetState, async () => getAuthService().getState());

  registerHandler(IPC_CHANNELS.authLogin, async (_event, input: LoginInput) =>
    getAuthService().login(input),
  );

  registerHandler(IPC_CHANNELS.authRegister, async (_event, input: RegisterInput) =>
    getAuthService().register(input),
  );

  registerHandler(
    IPC_CHANNELS.authRequestPasswordReset,
    async (_event, input: PasswordResetInput) => getAuthService().requestPasswordReset(input),
  );

  registerHandler(IPC_CHANNELS.authGetAccountProfile, async () => getAuthService().getAccountProfile());

  registerHandler(IPC_CHANNELS.authGetLicenseSummary, async () => getAuthService().getLicenseSummary());

  registerHandler(
    IPC_CHANNELS.authApplyActivationCode,
    async (_event, input: ApplyActivationCodeInput) => getAuthService().applyActivationCode(input),
  );

  registerHandler(IPC_CHANNELS.authRequestInviteCode, async () => getAuthService().requestInviteCode());

  registerHandler(
    IPC_CHANNELS.authRedeemInviteCode,
    async (_event, input: RedeemInviteCodeInput) => getAuthService().redeemInviteCode(input),
  );

  registerHandler(IPC_CHANNELS.authClaimInviteReward, async () => getAuthService().claimInviteReward());

  registerHandler(
    IPC_CHANNELS.authApplyRewardCode,
    async (_event, input: ApplyRewardCodeInput) => getAuthService().applyRewardCode(input),
  );

  registerHandler(IPC_CHANNELS.authListInviteRecords, async () => getAuthService().listInviteRecords());

  registerHandler(IPC_CHANNELS.authHeartbeat, async () => getAuthService().heartbeat());

  registerHandler(
    IPC_CHANNELS.authGetHeartbeatBootstrap,
    async () => getAuthService().getHeartbeatBootstrap(),
  );

    registerHandler(IPC_CHANNELS.licenseHostGetState, async () => getLicenseHostService().getState());

    registerHandler(IPC_CHANNELS.licenseHostIssueCode, async (_event, input: IssueLicenseCodeInput) =>
      getLicenseHostService().issueCode(input),
    );

    registerHandler(IPC_CHANNELS.licenseHostSearchRecords, async (_event, query: string) =>
      getLicenseHostService().searchRecords(query),
    );

  registerHandler(IPC_CHANNELS.chooseAuthFile, async () => {
    const options: OpenDialogOptions = {
      title: '选择 auth.json',
      buttonLabel: '使用此文件',
      properties: ['openFile'],
      filters: [
        { name: 'Auth JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    };

    const result = isWindowAlive(mainWindow)
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    };
  });

  registerHandler(IPC_CHANNELS.chooseExecutableFile, async (_event, title?: string) => {
    const options: OpenDialogOptions = {
      title: title || '选择可执行文件',
      buttonLabel: '使用此文件',
      properties: ['openFile'],
      filters:
        process.platform === 'win32'
          ? [
              { name: 'Executable', extensions: ['exe'] },
              { name: 'All Files', extensions: ['*'] },
            ]
          : [{ name: 'All Files', extensions: ['*'] }],
    };

    const result = isWindowAlive(mainWindow)
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    };
  });

  registerHandler(IPC_CHANNELS.chooseDirectory, async () => {
    const options: OpenDialogOptions = {
      title: '选择目录',
      buttonLabel: '使用此目录',
      properties: ['openDirectory', 'createDirectory'],
    };

    const result = isWindowAlive(mainWindow)
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    };
  });

  registerHandler(IPC_CHANNELS.chooseRootDirectory, async () => {
    const options: OpenDialogOptions = {
      title: '选择 profiles 根目录',
      buttonLabel: '使用此目录',
      properties: ['openDirectory', 'createDirectory'],
    };

    const result = isWindowAlive(mainWindow)
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    };
  });
};

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }

  app.on('second-instance', async (_event, argv) => {
    if (argv.includes(LICENSE_HOST_ARG) || argv.includes(LICENSE_HOST_MODE_ARG)) {
      await showLicenseHostWindow();
      return;
    }

    await showMainWindow();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    destroyTrayUi();
    unsubscribeUpdateState?.();
    unsubscribeUpdateState = null;
    unsubscribeAuthState?.();
    unsubscribeAuthState = null;
  });

  app.whenReady().then(async () => {
    updateService = new UpdateService(APP_USER_MODEL_ID);
    await updateService.initialize();
    unsubscribeUpdateState = updateService.subscribe((state) => {
      if (isWindowAlive(mainWindow)) {
        mainWindow.webContents.send(IPC_CHANNELS.updateStateChanged, state);
      }
    });
    authService = new AuthService();
    await authService.initialize();
    unsubscribeAuthState = authService.subscribe((state) => {
      if (isWindowAlive(mainWindow)) {
        mainWindow.webContents.send(IPC_CHANNELS.authStateChanged, state);
      }
    });
    licenseHostService = new LicenseHostService();
    await licenseHostService.initialize();
    registerIpcHandlers();
    if (launchInLicenseHostMode) {
      await createLicenseHostWindow();
    } else {
      await createMainWindow();
      await createTray();
      await createTrayCardWindow();
      await refreshTrayCardState();
      updateService.scheduleStartupCheck();
    }

    app.on('activate', async () => {
      if (launchInLicenseHostMode && !isWindowAlive(mainWindow)) {
        await showLicenseHostWindow();
        return;
      }

      await showMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
