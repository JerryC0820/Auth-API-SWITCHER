import type {
  HeartbeatBootstrap,
  InviteProgress,
  LicenseDurationKey,
  LicenseSummary,
} from '../../../shared/types';

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONLINE_GRACE_MS = 6 * 60 * 60 * 1000;
export const MAX_PERMANENT_SLOTS = 4;
export const REWARD_PREVIEW = ['首次成功 +7 天', '第二次成功 +30 天', '第三次成功 = 永久'];
export const INVITE_RULE_SUMMARY =
  '正式授权用户可申请 one-time invite code；新设备兑换成功后，邀请奖励按 7 天 / 30 天 / 永久 三阶段递增，邀请永久最多占用 4 个槽位。';

export interface DurationDefinition {
  permanent: boolean;
  days: number;
  typeLabel: string;
  durationKey: LicenseDurationKey;
}

const DURATION_MAP: Record<LicenseDurationKey, DurationDefinition> = {
  'one-day': {
    permanent: false,
    days: 1,
    typeLabel: '日授权',
    durationKey: 'one-day',
  },
  'one-week': {
    permanent: false,
    days: 7,
    typeLabel: '周授权',
    durationKey: 'one-week',
  },
  'half-month': {
    permanent: false,
    days: 15,
    typeLabel: '半月授权',
    durationKey: 'half-month',
  },
  'one-month': {
    permanent: false,
    days: 30,
    typeLabel: '月度授权',
    durationKey: 'one-month',
  },
  'half-year': {
    permanent: false,
    days: 180,
    typeLabel: '半年授权',
    durationKey: 'half-year',
  },
  permanent: {
    permanent: true,
    days: 0,
    typeLabel: '永久授权',
    durationKey: 'permanent',
  },
  'invite-permanent': {
    permanent: true,
    days: 0,
    typeLabel: '邀请奖励永久',
    durationKey: 'invite-permanent',
  },
};

export const compareVersions = (left: string, right: string): number => {
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

export const formatRemainingLabel = (expiresAt: string | null, permanent: boolean): string => {
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

export const isFormalLicense = (license: LicenseSummary): boolean =>
  license.status === 'active' &&
  (license.permanent ||
    (license.durationKey !== null &&
      license.durationKey !== 'one-day' &&
      license.source !== 'trial'));

export const buildBootstrap = (
  currentVersion: string,
  minSupportedVersion: string | null,
  mandatoryUpdate: boolean,
  notice: string | null,
): HeartbeatBootstrap => {
  const checkedAt = new Date().toISOString();
  const graceExpiresAt = new Date(Date.now() + ONLINE_GRACE_MS).toISOString();
  const mandatory =
    Boolean(mandatoryUpdate) ||
    (minSupportedVersion ? compareVersions(currentVersion, minSupportedVersion) < 0 : false);

  return {
    checkedAt,
    serverTime: checkedAt,
    online: true,
    requiresOnline: true,
    graceExpiresAt,
    graceSecondsRemaining: Math.max(
      0,
      Math.floor((new Date(graceExpiresAt).getTime() - Date.now()) / 1000),
    ),
    minSupportedVersion,
    mandatoryUpdate: mandatory,
    allowCoreFeatures: !mandatory,
    notice,
  };
};

export const createInactiveLicense = (): LicenseSummary => ({
  status: 'inactive',
  licenseTypeLabel: '未授权',
  durationKey: null,
  expiresAt: null,
  permanent: false,
  source: 'local',
  sourceLabel: '在线授权层',
  stageLabel: '等待录入授权或邀请兑换',
  remainingLabel: '未激活',
  activatedAt: null,
  lastValidatedAt: null,
  rollbackDetected: false,
  graceExpiresAt: null,
});

export const createTrialLicense = (): LicenseSummary => {
  const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();
  return {
    status: 'grace',
    licenseTypeLabel: '登录体验 / 1 天',
    durationKey: 'one-day',
    expiresAt,
    permanent: false,
    source: 'trial',
    sourceLabel: '在线账号体验',
    stageLabel: '登录后体验',
    remainingLabel: formatRemainingLabel(expiresAt, false),
    activatedAt: new Date().toISOString(),
    lastValidatedAt: new Date().toISOString(),
    rollbackDetected: false,
    graceExpiresAt: expiresAt,
  };
};

export const applyDurationToLicense = (
  current: LicenseSummary | null,
  duration: DurationDefinition,
  source: LicenseSummary['source'],
  sourceLabel: string,
  stageLabel: string,
): LicenseSummary => {
  const activatedAt = new Date().toISOString();
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
      rollbackDetected: current?.rollbackDetected ?? false,
      graceExpiresAt: null,
    };
  }

  const baseTime =
    current?.expiresAt && new Date(current.expiresAt).getTime() > Date.now()
      ? new Date(current.expiresAt).getTime()
      : Date.now();
  const expiresAt = new Date(baseTime + duration.days * ONE_DAY_MS).toISOString();

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
    rollbackDetected: current?.rollbackDetected ?? false,
    graceExpiresAt: source === 'trial' ? expiresAt : null,
  };
};

export const parseManualCode = (code: string): DurationDefinition => {
  const upper = code.toUpperCase();
  if (upper.includes('PERM') || upper.includes('FOREVER')) {
    return DURATION_MAP.permanent;
  }
  if (upper.includes('HALFYEAR') || upper.includes('180')) {
    return DURATION_MAP['half-year'];
  }
  if (upper.includes('MONTH') || upper.includes('30')) {
    return DURATION_MAP['one-month'];
  }
  if (upper.includes('HALF') || upper.includes('15')) {
    return DURATION_MAP['half-month'];
  }
  if (upper.includes('WEEK') || upper.includes('7D')) {
    return DURATION_MAP['one-week'];
  }
  return DURATION_MAP['one-day'];
};

export const rewardFromStage = (stage: number, slotsUsed: number): DurationDefinition => {
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
    return DURATION_MAP['invite-permanent'];
  }

  return {
    permanent: false,
    days: 30,
    typeLabel: '永久槽位已满 / 改发 +30 天',
    durationKey: 'one-month',
  };
};

export const buildInviteProgress = (
  inviteCode: string,
  requestedInviteCode: string | null,
  invitedCount: number,
  successfulCount: number,
  pendingRewardCount: number,
  slotsUsed: number,
  license: LicenseSummary,
): InviteProgress => {
  let nextRewardLabel: string | null = null;

  if (successfulCount <= 0) {
    nextRewardLabel = '+7 天';
  } else if (successfulCount === 1) {
    nextRewardLabel = '+30 天';
  } else if (successfulCount === 2) {
    nextRewardLabel = slotsUsed < MAX_PERMANENT_SLOTS ? '永久授权' : '+30 天（永久槽位已满）';
  }

  return {
    inviteCode,
    requestedInviteCode,
    invitedCount,
    successfulCount,
    progressLabel: `${Math.min(successfulCount, 3)}/3`,
    rewardPreview: [...REWARD_PREVIEW],
    slotsUsed,
    maxPermanentSlots: MAX_PERMANENT_SLOTS,
    eligible: isFormalLicense(license),
    nextRewardLabel,
    ruleSummary: INVITE_RULE_SUMMARY,
    pendingRewardCount,
  };
};
