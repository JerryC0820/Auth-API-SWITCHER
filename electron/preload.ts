import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type CodexWorkspaceApi } from '../shared/ipc';

const api: CodexWorkspaceApi = {
  getAppState: () => ipcRenderer.invoke(IPC_CHANNELS.getAppState),
  restartApp: () => ipcRenderer.send(IPC_CHANNELS.restartApp),
  restartLicenseHost: () => ipcRenderer.invoke(IPC_CHANNELS.restartLicenseHost),
  importCurrentAuth: () => ipcRenderer.invoke(IPC_CHANNELS.importCurrentAuth),
  syncUsage: () => ipcRenderer.invoke(IPC_CHANNELS.syncUsage),
  listProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.listProfiles),
  refreshProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.refreshProfiles),
  addProfile: (input) => ipcRenderer.invoke(IPC_CHANNELS.addProfile, input),
  updateProfile: (input) => ipcRenderer.invoke(IPC_CHANNELS.updateProfile, input),
  deleteProfile: (input) => ipcRenderer.invoke(IPC_CHANNELS.deleteProfile, input),
  switchProfile: (input) => ipcRenderer.invoke(IPC_CHANNELS.switchProfile, input),
  onSwitchProgress: (listener) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(payload as Parameters<typeof listener>[0]);
    };
    ipcRenderer.on(IPC_CHANNELS.switchProgress, handler);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.switchProgress, handler);
    };
  },
  chooseAuthFile: () => ipcRenderer.invoke(IPC_CHANNELS.chooseAuthFile),
  chooseExecutableFile: (title) => ipcRenderer.invoke(IPC_CHANNELS.chooseExecutableFile, title),
  chooseDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.chooseDirectory),
  chooseRootDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.chooseRootDirectory),
  setProfilesRootDir: (rootDir) => ipcRenderer.invoke(IPC_CHANNELS.setProfilesRootDir, rootDir),
  updateSettings: (input) => ipcRenderer.invoke(IPC_CHANNELS.updateSettings, input),
  openPath: (targetPath) => ipcRenderer.invoke(IPC_CHANNELS.openPath, targetPath),
  openExternal: (targetUrl) => ipcRenderer.invoke(IPC_CHANNELS.openExternal, targetUrl),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
  toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
  hideWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowHide),
  getWindowState: () => ipcRenderer.invoke(IPC_CHANNELS.windowGetState),
  onWindowStateChange: (listener) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(payload as Parameters<typeof listener>[0]);
    };
    ipcRenderer.on(IPC_CHANNELS.windowStateChanged, handler);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.windowStateChanged, handler);
    };
  },
  getTrayCardState: () => ipcRenderer.invoke(IPC_CHANNELS.trayCardGetState),
  onTrayCardStateChange: (listener) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(payload as Parameters<typeof listener>[0]);
    };
    ipcRenderer.on(IPC_CHANNELS.trayCardStateChanged, handler);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.trayCardStateChanged, handler);
    };
  },
  openLicenseHostWindow: () => ipcRenderer.invoke(IPC_CHANNELS.openLicenseHostWindow),
  getUpdateState: () => ipcRenderer.invoke(IPC_CHANNELS.updateGetState),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.updateCheck),
  downloadAndInstallUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.updateDownloadAndInstall),
  openUpdateNotes: () => ipcRenderer.invoke(IPC_CHANNELS.updateOpenNotes),
  onUpdateStateChange: (listener) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(payload as Parameters<typeof listener>[0]);
    };
    ipcRenderer.on(IPC_CHANNELS.updateStateChanged, handler);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.updateStateChanged, handler);
    };
  },
  getAuthState: () => ipcRenderer.invoke(IPC_CHANNELS.authGetState),
  login: (input) => ipcRenderer.invoke(IPC_CHANNELS.authLogin, input),
  register: (input) => ipcRenderer.invoke(IPC_CHANNELS.authRegister, input),
  requestPasswordReset: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.authRequestPasswordReset, input),
  getAccountProfile: () => ipcRenderer.invoke(IPC_CHANNELS.authGetAccountProfile),
  getLicenseSummary: () => ipcRenderer.invoke(IPC_CHANNELS.authGetLicenseSummary),
  applyActivationCode: (input) => ipcRenderer.invoke(IPC_CHANNELS.authApplyActivationCode, input),
  requestInviteCode: () => ipcRenderer.invoke(IPC_CHANNELS.authRequestInviteCode),
  redeemInviteCode: (input) => ipcRenderer.invoke(IPC_CHANNELS.authRedeemInviteCode, input),
  claimInviteReward: () => ipcRenderer.invoke(IPC_CHANNELS.authClaimInviteReward),
  applyRewardCode: (input) => ipcRenderer.invoke(IPC_CHANNELS.authApplyRewardCode, input),
  listInviteRecords: () => ipcRenderer.invoke(IPC_CHANNELS.authListInviteRecords),
  heartbeat: () => ipcRenderer.invoke(IPC_CHANNELS.authHeartbeat),
  getHeartbeatBootstrap: () => ipcRenderer.invoke(IPC_CHANNELS.authGetHeartbeatBootstrap),
  onAuthStateChange: (listener) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(payload as Parameters<typeof listener>[0]);
    };
    ipcRenderer.on(IPC_CHANNELS.authStateChanged, handler);
    return () => {
      ipcRenderer.off(IPC_CHANNELS.authStateChanged, handler);
    };
  },
  getLicenseHostState: () => ipcRenderer.invoke(IPC_CHANNELS.licenseHostGetState),
  issueLicenseCode: (input) => ipcRenderer.invoke(IPC_CHANNELS.licenseHostIssueCode, input),
  searchLicenseHostRecords: (query) =>
    ipcRenderer.invoke(IPC_CHANNELS.licenseHostSearchRecords, query),
};

contextBridge.exposeInMainWorld('codexWorkspace', api);
