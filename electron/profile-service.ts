import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { app } from 'electron';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import type {
  ActivateProfileResult,
  ActivityLogEntry,
  ActivityLogLevel,
  AddProfileInput,
  AppSettings,
  AppSummary,
  AuthFileStatus,
  BackupEntry,
  DeleteProfileInput,
  ExecutablePathSource,
  ImportCurrentAuthResult,
  OpenClawModelOption,
  PlanType,
  ProfileSummary,
  ProfilesState,
  SwitchProgressEvent,
  SwitchProgressStatus,
  SwitchProfileInput,
  SwitchMode,
  SyncUsageResult,
  UpdateAppSettingsInput,
  UpdateProfileInput,
  UsageQuota,
} from '../shared/types';
import { planTypes, switchModes } from '../shared/types';

interface StoredProfile {
  id: string;
  storageDirName: string;
  name: string;
  workspaceName: string | null;
  notes: string;
  planType: PlanType;
  manuallyDisabled: boolean;
  weeklyQuota: UsageQuota;
  fiveHourQuota: UsageQuota;
  reviewQuota: UsageQuota;
  createdAt: string;
  updatedAt: string;
  usageUpdatedAt: string | null;
  usageError: string | null;
  lastActivatedAt: string | null;
}

interface ProfilesFile {
  version: number;
  profiles: StoredProfile[];
}

interface ActivityLogFile {
  version: number;
  logs: ActivityLogEntry[];
}

interface AuthFilePayload {
  auth_mode?: string | null;
  tokens?: {
    id_token?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | string | null;
    account_id?: string | null;
  } | null;
}

interface OpenClawAuthProfileStore {
  version?: number;
  profiles?: Record<string, Record<string, unknown>>;
  order?: Record<string, string[]>;
  lastGood?: Record<string, string>;
  usageStats?: Record<string, Record<string, unknown>>;
}

interface OpenClawProviderModelObject {
  id?: string | null;
  name?: string | null;
}

interface OpenClawProviderDefinition {
  models?: Array<string | OpenClawProviderModelObject> | null;
}

interface OpenClawModelsCatalog {
  providers?: Record<string, OpenClawProviderDefinition> | null;
}

interface OpenClawConfig {
  agents?: {
    defaults?: {
      model?: {
        primary?: string | null;
      } | null;
      models?: Record<string, Record<string, unknown>> | null;
    } | null;
  } | null;
  localAssistant?: {
    selectedProvider?: string | null;
    selectedModel?: string | null;
  } | null;
  models?: OpenClawModelsCatalog | null;
}

interface AuthFileHints {
  planType: PlanType;
  defaultName: string | null;
  workspaceName: string | null;
  accountId: string | null;
}

interface UsageWindowPayload {
  limit_window_seconds?: number;
  used_percent?: number;
  reset_at?: number;
}

interface CodexUsageResponse {
  rate_limit?: {
    primary_window?: UsageWindowPayload;
    secondary_window?: UsageWindowPayload;
  };
  plan_type?: string | null;
}

interface LiveUsageSnapshot {
  planType: PlanType;
  weeklyQuota: UsageQuota | null;
  fiveHourQuota: UsageQuota | null;
}

type ManagedDesktopAppKind = 'codex' | 'trae';

interface RunningDesktopProcess {
  processId: number;
  name: string;
  executablePath: string | null;
}

interface ResolvedExecutablePath {
  path: string | null;
  source: ExecutablePathSource;
}

type SwitchProgressReporter = (event: SwitchProgressEvent) => void;

const SETTINGS_FILE_NAME = 'app-settings.json';
const PROFILES_FILE_NAME = 'profiles.json';
const ACTIVITY_LOG_FILE_NAME = 'activity-log.json';
const BACKUP_DIR_NAME = 'backup';
const PROFILE_DAILY_BACKUP_DIR_NAME = 'profile-daily';
const DELETED_PROFILE_BACKUP_DIR_NAME = 'deleted-profiles';
const AUTH_FILE_NAME = 'auth.json';
const MAX_LOG_ENTRIES = 80;
const DELETED_PROFILE_RETENTION_MS = 24 * 60 * 60 * 1000;
const USAGE_SYNC_TIMEOUT_MS = 8_000;
const USAGE_SYNC_CONCURRENCY = 6;
const OPENCLAW_AUTH_PROFILE_ID = 'openai-codex:codex-cli';
const OPENCLAW_DEFAULT_GATEWAY_PORT = 18_789;
const OPENCLAW_PROVIDER_LABELS: Record<string, string> = {
  'openai-codex': 'OpenAI Codex',
  ollama: 'Ollama',
  stepfun: 'StepFun',
  volcengine: 'Volcengine',
  'volcengine-plan': 'Volcengine Plan',
};
const OPENCLAW_MODEL_FALLBACKS: OpenClawModelOption[] = [
  {
    key: 'openai-codex/gpt-5.3-codex',
    label: 'OpenAI Codex / gpt-5.3-codex',
    provider: 'openai-codex',
    modelId: 'gpt-5.3-codex',
  },
  {
    key: 'openai-codex/gpt-5.3-codex-spark',
    label: 'OpenAI Codex / gpt-5.3-codex-spark',
    provider: 'openai-codex',
    modelId: 'gpt-5.3-codex-spark',
  },
  {
    key: 'openai-codex/gpt-5.4',
    label: 'OpenAI Codex / gpt-5.4',
    provider: 'openai-codex',
    modelId: 'gpt-5.4',
  },
  {
    key: 'openai-codex/gpt-5-codex',
    label: 'OpenAI Codex / gpt-5-codex',
    provider: 'openai-codex',
    modelId: 'gpt-5-codex',
  },
];
const execFileAsync = promisify(execFile);
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_PROFILES_ROOT =
  process.platform === 'win32'
    ? path.join(path.parse(os.homedir()).root, 'codex-profiles')
    : path.join(os.homedir(), '.codex-profiles');

const CURRENT_AUTH_PATH = path.join(os.homedir(), '.codex', AUTH_FILE_NAME);

const defaultQuota = (): UsageQuota => ({
  percentUsed: 0,
  resetAt: null,
  source: 'unknown',
  label: null,
  configured: false,
});

const defaultSettings = (): AppSettings => ({
  profilesRootDir: DEFAULT_PROFILES_ROOT,
  backupBeforeSwitch: true,
  switchMode: 'codex',
  lowQuotaWarningEnabled: true,
  lowQuotaWarningThreshold: 30,
  codexExecutablePathOverride: null,
  traeExecutablePathOverride: null,
  codexTraeAutoRestart: false,
  openclawStateDirOverride: null,
  openclawAutoRestartGateway: false,
  autoSwitchEnabled: false,
  autoSwitchThreshold: 18,
  autoSwitchCountdownSeconds: 30,
});

const normalizeText = (value?: string | null): string => value?.trim() ?? '';

const normalizePercent = (value?: number | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

const normalizeThreshold = (value?: number | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 30;
  }

  return Math.min(95, Math.max(5, Math.round(value)));
};

const normalizeSwitchMode = (value?: string | null): SwitchMode =>
  switchModes.includes(value as SwitchMode) ? (value as SwitchMode) : 'codex';

const normalizeCountdownSeconds = (value?: number | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 30;
  }

  return Math.min(180, Math.max(5, Math.round(value)));
};

const normalizeQuota = (quota?: Partial<UsageQuota> | null): UsageQuota => {
  const hasMeaningfulValue =
    (typeof quota?.percentUsed === 'number' && quota.percentUsed > 0) ||
    Boolean(quota?.resetAt) ||
    Boolean(normalizeText(quota?.label));
  const configured =
    quota?.configured ??
    (quota?.source === 'detected' || quota?.source === 'live' || hasMeaningfulValue);
  const normalizedSource =
    quota?.source === 'detected' || quota?.source === 'live'
      ? quota.source
      : configured
        ? 'manual'
        : 'unknown';

  return {
    percentUsed: configured ? normalizePercent(quota?.percentUsed) : 0,
    resetAt: configured ? quota?.resetAt ?? null : null,
    source: normalizedSource,
    label: configured ? normalizeText(quota?.label) || null : null,
    configured,
  };
};

const normalizePlanType = (value?: string | null): PlanType => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'Unknown';
  }

  if (normalized === 'Enterprise') {
    return 'Business';
  }

  return planTypes.includes(normalized as PlanType) ? (normalized as PlanType) : 'Unknown';
};

const isSameResolvedPath = (leftPath: string, rightPath: string): boolean => {
  const left = path.resolve(leftPath);
  const right = path.resolve(rightPath);

  if (process.platform === 'win32') {
    return left.toLowerCase() === right.toLowerCase();
  }

  return left === right;
};

const resolveOpenClawStateDir = (settings: AppSettings): string => {
  const override = normalizeText(settings.openclawStateDirOverride);
  const envOverride =
    normalizeText(process.env.OPENCLAW_STATE_DIR) || normalizeText(process.env.CLAWDBOT_STATE_DIR);

  return path.resolve(override || envOverride || path.join(os.homedir(), '.openclaw'));
};

const getOpenClawAuthStorePath = (stateDir: string): string =>
  path.join(stateDir, 'agents', 'main', 'agent', 'auth-profiles.json');

const getOpenClawGatewayCommandPath = (stateDir: string): string =>
  path.join(stateDir, 'gateway.cmd');

const getOpenClawConfigPath = (stateDir: string): string => path.join(stateDir, 'openclaw.json');

const getOpenClawModelsCatalogPath = (stateDir: string): string =>
  path.join(stateDir, 'agents', 'main', 'agent', 'models.json');

const formatOpenClawProviderLabel = (provider: string): string => {
  const normalized = normalizeText(provider);
  if (!normalized) {
    return 'Unknown';
  }

  if (OPENCLAW_PROVIDER_LABELS[normalized]) {
    return OPENCLAW_PROVIDER_LABELS[normalized];
  }

  return normalized
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(' ');
};

const splitOpenClawModelKey = (key: string): { provider: string; modelId: string } => {
  const normalized = normalizeText(key);
  if (!normalized) {
    return { provider: 'custom', modelId: '' };
  }

  const slashIndex = normalized.indexOf('/');
  if (slashIndex === -1) {
    return { provider: 'custom', modelId: normalized };
  }

  return {
    provider: normalized.slice(0, slashIndex),
    modelId: normalized.slice(slashIndex + 1),
  };
};

const buildOpenClawModelOption = (
  key: string,
  displayName?: string | null,
): OpenClawModelOption | null => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey) {
    return null;
  }

  const { provider, modelId } = splitOpenClawModelKey(normalizedKey);
  const resolvedName = normalizeText(displayName) || modelId || normalizedKey;

  return {
    key: normalizedKey,
    label:
      provider === 'custom'
        ? resolvedName
        : `${formatOpenClawProviderLabel(provider)} / ${resolvedName}`,
    provider,
    modelId: modelId || normalizedKey,
  };
};

const getOpenClawCurrentModel = (config?: OpenClawConfig | null): string | null =>
  normalizeText(config?.agents?.defaults?.model?.primary) || null;

const collectOpenClawProviderModels = (
  providerId: string,
  definition?: OpenClawProviderDefinition | null,
  target?: Map<string, OpenClawModelOption>,
): void => {
  if (!target || !Array.isArray(definition?.models)) {
    return;
  }

  for (const entry of definition.models) {
    if (typeof entry === 'string') {
      const option = buildOpenClawModelOption(`${providerId}/${entry}`);
      if (option && !target.has(option.key)) {
        target.set(option.key, option);
      }
      continue;
    }

    const modelId = normalizeText(entry?.id);
    if (!modelId) {
      continue;
    }

    const option = buildOpenClawModelOption(
      `${providerId}/${modelId}`,
      normalizeText(entry?.name) || modelId,
    );
    if (option && !target.has(option.key)) {
      target.set(option.key, option);
    }
  }
};

