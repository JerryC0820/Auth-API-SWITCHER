import path from 'node:path';
import { app } from 'electron';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import type {
  ApplyActivationCodeInput,
  ApplyRewardCodeInput,
  AuthActionResult,
  AuthState,
  DeviceIdentity,
  HeartbeatBootstrap,
  InviteProgress,
  InviteRecord,
  InviteRecordsResult,
  LicenseDurationKey,
  LicenseSummary,
  LoginInput,
  PasswordResetInput,
  RedeemInviteCodeInput,
  RegisterInput,
  RewardRecord,
  UserProfile,
} from '../../shared/types';
import { buildDeviceIdentity } from './device-identity';
import { getHostLicenseDurationDefinition, verifySignedLicenseCode } from './license-code';
import { readLocalLicenseHostPublicKey } from './license-host-service';

interface StoredAuthFile {
  version: number;
  state: AuthState;
  sessionToken?: string | null;
}

interface RemoteAuthActionResult extends AuthActionResult {
  sessionToken?: string;
}

interface RemoteErrorPayload {
  error?: {
    message?: string | null;
    details?: string | null;
  };
  message?: string | null;
}

interface AuthRequestPayload {
  currentVersion: string;
  device: DeviceIdentity;
}

const AUTH_FILE_NAME = 'auth-shell.json';
const AUTH_FILE_VERSION = 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONLINE_GRACE_MS = 6 * 60 * 60 * 1000;
const ROLLBACK_TOLERANCE_MS = 2 * 60 * 1000;
const REMOTE_AUTH_API_DEV_URL = 'http://127.0.0.1:8787';
const REMOTE_AUTH_API_PROD_URL =
  'https://auth-api-switcher-auth-api.jerryauthswitcher.workers.dev';
const REMOTE_AUTH_OFFLINE_NOTICE = '在线授权服务暂时不可达，当前显示本地缓存。';
const PASSWORD_RESET_PLACEHOLDER_MESSAGE = '当前未配置当前功能，敬请期待。';
const MAX_PERMANENT_SLOTS = 4;
const REWARD_PREVIEW = ['首次成功 +7 天', '第二次成功 +30 天', '第三次成功 = 永久'];
const INVITE_RULE_SUMMARY =
  '正式授权用户可申请 one-time invite code；新设备兑换成功后，邀请奖励按 7 天 / 30 天 / 永久 三阶段递增，邀请永久最多占用 4 个槽位。';

class RemoteAuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'RemoteAuthRequestError';
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const nowIso = (): string => new Date().toISOString();

