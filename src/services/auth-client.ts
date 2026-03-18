import type {
  ApplyActivationCodeInput,
  ApplyRewardCodeInput,
  AuthActionResult,
  AuthState,
  HeartbeatBootstrap,
  InviteRecordsResult,
  LicenseSummary,
  LoginInput,
  PasswordResetInput,
  RedeemInviteCodeInput,
  RegisterInput,
  UserProfile,
} from '../../shared/types';

const api = () => window.codexWorkspace;

export const authClient = {
  getState: (): Promise<AuthState> => api().getAuthState(),
  login: (input: LoginInput): Promise<AuthActionResult> => api().login(input),
  register: (input: RegisterInput): Promise<AuthActionResult> => api().register(input),
  requestPasswordReset: (input: PasswordResetInput): Promise<AuthActionResult> =>
    api().requestPasswordReset(input),
  getAccountProfile: (): Promise<UserProfile | null> => api().getAccountProfile(),
  getLicenseSummary: (): Promise<LicenseSummary> => api().getLicenseSummary(),
  applyActivationCode: (input: ApplyActivationCodeInput): Promise<AuthActionResult> =>
    api().applyActivationCode(input),
  requestInviteCode: (): Promise<AuthActionResult> => api().requestInviteCode(),
  redeemInviteCode: (input: RedeemInviteCodeInput): Promise<AuthActionResult> =>
    api().redeemInviteCode(input),
  claimInviteReward: (): Promise<AuthActionResult> => api().claimInviteReward(),
  applyRewardCode: (input: ApplyRewardCodeInput): Promise<AuthActionResult> =>
    api().applyRewardCode(input),
  listInviteRecords: (): Promise<InviteRecordsResult> => api().listInviteRecords(),
  heartbeat: (): Promise<AuthActionResult> => api().heartbeat(),
  getHeartbeatBootstrap: (): Promise<HeartbeatBootstrap> => api().getHeartbeatBootstrap(),
  onStateChange: (listener: (state: AuthState) => void): (() => void) => api().onAuthStateChange(listener),
};