const buildOpenClawAvailableModels = (
  config?: OpenClawConfig | null,
  runtimeCatalog?: OpenClawModelsCatalog | null,
): OpenClawModelOption[] => {
  const options = new Map<string, OpenClawModelOption>();

  for (const [providerId, definition] of Object.entries(config?.models?.providers ?? {})) {
    collectOpenClawProviderModels(providerId, definition, options);
  }

  for (const [providerId, definition] of Object.entries(runtimeCatalog?.providers ?? {})) {
    collectOpenClawProviderModels(providerId, definition, options);
  }

  for (const key of Object.keys(config?.agents?.defaults?.models ?? {})) {
    const option = buildOpenClawModelOption(key);
    if (option && !options.has(option.key)) {
      options.set(option.key, option);
    }
  }

  const currentModel = getOpenClawCurrentModel(config);
  if (currentModel) {
    const option = buildOpenClawModelOption(currentModel);
    if (option && !options.has(option.key)) {
      options.set(option.key, option);
    }
  }

  for (const option of OPENCLAW_MODEL_FALLBACKS) {
    if (!options.has(option.key)) {
      options.set(option.key, option);
    }
  }

  return [...options.values()].sort((left, right) =>
    left.label.localeCompare(right.label, 'zh-CN', { sensitivity: 'base' }),
  );
};

const resolveTokenExpiryMs = (accessToken?: string | null): number | null => {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return null;
  }

  return Math.round(payload.exp * 1000);
};

const mapDetectedPlanType = (value?: string | null): PlanType => {
  const normalized = normalizeText(value).toLowerCase();

  switch (normalized) {
    case 'free':
      return 'Free';
    case 'plus':
      return 'Plus';
    case 'pro':
      return 'Pro';
    case 'team':
      return 'Team';
    case 'enterprise':
    case 'business':
      return 'Business';
    default:
      return 'Unknown';
  }
};

const getSettingsPath = (): string => path.join(app.getPath('userData'), SETTINGS_FILE_NAME);

const getProfilesFilePath = (profilesRootDir: string): string =>
  path.join(profilesRootDir, PROFILES_FILE_NAME);

const getActivityLogPath = (profilesRootDir: string): string =>
  path.join(profilesRootDir, ACTIVITY_LOG_FILE_NAME);

const getProfileDirPath = (profilesRootDir: string, storageDirName: string): string =>
  path.join(profilesRootDir, storageDirName);

const getProfileAuthPath = (profilesRootDir: string, storageDirName: string): string =>
  path.join(getProfileDirPath(profilesRootDir, storageDirName), AUTH_FILE_NAME);

const getBackupDirPath = (profilesRootDir: string): string =>
  path.join(profilesRootDir, BACKUP_DIR_NAME);

const getDailyProfilesBackupRootPath = (profilesRootDir: string): string =>
  path.join(getBackupDirPath(profilesRootDir), PROFILE_DAILY_BACKUP_DIR_NAME);

const getDeletedProfilesBackupRootPath = (profilesRootDir: string): string =>
  path.join(getBackupDirPath(profilesRootDir), DELETED_PROFILE_BACKUP_DIR_NAME);

const getLocalDateStamp = (value = new Date()): string =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;

const getDailyProfilesBackupPath = (profilesRootDir: string, dateStamp = getLocalDateStamp()): string =>
  path.join(getDailyProfilesBackupRootPath(profilesRootDir), dateStamp);

const getFileModifiedAt = async (filePath: string): Promise<string | null> => {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
};

const getImportedProfileTimestamp = async (authFilePath: string): Promise<string> =>
  (await getFileModifiedAt(authFilePath)) ?? new Date().toISOString();

const buildBackupTimestamp = (value = new Date().toISOString()): string =>
  value.replace(/[:.]/g, '-');

const hasQuotaSignalForSort = (quota: UsageQuota): boolean =>
  Boolean(quota.configured) ||
  quota.source === 'detected' ||
  quota.source === 'live' ||
  quota.percentUsed > 0 ||
  Boolean(quota.resetAt) ||
  Boolean(normalizeText(quota.label));

const getQuotaRemainingPercent = (quota: UsageQuota): number | null =>
  hasQuotaSignalForSort(quota) ? 100 - normalizePercent(quota.percentUsed) : null;

const getProfileRecentLoginSortStamp = (
  profile: Pick<StoredProfile, 'lastActivatedAt' | 'updatedAt' | 'createdAt'>,
): string =>
  normalizeText(profile.lastActivatedAt) ||
  normalizeText(profile.updatedAt) ||
  normalizeText(profile.createdAt);

const cleanupExpiredDeletedProfileBackups = async (profilesRootDir: string): Promise<void> => {
  const deletedBackupRoot = getDeletedProfilesBackupRootPath(profilesRootDir);
  await fs.ensureDir(deletedBackupRoot);

  const entries = await fs.readdir(deletedBackupRoot, { withFileTypes: true });
  const nowMs = Date.now();

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(deletedBackupRoot, entry.name);

      try {
        const stat = await fs.stat(entryPath);
        if (nowMs - stat.mtimeMs >= DELETED_PROFILE_RETENTION_MS) {
          await fs.remove(entryPath);
        }
      } catch {
        // Ignore cleanup failures and keep the primary profile flow working.
      }
    }),
  );
};

const writeDailyProfilesBackup = async (
  profilesRootDir: string,
  profilesFile: ProfilesFile,
  options?: { overwrite?: boolean },
): Promise<void> => {
  const backupDir = getDailyProfilesBackupPath(profilesRootDir);
  const backupExists = await fs.pathExists(backupDir);

  if (backupExists && !options?.overwrite) {
    return;
  }

  const storedProfiles = profilesFile.profiles.map(toStoredProfile);
  await fs.remove(backupDir);
  await fs.ensureDir(path.join(backupDir, 'profiles'));
  await fs.writeJson(
    path.join(backupDir, PROFILES_FILE_NAME),
    {
      version: 1,
      capturedAt: new Date().toISOString(),
      profiles: storedProfiles,
    },
    { spaces: 2 },
  );

  for (const profile of storedProfiles) {
    const authPath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
    if (!(await fs.pathExists(authPath))) {
      continue;
    }

    const targetDir = path.join(backupDir, 'profiles', profile.storageDirName);
    await fs.ensureDir(targetDir);
    await fs.copy(authPath, path.join(targetDir, AUTH_FILE_NAME), { overwrite: true });
  }
};

const backupDeletedProfile = async (
  profilesRootDir: string,
  profile: StoredProfile,
  removeFiles: boolean,
): Promise<void> => {
  const deletedAt = new Date().toISOString();
  const backupDir = path.join(
    getDeletedProfilesBackupRootPath(profilesRootDir),
    `${buildBackupTimestamp(deletedAt)}-${profile.storageDirName}`,
  );

  await fs.ensureDir(backupDir);
  await fs.writeJson(
    path.join(backupDir, 'profile.json'),
    {
      version: 1,
      deletedAt,
      removeFiles,
      profile: toStoredProfile(profile),
    },
    { spaces: 2 },
  );

  const profileDir = getProfileDirPath(profilesRootDir, profile.storageDirName);
  if (isPathInside(profilesRootDir, profileDir) && (await fs.pathExists(profileDir))) {
    await fs.copy(profileDir, path.join(backupDir, 'profile-files'), { overwrite: true });
  }
};

const isPathInside = (parentPath: string, childPath: string): boolean => {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const getManagedDesktopProcessNames = (kind: ManagedDesktopAppKind): string[] =>
  kind === 'codex' ? ['Codex.exe'] : ['Trae.exe'];

const getManagedDesktopCommonPaths = (kind: ManagedDesktopAppKind): string[] => {
  const localAppData = normalizeText(process.env.LOCALAPPDATA);
  const programFiles = normalizeText(process.env.ProgramFiles);
  const programFilesX86 = normalizeText(process.env['ProgramFiles(x86)']);

  if (kind === 'codex') {
    return [
      localAppData ? path.join(localAppData, 'Programs', 'Codex', 'Codex.exe') : '',
      localAppData ? path.join(localAppData, 'Programs', 'OpenAI Codex', 'Codex.exe') : '',
      localAppData ? path.join(localAppData, 'Microsoft', 'WindowsApps', 'Codex.exe') : '',
      programFiles ? path.join(programFiles, 'Codex', 'Codex.exe') : '',
      programFilesX86 ? path.join(programFilesX86, 'Codex', 'Codex.exe') : '',
    ].filter(Boolean);
  }

  return [
    localAppData ? path.join(localAppData, 'Programs', 'Trae', 'Trae.exe') : '',
    programFiles ? path.join(programFiles, 'Trae', 'Trae.exe') : '',
    programFilesX86 ? path.join(programFilesX86, 'Trae', 'Trae.exe') : '',
  ].filter(Boolean);
};

const getManagedDesktopLabel = (kind: ManagedDesktopAppKind): string =>
  kind === 'codex' ? 'Codex' : 'Trae';

const escapePowerShellLiteral = (value: string): string => value.replace(/'/g, "''");

const waitForManagedDesktopProcessState = async (
  kind: ManagedDesktopAppKind,
  targetState: 'running' | 'stopped',
  timeoutMs: number,
): Promise<boolean> => {
  const startTime = Date.now();
  const processNames = new Set(getManagedDesktopProcessNames(kind));

  while (Date.now() - startTime < timeoutMs) {
    const processes = await listManagedDesktopProcesses();
    const isRunning = processes.some((item) => processNames.has(item.name));

    if ((targetState === 'running' && isRunning) || (targetState === 'stopped' && !isRunning)) {
      return true;
    }

    await wait(450);
  }

  return false;
};

const launchManagedDesktopExecutable = async (executablePath: string): Promise<boolean> => {
  const normalizedPath = normalizeText(executablePath);
  if (!normalizedPath) {
    return false;
  }

  if (process.platform === 'win32') {
    const command = `Start-Process -FilePath '${escapePowerShellLiteral(normalizedPath)}'`;

    try {
      await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
        {
          timeout: 10_000,
          windowsHide: true,
        },
      );
      return true;
    } catch {
      // Fall through to direct spawn.
    }
  }

  try {
    spawn(normalizedPath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd: path.dirname(normalizedPath),
    }).unref();
    return true;
  } catch {
    return false;
  }
};

const createSwitchProgressEmitter = (
  input: SwitchProfileInput,
  switchMode: SwitchMode,
  targetProfileId: string,
  reportProgress?: SwitchProgressReporter,
) => {
  const runId = normalizeText(input.runId);

  return (
    stepKey: SwitchProgressEvent['stepKey'],
    title: string,
    detail: string,
    status: SwitchProgressStatus,
  ): void => {
    if (!runId || !reportProgress) {
      return;
    }

    reportProgress({
      runId,
      targetProfileId,
      switchMode,
      stepKey,
      title,
      detail,
      status,
      timestamp: new Date().toISOString(),
    });
  };
};

const listManagedDesktopProcesses = async (): Promise<RunningDesktopProcess[]> => {
  if (process.platform !== 'win32') {
    return [];
  }

  const script = [
    "$items = Get-CimInstance Win32_Process | Where-Object { @('Codex.exe','Trae.exe') -contains $_.Name } | Select-Object ProcessId, Name, ExecutablePath",
    "if ($null -eq $items) { '[]' } else { $items | ConvertTo-Json -Compress }",
  ].join('; ');

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      {
        timeout: 10_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
    );
    const raw = stdout.trim();
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];

    return items
      .map((item) => ({
        processId: Number(item?.ProcessId) || 0,
        name: normalizeText(item?.Name),
        executablePath: normalizeText(item?.ExecutablePath) || null,
      }))
      .filter((item) => item.processId > 0 && item.name);
  } catch {
    return [];
  }
};

