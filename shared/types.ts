export const planTypes = ['Unknown', 'Free', 'Plus', 'Pro', 'Team', 'Business'] as const;
export const switchModes = ['codex', 'openclaw'] as const;
export const updateChannels = ['stable', 'beta', 'canary'] as const;

export type PlanType = (typeof planTypes)[number];
export type SwitchMode = (typeof switchModes)[number];
export type UpdateChannel = (typeof updateChannels)[number];
export type ExecutablePathSource = 'manual' | 'running' | 'common' | 'missing';
export type AuthFileStatus = 'ok' | 'missing' | 'path-error';
export type ActivityLogLevel = 'info' | 'success' | 'warn' | 'error';
export type SwitchProgressStatus = 'active' | 'success' | 'warning' | 'error';
export type UpdatePlatform = 'win' | 'mac' | 'unknown';
export type UpdateSourceName = 'github' | 'gitee' | 'custom';
export type UpdateAvailability =
  | 'idle'
  | 'checking'
  | 'unconfigured'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'required'
  | 'error';
export type UpdateKind = 'version' | 'patch' | null;
export type SwitchProgressStepKey =
  | 'prepare'
  | 'switch-auth'
  | 'desktop-stop'
  | 'desktop-start'
  | 'openclaw-sync'
  | 'openclaw-model'
  | 'openclaw-gateway'
  | 'quota-sync'
  | 'complete';

export interface OpenClawModelOption {
  key: string;
  label: string;
  provider: string;
  modelId: string;
}

export interface UpdateChannelOverride {
  channel: UpdateChannel;
  allowPrerelease: boolean;
  testerId: string | null;
  sourcePath: string;
}

export interface UpdateManifestMirrors {
  github?: string | null;
  gitee?: string | null;
}

export interface UpdateManifestWinPlatform {
  installerUrl: string;
  portableUrl?: string | null;
}

export interface UpdateManifestMacPlatform {
  dmgUrl: string;
  zipUrl?: string | null;
}

export interface UpdateManifestPlatforms {
  win?: UpdateManifestWinPlatform;
  mac?: UpdateManifestMacPlatform;
}

export interface UpdateManifest {
  appId: string;
  channel: UpdateChannel;
  version: string;
  minSupportedVersion: string | null;
  mandatory: boolean;
  releaseTime: string;
  notes: string | null;
  notesUrl: string | null;
  sha256: string;
  signature: string;
  mirrors: UpdateManifestMirrors;
  platforms: UpdateManifestPlatforms;
}

export interface UpdateState {
  appId: string;
  currentVersion: string;
  currentReleaseTime: string | null;
  currentPlatform: UpdatePlatform;
  channel: UpdateChannel;
  override: UpdateChannelOverride | null;
  allowPrerelease: boolean;
  testerId: string | null;
  availability: UpdateAvailability;
  updateAvailable: boolean;
  updateKind: UpdateKind;
  blockedByMandatory: boolean;
  mandatory: boolean;
  minSupportedVersion: string | null;
  lastCheckedAt: string | null;
  lastDownloadedAt: string | null;
  sourceName: UpdateSourceName | null;
  sourceUrl: string | null;
  errorMessage: string | null;
  manifest: UpdateManifest | null;
  downloadFilePath: string | null;
}

export interface UpdateActionResult {
  state: UpdateState;
  message: string;
}

export const authSessionStatuses = ['guest', 'authenticated'] as const;
export const licenseStatuses = ['inactive', 'active', 'expired', 'grace'] as const;
export const licenseDurationKeys = [
  'one-day',
  'one-week',
  'half-month',
  'one-month',
  'half-year',
  'permanent',
  'invite-permanent',
] as const;
export const hostLicenseDurationKeys = [
  'one-day',
  'one-week',
  'half-month',
  'one-month',
  'half-year',
  'permanent',
] as const;
export const inviteRecordStatuses = [
  'pending',
  'reward-ready',
  'claimed',
  'rejected',
  'redeemed',
] as const;
export const rewardRecordStatuses = ['issued', 'applied', 'expired', 'rejected'] as const;
export const authFormModes = ['login', 'register', 'forgot'] as const;

export type AuthSessionStatus = (typeof authSessionStatuses)[number];
export type LicenseStatus = (typeof licenseStatuses)[number];
export type LicenseDurationKey = (typeof licenseDurationKeys)[number];
export type HostLicenseDurationKey = (typeof hostLicenseDurationKeys)[number];
export type InviteRecordStatus = (typeof inviteRecordStatuses)[number];
export type RewardRecordStatus = (typeof rewardRecordStatuses)[number];
export type AuthFormMode = (typeof authFormModes)[number];

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarText: string;
  roleLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceIdentity {
  deviceId: string;
  fingerprintHash: string;
  fingerprintSummary: string;
  hostLabel: string;
  platformLabel: string;
  machineName: string;
}

