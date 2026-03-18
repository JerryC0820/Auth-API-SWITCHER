import type {
  ActivateProfileResult,
  ApplyActivationCodeInput,
  ApplyRewardCodeInput,
  AddProfileInput,
  AuthActionResult,
  AuthState,
  DeleteProfileInput,
  FileDialogResult,
  HeartbeatBootstrap,
  IssueLicenseCodeInput,
  InviteRecordsResult,
  LicenseHostActionResult,
  LicenseHostRecordsResult,
  LicenseHostState,
  LoginInput,
  PasswordResetInput,
  ImportCurrentAuthResult,
  LicenseSummary,
  UpdateActionResult,
  OpenPathResult,
  ProfilesState,
  ProfileSummary,
  RedeemInviteCodeInput,
  RegisterInput,
  SwitchProgressEvent,
  SwitchProfileInput,
  SyncUsageResult,
  TrayCardState,
  UpdateState,
  UpdateAppSettingsInput,
  UpdateProfileInput,
  UserProfile,
  WindowState,
} from './types';

export const IPC_CHANNELS = {
  getAppState: 'app:get-state',
  restartApp: 'app:restart',
  restartLicenseHost: 'license-host:restart',
  importCurrentAuth: 'app:import-current-auth',
  syncUsage: 'app:sync-usage',
  listProfiles: 'profiles:list',
  refreshProfiles: 'profiles:refresh',
  addProfile: 'profiles:add',
  updateProfile: 'profiles:update',
  deleteProfile: 'profiles:delete',
  switchProfile: 'profiles:switch',
  switchProgress: 'profiles:switch-progress',
  chooseAuthFile: 'dialog:choose-auth-file',
  chooseExecutableFile: 'dialog:choose-executable-file',
  chooseDirectory: 'dialog:choose-directory',
  chooseRootDirectory: 'dialog:choose-root-directory',
  setProfilesRootDir: 'settings:set-profiles-root',
  updateSettings: 'settings:update',
  openPath: 'shell:open-path',
  openExternal: 'shell:open-external',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowHide: 'window:hide',
  windowGetState: 'window:get-state',
  windowStateChanged: 'window:state-changed',
  trayCardGetState: 'tray-card:get-state',
  trayCardStateChanged: 'tray-card:state-changed',
  openLicenseHostWindow: 'app:open-license-host-window',
  updateGetState: 'update:get-state',
  updateCheck: 'update:check',
  updateDownloadAndInstall: 'update:download-and-install',
  updateOpenNotes: 'update:open-notes',
  updateStateChanged: 'update:state-changed',
  authGetState: 'auth:get-state',
  authLogin: 'auth:login',
  authRegister: 'auth:register',
  authRequestPasswordReset: 'auth:request-password-reset',
  authGetAccountProfile: 'auth:get-account-profile',
  authGetLicenseSummary: 'auth:get-license-summary',
  authApplyActivationCode: 'auth:apply-activation-code',
  authRequestInviteCode: 'auth:request-invite-code',
  authRedeemInviteCode: 'auth:redeem-invite-code',
  authClaimInviteReward: 'auth:claim-invite-reward',
  authApplyRewardCode: 'auth:apply-reward-code',
  authListInviteRecords: 'auth:list-invite-records',
  authHeartbeat: 'auth:heartbeat',
  authGetHeartbeatBootstrap: 'auth:get-heartbeat-bootstrap',
  authStateChanged: 'auth:state-changed',
  licenseHostGetState: 'license-host:get-state',
  licenseHostIssueCode: 'license-host:issue-code',
  licenseHostSearchRecords: 'license-host:search-records',
} as const;

export interface CodexWorkspaceApi {
  getAppState: () => Promise<ProfilesState>;
  restartApp: () => void;
  restartLicenseHost: () => Promise<{ ok: true }>;
  importCurrentAuth: () => Promise<ImportCurrentAuthResult>;
  syncUsage: () => Promise<SyncUsageResult>;
  listProfiles: () => Promise<ProfileSummary[]>;
  refreshProfiles: () => Promise<ProfilesState>;
  addProfile: (input: AddProfileInput) => Promise<ProfilesState>;
  updateProfile: (input: UpdateProfileInput) => Promise<ProfilesState>;
  deleteProfile: (input: DeleteProfileInput) => Promise<ProfilesState>;
  switchProfile: (input: SwitchProfileInput) => Promise<ActivateProfileResult>;
  onSwitchProgress: (listener: (event: SwitchProgressEvent) => void) => () => void;
  chooseAuthFile: () => Promise<FileDialogResult>;
  chooseExecutableFile: (title?: string) => Promise<FileDialogResult>;
  chooseDirectory: () => Promise<FileDialogResult>;
  chooseRootDirectory: () => Promise<FileDialogResult>;
  setProfilesRootDir: (rootDir: string) => Promise<ProfilesState>;
  updateSettings: (input: UpdateAppSettingsInput) => Promise<ProfilesState>;
  openPath: (targetPath: string) => Promise<OpenPathResult>;
  openExternal: (targetUrl: string) => Promise<OpenPathResult>;
  minimizeWindow: () => Promise<WindowState>;
  toggleMaximizeWindow: () => Promise<WindowState>;
  closeWindow: () => Promise<WindowState>;
  hideWindow: () => Promise<WindowState>;
  getWindowState: () => Promise<WindowState>;
  onWindowStateChange: (listener: (state: WindowState) => void) => () => void;
  getTrayCardState: () => Promise<TrayCardState>;
  onTrayCardStateChange: (listener: (state: TrayCardState) => void) => () => void;
  openLicenseHostWindow: () => Promise<{ ok: true }>;
  getUpdateState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<UpdateActionResult>;
  downloadAndInstallUpdate: () => Promise<UpdateActionResult>;
  openUpdateNotes: () => Promise<OpenPathResult>;
  onUpdateStateChange: (listener: (state: UpdateState) => void) => () => void;
  getAuthState: () => Promise<AuthState>;
  login: (input: LoginInput) => Promise<AuthActionResult>;
  register: (input: RegisterInput) => Promise<AuthActionResult>;
  requestPasswordReset: (input: PasswordResetInput) => Promise<AuthActionResult>;
  getAccountProfile: () => Promise<UserProfile | null>;
  getLicenseSummary: () => Promise<LicenseSummary>;
  applyActivationCode: (input: ApplyActivationCodeInput) => Promise<AuthActionResult>;
  requestInviteCode: () => Promise<AuthActionResult>;
  redeemInviteCode: (input: RedeemInviteCodeInput) => Promise<AuthActionResult>;
  claimInviteReward: () => Promise<AuthActionResult>;
  applyRewardCode: (input: ApplyRewardCodeInput) => Promise<AuthActionResult>;
  listInviteRecords: () => Promise<InviteRecordsResult>;
  heartbeat: () => Promise<AuthActionResult>;
  getHeartbeatBootstrap: () => Promise<HeartbeatBootstrap>;
  onAuthStateChange: (listener: (state: AuthState) => void) => () => void;
  getLicenseHostState: () => Promise<LicenseHostState>;
  issueLicenseCode: (input: IssueLicenseCodeInput) => Promise<LicenseHostActionResult>;
  searchLicenseHostRecords: (query: string) => Promise<LicenseHostRecordsResult>;
}