const findFirstExistingPath = async (candidates: string[]): Promise<string | null> => {
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (!normalized) {
      continue;
    }

    const resolved = path.resolve(normalized);
    if (await fs.pathExists(resolved)) {
      return resolved;
    }
  }

  return null;
};

const getFirstResolvedExecutablePath = (candidates: Array<string | null | undefined>): string | null => {
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (!normalized) {
      continue;
    }

    return path.resolve(normalized);
  }

  return null;
};

const resolveManagedDesktopExecutable = async (
  kind: ManagedDesktopAppKind,
  settings: AppSettings,
  runningProcesses?: RunningDesktopProcess[],
): Promise<ResolvedExecutablePath> => {
  const override =
    kind === 'codex' ? settings.codexExecutablePathOverride : settings.traeExecutablePathOverride;
  const manualPath = getFirstResolvedExecutablePath(override ? [override] : []);
  if (manualPath) {
    return { path: manualPath, source: 'manual' };
  }

  const processNames = new Set(getManagedDesktopProcessNames(kind));
  const livePath = getFirstResolvedExecutablePath(
    (runningProcesses ?? [])
      .filter((item) => processNames.has(item.name))
      .map((item) => item.executablePath ?? ''),
  );
  if (livePath) {
    return { path: livePath, source: 'running' };
  }

  const commonPath = await findFirstExistingPath(getManagedDesktopCommonPaths(kind));
  if (commonPath) {
    return { path: commonPath, source: 'common' };
  }

  return { path: null, source: 'missing' };
};

const sanitizeStorageDirName = (value: string): string => {
  const sanitized = value
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[^\w\-.一-龥]/g, '')
    .toLowerCase();

  return sanitized || 'profile';
};

const toStoredProfile = (profile: Partial<StoredProfile>): StoredProfile => ({
  id: normalizeText(profile.id) || nanoid(10),
  storageDirName: normalizeText(profile.storageDirName) || 'profile',
  name: normalizeText(profile.name) || normalizeText(profile.storageDirName) || 'profile',
  workspaceName: normalizeText(profile.workspaceName) || null,
  notes: normalizeText(profile.notes),
  planType: normalizePlanType(profile.planType),
  manuallyDisabled: profile.manuallyDisabled ?? false,
  weeklyQuota: normalizeQuota(profile.weeklyQuota),
  fiveHourQuota: normalizeQuota(profile.fiveHourQuota),
  reviewQuota: normalizeQuota(profile.reviewQuota),
  createdAt: profile.createdAt ?? new Date().toISOString(),
  updatedAt: profile.updatedAt ?? new Date().toISOString(),
  usageUpdatedAt: profile.usageUpdatedAt ?? null,
  usageError: normalizeText(profile.usageError) || null,
  lastActivatedAt: profile.lastActivatedAt ?? null,
});

const readJsonIfExists = async <T>(filePath: string): Promise<T | null> => {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  try {
    return (await fs.readJson(filePath)) as T;
  } catch {
    return null;
  }
};

const readSettings = async (): Promise<AppSettings> => {
  const defaults = defaultSettings();
  const filePath = getSettingsPath();

  await fs.ensureDir(path.dirname(filePath));

  const raw = await readJsonIfExists<Partial<AppSettings>>(filePath);
  const nextSettings: AppSettings = {
    profilesRootDir: normalizeText(raw?.profilesRootDir) || defaults.profilesRootDir,
    backupBeforeSwitch: raw?.backupBeforeSwitch ?? defaults.backupBeforeSwitch,
    switchMode: normalizeSwitchMode(raw?.switchMode),
    lowQuotaWarningEnabled: raw?.lowQuotaWarningEnabled ?? defaults.lowQuotaWarningEnabled,
    lowQuotaWarningThreshold: normalizeThreshold(raw?.lowQuotaWarningThreshold),
    codexExecutablePathOverride:
      normalizeText(raw?.codexExecutablePathOverride) || defaults.codexExecutablePathOverride,
    traeExecutablePathOverride:
      normalizeText(raw?.traeExecutablePathOverride) || defaults.traeExecutablePathOverride,
    codexTraeAutoRestart:
      raw?.codexTraeAutoRestart ?? defaults.codexTraeAutoRestart,
    openclawStateDirOverride:
      normalizeText(raw?.openclawStateDirOverride) || defaults.openclawStateDirOverride,
    openclawAutoRestartGateway:
      raw?.openclawAutoRestartGateway ?? defaults.openclawAutoRestartGateway,
    autoSwitchEnabled: raw?.autoSwitchEnabled ?? defaults.autoSwitchEnabled,
    autoSwitchThreshold: normalizeThreshold(raw?.autoSwitchThreshold),
    autoSwitchCountdownSeconds: normalizeCountdownSeconds(raw?.autoSwitchCountdownSeconds),
  };

  await fs.writeJson(filePath, nextSettings, { spaces: 2 });
  return nextSettings;
};

const writeSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const nextSettings: AppSettings = {
    profilesRootDir: path.resolve(settings.profilesRootDir),
    backupBeforeSwitch: settings.backupBeforeSwitch,
    switchMode: normalizeSwitchMode(settings.switchMode),
    lowQuotaWarningEnabled: settings.lowQuotaWarningEnabled,
    lowQuotaWarningThreshold: normalizeThreshold(settings.lowQuotaWarningThreshold),
    codexExecutablePathOverride: normalizeText(settings.codexExecutablePathOverride) || null,
    traeExecutablePathOverride: normalizeText(settings.traeExecutablePathOverride) || null,
    codexTraeAutoRestart: settings.codexTraeAutoRestart,
    openclawStateDirOverride: normalizeText(settings.openclawStateDirOverride) || null,
    openclawAutoRestartGateway: settings.openclawAutoRestartGateway,
    autoSwitchEnabled: settings.autoSwitchEnabled,
    autoSwitchThreshold: normalizeThreshold(settings.autoSwitchThreshold),
    autoSwitchCountdownSeconds: normalizeCountdownSeconds(settings.autoSwitchCountdownSeconds),
  };

  await fs.ensureDir(path.dirname(getSettingsPath()));
  await fs.writeJson(getSettingsPath(), nextSettings, { spaces: 2 });
  return nextSettings;
};

const ensureProfilesRoot = async (profilesRootDir: string): Promise<void> => {
  await fs.ensureDir(profilesRootDir);
  await fs.ensureDir(getBackupDirPath(profilesRootDir));
  await fs.ensureDir(getDailyProfilesBackupRootPath(profilesRootDir));
  await fs.ensureDir(getDeletedProfilesBackupRootPath(profilesRootDir));
};

const readProfilesFile = async (profilesRootDir: string): Promise<ProfilesFile> => {
  await ensureProfilesRoot(profilesRootDir);
  await cleanupExpiredDeletedProfileBackups(profilesRootDir);

  const profilesFilePath = getProfilesFilePath(profilesRootDir);
  const fileExists = await fs.pathExists(profilesFilePath);
  let raw: Partial<ProfilesFile> | null = null;

  if (fileExists) {
    try {
      raw = (await fs.readJson(profilesFilePath)) as Partial<ProfilesFile>;
    } catch {
      throw new Error(
        `profiles.json 解析失败，已停止自动覆盖。请先检查或恢复 ${profilesFilePath} 后再重试。`,
      );
    }
  }

  const nextProfilesFile: ProfilesFile = {
    version: 2,
    profiles: Array.isArray(raw?.profiles)
      ? raw.profiles.map((profile) => toStoredProfile(profile as Partial<StoredProfile>))
      : [],
  };

  if (!fileExists) {
    await fs.writeJson(profilesFilePath, nextProfilesFile, { spaces: 2 });
  }

  await writeDailyProfilesBackup(profilesRootDir, nextProfilesFile);

  return nextProfilesFile;
};

const writeProfilesFile = async (profilesRootDir: string, profilesFile: ProfilesFile): Promise<void> => {
  await ensureProfilesRoot(profilesRootDir);
  await cleanupExpiredDeletedProfileBackups(profilesRootDir);
  const storedProfilesFile: ProfilesFile = {
    version: 2,
    profiles: profilesFile.profiles.map(toStoredProfile),
  };
  await fs.writeJson(
    getProfilesFilePath(profilesRootDir),
    storedProfilesFile,
    { spaces: 2 },
  );
  await writeDailyProfilesBackup(profilesRootDir, storedProfilesFile, { overwrite: true });
};

const readActivityLogFile = async (profilesRootDir: string): Promise<ActivityLogFile> => {
  await ensureProfilesRoot(profilesRootDir);

  const raw = await readJsonIfExists<Partial<ActivityLogFile>>(getActivityLogPath(profilesRootDir));
  const nextLogFile: ActivityLogFile = {
    version: 1,
    logs: Array.isArray(raw?.logs) ? raw.logs.slice(0, MAX_LOG_ENTRIES) : [],
  };

  await fs.writeJson(getActivityLogPath(profilesRootDir), nextLogFile, { spaces: 2 });
  return nextLogFile;
};

const writeActivityLogFile = async (
  profilesRootDir: string,
  activityLogFile: ActivityLogFile,
): Promise<void> => {
  await ensureProfilesRoot(profilesRootDir);
  await fs.writeJson(
    getActivityLogPath(profilesRootDir),
    {
      version: 1,
      logs: activityLogFile.logs.slice(0, MAX_LOG_ENTRIES),
    },
    { spaces: 2 },
  );
};

const appendActivityLog = async (
  profilesRootDir: string,
  level: ActivityLogLevel,
  message: string,
): Promise<void> => {
  const current = await readActivityLogFile(profilesRootDir);
  const entry: ActivityLogEntry = {
    id: nanoid(10),
    level,
    message,
    createdAt: new Date().toISOString(),
  };

  current.logs = [entry, ...current.logs].slice(0, MAX_LOG_ENTRIES);
  await writeActivityLogFile(profilesRootDir, current);
};

const hashFile = async (filePath: string): Promise<string | null> => {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
};

const decodeJwtPayload = (token?: string | null): Record<string, unknown> | null => {
  const normalized = normalizeText(token);
  if (!normalized) {
    return null;
  }

  const parts = normalized.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const detectAuthFileHints = async (filePath: string): Promise<AuthFileHints> => {
  const raw = await readJsonIfExists<AuthFilePayload>(filePath);
  if (!raw?.tokens) {
    return { planType: 'Unknown', defaultName: null, workspaceName: null, accountId: null };
  }

  const accessPayload = decodeJwtPayload(raw.tokens.access_token);
  const idPayload = decodeJwtPayload(raw.tokens.id_token);
  const accessAuth =
    accessPayload?.['https://api.openai.com/auth'] as Record<string, unknown> | undefined;
  const idAuth = idPayload?.['https://api.openai.com/auth'] as Record<string, unknown> | undefined;

  const planType = mapDetectedPlanType(
    typeof accessAuth?.chatgpt_plan_type === 'string'
      ? accessAuth.chatgpt_plan_type
      : typeof accessPayload?.chatgpt_plan_type === 'string'
        ? accessPayload.chatgpt_plan_type
        : null,
  );

  const organizations =
    (Array.isArray(idAuth?.organizations) ? idAuth.organizations : []) as Array<
      Record<string, unknown>
    >;
  const defaultOrganization =
    organizations.find((organization) => organization.is_default === true) ?? organizations[0];
  const defaultName =
    typeof defaultOrganization?.title === 'string'
      ? normalizeText(defaultOrganization.title)
      : null;
  const accountId =
    normalizeText(raw.tokens.account_id) ||
    (typeof idAuth?.chatgpt_account_id === 'string' ? normalizeText(idAuth.chatgpt_account_id) : '') ||
    (typeof accessAuth?.chatgpt_account_id === 'string'
      ? normalizeText(accessAuth.chatgpt_account_id)
      : '') ||
    null;

  return {
    planType,
    defaultName: defaultName || null,
    workspaceName: defaultName || null,
    accountId,
  };
};

const createTimedFetchOptions = (
  timeoutMs: number,
): { controller: AbortController; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timer),
  };
};