export interface LicenseSummary {
  status: LicenseStatus;
  licenseTypeLabel: string;
  durationKey: LicenseDurationKey | null;
  expiresAt: string | null;
  permanent: boolean;
  source: 'local' | 'activation' | 'invite' | 'reward' | 'trial';
  sourceLabel: string;
  stageLabel: string;
  remainingLabel: string;
  activatedAt: string | null;
  lastValidatedAt: string | null;
  rollbackDetected: boolean;
  graceExpiresAt: string | null;
}

export interface InviteProgress {
  inviteCode: string;
  requestedInviteCode: string | null;
  invitedCount: number;
  successfulCount: number;
  progressLabel: string;
  rewardPreview: string[];
  slotsUsed: number;
  maxPermanentSlots: number;
  eligible: boolean;
  nextRewardLabel: string | null;
  ruleSummary: string;
  pendingRewardCount: number;
}

export interface InviteRecord {
  id: string;
  createdAt: string;
  targetDeviceId: string;
  targetLabel: string;
  result: string;
  rewardLabel: string;
  stage: number;
  status: InviteRecordStatus;
  byCurrentUser: boolean;
}

export interface RewardRecord {
  id: string;
  createdAt: string;
  code: string;
  result: string;
  rewardLabel: string;
  status: RewardRecordStatus;
}

export interface LicenseHostDurationOption {
  key: HostLicenseDurationKey;
  label: string;
  description: string;
}

export interface LicenseHostIssuedRecord {
  id: string;
  createdAt: string;
  targetLabel: string;
  targetDeviceId: string | null;
  targetFingerprintSummary: string;
  durationKey: HostLicenseDurationKey;
  durationLabel: string;
  note: string | null;
  codePreview: string;
}

export interface LicenseHostState {
  initialized: boolean;
  hostId: string;
  hostName: string;
  hostCreatedAt: string | null;
  publicKeySummary: string;
  publicKeyPem: string;
  publicKeyPath: string;
  storagePath: string;
  currentDevice: DeviceIdentity;
  lastIssuedAt: string | null;
  issuedCount: number;
  supportedDurations: LicenseHostDurationOption[];
  recentRecords: LicenseHostIssuedRecord[];
}

export interface LicenseHostRecordsResult {
  query: string;
  records: LicenseHostIssuedRecord[];
  totalCount: number;
}

export interface IssueLicenseCodeInput {
  durationKey: HostLicenseDurationKey;
  targetLabel: string;
  deviceFingerprintHash: string;
  deviceId?: string | null;
  note?: string;
}

export interface LicenseHostActionResult {
  state: LicenseHostState;
  message: string;
  generatedCode: string | null;
}

export interface ActivationResult {
  success: boolean;
  message: string;
  license: LicenseSummary;
  invite: InviteProgress;
  inviteRecord: InviteRecord | null;
  rewardRecord: RewardRecord | null;
}

export interface HeartbeatBootstrap {
  checkedAt: string;
  serverTime: string;
  online: boolean;
  requiresOnline: boolean;
  graceExpiresAt: string | null;
  graceSecondsRemaining: number;
  minSupportedVersion: string | null;
  mandatoryUpdate: boolean;
  allowCoreFeatures: boolean;
  notice: string | null;
}

export interface AuthState {
  sessionStatus: AuthSessionStatus;
  profile: UserProfile | null;
  device: DeviceIdentity;
  license: LicenseSummary;
  invite: InviteProgress;
  inviteRecords: InviteRecord[];
  rewardRecords: RewardRecord[];
  bootstrap: HeartbeatBootstrap;
  lastAuthAction: string | null;
}

export interface AuthActionResult {
  state: AuthState;
  message: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
  verificationCode?: string;
}

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  verificationCode?: string;
}

export interface PasswordResetInput {
  email: string;
  verificationCode?: string;
}

export interface ApplyActivationCodeInput {
  code: string;
}

export interface RedeemInviteCodeInput {
  code: string;
}

export interface ApplyRewardCodeInput {
  code: string;
}

export interface InviteRecordsResult {
  inviteRecords: InviteRecord[];
  rewardRecords: RewardRecord[];
}

export interface UsageQuota {
  percentUsed: number;
  resetAt: string | null;
  source?: 'manual' | 'detected' | 'live' | 'unknown';
  label?: string | null;
  configured?: boolean;
}

export interface ProfileRecord {
  id: string;
  storageDirName: string;
  name: string;
  workspaceName?: string | null;
  notes: string;
  planType: PlanType;
  manuallyDisabled: boolean;
  authFilePath: string;
  weeklyQuota: UsageQuota;
  fiveHourQuota: UsageQuota;
  reviewQuota: UsageQuota;
  createdAt: string;
  updatedAt: string;
  usageUpdatedAt?: string | null;
  usageError?: string | null;
  lastActivatedAt: string | null;
  authStatus: AuthFileStatus;
}