const compareVersions = (left: string, right: string): number => {
  const leftParts = left.split('.').map((item) => Number.parseInt(item, 10) || 0);
  const rightParts = right.split('.').map((item) => Number.parseInt(item, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
};

const formatRemainingLabel = (expiresAt: string | null, permanent: boolean): string => {
  if (permanent || !expiresAt) {
    return '永久有效';
  }

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return '已到期';
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) {
    return `还有 ${days} 天 ${hours} 小时`;
  }

  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `还有 ${hours} 小时 ${minutes} 分钟`;
};

const tryParseHostActivationCode = async (
  code: string,
  device: DeviceIdentity,
): Promise<
  | {
      permanent: boolean;
      days: number;
      typeLabel: string;
      durationKey: LicenseDurationKey;
      issuerLabel: string;
      stageLabel: string;
    }
  | null
> => {
  if (!code.startsWith('AAS1.')) {
    return null;
  }

  const publicKeyPem = await readLocalLicenseHostPublicKey();
  if (!publicKeyPem) {
    throw new Error('当前设备还没有本地主机公钥，请先启动本地授权主机初始化。');
  }

  const verified = verifySignedLicenseCode(code, publicKeyPem);
  if (!verified) {
    return null;
  }

  if (verified.payload.deviceFingerprintHash !== device.fingerprintHash) {
    throw new Error(
      `该授权码绑定的是 ${verified.payload.deviceFingerprintSummary}，与当前设备不匹配。`,
    );
  }

  const duration = getHostLicenseDurationDefinition(verified.payload.durationKey);
  return {
    permanent: duration.permanent,
    days: duration.days,
    typeLabel: verified.payload.licenseTypeLabel,
    durationKey: verified.payload.durationKey,
    issuerLabel: `本地主机 ${verified.payload.issuerId}`,
    stageLabel: duration.permanent
      ? `本地主机永久授权已激活 / ${verified.payload.targetLabel}`
      : `本地主机授权已录入 / ${verified.payload.targetLabel}`,
  };
};

const isFormalLicense = (license: LicenseSummary): boolean =>
  license.status === 'active' &&
  (license.permanent ||
    (license.durationKey !== null &&
      license.durationKey !== 'one-day' &&
      license.source !== 'trial'));

const buildInviteProgress = (invite: InviteProgress, license: LicenseSummary): InviteProgress => {
  const successfulCount = Math.max(0, invite.successfulCount);
  let nextRewardLabel: string | null = null;

  if (successfulCount <= 0) {
    nextRewardLabel = '+7 天';
  } else if (successfulCount === 1) {
    nextRewardLabel = '+30 天';
  } else if (successfulCount === 2) {
    nextRewardLabel =
      invite.slotsUsed < invite.maxPermanentSlots ? '永久授权' : '+30 天（永久槽位已满）';
  }

  return {
    ...invite,
    eligible: isFormalLicense(license),
    progressLabel: `${Math.min(successfulCount, 3)}/3`,
    nextRewardLabel,
    rewardPreview: [...REWARD_PREVIEW],
    ruleSummary: INVITE_RULE_SUMMARY,
    maxPermanentSlots: MAX_PERMANENT_SLOTS,
  };
};

const withBootstrapNotice = (
  bootstrap: HeartbeatBootstrap,
  notice: string | null,
): HeartbeatBootstrap => {
  if (!notice) {
    return bootstrap;
  }

  return {
    ...bootstrap,
    notice,
  };
};

const buildBootstrap = (
  currentVersion: string,
  previous: HeartbeatBootstrap | null,
  notice: string | null,
): HeartbeatBootstrap => {
  const checkedAt = nowIso();
  const graceExpiresAt = new Date(Date.now() + ONLINE_GRACE_MS).toISOString();
  const minSupportedVersion = currentVersion;
  const mandatoryUpdate = compareVersions(currentVersion, minSupportedVersion) < 0;
  const graceSecondsRemaining = Math.max(
    0,
    Math.floor((new Date(graceExpiresAt).getTime() - Date.now()) / 1000),
  );

  return {
    checkedAt,
    serverTime: checkedAt,
    online: true,
    requiresOnline: true,
    graceExpiresAt,
    graceSecondsRemaining,
    minSupportedVersion,
    mandatoryUpdate,
    allowCoreFeatures: !mandatoryUpdate || graceSecondsRemaining > 0,
    notice: notice ?? previous?.notice ?? '当前使用本地 mock 在线层，后续可切到真实 Auth API。',
  };
};

const createInactiveLicense = (): LicenseSummary => ({
  status: 'inactive',
  licenseTypeLabel: '未授权',
  durationKey: null,
  expiresAt: null,
  permanent: false,
  source: 'local',
  sourceLabel: '本地授权底座',
  stageLabel: '等待登录或录入授权码',
  remainingLabel: '未激活',
  activatedAt: null,
  lastValidatedAt: null,
  rollbackDetected: false,
  graceExpiresAt: null,
});

const createTrialLicense = (): LicenseSummary => {
  const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();
  return {
    status: 'grace',
    licenseTypeLabel: '登录体验 / 1 天',
    durationKey: 'one-day',
    expiresAt,
    permanent: false,
    source: 'trial',
    sourceLabel: '账号体验期',
    stageLabel: '登录后体验',
    remainingLabel: formatRemainingLabel(expiresAt, false),
    activatedAt: nowIso(),
    lastValidatedAt: nowIso(),
    rollbackDetected: false,
    graceExpiresAt: expiresAt,
  };
};

const createInviteProgress = (deviceId: string): InviteProgress => ({
  inviteCode: `INV-${deviceId.slice(-4)}`,
  requestedInviteCode: null,
  invitedCount: 0,
  successfulCount: 0,
  progressLabel: '0/3',
  rewardPreview: [...REWARD_PREVIEW],
  slotsUsed: 0,
  maxPermanentSlots: MAX_PERMANENT_SLOTS,
  eligible: false,
  nextRewardLabel: '+7 天',
  ruleSummary: INVITE_RULE_SUMMARY,
  pendingRewardCount: 0,
});

const createEmptyState = (device: DeviceIdentity, currentVersion: string): AuthState => {
  const license = createInactiveLicense();
  return {
    sessionStatus: 'guest',
    profile: null,
    device,
    license,
    invite: buildInviteProgress(createInviteProgress(device.deviceId), license),
    inviteRecords: [],
    rewardRecords: [],
    bootstrap: buildBootstrap(currentVersion, null, null),
    lastAuthAction: null,
  };
};

const toAvatarText = (displayName: string, email: string): string => {
  const source = displayName.trim() || email.trim();
  const plain = source.replace(/[^A-Za-z0-9\u4E00-\u9FFF]/g, '').slice(0, 2);
  return (plain || 'U').toUpperCase();
};

const createProfile = (
  displayName: string,
  email: string,
  previousProfile: UserProfile | null,
): UserProfile => {
  const current = nowIso();
  return {
    id: previousProfile?.id ?? nanoid(10),
    displayName: displayName.trim() || email.split('@')[0] || '新用户',
    email: email.trim(),
    avatarText: toAvatarText(displayName, email),
    roleLabel: '已登录账号',
    createdAt: previousProfile?.createdAt ?? current,
    updatedAt: current,
  };
};

const buildRequestedInviteCode = (inviteCode: string): string =>
  `${inviteCode}-${nanoid(6).toUpperCase()}`;

const applyDurationToLicense = (
  current: LicenseSummary,
  duration: { permanent: boolean; days: number; typeLabel: string; durationKey: LicenseDurationKey },
  source: LicenseSummary['source'],
  sourceLabel: string,
  stageLabel: string,
): LicenseSummary => {
  const activatedAt = nowIso();
  if (duration.permanent) {
    return {
      status: 'active',
      licenseTypeLabel: duration.typeLabel,
      durationKey: duration.durationKey,
      expiresAt: null,
      permanent: true,
      source,
      sourceLabel,
      stageLabel,
      remainingLabel: '永久有效',
      activatedAt,
      lastValidatedAt: activatedAt,
      rollbackDetected: current.rollbackDetected,
      graceExpiresAt: null,
    };
  }

  const baseTime = current.expiresAt ? new Date(current.expiresAt).getTime() : Date.now();
  const nextTime = Math.max(baseTime, Date.now()) + duration.days * ONE_DAY_MS;
  const expiresAt = new Date(nextTime).toISOString();

  return {
    status: source === 'trial' ? 'grace' : 'active',
    licenseTypeLabel: duration.typeLabel,
    durationKey: duration.durationKey,
    expiresAt,
    permanent: false,
    source,
    sourceLabel,
    stageLabel,
    remainingLabel: formatRemainingLabel(expiresAt, false),
    activatedAt,
    lastValidatedAt: activatedAt,
    rollbackDetected: current.rollbackDetected,
    graceExpiresAt: source === 'trial' ? expiresAt : null,
  };
};

const parseActivationCode = (
  code: string,
): { permanent: boolean; days: number; typeLabel: string; durationKey: LicenseDurationKey } => {
  const upper = code.toUpperCase();
  if (upper.includes('PERM') || upper.includes('FOREVER')) {
    return {
      permanent: true,
      days: 0,
      typeLabel: '永久授权',
      durationKey: 'permanent',
    };
  }
  if (upper.includes('HALFYEAR') || upper.includes('180')) {
    return {
      permanent: false,
      days: 180,
      typeLabel: '半年授权',
      durationKey: 'half-year',
    };
  }
  if (upper.includes('MONTH') || upper.includes('30')) {
    return {
      permanent: false,
      days: 30,
      typeLabel: '月度授权',
      durationKey: 'one-month',
    };
  }
  if (upper.includes('HALF') || upper.includes('15')) {
    return {
      permanent: false,
      days: 15,
      typeLabel: '半月授权',
      durationKey: 'half-month',
    };
  }
  if (upper.includes('WEEK') || upper.includes('7D')) {
    return {
      permanent: false,
      days: 7,
      typeLabel: '周授权',
      durationKey: 'one-week',
    };
  }
  return {
    permanent: false,
    days: 1,
    typeLabel: '日授权',
    durationKey: 'one-day',
  };
};

const parseRewardFromStage = (
  stage: number,
  slotsUsed: number,
): { permanent: boolean; days: number; typeLabel: string; durationKey: LicenseDurationKey } => {
  if (stage <= 1) {
    return {
      permanent: false,
      days: 7,
      typeLabel: '邀请奖励 +7 天',
      durationKey: 'one-week',
    };
  }
  if (stage === 2) {
    return {
      permanent: false,
      days: 30,
      typeLabel: '邀请奖励 +30 天',
      durationKey: 'one-month',
    };
  }
  if (slotsUsed < MAX_PERMANENT_SLOTS) {
    return {
      permanent: true,
      days: 0,
      typeLabel: '邀请奖励永久',
      durationKey: 'invite-permanent',
    };
  }
  return {
    permanent: false,
    days: 30,
    typeLabel: '永久槽位已满 / 改发 +30 天',
    durationKey: 'one-month',
  };
};

const refreshDerivedState = (
  state: AuthState,
  currentVersion: string,
  notice: string | null,
  options?: { preserveBootstrap?: boolean },
): AuthState => {
  const nextLicense =
    state.license.permanent || !state.license.expiresAt
      ? {
          ...state.license,
          remainingLabel: formatRemainingLabel(state.license.expiresAt, state.license.permanent),
        }
      : (() => {
          const expiresAt = state.license.expiresAt;
          const expired = new Date(expiresAt).getTime() <= Date.now();
          return {
            ...state.license,
            status: expired && state.license.source !== 'trial' ? 'expired' : state.license.status,
            remainingLabel: formatRemainingLabel(expiresAt, false),
          };
        })();

  const nextInvite = buildInviteProgress(state.invite, nextLicense);
  const nextBootstrap = options?.preserveBootstrap
    ? withBootstrapNotice(state.bootstrap, notice)
    : buildBootstrap(currentVersion, state.bootstrap, notice);
  return {
    ...state,
    license: nextLicense,
    invite: nextInvite,
    bootstrap: nextBootstrap,
  };
};

const createInviteRecord = (
  targetDeviceId: string,
  targetLabel: string,
  result: string,
  rewardLabel: string,
  stage: number,
  status: InviteRecord['status'],
  byCurrentUser: boolean,
): InviteRecord => ({
  id: nanoid(10),
  createdAt: nowIso(),
  targetDeviceId,
  targetLabel,
  result,
  rewardLabel,
  stage,
  status,
  byCurrentUser,
});

const createRewardRecord = (
  code: string,
  result: string,
  rewardLabel: string,
  status: RewardRecord['status'],
): RewardRecord => ({
  id: nanoid(10),
  createdAt: nowIso(),
  code,
  result,
  rewardLabel,
  status,
});

export class AuthService {
  private readonly dataFilePath = path.join(app.getPath('userData'), AUTH_FILE_NAME);

  private readonly currentVersion = app.getVersion();

  private readonly remoteAuthBaseUrl: string | null;

  private state: AuthState | null = null;

  private sessionToken: string | null = null;

  private readonly listeners = new Set<(state: AuthState) => void>();

  constructor() {
    const configuredUrl =
      process.env.CODEX_WORKSPACE_AUTH_API_URL?.trim() ||
      process.env.AUTH_API_BASE_URL?.trim() ||
      (app.isPackaged ? REMOTE_AUTH_API_PROD_URL : REMOTE_AUTH_API_DEV_URL);
    this.remoteAuthBaseUrl = configuredUrl || null;
  }

  async initialize(): Promise<void> {
    if (this.state) {
      return;
    }

    const device = buildDeviceIdentity();
    const stored = await this.loadStoredState(device);
    this.sessionToken = stored.sessionToken;
    this.state = refreshDerivedState(stored.state, this.currentVersion, null, {
      preserveBootstrap: true,
    });

    if (this.hasRemoteAuthConfigured()) {
      await this.refreshRemoteBootstrap({ emit: false });
      if (this.sessionToken) {
        await this.refreshRemoteSessionState({
          emit: false,
          fallbackToLocalOnUnavailable: false,
        });
      } else {
        await this.saveState();
      }
      return;
    }

    this.state = refreshDerivedState(this.state, this.currentVersion, null);
    await this.saveState();
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    if (this.state) {
      listener(clone(this.state));
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  async getState(): Promise<AuthState> {
    await this.ensureReady();
    return clone(this.state as AuthState);
  }

  async login(input: LoginInput): Promise<AuthActionResult> {
    await this.ensureReady();
    const email = input.email.trim();
    if (!email) {
      throw new Error('请输入邮箱。');
    }
    if (!input.password.trim()) {
      throw new Error('请输入密码。');
    }

    if (this.hasRemoteAuthConfigured()) {
      try {
        return await this.performRemoteAuthAction('/api/auth/login', {
          email,
          password: input.password,
          rememberMe: input.rememberMe,
          verificationCode: input.verificationCode,
        });
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.loginLocal(input);
  }

  async register(input: RegisterInput): Promise<AuthActionResult> {
    await this.ensureReady();
    const email = input.email.trim();
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new Error('请输入用户名。');
    }
    if (!email) {
      throw new Error('请输入邮箱。');
    }
    if (!input.password.trim()) {
      throw new Error('请输入密码。');
    }

    if (this.hasRemoteAuthConfigured()) {
      try {
        return await this.performRemoteAuthAction('/api/auth/register', {
          displayName,
          email,
          password: input.password,
          verificationCode: input.verificationCode,
        });
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.registerLocal(input);
  }

  async requestPasswordReset(input: PasswordResetInput): Promise<AuthActionResult> {
    await this.ensureReady();
    const email = input.email.trim();
    if (!email) {
      throw new Error('请输入邮箱。');
    }

    this.state = refreshDerivedState(
      {
        ...(this.state as AuthState),
        lastAuthAction: 'forgot-password',
      },
      this.currentVersion,
      PASSWORD_RESET_PLACEHOLDER_MESSAGE,
      { preserveBootstrap: true },
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: `${email} 的找回密码功能当前未配置，敬请期待。`,
    };
  }

  async getAccountProfile(): Promise<UserProfile | null> {
    await this.ensureReady();
    return clone((this.state as AuthState).profile);
  }

  async getLicenseSummary(): Promise<LicenseSummary> {
    await this.ensureReady();
    return clone((this.state as AuthState).license);
  }

  async applyActivationCode(input: ApplyActivationCodeInput): Promise<AuthActionResult> {
    await this.ensureReady();
    const code = input.code.trim();
    if (!code) {
      throw new Error('请输入授权码。');
    }

    const current = this.state as AuthState;
    const hostDuration = await tryParseHostActivationCode(code, current.device);
    if (hostDuration) {
      const license = applyDurationToLicense(
        current.license,
        hostDuration,
        'activation',
        hostDuration.issuerLabel,
        hostDuration.stageLabel,
      );

      this.state = refreshDerivedState(
        {
          ...current,
          sessionStatus: current.profile ? 'authenticated' : current.sessionStatus,
          license,
          lastAuthAction: 'activation-code',
        },
        this.currentVersion,
        null,
      );
      await this.persistAndEmit();
      return {
        state: clone(this.state),
        message: hostDuration.permanent ? '永久授权已生效。' : `${hostDuration.typeLabel} 已生效。`,
      };
    }

    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        return await this.performRemoteAuthAction(
          '/api/license/activate',
          { code },
          { requiresSession: true },
        );
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    const duration = parseActivationCode(code);
    const license = applyDurationToLicense(
      current.license,
      duration,
      'activation',
      '激活码授权',
      duration.permanent ? '已激活永久授权' : `已录入授权码 ${code.slice(-4).toUpperCase()}`,
    );

    this.state = refreshDerivedState(
      {
        ...current,
        sessionStatus: current.profile ? 'authenticated' : current.sessionStatus,
        license,
        lastAuthAction: 'activation-code',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: duration.permanent ? '永久授权已生效。' : `${duration.typeLabel} 已生效。`,
    };
  }

  async requestInviteCode(): Promise<AuthActionResult> {
    await this.ensureReady();
    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        return await this.performRemoteAuthAction('/api/invite/request', {}, { requiresSession: true });
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.requestInviteCodeLocal();
  }

  async redeemInviteCode(input: RedeemInviteCodeInput): Promise<AuthActionResult> {
    await this.ensureReady();
    const code = input.code.trim().toUpperCase();
    if (!code) {
      throw new Error('请输入邀请码。');
    }

    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        return await this.performRemoteAuthAction(
          '/api/invite/redeem',
          { code },
          { requiresSession: true },
        );
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.redeemInviteCodeLocal({ code });
  }

  async claimInviteReward(): Promise<AuthActionResult> {
    await this.ensureReady();
    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        return await this.performRemoteAuthAction('/api/invite/claim', {}, { requiresSession: true });
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.claimInviteRewardLocal();
  }

  async applyRewardCode(input: ApplyRewardCodeInput): Promise<AuthActionResult> {
    await this.ensureReady();
    const code = input.code.trim();
    if (!code) {
      throw new Error('请输入奖励码。');
    }

    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        return await this.performRemoteAuthAction(
          '/api/reward/apply',
          { code },
          { requiresSession: true },
        );
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.applyRewardCodeLocal({ code });
  }

  async listInviteRecords(): Promise<InviteRecordsResult> {
    await this.ensureReady();
    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        const result = await this.requestRemoteJson<InviteRecordsResult>(
          '/api/invite/records',
          { method: 'GET' },
          { requiresSession: true },
        );

        this.state = {
          ...(this.state as AuthState),
          inviteRecords: clone(result.inviteRecords),
          rewardRecords: clone(result.rewardRecords),
        };
        await this.persistAndEmit();
        return {
          inviteRecords: clone(result.inviteRecords),
          rewardRecords: clone(result.rewardRecords),
        };
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    const current = this.state as AuthState;
    return {
      inviteRecords: clone(current.inviteRecords),
      rewardRecords: clone(current.rewardRecords),
    };
  }

  async heartbeat(): Promise<AuthActionResult> {
    await this.ensureReady();
    if (this.hasRemoteAuthConfigured() && this.sessionToken) {
      try {
        return await this.refreshRemoteSessionState({
          emit: true,
          fallbackToLocalOnUnavailable: true,
        });
      } catch (error) {
        if (!this.isRemoteUnavailableError(error)) {
          throw error;
        }
      }
    }

    return this.heartbeatLocal();
  }

  async getHeartbeatBootstrap(): Promise<HeartbeatBootstrap> {
    await this.ensureReady();
    if (this.hasRemoteAuthConfigured()) {
      await this.refreshRemoteBootstrap({ emit: false });
    }

    return clone((this.state as AuthState).bootstrap);
  }

  private hasRemoteAuthConfigured(): boolean {
    return Boolean(this.remoteAuthBaseUrl);
  }

  private isRemoteUnavailableError(error: unknown): boolean {
    return error instanceof RemoteAuthRequestError && error.status === null;
  }

  private buildRemoteUrl(endpointPath: string): string {
    if (!this.remoteAuthBaseUrl) {
      throw new RemoteAuthRequestError('当前未配置在线授权服务地址。');
    }

    return `${this.remoteAuthBaseUrl.replace(/\/+$/, '')}${endpointPath}`;
  }

  private getCurrentDevice(): DeviceIdentity {
    return (this.state as AuthState)?.device ?? buildDeviceIdentity();
  }

  private buildRemotePayload<T extends Record<string, unknown>>(payload: T): T & AuthRequestPayload {
    return {
      ...payload,
      currentVersion: this.currentVersion,
      device: this.getCurrentDevice(),
    };
  }

  private async requestRemoteJson<T>(
    endpointPath: string,
    init: RequestInit,
    options?: { requiresSession?: boolean },
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body) {
      headers.set('content-type', 'application/json; charset=utf-8');
    }

    if (options?.requiresSession) {
      if (!this.sessionToken) {
        throw new RemoteAuthRequestError('当前还没有在线登录会话。');
      }
      headers.set('authorization', `Bearer ${this.sessionToken}`);
    }

    let response: Response;
    try {
      response = await fetch(this.buildRemoteUrl(endpointPath), {
        ...init,
        headers,
      });
    } catch (error) {
      throw new RemoteAuthRequestError(
        error instanceof Error ? error.message : '在线授权服务不可达。',
        null,
      );
    }

    const responseText = await response.text();
    const payload = responseText ? (JSON.parse(responseText) as T | RemoteErrorPayload) : ({} as T);
    if (!response.ok) {
      const remoteError = payload as RemoteErrorPayload;
      const message =
        remoteError.error?.message ??
        remoteError.message ??
        `在线授权服务请求失败（${response.status}）。`;

      if (response.status === 401 || response.status === 403) {
        await this.handleRemoteSessionInvalid(message);
      }

      throw new RemoteAuthRequestError(message, response.status);
    }

    return payload as T;
  }

  private async performRemoteAuthAction(
    endpointPath: string,
    payload: Record<string, unknown>,
    options?: { requiresSession?: boolean },
  ): Promise<AuthActionResult> {
    const result = await this.requestRemoteJson<RemoteAuthActionResult>(
      endpointPath,
      {
        method: 'POST',
        body: JSON.stringify(this.buildRemotePayload(payload)),
      },
      options,
    );

    this.state = refreshDerivedState(result.state, this.currentVersion, result.state.bootstrap.notice, {
      preserveBootstrap: true,
    });
    if (typeof result.sessionToken === 'string') {
      this.sessionToken = result.sessionToken;
    }
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: result.message,
    };
  }

  private async refreshRemoteBootstrap(options?: { emit?: boolean }): Promise<void> {
    try {
      const bootstrap = await this.requestRemoteJson<HeartbeatBootstrap>('/api/bootstrap', {
        method: 'POST',
        body: JSON.stringify(this.buildRemotePayload({})),
      });

      this.state = {
        ...(this.state as AuthState),
        bootstrap,
      };
      await this.saveState();
      if (options?.emit) {
        this.emit();
      }
    } catch (error) {
      if (!this.isRemoteUnavailableError(error)) {
        throw error;
      }

      this.state = refreshDerivedState(
        this.state as AuthState,
        this.currentVersion,
        REMOTE_AUTH_OFFLINE_NOTICE,
        { preserveBootstrap: true },
      );
      await this.saveState();
      if (options?.emit) {
        this.emit();
      }
    }
  }

  private async refreshRemoteSessionState(options?: {
    emit?: boolean;
    fallbackToLocalOnUnavailable?: boolean;
  }): Promise<AuthActionResult> {
    try {
      const result = await this.requestRemoteJson<AuthActionResult>(
        '/api/heartbeat',
        {
          method: 'POST',
          body: JSON.stringify(this.buildRemotePayload({})),
        },
        { requiresSession: true },
      );

      this.state = refreshDerivedState(result.state, this.currentVersion, result.state.bootstrap.notice, {
        preserveBootstrap: true,
      });
      await this.persistAndEmit();
      return {
        state: clone(this.state),
        message: result.message,
      };
    } catch (error) {
      if (!this.isRemoteUnavailableError(error)) {
        throw error;
      }

      if (!options?.fallbackToLocalOnUnavailable) {
        this.state = refreshDerivedState(
          this.state as AuthState,
          this.currentVersion,
          REMOTE_AUTH_OFFLINE_NOTICE,
          { preserveBootstrap: true },
        );
        await this.saveState();
        if (options?.emit) {
          this.emit();
        }
        return {
          state: clone(this.state),
          message: REMOTE_AUTH_OFFLINE_NOTICE,
        };
      }

      return this.heartbeatLocal(REMOTE_AUTH_OFFLINE_NOTICE);
    }
  }

  private async handleRemoteSessionInvalid(message: string): Promise<void> {
    this.sessionToken = null;
    this.state = refreshDerivedState(
      {
        ...(this.state as AuthState),
        lastAuthAction: 'remote-session-expired',
      },
      this.currentVersion,
      message,
      { preserveBootstrap: true },
    );
    await this.saveState();
  }

  private async loginLocal(input: LoginInput): Promise<AuthActionResult> {
    const current = this.state as AuthState;
    const profile = createProfile(current.profile?.displayName ?? '', input.email.trim(), current.profile);
    const nextLicense =
      current.license.status === 'inactive' || current.license.status === 'expired'
        ? createTrialLicense()
        : current.license;

    this.state = refreshDerivedState(
      {
        ...current,
        sessionStatus: 'authenticated',
        profile,
        license: nextLicense,
        lastAuthAction: 'login',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return { state: clone(this.state), message: `登录成功，欢迎回来 ${profile.displayName}。` };
  }

  private async registerLocal(input: RegisterInput): Promise<AuthActionResult> {
    const profile = createProfile(input.displayName.trim(), input.email.trim(), null);
    this.state = refreshDerivedState(
      {
        ...(this.state as AuthState),
        sessionStatus: 'authenticated',
        profile,
        license: createTrialLicense(),
        lastAuthAction: 'register',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: `注册成功，已为 ${input.displayName.trim()} 创建账号。`,
    };
  }

  private async requestInviteCodeLocal(): Promise<AuthActionResult> {
    const current = this.state as AuthState;
    if (!current.profile) {
      throw new Error('请先登录后再申请邀请码。');
    }
    if (!isFormalLicense(current.license)) {
      throw new Error('当前账号还不是正式授权，暂不能申请邀请码。');
    }

    const requestedInviteCode = buildRequestedInviteCode(current.invite.inviteCode);
    this.state = refreshDerivedState(
      {
        ...current,
        invite: {
          ...current.invite,
          requestedInviteCode,
        },
        lastAuthAction: 'request-invite-code',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: `已生成 one-time invite code：${requestedInviteCode}`,
    };
  }

  private async redeemInviteCodeLocal(input: RedeemInviteCodeInput): Promise<AuthActionResult> {
    const current = this.state as AuthState;
    const code = input.code.trim().toUpperCase();
    const ownCodes = [current.invite.inviteCode, current.invite.requestedInviteCode]
      .filter((item): item is string => Boolean(item))
      .map((item) => item.toUpperCase());

    if (ownCodes.includes(code)) {
      const stage = current.invite.successfulCount + 1;
      const nextRecord = createInviteRecord(
        `SIM-${nanoid(4).toUpperCase()}`,
        '模拟新设备',
        '新设备兑换成功，奖励待领取',
        stage === 1 ? '+7 天待领取' : stage === 2 ? '+30 天待领取' : '永久待领取',
        stage,
        'reward-ready',
        false,
      );

      this.state = refreshDerivedState(
        {
          ...current,
          invite: {
            ...current.invite,
            invitedCount: current.invite.invitedCount + 1,
            successfulCount: stage,
            pendingRewardCount: current.invite.pendingRewardCount + 1,
          },
          inviteRecords: [nextRecord, ...current.inviteRecords].slice(0, 12),
          lastAuthAction: 'simulate-invite-success',
        },
        this.currentVersion,
        null,
      );
      await this.persistAndEmit();
      return {
        state: clone(this.state),
        message: '已模拟一台新设备成功兑换当前邀请码，奖励待领取。',
      };
    }

    const inviteRecord = createInviteRecord(
      current.device.deviceId,
      current.profile?.displayName ?? '当前设备',
      '已兑换他人邀请码，当前设备获得 1 天体验',
      '+1 天体验',
      0,
      'redeemed',
      true,
    );
    const license =
      current.license.status === 'inactive'
        ? createTrialLicense()
        : applyDurationToLicense(
            current.license,
            {
              permanent: false,
              days: 1,
              typeLabel: '邀请码兑换体验 / 1 天',
              durationKey: 'one-day',
            },
            'invite',
            '邀请码兑换',
            '已兑换他人邀请码',
          );

    this.state = refreshDerivedState(
      {
        ...current,
        sessionStatus: current.profile ? 'authenticated' : current.sessionStatus,
        license,
        inviteRecords: [inviteRecord, ...current.inviteRecords].slice(0, 12),
        lastAuthAction: 'redeem-invite-code',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: '邀请码兑换成功，当前设备已获得体验时长。',
    };
  }

  private async claimInviteRewardLocal(): Promise<AuthActionResult> {
    const current = this.state as AuthState;
    const pendingRecord = current.inviteRecords.find((item) => item.status === 'reward-ready');
    if (!pendingRecord) {
      throw new Error('当前没有待领取的邀请奖励。');
    }

    const rewardDuration = parseRewardFromStage(pendingRecord.stage, current.invite.slotsUsed);
    const license = applyDurationToLicense(
      current.license,
      rewardDuration,
      rewardDuration.permanent ? 'invite' : 'reward',
      '邀请奖励',
      rewardDuration.permanent ? '已升级为邀请永久授权' : '已领取邀请奖励',
    );
    const rewardRecord = createRewardRecord(
      `INVITE-STAGE-${pendingRecord.stage}`,
      '邀请奖励已发放',
      rewardDuration.typeLabel,
      'applied',
    );

    this.state = refreshDerivedState(
      {
        ...current,
        license,
        invite: {
          ...current.invite,
          pendingRewardCount: Math.max(0, current.invite.pendingRewardCount - 1),
          slotsUsed:
            current.invite.slotsUsed +
            (rewardDuration.permanent && current.invite.slotsUsed < MAX_PERMANENT_SLOTS ? 1 : 0),
        },
        inviteRecords: current.inviteRecords.map((item) =>
          item.id === pendingRecord.id
            ? { ...item, status: 'claimed', rewardLabel: rewardDuration.typeLabel }
            : item,
        ),
        rewardRecords: [rewardRecord, ...current.rewardRecords].slice(0, 12),
        lastAuthAction: 'claim-invite-reward',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: rewardDuration.permanent ? '邀请奖励永久授权已发放。' : '邀请奖励已发放。',
    };
  }

  private async applyRewardCodeLocal(input: ApplyRewardCodeInput): Promise<AuthActionResult> {
    const current = this.state as AuthState;
    const duration = parseActivationCode(input.code.trim());
    const license = applyDurationToLicense(
      current.license,
      duration,
      'reward',
      '奖励码录入',
      duration.permanent ? '奖励码升级为永久授权' : '奖励码已录入',
    );
    const rewardRecord = createRewardRecord(
      input.code.trim().toUpperCase(),
      '奖励码已应用',
      duration.typeLabel,
      'applied',
    );

    this.state = refreshDerivedState(
      {
        ...current,
        license,
        rewardRecords: [rewardRecord, ...current.rewardRecords].slice(0, 12),
        lastAuthAction: 'reward-code',
      },
      this.currentVersion,
      null,
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: duration.permanent ? '奖励码已升级为永久授权。' : '奖励码已录入。',
    };
  }

  private async heartbeatLocal(notice: string | null = null): Promise<AuthActionResult> {
    const current = this.state as AuthState;
    const previousCheck = current.bootstrap.checkedAt
      ? new Date(current.bootstrap.checkedAt).getTime()
      : null;
    const rollbackDetected =
      previousCheck !== null && Date.now() + ROLLBACK_TOLERANCE_MS < previousCheck;

    const nextLicense = rollbackDetected
      ? {
          ...current.license,
          rollbackDetected: true,
          stageLabel: '检测到时间回拨，请尽快联网校验',
        }
      : current.license;

    this.state = refreshDerivedState(
      {
        ...current,
        license: nextLicense,
        lastAuthAction: 'heartbeat',
      },
      this.currentVersion,
      rollbackDetected ? '检测到系统时间回拨，已标记本地授权状态。' : notice,
      { preserveBootstrap: Boolean(notice) },
    );
    await this.persistAndEmit();
    return {
      state: clone(this.state),
      message: rollbackDetected ? '心跳完成，但检测到时间回拨。' : notice ?? '心跳校验完成。',
    };
  }

  private async loadStoredState(
    device: DeviceIdentity,
  ): Promise<{ state: AuthState; sessionToken: string | null }> {
    const exists = await fs.pathExists(this.dataFilePath);
    if (!exists) {
      return {
        state: createEmptyState(device, this.currentVersion),
        sessionToken: null,
      };
    }

    try {
      const payload = (await fs.readJson(this.dataFilePath)) as StoredAuthFile;
      if (payload.version !== AUTH_FILE_VERSION || !payload.state) {
        return {
          state: createEmptyState(device, this.currentVersion),
          sessionToken: null,
        };
      }

      return {
        state: {
          ...payload.state,
          device,
        },
        sessionToken: payload.sessionToken ?? null,
      };
    } catch {
      return {
        state: createEmptyState(device, this.currentVersion),
        sessionToken: null,
      };
    }
  }

  private async saveState(): Promise<void> {
    await fs.ensureDir(path.dirname(this.dataFilePath));
    await fs.writeJson(
      this.dataFilePath,
      {
        version: AUTH_FILE_VERSION,
        state: this.state as AuthState,
        sessionToken: this.sessionToken,
      } satisfies StoredAuthFile,
      { spaces: 2 },
    );
  }

  private async ensureReady(): Promise<void> {
    if (!this.state) {
      await this.initialize();
    }
  }

  private async persistAndEmit(): Promise<void> {
    await this.saveState();
    this.emit();
  }

  private emit(): void {
    const current = clone(this.state as AuthState);
    for (const listener of this.listeners) {
      listener(current);
    }
  }
}