const buildLiveQuota = (
  windowPayload: UsageWindowPayload | undefined,
  label: string,
): UsageQuota | null => {
  if (!windowPayload) {
    return null;
  }

  const percentUsed = normalizePercent(windowPayload.used_percent);
  const resetAt =
    typeof windowPayload.reset_at === 'number' && Number.isFinite(windowPayload.reset_at)
      ? new Date(windowPayload.reset_at * 1000).toISOString()
      : null;

  return normalizeQuota({
    percentUsed,
    resetAt,
    source: 'live',
    label,
    configured: true,
  });
};

const fetchUsageJsonViaPowerShell = async (
  accessToken: string,
  accountId: string | null,
): Promise<CodexUsageResponse> => {
  const command = [
    '$headers = @{',
    '  Authorization = "Bearer $env:CODEX_USAGE_TOKEN"',
    "  Accept = 'application/json'",
    "  'User-Agent' = 'CodexBar'",
    '}',
    "if ($env:CODEX_USAGE_ACCOUNT_ID) { $headers['ChatGPT-Account-Id'] = $env:CODEX_USAGE_ACCOUNT_ID }",
    "$res = Invoke-WebRequest -Uri 'https://chatgpt.com/backend-api/wham/usage' -Headers $headers -Method Get -TimeoutSec 30 -UseBasicParsing",
    '$res.Content',
  ].join('\n');

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    {
      timeout: 35_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        CODEX_USAGE_TOKEN: accessToken,
        CODEX_USAGE_ACCOUNT_ID: accountId ?? '',
      },
    },
  );

  return JSON.parse(stdout.trim()) as CodexUsageResponse;
};

const fetchUsageJsonViaNode = async (
  accessToken: string,
  accountId: string | null,
): Promise<CodexUsageResponse> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'User-Agent': 'CodexBar',
  };

  if (accountId) {
    headers['ChatGPT-Account-Id'] = accountId;
  }

  const { controller, cleanup } = createTimedFetchOptions(USAGE_SYNC_TIMEOUT_MS);

  try {
    const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`额度接口返回 ${response.status}`);
    }

    return (await response.json()) as CodexUsageResponse;
  } finally {
    cleanup();
  }
};

const fetchLiveUsageSnapshot = async (
  authFilePath: string,
  hintsOverride?: AuthFileHints | null,
): Promise<LiveUsageSnapshot | null> => {
  const raw = await readJsonIfExists<AuthFilePayload>(authFilePath);
  const accessToken = normalizeText(raw?.tokens?.access_token);

  if (!accessToken) {
    return null;
  }

  const hints = hintsOverride ?? (await detectAuthFileHints(authFilePath));
  const payload =
    process.platform === 'win32'
      ? await fetchUsageJsonViaPowerShell(accessToken, hints.accountId)
      : await fetchUsageJsonViaNode(accessToken, hints.accountId);
  const primaryWindow = payload.rate_limit?.primary_window;
  const secondaryWindow = payload.rate_limit?.secondary_window;
  const primarySeconds = primaryWindow?.limit_window_seconds ?? 0;
  const secondarySeconds = secondaryWindow?.limit_window_seconds ?? 0;

  const fiveHourQuota =
    primarySeconds > 0 && primarySeconds <= 6 * 3600
      ? buildLiveQuota(primaryWindow, `${Math.max(1, Math.round(primarySeconds / 3600))}h`)
      : null;
  const weeklyQuota =
    secondarySeconds >= 5 * 24 * 3600
      ? buildLiveQuota(secondaryWindow, 'Week')
      : secondarySeconds > 0
        ? buildLiveQuota(secondaryWindow, `${Math.max(1, Math.round(secondarySeconds / 3600))}h`)
        : null;

  return {
    planType:
      hints.planType !== 'Unknown'
        ? hints.planType
        : mapDetectedPlanType(payload.plan_type),
    weeklyQuota,
    fiveHourQuota,
  };
};

const resolveOpenClawGatewayPort = async (stateDir: string): Promise<number> => {
  const gatewayCommandPath = getOpenClawGatewayCommandPath(stateDir);
  if (!(await fs.pathExists(gatewayCommandPath))) {
    return OPENCLAW_DEFAULT_GATEWAY_PORT;
  }

  try {
    const content = await fs.readFile(gatewayCommandPath, 'utf8');
    const match = content.match(/OPENCLAW_GATEWAY_PORT=(\d{2,5})/i);
    if (!match) {
      return OPENCLAW_DEFAULT_GATEWAY_PORT;
    }

    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : OPENCLAW_DEFAULT_GATEWAY_PORT;
  } catch {
    return OPENCLAW_DEFAULT_GATEWAY_PORT;
  }
};