export interface ProfileSummary extends ProfileRecord {
  isActive: boolean;
}

export interface ActivityLogEntry {
  id: string;
  level: ActivityLogLevel;
  message: string;
  createdAt: string;
}

export interface BackupEntry {
  name: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AppSettings {
  profilesRootDir: string;
  backupBeforeSwitch: boolean;
  switchMode: SwitchMode;
  lowQuotaWarningEnabled: boolean;
  lowQuotaWarningThreshold: number;
  codexExecutablePathOverride: string | null;
  traeExecutablePathOverride: string | null;
  codexTraeAutoRestart: boolean;
  openclawStateDirOverride: string | null;
  openclawAutoRestartGateway: boolean;
  autoSwitchEnabled: boolean;
  autoSwitchThreshold: number;
  autoSwitchCountdownSeconds: number;
}

export interface AppSummary {
  activeProfileName: string | null;
  currentAuthExists: boolean;
  authRecognized: boolean;
  currentAuthSuggestedName?: string | null;
  currentAuthSuggestedWorkspaceName?: string | null;
  currentAuthSuggestedPlanType?: PlanType;
  profilesCount: number;
  backupBeforeSwitch: boolean;
  lastSwitchedAt: string | null;
  overallRemainingPercent: number | null;
  currentAuthPath: string;
  codexExecutablePath: string | null;
  codexExecutablePathSource: ExecutablePathSource;
  traeExecutablePath: string | null;
  traeExecutablePathSource: ExecutablePathSource;
  openclawStateDir: string;
  openclawGatewayCommandPath: string | null;
  openclawGatewayAvailable: boolean;
  openclawCurrentModel: string | null;
  openclawAvailableModels: OpenClawModelOption[];
}

export interface ProfilesState {
  profiles: ProfileSummary[];
  settings: AppSettings;
  lastScannedAt: string;
  logs: ActivityLogEntry[];
  backups: BackupEntry[];
  summary: AppSummary;
}

export interface AddProfileInput {
  name: string;
  workspaceName?: string;
  authSourcePath: string;
  notes: string;
  planType: PlanType;
  manuallyDisabled: boolean;
  weeklyQuota: UsageQuota;
  fiveHourQuota: UsageQuota;
  reviewQuota: UsageQuota;
}

export interface UpdateAppSettingsInput {
  backupBeforeSwitch?: boolean;
  switchMode?: SwitchMode;
  lowQuotaWarningEnabled?: boolean;
  lowQuotaWarningThreshold?: number;
  codexExecutablePathOverride?: string | null;
  traeExecutablePathOverride?: string | null;
  codexTraeAutoRestart?: boolean;
  openclawStateDirOverride?: string | null;
  openclawAutoRestartGateway?: boolean;
  autoSwitchEnabled?: boolean;
  autoSwitchThreshold?: number;
  autoSwitchCountdownSeconds?: number;
}

export interface UpdateProfileInput {
  id: string;
  name?: string;
  workspaceName?: string;
  authSourcePath?: string;
  notes?: string;
  planType?: PlanType;
  manuallyDisabled?: boolean;
  weeklyQuota?: UsageQuota;
  fiveHourQuota?: UsageQuota;
  reviewQuota?: UsageQuota;
}

export interface DeleteProfileInput {
  profileId: string;
  removeFiles: boolean;
}

export interface SwitchProfileInput {
  profileId: string;
  openclawModel?: string | null;
  runId?: string;
}

export interface SwitchProgressEvent {
  runId: string;
  targetProfileId: string;
  switchMode: SwitchMode;
  stepKey: SwitchProgressStepKey;
  title: string;
  detail: string;
  status: SwitchProgressStatus;
  timestamp: string;
}

export interface ActivateProfileResult {
  state: ProfilesState;
  targetAuthPath: string;
  backupPath: string | null;
  activatedAt: string;
  message: string;
  switchMode: SwitchMode;
  codexTraeAutoRestart: boolean;
  restartedDesktopApps: string[];
  openclawSynced: boolean;
  openclawGatewayRestarted: boolean;
  openclawModel: string | null;
  openclawModelChanged: boolean;
  warnings: string[];
}

export interface ImportCurrentAuthResult {
  state: ProfilesState;
  importedProfileId: string | null;
  message: string;
}

export interface SyncUsageResult {
  state: ProfilesState;
  syncedProfiles: number;
  message: string;
}

export interface FileDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface OpenPathResult {
  ok: boolean;
  error?: string;
}

export interface WindowState {
  maximized: boolean;
  visible: boolean;
}

export interface TrayCardState {
  activeProfile: ProfileSummary | null;
  currentAuthExists: boolean;
  authRecognized: boolean;
  currentAuthSuggestedName: string | null;
  currentAuthSuggestedWorkspaceName: string | null;
  currentAuthSuggestedPlanType: PlanType;
  profilesCount: number;
  overallRemainingPercent: number | null;
  lastScannedAt: string;
}