const getListeningProcessId = async (port: number): Promise<number | null> => {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$conn = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1 -ExpandProperty OwningProcess; if ($conn) { Write-Output $conn }`,
      ],
      {
        timeout: 8_000,
        windowsHide: true,
      },
    );

    const value = Number(String(stdout).trim());
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const waitForPortState = async (
  port: number,
  targetState: 'running' | 'stopped',
  timeoutMs: number,
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const pid = await getListeningProcessId(port);
    if ((targetState === 'running' && pid) || (targetState === 'stopped' && !pid)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return false;
};

const syncCodexAuthIntoOpenClaw = async (
  settings: AppSettings,
): Promise<{ synced: boolean; stateDir: string; warnings: string[] }> => {
  const stateDir = resolveOpenClawStateDir(settings);
  const warnings: string[] = [];

  if (!(await fs.pathExists(CURRENT_AUTH_PATH))) {
    warnings.push('当前 .codex\\auth.json 不存在，未同步 OpenClaw。');
    return { synced: false, stateDir, warnings };
  }

  const authPayload = await readJsonIfExists<AuthFilePayload>(CURRENT_AUTH_PATH);
  const accessToken = normalizeText(authPayload?.tokens?.access_token);
  const refreshToken = normalizeText(authPayload?.tokens?.refresh_token);
  const accountId = normalizeText(authPayload?.tokens?.account_id) || null;
  const explicitExpiresRaw = authPayload?.tokens?.expires_at;

  if (!accessToken || !refreshToken) {
    warnings.push('当前 auth.json 缺少 OpenClaw 所需 token，未同步 OpenClaw。');
    return { synced: false, stateDir, warnings };
  }

  let expires = null as number | null;
  if (typeof explicitExpiresRaw === 'number' && Number.isFinite(explicitExpiresRaw)) {
    expires = Math.round(explicitExpiresRaw);
  } else if (typeof explicitExpiresRaw === 'string' && explicitExpiresRaw.trim()) {
    const parsed = Number(explicitExpiresRaw);
    expires = Number.isFinite(parsed) ? Math.round(parsed) : null;
  }

  if (!expires) {
    expires = resolveTokenExpiryMs(accessToken);
  }

  const authStorePath = getOpenClawAuthStorePath(stateDir);
  const rawStore = (await readJsonIfExists<OpenClawAuthProfileStore>(authStorePath)) ?? {};
  const store: OpenClawAuthProfileStore = {
    version: typeof rawStore.version === 'number' ? rawStore.version : 1,
    profiles:
      rawStore.profiles && typeof rawStore.profiles === 'object' ? { ...rawStore.profiles } : {},
    order: rawStore.order && typeof rawStore.order === 'object' ? { ...rawStore.order } : {},
    lastGood:
      rawStore.lastGood && typeof rawStore.lastGood === 'object' ? { ...rawStore.lastGood } : {},
    usageStats:
      rawStore.usageStats && typeof rawStore.usageStats === 'object'
        ? { ...rawStore.usageStats }
        : {},
  };

  const existingProfile =
    store.profiles?.[OPENCLAW_AUTH_PROFILE_ID] &&
    typeof store.profiles[OPENCLAW_AUTH_PROFILE_ID] === 'object'
      ? { ...store.profiles[OPENCLAW_AUTH_PROFILE_ID] }
      : {};

  store.profiles = store.profiles ?? {};
  store.profiles[OPENCLAW_AUTH_PROFILE_ID] = {
    ...existingProfile,
    type: 'oauth',
    provider: 'openai-codex',
    access: accessToken,
    refresh: refreshToken,
    ...(accountId ? { accountId } : {}),
    ...(expires ? { expires } : {}),
  };

  store.order = store.order ?? {};
  store.order['openai-codex'] = [OPENCLAW_AUTH_PROFILE_ID];
  store.lastGood = store.lastGood ?? {};
  store.lastGood['openai-codex'] = OPENCLAW_AUTH_PROFILE_ID;
  store.usageStats = store.usageStats ?? {};
  store.usageStats[OPENCLAW_AUTH_PROFILE_ID] = {
    ...(store.usageStats[OPENCLAW_AUTH_PROFILE_ID] ?? {}),
    lastUsed: Date.now(),
    errorCount: 0,
  };

  await fs.ensureDir(path.dirname(authStorePath));
  await fs.writeJson(authStorePath, store, { spaces: 2 });
  return { synced: true, stateDir, warnings };
};

const applyOpenClawModelSelection = async (
  settings: AppSettings,
  requestedModel?: string | null,
): Promise<{ appliedModel: string | null; changed: boolean; warnings: string[] }> => {
  const normalizedModel = normalizeText(requestedModel) || null;
  if (!normalizedModel) {
    return { appliedModel: null, changed: false, warnings: [] };
  }

  const stateDir = resolveOpenClawStateDir(settings);
  const configPath = getOpenClawConfigPath(stateDir);
  const warnings: string[] = [];

  if (!(await fs.pathExists(configPath))) {
    warnings.push('未找到 OpenClaw 配置 openclaw.json，已跳过模型切换。');
    return { appliedModel: normalizedModel, changed: false, warnings };
  }

  const rawConfig = (await readJsonIfExists<OpenClawConfig>(configPath)) ?? {};
  const currentModel = getOpenClawCurrentModel(rawConfig);
  const { provider, modelId } = splitOpenClawModelKey(normalizedModel);
  const nextAllowlist = {
    ...(rawConfig.agents?.defaults?.models ?? {}),
    [normalizedModel]:
      rawConfig.agents?.defaults?.models?.[normalizedModel] ?? ({} as Record<string, unknown>),
  };

  const nextConfig: OpenClawConfig = {
    ...rawConfig,
    agents: {
      ...(rawConfig.agents ?? {}),
      defaults: {
        ...(rawConfig.agents?.defaults ?? {}),
        model: {
          ...(rawConfig.agents?.defaults?.model ?? {}),
          primary: normalizedModel,
        },
        models: nextAllowlist,
      },
    },
    localAssistant: {
      ...(rawConfig.localAssistant ?? {}),
      selectedProvider: provider,
      selectedModel: modelId || normalizedModel,
    },
  };

  await fs.writeJson(configPath, nextConfig, { spaces: 2 });

  return {
    appliedModel: normalizedModel,
    changed: currentModel !== normalizedModel,
    warnings,
  };
};

const restartOpenClawGateway = async (
  settings: AppSettings,
): Promise<{ restarted: boolean; gatewayCommandPath: string | null; warnings: string[] }> => {
  const stateDir = resolveOpenClawStateDir(settings);
  const gatewayCommandPath = getOpenClawGatewayCommandPath(stateDir);
  const warnings: string[] = [];

  if (!(await fs.pathExists(gatewayCommandPath))) {
    warnings.push('未找到 OpenClaw 网关命令文件，已跳过网关重启。');
    return { restarted: false, gatewayCommandPath: null, warnings };
  }

  const port = await resolveOpenClawGatewayPort(stateDir);
  const existingPid = await getListeningProcessId(port);

  if (existingPid) {
    try {
      await execFileAsync(
        'taskkill.exe',
        ['/PID', String(existingPid), '/T', '/F'],
        {
          timeout: 8_000,
          windowsHide: true,
        },
      );
    } catch {
      warnings.push('OpenClaw 网关旧进程未完全结束，已尝试继续重启。');
    }

    await waitForPortState(port, 'stopped', 8_000);
  }

  try {
    spawn('cmd.exe', ['/c', gatewayCommandPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd: stateDir,
    }).unref();
  } catch {
    warnings.push('OpenClaw 网关启动命令执行失败。');
    return { restarted: false, gatewayCommandPath, warnings };
  }

  const running = await waitForPortState(port, 'running', 20_000);
  if (!running) {
    warnings.push('OpenClaw 网关未在预期时间内恢复监听。');
    return { restarted: false, gatewayCommandPath, warnings };
  }

  return { restarted: true, gatewayCommandPath, warnings };
};

const restartManagedDesktopApps = async (
  settings: AppSettings,
  reportStep?: (
    stepKey: SwitchProgressEvent['stepKey'],
    title: string,
    detail: string,
    status: SwitchProgressStatus,
  ) => void,
): Promise<{ restartedApps: string[]; warnings: string[] }> => {
  const warnings: string[] = [];
  const restartedApps: string[] = [];

  if (process.platform !== 'win32') {
    warnings.push('当前只支持在 Windows 上自动重启 Codex / Trae。');
    reportStep?.('desktop-start', '启动 Codex / Trae', warnings[0], 'warning');
    return { restartedApps, warnings };
  }

  const runningProcesses = await listManagedDesktopProcesses();
  const runningKinds = (['codex', 'trae'] as const).filter((kind) => {
    const processNames = new Set(getManagedDesktopProcessNames(kind));
    return runningProcesses.some((item) => processNames.has(item.name));
  });

  if (runningKinds.length === 0) {
    reportStep?.('desktop-stop', '关闭 Codex / Trae', '未检测到需要关闭的运行实例。', 'warning');
    reportStep?.('desktop-start', '启动 Codex / Trae', '未检测到需要重新启动的运行实例。', 'warning');
    return { restartedApps, warnings };
  }

  reportStep?.(
    'desktop-stop',
    '关闭 Codex / Trae',
    `正在关闭：${runningKinds.map(getManagedDesktopLabel).join(' / ')}`,
    'active',
  );

  for (const kind of ['codex', 'trae'] as const) {
    const processNames = new Set(getManagedDesktopProcessNames(kind));
    const processes = runningProcesses.filter((item) => processNames.has(item.name));

    if (processes.length === 0) {
      continue;
    }

    const executable = await resolveManagedDesktopExecutable(kind, settings, runningProcesses);
    const executablePath =
      executable.path ??
      processes.find((item) => normalizeText(item.executablePath))?.executablePath ??
      null;

    if (!executablePath) {
      warnings.push(`未识别到 ${getManagedDesktopLabel(kind)} 的可执行文件路径，已跳过自动重启。`);
      continue;
    }

    for (const pid of [...new Set(processes.map((item) => item.processId))]) {
      try {
        await execFileAsync(
          'taskkill.exe',
          ['/PID', String(pid), '/T', '/F'],
          {
            timeout: 8_000,
            windowsHide: true,
          },
        );
      } catch {
        warnings.push(`${getManagedDesktopLabel(kind)} 旧进程未完全结束，已尝试继续启动新实例。`);
      }
    }

    const fullyStopped = await waitForManagedDesktopProcessState(kind, 'stopped', 12_000);
    if (!fullyStopped) {
      warnings.push(`${getManagedDesktopLabel(kind)} 未在预期时间内完全关闭。`);
    }

    reportStep?.(
      'desktop-start',
      '启动 Codex / Trae',
      `正在启动：${getManagedDesktopLabel(kind)}`,
      'active',
    );

    const launched = await launchManagedDesktopExecutable(executablePath);
    if (!launched) {
      warnings.push(`${getManagedDesktopLabel(kind)} 启动命令执行失败。`);
      continue;
    }

    const started = await waitForManagedDesktopProcessState(kind, 'running', 15_000);
    if (started) {
      restartedApps.push(getManagedDesktopLabel(kind));
    } else {
      warnings.push(`${getManagedDesktopLabel(kind)} 未在预期时间内重新启动。`);
    }
  }

  reportStep?.(
    'desktop-stop',
    '关闭 Codex / Trae',
    `已结束关闭流程：${runningKinds.map(getManagedDesktopLabel).join(' / ')}`,
    warnings.some((warning) => warning.includes('关闭') || warning.includes('旧进程'))
      ? 'warning'
      : 'success',
  );

  if (restartedApps.length > 0) {
    reportStep?.(
      'desktop-start',
      '启动 Codex / Trae',
      `启动成功：${restartedApps.join(' / ')}`,
      warnings.some((warning) => warning.includes('启动')) ? 'warning' : 'success',
    );
  } else {
    reportStep?.('desktop-start', '启动 Codex / Trae', '未成功启动任何运行实例。', 'warning');
  }

  return { restartedApps, warnings };
};

const resolveAuthStatus = async (
  profilesRootDir: string,
  storageDirName: string,
): Promise<AuthFileStatus> => {
  const profileDir = getProfileDirPath(profilesRootDir, storageDirName);
  if (!(await fs.pathExists(profileDir))) {
    return 'path-error';
  }

  if (!(await fs.pathExists(getProfileAuthPath(profilesRootDir, storageDirName)))) {
    return 'missing';
  }

  return 'ok';
};

const sortProfiles = (profiles: ProfileSummary[]): ProfileSummary[] =>
  [...profiles].sort((left, right) => {
    if (left.manuallyDisabled !== right.manuallyDisabled) {
      return left.manuallyDisabled ? 1 : -1;
    }

    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    if (left.authStatus !== right.authStatus) {
      return left.authStatus === 'ok' ? -1 : 1;
    }

    const leftWeeklyRemaining = getQuotaRemainingPercent(left.weeklyQuota);
    const rightWeeklyRemaining = getQuotaRemainingPercent(right.weeklyQuota);
    if (leftWeeklyRemaining !== rightWeeklyRemaining) {
      if (leftWeeklyRemaining === null) {
        return 1;
      }

      if (rightWeeklyRemaining === null) {
        return -1;
      }

      return rightWeeklyRemaining - leftWeeklyRemaining;
    }

    const leftDate = getProfileRecentLoginSortStamp(left);
    const rightDate = getProfileRecentLoginSortStamp(right);
    return rightDate.localeCompare(leftDate) || left.name.localeCompare(right.name, 'zh-CN');
  });

const reconcileProfiles = async (
  profilesRootDir: string,
  profilesFile: ProfilesFile,
): Promise<{ changed: boolean; profilesFile: ProfilesFile }> => {
  const nextProfiles = [...profilesFile.profiles];
  const knownDirs = new Set(nextProfiles.map((profile) => profile.storageDirName));
  const entries = await fs.readdir(profilesRootDir, { withFileTypes: true });
  let changed = false;

  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      entry.name === BACKUP_DIR_NAME ||
      entry.name.startsWith('.')
    ) {
      continue;
    }

    const authFilePath = getProfileAuthPath(profilesRootDir, entry.name);
    if (!(await fs.pathExists(authFilePath)) || knownDirs.has(entry.name)) {
      continue;
    }

    const importedAt = await getImportedProfileTimestamp(authFilePath);
    nextProfiles.push({
      id: nanoid(10),
      storageDirName: entry.name,
      name: entry.name,
      workspaceName: null,
      notes: '',
      planType: 'Unknown',
      manuallyDisabled: false,
      weeklyQuota: defaultQuota(),
      fiveHourQuota: defaultQuota(),
      reviewQuota: defaultQuota(),
      createdAt: importedAt,
      updatedAt: importedAt,
      usageUpdatedAt: null,
      usageError: null,
      lastActivatedAt: null,
    });
    knownDirs.add(entry.name);
    changed = true;
  }

  return {
    changed,
    profilesFile: {
      version: 2,
      profiles: nextProfiles,
    },
  };
};

const makeUniqueStorageDirName = async (profilesRootDir: string, preferredName: string): Promise<string> => {
  const baseName = sanitizeStorageDirName(preferredName);
  let candidate = baseName;
  let index = 1;

  while (await fs.pathExists(path.join(profilesRootDir, candidate))) {
    index += 1;
    candidate = `${baseName}-${index}`;
  }

  return candidate;
};

const materializeProfiles = async (
  profilesRootDir: string,
  storedProfiles: StoredProfile[],
): Promise<ProfileSummary[]> => {
  const currentAuthHash = await hashFile(CURRENT_AUTH_PATH);

  return Promise.all(
    storedProfiles.map(async (profile) => {
      const authFilePath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
      const authStatus = await resolveAuthStatus(profilesRootDir, profile.storageDirName);
      const profileHash = authStatus === 'ok' ? await hashFile(authFilePath) : null;
      const hints =
        authStatus === 'ok'
          ? await detectAuthFileHints(authFilePath)
          : { planType: 'Unknown' as PlanType, defaultName: null, workspaceName: null, accountId: null };
      const resolvedName = normalizeText(profile.name);

      return {
        ...profile,
        name: resolvedName || hints.defaultName || profile.storageDirName,
        workspaceName: normalizeText(profile.workspaceName) || hints.workspaceName,
        planType: profile.planType === 'Unknown' ? hints.planType : profile.planType,
        manuallyDisabled: profile.manuallyDisabled,
        authFilePath,
        authStatus,
        isActive: authStatus === 'ok' && !!currentAuthHash && currentAuthHash === profileHash,
      };
    }),
  );
};

const findProfileByAuthHash = async (
  profilesRootDir: string,
  storedProfiles: StoredProfile[],
  sourcePath: string,
): Promise<StoredProfile | null> => {
  const sourceHash = await hashFile(sourcePath);
  if (!sourceHash) {
    return null;
  }

  for (const profile of storedProfiles) {
    const targetPath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
    const targetHash = await hashFile(targetPath);
    if (targetHash && targetHash === sourceHash) {
      return profile;
    }
  }

  return null;
};

const createCurrentAuthStoredProfile = (
  storageDirName: string,
  hints?: AuthFileHints,
  importedAt?: string | null,
): StoredProfile => {
  const now = importedAt ?? new Date().toISOString();
  const fallbackName = `当前登录 ${new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(now))}`;

  return {
    id: nanoid(10),
    storageDirName,
    name: hints?.defaultName || fallbackName,
    workspaceName: hints?.workspaceName ?? null,
    notes: '由当前 %USERPROFILE%\\.codex\\auth.json 自动导入。',
    planType: hints?.planType ?? 'Unknown',
    manuallyDisabled: false,
    weeklyQuota: defaultQuota(),
    fiveHourQuota: defaultQuota(),
    reviewQuota: defaultQuota(),
    createdAt: now,
    updatedAt: now,
    usageUpdatedAt: null,
    usageError: null,
    lastActivatedAt: null,
  };
};

const ensureCurrentAuthImportedIfNeeded = async (
  profilesRootDir: string,
  profilesFile: ProfilesFile,
): Promise<{ changed: boolean; profilesFile: ProfilesFile }> => {
  if (!(await fs.pathExists(CURRENT_AUTH_PATH))) {
    return { changed: false, profilesFile };
  }

  const matchedProfile = await findProfileByAuthHash(
    profilesRootDir,
    profilesFile.profiles,
    CURRENT_AUTH_PATH,
  );

  if (matchedProfile || profilesFile.profiles.length > 0) {
    return { changed: false, profilesFile };
  }

  const storageDirName = await makeUniqueStorageDirName(profilesRootDir, 'current-auth');
  const targetDir = path.join(profilesRootDir, storageDirName);
  await fs.ensureDir(targetDir);
  await fs.copy(CURRENT_AUTH_PATH, getProfileAuthPath(profilesRootDir, storageDirName), {
    overwrite: true,
  });
  const hints = await detectAuthFileHints(CURRENT_AUTH_PATH);
  const importedAt = await getImportedProfileTimestamp(CURRENT_AUTH_PATH);

  const nextProfilesFile: ProfilesFile = {
    version: profilesFile.version,
    profiles: [
      ...profilesFile.profiles,
      createCurrentAuthStoredProfile(storageDirName, hints, importedAt),
    ],
  };

  await writeProfilesFile(profilesRootDir, nextProfilesFile);
  await appendActivityLog(
    profilesRootDir,
    'info',
    '检测到当前 .codex\\auth.json，已自动纳入 profiles。',
  );

  return {
    changed: true,
    profilesFile: nextProfilesFile,
  };
};

const quotaHasSignal = (quota: UsageQuota): boolean =>
  Boolean(quota.configured) ||
  quota.source === 'detected' ||
  quota.source === 'live' ||
  quota.percentUsed > 0 ||
  Boolean(quota.resetAt) ||
  Boolean(normalizeText(quota.label));

const getProfileRank = (profile: StoredProfile): number => {
  let score = 0;

  if (normalizeText(profile.name) && normalizeText(profile.name) !== profile.storageDirName) {
    score += 3;
  }

  if (normalizeText(profile.notes)) {
    score += 2;
  }

  if (profile.planType !== 'Unknown') {
    score += 2;
  }

  if (quotaHasSignal(profile.weeklyQuota)) {
    score += 1;
  }

  if (quotaHasSignal(profile.fiveHourQuota)) {
    score += 1;
  }

  if (quotaHasSignal(profile.reviewQuota)) {
    score += 1;
  }

  if (profile.lastActivatedAt) {
    score += 2;
  }

  return score;
};

const pickPreferredProfile = (left: StoredProfile, right: StoredProfile): StoredProfile => {
  const leftScore = getProfileRank(left);
  const rightScore = getProfileRank(right);

  if (leftScore !== rightScore) {
    return leftScore > rightScore ? left : right;
  }

  const leftStamp = getProfileRecentLoginSortStamp(left);
  const rightStamp = getProfileRecentLoginSortStamp(right);

  return leftStamp >= rightStamp ? left : right;
};

const dedupeProfilesByAuthHash = async (
  profilesRootDir: string,
  profilesFile: ProfilesFile,
): Promise<{ changed: boolean; profilesFile: ProfilesFile }> => {
  const hashOwners = new Map<string, StoredProfile>();
  const duplicateIds = new Set<string>();
  let changed = false;

  for (const profile of profilesFile.profiles) {
    const authPath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
    const authHash = await hashFile(authPath);

    if (!authHash) {
      continue;
    }

    const existing = hashOwners.get(authHash);
    if (!existing) {
      hashOwners.set(authHash, profile);
      continue;
    }

    const preferred = pickPreferredProfile(existing, profile);
    const duplicate = preferred.id === existing.id ? profile : existing;

    hashOwners.set(authHash, preferred);
    duplicateIds.add(duplicate.id);
    changed = true;

    if (duplicate.storageDirName.startsWith('current-auth')) {
      const duplicateDir = getProfileDirPath(profilesRootDir, duplicate.storageDirName);
      if (isPathInside(profilesRootDir, duplicateDir) && (await fs.pathExists(duplicateDir))) {
        await fs.remove(duplicateDir);
      }
    }
  }

  if (!changed) {
    return { changed: false, profilesFile };
  }

  return {
    changed: true,
    profilesFile: {
      version: profilesFile.version,
      profiles: profilesFile.profiles.filter((profile) => !duplicateIds.has(profile.id)),
    },
  };
};

const readBackupEntries = async (profilesRootDir: string): Promise<BackupEntry[]> => {
  const backupDir = getBackupDirPath(profilesRootDir);
  await fs.ensureDir(backupDir);

  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(backupDir, entry.name);
        const stat = await fs.stat(filePath);

        return {
          name: entry.name,
          filePath,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
        } satisfies BackupEntry;
      }),
  );

  return files.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 20);
};

const syncUsageIntoProfilesFile = async (
  profilesRootDir: string,
  profilesFile: ProfilesFile,
  targetProfileId?: string,
): Promise<{
  changed: boolean;
  profilesFile: ProfilesFile;
  syncedProfiles: number;
  failedProfiles: number;
}> => {
  let changed = false;
  let syncedProfiles = 0;
  let failedProfiles = 0;
  const usageSnapshotCache = new Map<string, Promise<LiveUsageSnapshot | null>>();

  const getUsageSnapshot = async (
    authPath: string,
    hints: AuthFileHints,
  ): Promise<LiveUsageSnapshot | null> => {
    const authHash = await hashFile(authPath);
    const cacheKey = authHash ?? authPath;
    const cachedPromise = usageSnapshotCache.get(cacheKey);

    if (cachedPromise) {
      return cachedPromise;
    }

    const nextPromise = fetchLiveUsageSnapshot(authPath, hints);
    usageSnapshotCache.set(cacheKey, nextPromise);
    return nextPromise;
  };

  const processProfile = async (
    profile: StoredProfile,
  ): Promise<{ changed: boolean; synced: number; failed: number }> => {
    let profileChanged = false;
    const authPath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
    if (!(await fs.pathExists(authPath))) {
      return {
        changed: false,
        synced: 0,
        failed: 0,
      };
    }

    const hints = await detectAuthFileHints(authPath);
    if (!normalizeText(profile.workspaceName) && hints.workspaceName) {
      profile.workspaceName = hints.workspaceName;
      profileChanged = true;
    }

    if (profile.planType === 'Unknown' && hints.planType !== 'Unknown') {
      profile.planType = hints.planType;
      profileChanged = true;
    }

    try {
      const snapshot = await getUsageSnapshot(authPath, hints);
      if (!snapshot) {
        return {
          changed: profileChanged,
          synced: 0,
          failed: 0,
        };
      }

      if (snapshot.weeklyQuota) {
        profile.weeklyQuota = snapshot.weeklyQuota;
      }

      if (snapshot.fiveHourQuota) {
        profile.fiveHourQuota = snapshot.fiveHourQuota;
      }

      if (snapshot.planType !== 'Unknown') {
        profile.planType = snapshot.planType;
      }

      profile.usageUpdatedAt = new Date().toISOString();
      profile.usageError = null;
      return {
        changed: true,
        synced: 1,
        failed: 0,
      };
    } catch (error) {
      profile.usageError = error instanceof Error ? error.message : '额度同步失败';
      return {
        changed: true,
        synced: 0,
        failed: 1,
      };
    }
  };

  const pendingProfiles = profilesFile.profiles.filter(
    (profile) => !targetProfileId || profile.id === targetProfileId,
  );

  if (pendingProfiles.length > 0) {
    const queue = [...pendingProfiles];
    const workerCount = Math.min(USAGE_SYNC_CONCURRENCY, pendingProfiles.length);
    const workerResults = await Promise.all(
      Array.from({ length: workerCount }, async () => {
        const results: Array<{ changed: boolean; synced: number; failed: number }> = [];

        while (queue.length > 0) {
          const nextProfile = queue.shift();
          if (!nextProfile) {
            continue;
          }

          results.push(await processProfile(nextProfile));
        }

        return results;
      }),
    );

    for (const results of workerResults) {
      for (const result of results) {
        changed = changed || result.changed;
        syncedProfiles += result.synced;
        failedProfiles += result.failed;
      }
    }
  }

  return {
    changed,
    profilesFile,
    syncedProfiles,
    failedProfiles,
  };
};

const syncTargetProfileUsageWithRetries = async (
  profilesRootDir: string,
  profilesFile: ProfilesFile,
  targetProfileId: string,
  options?: {
    attempts?: number;
    delayMs?: number;
  },
): Promise<{
  changed: boolean;
  profilesFile: ProfilesFile;
  syncedProfiles: number;
  failedProfiles: number;
}> => {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const delayMs = Math.max(500, options?.delayMs ?? 1_800);
  let lastResult = await syncUsageIntoProfilesFile(profilesRootDir, profilesFile, targetProfileId);

  for (let attempt = 2; attempt <= attempts; attempt += 1) {
    if (lastResult.syncedProfiles > 0) {
      return lastResult;
    }

    await wait(delayMs);
    lastResult = await syncUsageIntoProfilesFile(
      profilesRootDir,
      lastResult.profilesFile,
      targetProfileId,
    );
  }

  return lastResult;
};

const buildSummary = async (
  profiles: ProfileSummary[],
  settings: AppSettings,
  currentAuthExists: boolean,
  currentAuthHints?: AuthFileHints | null,
): Promise<AppSummary> => {
  const openclawStateDir = resolveOpenClawStateDir(settings);
  const openclawGatewayCommandPath = getOpenClawGatewayCommandPath(openclawStateDir);
  const [runningProcesses, openclawConfig, openclawRuntimeCatalog] = await Promise.all([
    listManagedDesktopProcesses(),
    readJsonIfExists<OpenClawConfig>(getOpenClawConfigPath(openclawStateDir)),
    readJsonIfExists<OpenClawModelsCatalog>(getOpenClawModelsCatalogPath(openclawStateDir)),
  ]);
  const codexExecutable = await resolveManagedDesktopExecutable('codex', settings, runningProcesses);
  const traeExecutable = await resolveManagedDesktopExecutable('trae', settings, runningProcesses);
  const openclawCurrentModel = getOpenClawCurrentModel(openclawConfig);
  const openclawAvailableModels = buildOpenClawAvailableModels(
    openclawConfig,
    openclawRuntimeCatalog,
  );
  const activeProfile = profiles.find((profile) => profile.isActive) ?? null;
  const lastSwitchedAt = profiles
    .map((profile) => profile.lastActivatedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? null;

  const usedValues = profiles
    .flatMap((profile) => [profile.weeklyQuota, profile.fiveHourQuota, profile.reviewQuota])
    .filter((quota) => quota.configured || quota.source === 'detected' || quota.source === 'live')
    .map((quota) => 100 - quota.percentUsed);

  const overallRemainingPercent =
    usedValues.length > 0
      ? Math.round(usedValues.reduce((total, value) => total + value, 0) / usedValues.length)
      : null;

  return {
    activeProfileName: activeProfile?.name ?? null,
    currentAuthExists,
    authRecognized: Boolean(activeProfile),
    currentAuthSuggestedName: currentAuthHints?.defaultName ?? null,
    currentAuthSuggestedWorkspaceName: currentAuthHints?.workspaceName ?? null,
    currentAuthSuggestedPlanType: currentAuthHints?.planType ?? 'Unknown',
    profilesCount: profiles.length,
    backupBeforeSwitch: settings.backupBeforeSwitch,
    lastSwitchedAt,
    overallRemainingPercent,
    currentAuthPath: CURRENT_AUTH_PATH,
    codexExecutablePath: codexExecutable.path,
    codexExecutablePathSource: codexExecutable.source,
    traeExecutablePath: traeExecutable.path,
    traeExecutablePathSource: traeExecutable.source,
    openclawStateDir,
    openclawGatewayCommandPath,
    openclawGatewayAvailable: fs.existsSync(openclawGatewayCommandPath),
    openclawCurrentModel,
    openclawAvailableModels,
  };
};

const loadProfilesState = async (options?: { syncUsage?: boolean }): Promise<ProfilesState> => {
  const settings = await readSettings();
  const profilesFile = await readProfilesFile(settings.profilesRootDir);
  const { changed, profilesFile: reconciledFile } = await reconcileProfiles(
    settings.profilesRootDir,
    profilesFile,
  );
  const deduped = await dedupeProfilesByAuthHash(settings.profilesRootDir, reconciledFile);
  const autoImported = await ensureCurrentAuthImportedIfNeeded(
    settings.profilesRootDir,
    deduped.profilesFile,
  );

  let workingProfilesFile = autoImported.profilesFile;
  let shouldWriteProfiles =
    changed || deduped.changed || autoImported.changed;

  if (options?.syncUsage) {
    const syncResult = await syncUsageIntoProfilesFile(settings.profilesRootDir, workingProfilesFile);
    workingProfilesFile = syncResult.profilesFile;
    shouldWriteProfiles = shouldWriteProfiles || syncResult.changed;

    if (syncResult.syncedProfiles > 0) {
      await appendActivityLog(
        settings.profilesRootDir,
        'success',
        `已同步 ${syncResult.syncedProfiles} 个 profile 的实时额度。`,
      );
    } else if (syncResult.failedProfiles > 0) {
      await appendActivityLog(
        settings.profilesRootDir,
        'warn',
        `额度同步失败 ${syncResult.failedProfiles} 个 profile，请稍后重试。`,
      );
    }
  }

  if (shouldWriteProfiles) {
    await writeProfilesFile(settings.profilesRootDir, workingProfilesFile);
  }

  const profiles = sortProfiles(
    await materializeProfiles(settings.profilesRootDir, workingProfilesFile.profiles),
  );
  const logFile = await readActivityLogFile(settings.profilesRootDir);
  const backups = await readBackupEntries(settings.profilesRootDir);
  const currentAuthExists = await fs.pathExists(CURRENT_AUTH_PATH);
  const currentAuthHints = currentAuthExists ? await detectAuthFileHints(CURRENT_AUTH_PATH) : null;

  return {
    profiles,
    settings,
    lastScannedAt: new Date().toISOString(),
    logs: logFile.logs,
    backups,
    summary: await buildSummary(profiles, settings, currentAuthExists, currentAuthHints),
  };
};

export const getProfilesState = async (): Promise<ProfilesState> => loadProfilesState();

export const refreshProfilesState = async (): Promise<ProfilesState> =>
  loadProfilesState({ syncUsage: true });

export const syncProfilesUsage = async (): Promise<SyncUsageResult> => {
  const state = await refreshProfilesState();
  const syncedProfiles = state.profiles.filter(
    (profile) =>
      profile.weeklyQuota.source === 'live' ||
      profile.fiveHourQuota.source === 'live',
  ).length;

  return {
    state,
    syncedProfiles,
    message:
      syncedProfiles > 0
        ? `已同步 ${syncedProfiles} 个 profile 的实时额度。`
        : '没有同步到新的实时额度，已保留现有显示。',
  };
};

export const importCurrentAuthProfile = async (): Promise<ImportCurrentAuthResult> => {
  const settings = await readSettings();
  const profilesRootDir = settings.profilesRootDir;

  if (!(await fs.pathExists(CURRENT_AUTH_PATH))) {
    throw new Error('当前 .codex 目录下没有找到 auth.json。');
  }

  const profilesFile = await readProfilesFile(profilesRootDir);
  const matchedProfile = await findProfileByAuthHash(
    profilesRootDir,
    profilesFile.profiles,
    CURRENT_AUTH_PATH,
  );

  if (matchedProfile) {
    await appendActivityLog(
      profilesRootDir,
      'info',
      `当前 auth.json 已存在于 profile：${matchedProfile.name}`,
    );
    return {
      state: await getProfilesState(),
      importedProfileId: matchedProfile.id,
      message: `当前 auth.json 已经纳入 profile：${matchedProfile.name}`,
    };
  }

  const storageDirName = await makeUniqueStorageDirName(profilesRootDir, 'current-auth');
  const targetDir = path.join(profilesRootDir, storageDirName);
  await fs.ensureDir(targetDir);
  await fs.copy(CURRENT_AUTH_PATH, getProfileAuthPath(profilesRootDir, storageDirName), {
    overwrite: true,
  });
  const hints = await detectAuthFileHints(CURRENT_AUTH_PATH);
  const importedAt = await getImportedProfileTimestamp(CURRENT_AUTH_PATH);

  const nextProfile = createCurrentAuthStoredProfile(storageDirName, hints, importedAt);

  profilesFile.profiles.push(nextProfile);
  await syncUsageIntoProfilesFile(profilesRootDir, profilesFile, nextProfile.id);
  await writeProfilesFile(profilesRootDir, profilesFile);
  await appendActivityLog(profilesRootDir, 'success', `已从当前 .codex 导入 profile：${nextProfile.name}`);

  return {
    state: await getProfilesState(),
    importedProfileId: nextProfile.id,
    message: `已导入当前 auth.json：${nextProfile.name}`,
  };
};

export const addProfile = async (input: AddProfileInput): Promise<ProfilesState> => {
  const settings = await readSettings();
  const profilesRootDir = settings.profilesRootDir;
  const sourcePath = path.resolve(input.authSourcePath);

  if (!(await fs.pathExists(sourcePath))) {
    throw new Error('未找到选中的 auth.json 文件。');
  }

  if (path.basename(sourcePath).toLowerCase() !== AUTH_FILE_NAME) {
    throw new Error('请选择名为 auth.json 的文件。');
  }

  const profilesFile = await readProfilesFile(profilesRootDir);
  const detectedHints = await detectAuthFileHints(sourcePath);
  const importedAt = await getImportedProfileTimestamp(sourcePath);
  let storageDirName = '';

  if (isPathInside(profilesRootDir, sourcePath)) {
    storageDirName = path.basename(path.dirname(sourcePath));
  } else {
    storageDirName = await makeUniqueStorageDirName(profilesRootDir, input.name || 'profile');
    const targetDir = path.join(profilesRootDir, storageDirName);
    await fs.ensureDir(targetDir);
    await fs.copy(sourcePath, getProfileAuthPath(profilesRootDir, storageDirName), {
      overwrite: true,
    });
  }

  const nextProfile: StoredProfile = {
    id: nanoid(10),
    storageDirName,
    name: normalizeText(input.name) || detectedHints.defaultName || storageDirName,
    workspaceName: normalizeText(input.workspaceName) || detectedHints.workspaceName || null,
    notes: normalizeText(input.notes),
    planType:
      normalizePlanType(input.planType) === 'Unknown'
        ? detectedHints.planType
        : normalizePlanType(input.planType),
    manuallyDisabled: input.manuallyDisabled,
    weeklyQuota: normalizeQuota(input.weeklyQuota),
    fiveHourQuota: normalizeQuota(input.fiveHourQuota),
    reviewQuota: normalizeQuota(input.reviewQuota),
    createdAt: importedAt,
    updatedAt: importedAt,
    usageUpdatedAt: null,
    usageError: null,
    lastActivatedAt: null,
  };

  const existingIndex = profilesFile.profiles.findIndex(
    (profile) => profile.storageDirName === storageDirName,
  );

  if (existingIndex >= 0) {
    const existingProfile = profilesFile.profiles[existingIndex];
    nextProfile.id = existingProfile.id;
    nextProfile.createdAt = existingProfile.createdAt;
    nextProfile.notes = normalizeText(input.notes) || existingProfile.notes;
    nextProfile.usageUpdatedAt = existingProfile.usageUpdatedAt;
    nextProfile.usageError = existingProfile.usageError;
    nextProfile.lastActivatedAt = existingProfile.lastActivatedAt;
    profilesFile.profiles[existingIndex] = nextProfile;
  } else {
    profilesFile.profiles.push(nextProfile);
  }

  await syncUsageIntoProfilesFile(profilesRootDir, profilesFile, nextProfile.id);
  await writeProfilesFile(profilesRootDir, profilesFile);
  await appendActivityLog(profilesRootDir, 'success', `已导入 profile：${nextProfile.name}`);
  return getProfilesState();
};

export const updateProfile = async (input: UpdateProfileInput): Promise<ProfilesState> => {
  const settings = await readSettings();
  const profilesRootDir = settings.profilesRootDir;
  const profilesFile = await readProfilesFile(profilesRootDir);
  const profile = profilesFile.profiles.find((item) => item.id === input.id);

  if (!profile) {
    throw new Error('未找到要编辑的 profile。');
  }

  if (input.authSourcePath) {
    const sourcePath = path.resolve(input.authSourcePath);
    const targetPath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
    if (!(await fs.pathExists(sourcePath))) {
      throw new Error('新的 auth.json 文件不存在。');
    }

    if (!isSameResolvedPath(sourcePath, targetPath)) {
      await fs.copy(sourcePath, targetPath, {
        overwrite: true,
      });
    }
  }

  profile.name = normalizeText(input.name) || profile.name;
  profile.workspaceName =
    input.workspaceName !== undefined
      ? normalizeText(input.workspaceName) || null
      : profile.workspaceName;
  profile.notes = input.notes !== undefined ? normalizeText(input.notes) : profile.notes;
  profile.planType =
    input.planType !== undefined ? normalizePlanType(input.planType) : profile.planType;
  profile.manuallyDisabled =
    input.manuallyDisabled !== undefined ? input.manuallyDisabled : profile.manuallyDisabled;
  profile.weeklyQuota =
    input.weeklyQuota !== undefined ? normalizeQuota(input.weeklyQuota) : profile.weeklyQuota;
  profile.fiveHourQuota =
    input.fiveHourQuota !== undefined
      ? normalizeQuota(input.fiveHourQuota)
      : profile.fiveHourQuota;
  profile.reviewQuota =
    input.reviewQuota !== undefined ? normalizeQuota(input.reviewQuota) : profile.reviewQuota;

  await syncUsageIntoProfilesFile(profilesRootDir, profilesFile, profile.id);
  await writeProfilesFile(profilesRootDir, profilesFile);
  await appendActivityLog(profilesRootDir, 'info', `已更新 profile：${profile.name}`);
  return getProfilesState();
};

export const deleteProfile = async (input: DeleteProfileInput): Promise<ProfilesState> => {
  const settings = await readSettings();
  const profilesRootDir = settings.profilesRootDir;
  const profilesFile = await readProfilesFile(profilesRootDir);
  const profile = profilesFile.profiles.find((item) => item.id === input.profileId);

  if (!profile) {
    throw new Error('未找到要删除的 profile。');
  }

  await backupDeletedProfile(profilesRootDir, profile, input.removeFiles);
  profilesFile.profiles = profilesFile.profiles.filter((item) => item.id !== input.profileId);
  await writeProfilesFile(profilesRootDir, profilesFile);

  if (input.removeFiles) {
    const profileDir = path.join(profilesRootDir, profile.storageDirName);
    if (isPathInside(profilesRootDir, profileDir) && (await fs.pathExists(profileDir))) {
      await fs.remove(profileDir);
    }
  }

  await appendActivityLog(
    profilesRootDir,
    'warn',
    input.removeFiles
      ? `已删除 profile 及本地文件：${profile.name}`
      : `已删除 profile 元数据：${profile.name}`,
  );
  return getProfilesState();
};

export const activateProfile = async (
  input: SwitchProfileInput,
  reportProgress?: SwitchProgressReporter,
): Promise<ActivateProfileResult> => {
  const settings = await readSettings();
  const profilesRootDir = settings.profilesRootDir;
  const profilesFile = await readProfilesFile(profilesRootDir);
  const profileId = normalizeText(input.profileId);
  const emitProgress = createSwitchProgressEmitter(input, settings.switchMode, profileId, reportProgress);
  const profile = profilesFile.profiles.find((item) => item.id === profileId);

  try {
    emitProgress('prepare', '准备切换', '正在准备目标空间和认证文件。', 'active');

    if (!profile) {
      throw new Error('未找到要切换的 profile。');
    }

    if (profile.manuallyDisabled) {
      throw new Error('该 profile 已被手动标记为停用，无法切换。');
    }

    const sourcePath = getProfileAuthPath(profilesRootDir, profile.storageDirName);
    if (!(await fs.pathExists(sourcePath))) {
      throw new Error('该 profile 的 auth.json 已丢失，无法切换。');
    }

    await fs.ensureDir(path.dirname(CURRENT_AUTH_PATH));

    let backupPath: string | null = null;
    if (settings.backupBeforeSwitch && (await fs.pathExists(CURRENT_AUTH_PATH))) {
      const backupDir = path.join(profilesRootDir, BACKUP_DIR_NAME);
      await fs.ensureDir(backupDir);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = path.join(backupDir, `${timestamp}-${profile.storageDirName}.json`);
      await fs.copy(CURRENT_AUTH_PATH, backupPath, { overwrite: false });
      await appendActivityLog(
        profilesRootDir,
        'info',
        `已备份当前 auth.json：${path.basename(backupPath)}`,
      );
    }

    emitProgress('switch-auth', '空间切换', `正在切换到 ${profile.name} 的认证。`, 'active');
    await fs.copy(sourcePath, CURRENT_AUTH_PATH, { overwrite: true });
    emitProgress('switch-auth', '空间切换', `空间切换成功，已写入 ${profile.name} 的认证。`, 'success');

    let codexTraeAutoRestart = false;
    let restartedDesktopApps: string[] = [];
    let openclawSynced = false;
    let openclawGatewayRestarted = false;
    let openclawModel: string | null = null;
    let openclawModelChanged = false;
    const warnings: string[] = [];

    if (settings.switchMode === 'codex') {
      if (settings.codexTraeAutoRestart) {
        codexTraeAutoRestart = true;
        const restartResult = await restartManagedDesktopApps(settings, emitProgress);
        restartedDesktopApps = restartResult.restartedApps;
        warnings.push(...restartResult.warnings);

        if (restartResult.restartedApps.length > 0) {
          await appendActivityLog(
            profilesRootDir,
            'success',
            `已自动重启：${restartResult.restartedApps.join(' / ')}`,
          );
        }
      } else {
        emitProgress(
          'desktop-start',
          '启动 Codex / Trae',
          '当前未开启自动重启，空间切换后请手动重启 Codex / Trae。',
          'warning',
        );
      }
    } else {
      emitProgress('openclaw-sync', '同步 OpenClaw 认证', '正在同步 OpenClaw 认证。', 'active');
      const syncResult = await syncCodexAuthIntoOpenClaw(settings);
      openclawSynced = syncResult.synced;
      warnings.push(...syncResult.warnings);

      emitProgress(
        'openclaw-sync',
        '同步 OpenClaw 认证',
        syncResult.synced
          ? 'OpenClaw 认证同步成功。'
          : syncResult.warnings[0] ?? 'OpenClaw 认证未同步。',
        syncResult.synced ? 'success' : 'warning',
      );

      if (syncResult.synced) {
        await appendActivityLog(
          profilesRootDir,
          'success',
          `已同步 OpenClaw 认证：${syncResult.stateDir}`,
        );
      } else if (syncResult.warnings.length > 0) {
        await appendActivityLog(
          profilesRootDir,
          'warn',
          `OpenClaw 同步未完成：${syncResult.warnings[0]}`,
        );
      }

      emitProgress('openclaw-model', '切换 OpenClaw 模型', '正在处理 OpenClaw 模型设置。', 'active');
      const modelResult = await applyOpenClawModelSelection(settings, input.openclawModel);
      openclawModel = modelResult.appliedModel;
      openclawModelChanged = modelResult.changed;
      warnings.push(...modelResult.warnings);

      emitProgress(
        'openclaw-model',
        '切换 OpenClaw 模型',
        modelResult.changed && modelResult.appliedModel
          ? `模型切换成功：${modelResult.appliedModel}`
          : modelResult.warnings[0] ?? '本次沿用当前 OpenClaw 模型。',
        modelResult.changed ? 'success' : modelResult.warnings.length > 0 ? 'warning' : 'success',
      );

      if (modelResult.changed && modelResult.appliedModel) {
        await appendActivityLog(
          profilesRootDir,
          'success',
          `已切换 OpenClaw 模型：${modelResult.appliedModel}`,
        );
      } else if (modelResult.warnings.length > 0) {
        await appendActivityLog(
          profilesRootDir,
          'warn',
          `OpenClaw 模型切换未完成：${modelResult.warnings[0]}`,
        );
      }

      if (settings.openclawAutoRestartGateway) {
        emitProgress('openclaw-gateway', '重启 OpenClaw 网关', '正在重启 OpenClaw 网关。', 'active');
        const restartResult = await restartOpenClawGateway(settings);
        openclawGatewayRestarted = restartResult.restarted;
        warnings.push(...restartResult.warnings);

        emitProgress(
          'openclaw-gateway',
          '重启 OpenClaw 网关',
          restartResult.restarted
            ? 'OpenClaw 网关已自动重启。'
            : restartResult.warnings[0] ?? 'OpenClaw 网关未自动重启。',
          restartResult.restarted ? 'success' : 'warning',
        );

        if (restartResult.restarted) {
          await appendActivityLog(profilesRootDir, 'success', '已自动重启 OpenClaw 网关。');
        } else if (restartResult.warnings.length > 0) {
          await appendActivityLog(
            profilesRootDir,
            'warn',
            `OpenClaw 网关重启未完成：${restartResult.warnings[0]}`,
          );
        }
      }
    }

    const activatedAt = new Date().toISOString();
    profile.lastActivatedAt = activatedAt;
    profile.updatedAt = activatedAt;

    if (settings.switchMode === 'codex') {
      await wait(settings.codexTraeAutoRestart ? 1_500 : 700);
      try {
        await fs.copy(CURRENT_AUTH_PATH, sourcePath, { overwrite: true });
      } catch {
        warnings.push('切换后回写最新认证失败，可能需要稍后重新同步额度。');
      }
    }

    emitProgress('quota-sync', '同步空间额度', '正在同步当前空间额度。', 'active');
    const quotaSyncResult = await syncTargetProfileUsageWithRetries(
      profilesRootDir,
      profilesFile,
      profile.id,
      {
        attempts: settings.switchMode === 'codex' ? 4 : 3,
        delayMs: settings.switchMode === 'codex' ? 2_000 : 1_500,
      },
    );

    if (quotaSyncResult.syncedProfiles > 0) {
      emitProgress('quota-sync', '同步空间额度', '当前空间额度已同步完成。', 'success');
    } else {
      const quotaWarning = '切换后暂未拉到实时额度，已保留原有配额显示。';
      warnings.push(quotaWarning);
      emitProgress('quota-sync', '同步空间额度', quotaWarning, 'warning');
    }

    await writeProfilesFile(profilesRootDir, quotaSyncResult.profilesFile);
    await appendActivityLog(profilesRootDir, 'success', `已切换到 profile：${profile.name}`);
    emitProgress(
      'complete',
      '切换完成',
      restartedDesktopApps.length > 0
        ? `空间切换成功，${restartedDesktopApps.join(' / ')} 已启动。`
        : '空间切换成功，可以开始使用。',
      'success',
    );

    return {
      state: await getProfilesState(),
      targetAuthPath: CURRENT_AUTH_PATH,
      backupPath,
      activatedAt,
      message:
        settings.switchMode === 'openclaw'
          ? openclawModel
            ? `切换完成，OpenClaw 认证已同步，模型已切到 ${openclawModel}；如未自动恢复，可手动重启网关。`
            : '切换完成，请确认 OpenClaw 已刷新认证；如未自动恢复，可手动重启网关。'
          : settings.codexTraeAutoRestart
            ? restartedDesktopApps.length > 0
              ? `切换完成，已自动重启：${restartedDesktopApps.join(' / ')}。`
              : '切换完成，未检测到需要重启的 Codex / Trae 运行实例。'
            : '切换完成，请重启 Codex CLI / VSCode 插件。',
      switchMode: settings.switchMode,
      codexTraeAutoRestart,
      restartedDesktopApps,
      openclawSynced,
      openclawGatewayRestarted,
      openclawModel,
      openclawModelChanged,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '切换 profile 失败。';
    emitProgress('complete', '切换失败', message, 'error');
    throw error;
  }
};

export const setProfilesRootDir = async (profilesRootDir: string): Promise<ProfilesState> => {
  const currentSettings = await readSettings();
  const nextProfilesRootDir = path.resolve(normalizeText(profilesRootDir) || DEFAULT_PROFILES_ROOT);

  await ensureProfilesRoot(nextProfilesRootDir);
  await writeSettings({
    ...currentSettings,
    profilesRootDir: nextProfilesRootDir,
  });
  await appendActivityLog(nextProfilesRootDir, 'info', `根目录已切换到：${nextProfilesRootDir}`);

  return getProfilesState();
};

export const updateAppSettings = async (input: UpdateAppSettingsInput): Promise<ProfilesState> => {
  const currentSettings = await readSettings();
  const nextSettings: AppSettings = {
    ...currentSettings,
    backupBeforeSwitch:
      input.backupBeforeSwitch ?? currentSettings.backupBeforeSwitch,
    switchMode:
      input.switchMode !== undefined
        ? normalizeSwitchMode(input.switchMode)
        : currentSettings.switchMode,
    lowQuotaWarningEnabled:
      input.lowQuotaWarningEnabled ?? currentSettings.lowQuotaWarningEnabled,
    lowQuotaWarningThreshold:
      input.lowQuotaWarningThreshold !== undefined
        ? normalizeThreshold(input.lowQuotaWarningThreshold)
        : currentSettings.lowQuotaWarningThreshold,
    codexExecutablePathOverride:
      input.codexExecutablePathOverride !== undefined
        ? normalizeText(input.codexExecutablePathOverride) || null
        : currentSettings.codexExecutablePathOverride,
    traeExecutablePathOverride:
      input.traeExecutablePathOverride !== undefined
        ? normalizeText(input.traeExecutablePathOverride) || null
        : currentSettings.traeExecutablePathOverride,
    codexTraeAutoRestart:
      input.codexTraeAutoRestart ?? currentSettings.codexTraeAutoRestart,
    openclawStateDirOverride:
      input.openclawStateDirOverride !== undefined
        ? normalizeText(input.openclawStateDirOverride) || null
        : currentSettings.openclawStateDirOverride,
    openclawAutoRestartGateway:
      input.openclawAutoRestartGateway ?? currentSettings.openclawAutoRestartGateway,
    autoSwitchEnabled: input.autoSwitchEnabled ?? currentSettings.autoSwitchEnabled,
    autoSwitchThreshold:
      input.autoSwitchThreshold !== undefined
        ? normalizeThreshold(input.autoSwitchThreshold)
        : currentSettings.autoSwitchThreshold,
    autoSwitchCountdownSeconds:
      input.autoSwitchCountdownSeconds !== undefined
        ? normalizeCountdownSeconds(input.autoSwitchCountdownSeconds)
        : currentSettings.autoSwitchCountdownSeconds,
  };

  await writeSettings(nextSettings);
  await appendActivityLog(
    nextSettings.profilesRootDir,
    'info',
    `已更新设置：模式 ${nextSettings.switchMode === 'openclaw' ? 'OpenClaw' : 'Codex'}，预警 ${nextSettings.lowQuotaWarningEnabled ? '开启' : '关闭'}，阈值 ${nextSettings.lowQuotaWarningThreshold}%`,
  );

  return getProfilesState();
};

export const getDefaultProfilesRootDir = (): string => DEFAULT_PROFILES_ROOT;
