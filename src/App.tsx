import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowUpCircle,
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  EllipsisVertical,
  ExternalLink,
  FolderOpen,
  KeyRound,
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import type {
  AuthActionResult,
  AuthFormMode,
  AuthState,
  BackupEntry,
  ExecutablePathSource,
  FileDialogResult,
  HeartbeatBootstrap,
  LicenseSummary,
  OpenClawModelOption,
  PlanType,
  ProfileSummary,
  ProfilesState,
  SwitchProgressEvent,
  SwitchMode,
  TrayCardState,
  UpdateActionResult,
  UpdateState,
  UsageQuota,
  UserProfile,
  WindowState,
} from '../shared/types';
import { AddProfileDialog, type ProfileFormValues } from './components/AddProfileDialog';
import {
  AboutDialog,
  type AboutDialogLinkItem,
  type AboutDialogProductItem,
  type AboutDialogQrItem,
} from './components/AboutDialog';
import { ConfirmActionDialog } from './components/ConfirmActionDialog';
import { FooterHelpCard, type FooterHelpCardQrItem } from './components/FooterHelpCard';
import { LicenseHostView } from './components/LicenseHostView';
import {
  type LicenseCenterSnapshot,
} from './components/LicenseCenterDialog';
import { UpdateDialog } from './components/UpdateDialog';
import {
  UserCenterDrawer,
  type UserCenterAuthForm,
  type UserCenterSession,
} from './components/UserCenterDrawer';
import { authClient } from './services/auth-client';
import './shell.css';

const OPENAI_BRAND_ICON_SRC = '/assets/icons/openai.png';
const APP_DISPLAY_NAME = 'Auth API Switcher';
const APP_SUBTITLE = '登录切换、更新检测、授权与邀请入口';
const APP_SUPPORT_EMAIL = '18705011741@qq.com';
const APP_REPOSITORY_URL = 'https://github.com/JerryC0820/Auth-API-SWITCHER';

const ABOUT_CONTACT_LINKS: AboutDialogLinkItem[] = [
  {
    id: 'repo',
    label: '项目仓库',
    description: '打开 GitHub 仓库与发布页',
    value: APP_REPOSITORY_URL,
    action: 'external',
  },
  {
    id: 'email',
    label: '联系邮箱',
    description: '通过邮件反馈问题、合作或授权需求',
    value: `mailto:${APP_SUPPORT_EMAIL}`,
    action: 'external',
  },
  {
    id: 'wechat',
    label: '客服微信',
    description: '当前尚未配置微信号，先保留复制入口位',
    value: '待配置微信号',
    action: 'disabled',
  },
];

const ABOUT_QR_ITEMS: AboutDialogQrItem[] = [
  {
    id: 'personal',
    title: '个人微信',
    subtitle: '扫码后可一对一沟通',
    hint: '扫码即可添加客服微信。',
    imageSrc: '/assets/support/wechat-support.png',
  },
  {
    id: 'group',
    title: '微信群',
    subtitle: '扫码加入用户群或测试群',
    hint: '群聊二维码敬请期待。',
  },
];

const ABOUT_PRODUCT_ITEMS: AboutDialogProductItem[] = [
  {
    id: 'switcher',
    title: 'Auth API Switcher',
    description: '当前主程序，用于多账号切换、更新检查和授权入口承载。',
    tag: 'Main App',
    url: APP_REPOSITORY_URL,
  },
  {
    id: 'release-center',
    title: 'Release Mirror Center',
    description: '面向静态 manifest、notes 与多源镜像的发布面板占位。',
    tag: 'Mock',
    url: APP_REPOSITORY_URL,
  },
  {
    id: 'openclaw',
    title: 'OpenClaw Link',
    description: '用于展示 OpenClaw 同步、模型切换和网关联动的相关产品位。',
    tag: 'Mock',
    url: APP_REPOSITORY_URL,
  },
  {
    id: 'license-service',
    title: 'License Service',
    description: '承载授权码、奖励码、邀请归因和设备归属的服务端能力占位。',
    tag: 'Mock',
    url: APP_REPOSITORY_URL,
  },
];

const FOOTER_HELP_QR_ITEMS: FooterHelpCardQrItem[] = [
  {
    id: 'help-personal',
    title: '客服二维码',
    subtitle: '个人联系入口',
    hint: '扫码即可添加客服微信。',
    imageSrc: '/assets/support/wechat-support.png',
  },
  {
    id: 'help-group',
    title: '群二维码',
    subtitle: '用户群 / 测试群',
    hint: '群聊二维码敬请期待。',
  },
];

const createEmptyHeartbeatBootstrap = (): HeartbeatBootstrap => ({
  checkedAt: '',
  serverTime: '',
  online: true,
  requiresOnline: true,
  graceExpiresAt: null,
  graceSecondsRemaining: 0,
  minSupportedVersion: null,
  mandatoryUpdate: false,
  allowCoreFeatures: true,
  notice: '当前使用本地 mock 在线层。',
});

const createEmptyLicenseSummary = (): LicenseSummary => ({
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

const createEmptyAuthState = (): AuthState => ({
  sessionStatus: 'guest',
  profile: null,
  device: {
    deviceId: 'DEV-UNKNOWN',
    fingerprintHash: 'unknown',
    fingerprintSummary: 'UNKN-OWNS-IGN',
    hostLabel: 'unknown',
    platformLabel: 'Unknown',
    machineName: 'Unknown',
  },
  license: createEmptyLicenseSummary(),
  invite: {
    inviteCode: 'INV-UNKNOWN',
    requestedInviteCode: null,
    invitedCount: 0,
    successfulCount: 0,
    progressLabel: '0/3',
    rewardPreview: ['首次成功 +7 天', '第二次成功 +30 天', '第三次成功 = 永久'],
    slotsUsed: 0,
    maxPermanentSlots: 4,
    eligible: false,
    nextRewardLabel: '+7 天',
    ruleSummary:
      '正式授权用户可申请 one-time invite code；新设备兑换成功后，邀请奖励按 7 天 / 30 天 / 永久 三阶段递增。',
    pendingRewardCount: 0,
  },
  inviteRecords: [],
  rewardRecords: [],
  bootstrap: createEmptyHeartbeatBootstrap(),
  lastAuthAction: null,
});

const createInitialAuthForm = (): UserCenterAuthForm => ({
  displayName: '',
  email: '',
  password: '',
  verificationCode: '',
  rememberMe: true,
});

const formatPreciseCountdown = (targetAt: string | null, nowMs: number): string => {
  if (!targetAt) {
    return '永久有效';
  }

  const targetMs = new Date(targetAt).getTime();
  if (Number.isNaN(targetMs)) {
    return '未记录';
  }

  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return '已到期';
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const isWorkspaceAuthorized = (authState: AuthState): boolean => {
  if (authState.license.permanent) {
    return true;
  }

  if (authState.license.status === 'active') {
    return true;
  }

  if (authState.license.status !== 'grace' || !authState.license.expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(authState.license.expiresAt).getTime();
  return !Number.isNaN(expiresAtMs) && expiresAtMs > Date.now();
};

const mapAuthStateToUserCenterSession = (authState: AuthState): UserCenterSession => ({
  status: authState.sessionStatus,
  displayName: authState.profile?.displayName ?? '未登录',
  email: authState.profile?.email ?? null,
  avatarText: authState.profile?.avatarText ?? 'U',
  hasAlert:
    authState.license.rollbackDetected ||
    authState.bootstrap.mandatoryUpdate ||
    !isWorkspaceAuthorized(authState),
  licenseLabel: authState.license.licenseTypeLabel,
  remainingLabel: authState.license.remainingLabel,
  expiresAt: authState.license.expiresAt,
  deviceId: authState.device.deviceId,
  fingerprintSummary: authState.device.fingerprintSummary,
  fingerprintHash: authState.device.fingerprintHash,
  inviteCode: authState.invite.requestedInviteCode ?? authState.invite.inviteCode,
  invitedCount: authState.invite.invitedCount,
  inviteProgressLabel: authState.invite.progressLabel,
  bootstrapNotice: authState.bootstrap.notice,
});

const mapAuthStateToLicenseSnapshot = (authState: AuthState): LicenseCenterSnapshot => ({
  licenseType: authState.license.licenseTypeLabel,
  expiresAt: authState.license.expiresAt,
  permanent: authState.license.permanent,
  sourceLabel: authState.license.sourceLabel,
  stageLabel: authState.license.stageLabel,
  remainingLabel: authState.license.remainingLabel,
  deviceId: authState.device.deviceId,
  fingerprintSummary: authState.device.fingerprintSummary,
  inviteCode: authState.invite.inviteCode,
  requestedInviteCode: authState.invite.requestedInviteCode,
  inviteRule: authState.invite.ruleSummary,
  inviteProgressLabel: authState.invite.progressLabel,
  rewardPreview: authState.invite.rewardPreview,
  inviteSlotsText: `邀请永久槽位 ${authState.invite.slotsUsed}/${authState.invite.maxPermanentSlots}`,
  pendingRewardCount: authState.invite.pendingRewardCount,
  eligibleForInvite: authState.invite.eligible,
  nextRewardLabel: authState.invite.nextRewardLabel,
  inviteRecords: authState.inviteRecords.map((item) => ({
    id: item.id,
    time: item.createdAt,
    target: item.targetLabel,
    result: item.result,
    reward: item.rewardLabel,
  })),
  rewardRecords: authState.rewardRecords.map((item) => ({
    id: item.id,
    time: item.createdAt,
    target: `奖励码 ${item.code}`,
    result: item.result,
    reward: item.rewardLabel,
  })),
  bootstrapNotice: authState.bootstrap.notice,
});

type BusyAction = 'initial' | 'refresh' | 'add' | 'edit' | 'switch' | 'delete' | 'root' | null;
type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  tone: ToastTone;
  message: string;
}

interface AvatarUploadDraft {
  fileName: string;
  fileSize: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceType: string;
  sourceDataUrl: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  minScale: number;
  maxScale: number;
}

interface AvatarRenderMetrics {
  renderWidth: number;
  renderHeight: number;
  maxOffsetX: number;
  maxOffsetY: number;
}

interface QuotaAlertSuggestion {
  activeProfile: ProfileSummary;
  recommendedProfile: ProfileSummary;
  threshold: number;
  breachedLabels: string[];
  warningKey: string;
}

interface CenterNotice {
  id: string;
  message: string;
}

interface PendingAddOverwriteState {
  target: ProfileSummary;
  values: ProfileFormValues;
}

interface SwitchSuccessNotice {
  name: string;
  workspaceName: string;
  activatedAt: string;
  switchMode: SwitchMode;
  codexTraeAutoRestart: boolean;
  restartedDesktopApps: string[];
  openclawSynced: boolean;
  openclawGatewayRestarted: boolean;
  openclawModel: string | null;
  openclawModelLabel: string | null;
  openclawModelChanged: boolean;
  warnings: string[];
}

const SWITCH_PROGRESS_STEP_ORDER: Record<SwitchProgressEvent['stepKey'], number> = {
  prepare: 0,
  'switch-auth': 1,
  'desktop-stop': 2,
  'desktop-start': 3,
  'openclaw-sync': 4,
  'openclaw-model': 5,
  'openclaw-gateway': 6,
  'quota-sync': 7,
  complete: 8,
};

interface AutoSwitchPromptState {
  suggestion: QuotaAlertSuggestion;
  startedAt: number;
  deadlineAt: number;
}

type SimulationPlanType = 'Free' | 'Plus' | 'Pro' | 'Team' | 'Business';
type DisplayPlanType = PlanType | SimulationPlanType;
type PlanFilterValue = 'ALL' | DisplayPlanType;
type HiddenModeDialogMode = 'unlock' | 'setup' | 'change';

interface DisplayProfile extends ProfileSummary {
  simulatedPlanType?: SimulationPlanType;
}

interface SimulatedProfileSeed {
  id: string;
  storageDirName: string;
  name: string;
  workspaceName: string;
  notes: string;
  planType: PlanType;
  simulatedPlanType: SimulationPlanType;
  authFilePath: string;
  createdAt: string;
  updatedAt: string;
  usageUpdatedAt: string;
  lastActivatedAt: string;
  weeklyBaseResetAtMs: number;
  weeklyCycleSeconds: number;
  fiveHourBaseResetAtMs: number;
  fiveHourCycleSeconds: number;
  reviewBaseResetAtMs: number;
  reviewCycleSeconds: number;
}

const IS_TRAY_CARD_VIEW =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('view') === 'tray-card';
const IS_LICENSE_HOST_VIEW =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('view') === 'license-host';

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  }

  return `${sizeBytes}B`;
};

const getProfileDisplayName = (
  profile?: Pick<ProfileSummary, 'name' | 'workspaceName'> | null,
): string => {
  const primary = profile?.name?.trim();
  if (primary) {
    return primary;
  }

  const fallback = profile?.workspaceName?.trim();
  return fallback || '未识别';
};

const upsertSwitchProgressEvent = (
  current: SwitchProgressEvent[],
  nextEvent: SwitchProgressEvent,
): SwitchProgressEvent[] => {
  const next = current.filter((item) => item.stepKey !== nextEvent.stepKey);
  next.push(nextEvent);
  next.sort((left, right) => {
    const orderDiff =
      SWITCH_PROGRESS_STEP_ORDER[left.stepKey] - SWITCH_PROGRESS_STEP_ORDER[right.stepKey];
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return left.timestamp.localeCompare(right.timestamp);
  });
  return next;
};

const getSwitchProgressStatusText = (status: SwitchProgressEvent['status']): string => {
  switch (status) {
    case 'success':
      return '已完成';
    case 'warning':
      return '需注意';
    case 'error':
      return '失败';
    default:
      return '进行中';
  }
};

const hasQuotaData = (quota: UsageQuota): boolean =>
  Boolean(quota.configured) || quota.source === 'detected' || quota.source === 'live';

const getQuotaSourceText = (quota: UsageQuota): string => {
  if (quota.source === 'live') {
    return '实时同步';
  }

  if (quota.source === 'detected') {
    return '本地缓存';
  }

  if (hasQuotaData(quota)) {
    return '手动维护';
  }

  return '未识别';
};

const getRemainingPercent = (quota: UsageQuota): number =>
  hasQuotaData(quota) ? Math.max(0, 100 - quota.percentUsed) : 0;

const getQuotaTone = (quota: UsageQuota): 'ok' | 'warn' | 'danger' | 'idle' => {
  if (!hasQuotaData(quota)) {
    return 'idle';
  }

  const remaining = getRemainingPercent(quota);

  if (remaining <= 20) {
    return 'danger';
  }

  if (remaining <= 45) {
    return 'warn';
  }

  return 'ok';
};

const getQuotaBarClassName = (quota: UsageQuota): string => {
  switch (getQuotaTone(quota)) {
    case 'danger':
      return 'quota-fill is-danger';
    case 'warn':
      return 'quota-fill is-warn';
    case 'idle':
      return 'quota-fill is-idle';
    default:
      return 'quota-fill is-ok';
  }
};

const getAuthStatusText = (profile: ProfileSummary): string => {
  if (profile.manuallyDisabled) {
    return '已停用';
  }

  switch (profile.authStatus) {
    case 'missing':
      return '文件缺失';
    case 'path-error':
      return '路径异常';
    default:
      return '认证正常';
  }
};

const mapPlanLabel = (planType: DisplayPlanType): string => {
  switch (planType) {
    case 'Free':
      return 'FREE';
    case 'Plus':
      return 'PLUS';
    case 'Pro':
      return 'PRO';
    case 'Team':
      return 'TEAM';
    case 'Business':
      return 'BUSSINESS';
    default:
      return 'UNKNOWN';
  }
};

const getPlanBadgeClassName = (planType: DisplayPlanType): string => {
  switch (planType) {
    case 'Plus':
    case 'Pro':
      return 'badge--plan-plus';
    default:
      return '';
  }
};

const getDisplayPlanType = (
  profile: Pick<DisplayProfile, 'planType' | 'simulatedPlanType'>,
): DisplayPlanType => profile.simulatedPlanType ?? profile.planType;

const mapSwitchModeLabel = (mode: SwitchMode): string =>
  mode === 'openclaw' ? 'OpenClaw' : 'Codex / Trae';

const mapExecutableSourceLabel = (source: ExecutablePathSource): string => {
  switch (source) {
    case 'manual':
      return '手动定位';
    case 'running':
      return '自动识别：运行中实例';
    case 'common':
      return '自动识别：常见安装目录';
    default:
      return '未识别';
  }
};

const chooseExecutableFileWithFallback = async (title: string): Promise<FileDialogResult> => {
  const runtimeApi = window.codexWorkspace as {
    chooseExecutableFile?: (dialogTitle?: string) => Promise<FileDialogResult>;
  };

  if (typeof runtimeApi.chooseExecutableFile === 'function') {
    return runtimeApi.chooseExecutableFile(title);
  }

  return new Promise<FileDialogResult>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.exe';
    input.style.display = 'none';

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0] as (File & { path?: string }) | undefined;
        const filePath = typeof file?.path === 'string' ? file.path.trim() : '';
        cleanup();

        if (!file) {
          resolve({ canceled: true });
          return;
        }

        if (filePath) {
          resolve({ canceled: false, filePath });
          return;
        }

        reject(new Error('当前窗口未加载新版桌面文件选择接口，请重启应用后再选择可执行文件。'));
      },
      { once: true },
    );

    input.addEventListener(
      'cancel',
      () => {
        cleanup();
        resolve({ canceled: true });
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
};

const getProfileRoleBadge = (
  profile: ProfileSummary,
): { label: string; className: string } => {
  if (profile.isActive) {
    return { label: '当前空间', className: 'badge--role-current' };
  }

  if (profile.storageDirName.startsWith('current-auth') || profile.notes.includes('当前')) {
    return { label: '其他空间', className: 'badge--role-backup' };
  }

  return { label: '其他空间', className: 'badge--role-saved' };
};

const getProfileAvailability = (
  profile: ProfileSummary,
): {
  isUnavailable: boolean;
  badgeLabel: string | null;
  footerText: string | null;
} => {
  if (profile.manuallyDisabled) {
    return {
      isUnavailable: true,
      badgeLabel: '已停用',
      footerText: '已手动标记停用',
    };
  }

  if (profile.authStatus === 'missing') {
    return {
      isUnavailable: true,
      badgeLabel: '空间停用',
      footerText: 'auth.json 已丢失',
    };
  }

  if (profile.authStatus === 'path-error') {
    return {
      isUnavailable: true,
      badgeLabel: '空间停用',
      footerText: '目录路径异常',
    };
  }

  const usageError = (profile.usageError || '').toLowerCase();
  if (
    usageError.includes('401') ||
    usageError.includes('403') ||
    usageError.includes('unauthorized') ||
    usageError.includes('forbidden') ||
    usageError.includes('token')
  ) {
    return {
      isUnavailable: true,
      badgeLabel: '空间停用',
      footerText: '认证失效或已过期',
    };
  }

  return {
    isUnavailable: false,
    badgeLabel: null,
    footerText: null,
  };
};

const getProfileAuthToneClassName = (profile: ProfileSummary): string =>
  profile.manuallyDisabled ? 'manualdisabled' : profile.authStatus.replace('-', '');

const formatCountdown = (targetAt: string | null, nowMs: number): string | null => {
  if (!targetAt) {
    return null;
  }

  const targetMs = new Date(targetAt).getTime();
  if (Number.isNaN(targetMs)) {
    return null;
  }

  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return '即将刷新';
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getCountdownTone = (targetAt: string | null, nowMs: number): 'ok' | 'warn' | 'danger' | 'idle' => {
  if (!targetAt) {
    return 'idle';
  }

  const targetMs = new Date(targetAt).getTime();
  if (Number.isNaN(targetMs)) {
    return 'idle';
  }

  const diff = targetMs - nowMs;
  if (diff <= 60 * 60 * 1000) {
    return 'danger';
  }

  if (diff <= 12 * 60 * 60 * 1000) {
    return 'warn';
  }

  return 'ok';
};

const didQuotaReset = (previous: UsageQuota | undefined, next: UsageQuota): boolean => {
  if (!previous || !hasQuotaData(previous) || !hasQuotaData(next) || !previous.resetAt || !next.resetAt) {
    return false;
  }

  const previousResetAt = new Date(previous.resetAt).getTime();
  const nextResetAt = new Date(next.resetAt).getTime();
  if (Number.isNaN(previousResetAt) || Number.isNaN(nextResetAt) || nextResetAt <= previousResetAt) {
    return false;
  }

  return next.percentUsed < previous.percentUsed && (previous.percentUsed - next.percentUsed >= 15 || next.percentUsed <= 12);
};

const createEmptyState = (): ProfilesState => ({
  profiles: [],
  settings: {
    profilesRootDir: 'C:\\codex-profiles',
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
  },
  lastScannedAt: new Date(0).toISOString(),
  logs: [],
  backups: [],
  summary: {
    activeProfileName: null,
    currentAuthExists: false,
    authRecognized: false,
    currentAuthSuggestedName: null,
    currentAuthSuggestedWorkspaceName: null,
    currentAuthSuggestedPlanType: 'Unknown',
    profilesCount: 0,
    backupBeforeSwitch: true,
    lastSwitchedAt: null,
    overallRemainingPercent: null,
    currentAuthPath: '',
    codexExecutablePath: null,
    codexExecutablePathSource: 'missing',
    traeExecutablePath: null,
    traeExecutablePathSource: 'missing',
    openclawStateDir: '',
    openclawGatewayCommandPath: null,
    openclawGatewayAvailable: false,
    openclawCurrentModel: null,
    openclawAvailableModels: [],
  },
});

const createEmptyUpdateState = (): UpdateState => ({
  appId: 'com.openai.codex.workspace-switcher',
  currentVersion: '0.0.0',
  currentReleaseTime: null,
  currentPlatform: 'win',
  channel: 'stable',
  override: null,
  allowPrerelease: false,
  testerId: null,
  availability: 'idle',
  updateAvailable: false,
  updateKind: null,
  blockedByMandatory: false,
  mandatory: false,
  minSupportedVersion: null,
  lastCheckedAt: null,
  lastDownloadedAt: null,
  sourceName: null,
  sourceUrl: null,
  errorMessage: null,
  manifest: null,
  downloadFilePath: null,
});

const mapUpdateChannelLabel = (channel: UpdateState['channel']): string => {
  switch (channel) {
    case 'beta':
      return '公测';
    case 'canary':
      return '测试';
    default:
      return '正式';
  }
};

const mapUpdateSourceLabel = (sourceName: UpdateState['sourceName']): string => {
  switch (sourceName) {
    case 'github':
      return 'GitHub';
    case 'gitee':
      return 'Gitee';
    case 'custom':
      return '自定义';
    default:
      return '未检查';
  }
};

const mapUpdateAvailabilityLabel = (updateState: UpdateState): string => {
  switch (updateState.availability) {
    case 'checking':
      return '检查中';
    case 'unconfigured':
      return '未配置更新源';
    case 'available':
      return updateState.updateKind === 'patch' ? '发现新修复' : '发现新版本';
    case 'downloading':
      return '下载中';
    case 'ready':
      return updateState.currentPlatform === 'win' ? '安装器就绪' : '下载完成';
    case 'required':
      return '必须更新';
    case 'error':
      return '检查失败';
    case 'up-to-date':
      return '已是最新';
    default:
      return '待检查';
  }
};

const getUpdateActionTone = (
  result: UpdateActionResult,
): ToastTone => {
  if (result.state.availability === 'error') {
    return 'error';
  }

  if (result.state.availability === 'available' || result.state.availability === 'required') {
    return 'success';
  }

  return 'info';
};

const getRemainingPercentOrNull = (quota: UsageQuota): number | null =>
  hasQuotaData(quota) ? Math.max(0, 100 - quota.percentUsed) : null;

const getRecommendationPlanBonus = (planType: PlanType): number => {
  switch (planType) {
    case 'Business':
      return 22;
    case 'Team':
      return 14;
    case 'Pro':
      return 8;
    case 'Plus':
      return 8;
    case 'Free':
      return 0;
    default:
      return 4;
  }
};

const getRecommendationScore = (profile: ProfileSummary): number => {
  const availability = getProfileAvailability(profile);
  if (profile.isActive || profile.authStatus !== 'ok' || availability.isUnavailable) {
    return Number.NEGATIVE_INFINITY;
  }

  const weeklyRemaining = getRemainingPercentOrNull(profile.weeklyQuota) ?? 58;
  const fiveHourRemaining = getRemainingPercentOrNull(profile.fiveHourQuota) ?? 58;
  const liveBonus =
    (profile.weeklyQuota.source === 'live' ? 6 : 0) +
    (profile.fiveHourQuota.source === 'live' ? 6 : 0);
  const recencyBonus = profile.lastActivatedAt ? 3 : 0;

  return (
    weeklyRemaining * 0.55 +
    fiveHourRemaining * 0.45 +
    getRecommendationPlanBonus(profile.planType) +
    liveBonus +
    recencyBonus
  );
};

const getOpenClawModelLabel = (
  modelKey: string | null | undefined,
  options: OpenClawModelOption[],
): string => {
  const normalized = modelKey?.trim() ?? '';
  if (!normalized) {
    return '未选择';
  }

  return options.find((item) => item.key === normalized)?.label ?? normalized;
};

const OPENCLAW_SWITCH_MODEL_PROVIDER = 'openai-codex';

const isOpenClawSwitchModelOptionAllowed = (
  option: Pick<OpenClawModelOption, 'provider' | 'key'>,
): boolean => {
  const normalizedProvider = option.provider.trim().toLowerCase();
  const normalizedKey = option.key.trim().toLowerCase();
  return (
    normalizedProvider === OPENCLAW_SWITCH_MODEL_PROVIDER ||
    normalizedKey.startsWith(`${OPENCLAW_SWITCH_MODEL_PROVIDER}/`)
  );
};

const buildOpenClawSwitchModelOptions = (
  options: OpenClawModelOption[],
  currentModel: string | null | undefined,
): OpenClawModelOption[] => {
  const allowedOptions = options.filter(isOpenClawSwitchModelOptionAllowed);
  if (allowedOptions.length > 0) {
    return allowedOptions;
  }

  const normalizedCurrent = currentModel?.trim() ?? '';
  if (!normalizedCurrent.toLowerCase().startsWith(`${OPENCLAW_SWITCH_MODEL_PROVIDER}/`)) {
    return [];
  }

  const slashIndex = normalizedCurrent.indexOf('/');
  return [
    {
      key: normalizedCurrent,
      label: getOpenClawModelLabel(normalizedCurrent, options),
      provider: OPENCLAW_SWITCH_MODEL_PROVIDER,
      modelId: slashIndex >= 0 ? normalizedCurrent.slice(slashIndex + 1) : normalizedCurrent,
    },
  ];
};

const LOCAL_SIMULATION_PREFIXES = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'j',
  'k',
  'm',
  'n',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
] as const;
const LOCAL_SIMULATION_PLAN_TYPES: SimulationPlanType[] = [
  'Free',
  'Plus',
  'Pro',
  'Team',
  'Business',
];
const DISPLAY_PLAN_FILTER_ORDER: DisplayPlanType[] = [
  'Free',
  'Plus',
  'Pro',
  'Team',
  'Business',
  'Unknown',
];
const LOCAL_SIMULATION_PLAN_TYPE_MAP: Record<SimulationPlanType, PlanType> = {
  Free: 'Free',
  Plus: 'Plus',
  Pro: 'Pro',
  Team: 'Team',
  Business: 'Business',
};
const LOCAL_HIDDEN_MODE_PASSWORD_STORAGE_KEY = 'codex-workspace.hidden-mode-password';
const LOCAL_SPECIAL_FEATURE_SETTINGS_STORAGE_KEY = 'codex-workspace.special-feature-settings';
const LOCAL_AVATAR_STORAGE_PREFIX = 'codex-workspace.avatar';
const LOCAL_USER_CENTER_BRAND_FRAME_STORAGE_KEY = 'codex-workspace.user-center-brand-frame';
const AVATAR_OUTPUT_SIZE = 192;
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_LOCAL_SIMULATION_SETTINGS = {
  enabled: false,
  cardCount: 12,
  planTypes: LOCAL_SIMULATION_PLAN_TYPES,
} as const;

const isSimulationPlanType = (value: string): value is SimulationPlanType =>
  LOCAL_SIMULATION_PLAN_TYPES.includes(value as SimulationPlanType);

const loadHiddenModePassword = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(LOCAL_HIDDEN_MODE_PASSWORD_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
};

const persistHiddenModePassword = (value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const normalized = value.trim();
    if (normalized) {
      window.localStorage.setItem(LOCAL_HIDDEN_MODE_PASSWORD_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(LOCAL_HIDDEN_MODE_PASSWORD_STORAGE_KEY);
    }
  } catch {
    // Ignore local-only storage failures and keep the UI functional.
  }
};

const getAvatarStorageKey = (profile: Pick<UserProfile, 'id' | 'email'> | null | undefined): string | null => {
  if (!profile) {
    return null;
  }

  const idPart = profile.id?.trim();
  if (idPart) {
    return `${LOCAL_AVATAR_STORAGE_PREFIX}:${idPart}`;
  }

  const emailPart = profile.email?.trim().toLowerCase();
  return emailPart ? `${LOCAL_AVATAR_STORAGE_PREFIX}:${emailPart}` : null;
};

const loadStoredAvatar = (profile: Pick<UserProfile, 'id' | 'email'> | null | undefined): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storageKey = getAvatarStorageKey(profile);
  if (!storageKey) {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const persistStoredAvatar = (
  profile: Pick<UserProfile, 'id' | 'email'> | null | undefined,
  avatarDataUrl: string,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getAvatarStorageKey(profile);
  if (!storageKey) {
    return;
  }

  window.localStorage.setItem(storageKey, avatarDataUrl);
};

const loadUserCenterBrandFrameEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(LOCAL_USER_CENTER_BRAND_FRAME_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const persistUserCenterBrandFrameEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_USER_CENTER_BRAND_FRAME_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore local-only preference write failures and keep the UI functional.
  }
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取头像文件失败。'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('头像文件格式不受支持。'));
    };
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('头像图片加载失败。'));
    image.src = src;
  });

const buildAvatarRenderMetrics = (
  sourceWidth: number,
  sourceHeight: number,
  scale: number,
): AvatarRenderMetrics => {
  const fitScale = Math.min(AVATAR_OUTPUT_SIZE / sourceWidth, AVATAR_OUTPUT_SIZE / sourceHeight);
  const renderWidth = Math.max(1, Math.round(sourceWidth * fitScale * scale));
  const renderHeight = Math.max(1, Math.round(sourceHeight * fitScale * scale));
  return {
    renderWidth,
    renderHeight,
    maxOffsetX: Math.max(0, Math.round(Math.abs(renderWidth - AVATAR_OUTPUT_SIZE) / 2)),
    maxOffsetY: Math.max(0, Math.round(Math.abs(renderHeight - AVATAR_OUTPUT_SIZE) / 2)),
  };
};

const clampAvatarUploadDraft = (draft: AvatarUploadDraft): AvatarUploadDraft => {
  const nextScale = clampNumber(draft.scale, draft.minScale, draft.maxScale);
  const metrics = buildAvatarRenderMetrics(draft.sourceWidth, draft.sourceHeight, nextScale);
  return {
    ...draft,
    scale: nextScale,
    offsetX: clampNumber(draft.offsetX, -metrics.maxOffsetX, metrics.maxOffsetX),
    offsetY: clampNumber(draft.offsetY, -metrics.maxOffsetY, metrics.maxOffsetY),
  };
};

const buildAvatarDataUrl = async (draft: AvatarUploadDraft): Promise<string> => {
  const image = await loadImageElement(draft.sourceDataUrl);
  const normalizedDraft = clampAvatarUploadDraft(draft);
  const metrics = buildAvatarRenderMetrics(
    normalizedDraft.sourceWidth,
    normalizedDraft.sourceHeight,
    normalizedDraft.scale,
  );
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    return normalizedDraft.sourceDataUrl;
  }

  context.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  const drawX = Math.round((AVATAR_OUTPUT_SIZE - metrics.renderWidth) / 2 + normalizedDraft.offsetX);
  const drawY = Math.round((AVATAR_OUTPUT_SIZE - metrics.renderHeight) / 2 + normalizedDraft.offsetY);
  context.drawImage(
    image,
    drawX,
    drawY,
    metrics.renderWidth,
    metrics.renderHeight,
  );
  return canvas.toDataURL('image/png');
};

const prepareAvatarUploadDraft = async (file: File): Promise<AvatarUploadDraft> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片格式的头像文件。');
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error('头像图片不能超过 5MB。');
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceDataUrl);
  return {
    fileName: file.name,
    fileSize: file.size,
    sourceWidth: image.naturalWidth,
    sourceHeight: image.naturalHeight,
    sourceType: file.type || 'image/*',
    sourceDataUrl,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale: 1,
    maxScale: 3,
  };
};

const formatAvatarFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
};

const loadLocalSimulationSettings = (): {
  enabled: boolean;
  cardCount: number;
  planTypes: SimulationPlanType[];
} => {
  if (typeof window === 'undefined') {
    return {
      enabled: DEFAULT_LOCAL_SIMULATION_SETTINGS.enabled,
      cardCount: DEFAULT_LOCAL_SIMULATION_SETTINGS.cardCount,
      planTypes: [...DEFAULT_LOCAL_SIMULATION_SETTINGS.planTypes],
    };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_SPECIAL_FEATURE_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        enabled: DEFAULT_LOCAL_SIMULATION_SETTINGS.enabled,
        cardCount: DEFAULT_LOCAL_SIMULATION_SETTINGS.cardCount,
        planTypes: [...DEFAULT_LOCAL_SIMULATION_SETTINGS.planTypes],
      };
    }

    const parsed = JSON.parse(raw) as Partial<{
      enabled: boolean;
      cardCount: number;
      planTypes: string[];
    }>;
    const planTypes = Array.isArray(parsed.planTypes)
      ? LOCAL_SIMULATION_PLAN_TYPES.filter((planType) => parsed.planTypes?.some((item) => item === planType))
      : [...DEFAULT_LOCAL_SIMULATION_SETTINGS.planTypes];

    return {
      enabled: parsed.enabled === true,
      cardCount: clampSimulationCardCount(parsed.cardCount ?? DEFAULT_LOCAL_SIMULATION_SETTINGS.cardCount),
      planTypes:
        planTypes.length > 0 || Array.isArray(parsed.planTypes)
          ? planTypes.filter(isSimulationPlanType)
          : [...DEFAULT_LOCAL_SIMULATION_SETTINGS.planTypes],
    };
  } catch {
    return {
      enabled: DEFAULT_LOCAL_SIMULATION_SETTINGS.enabled,
      cardCount: DEFAULT_LOCAL_SIMULATION_SETTINGS.cardCount,
      planTypes: [...DEFAULT_LOCAL_SIMULATION_SETTINGS.planTypes],
    };
  }
};

const persistLocalSimulationSettings = (settings: {
  enabled: boolean;
  cardCount: number;
  planTypes: SimulationPlanType[];
}): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      LOCAL_SPECIAL_FEATURE_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        enabled: settings.enabled,
        cardCount: clampSimulationCardCount(settings.cardCount),
        planTypes: LOCAL_SIMULATION_PLAN_TYPES.filter((planType) => settings.planTypes.includes(planType)),
      }),
    );
  } catch {
    // Ignore local-only storage failures and keep the UI functional.
  }
};

const toggleSimulationPlanType = (
  current: SimulationPlanType[],
  target: SimulationPlanType,
): SimulationPlanType[] => {
  const nextSet = new Set(current);
  if (nextSet.has(target)) {
    nextSet.delete(target);
  } else {
    nextSet.add(target);
  }

  return LOCAL_SIMULATION_PLAN_TYPES.filter((planType) => nextSet.has(planType));
};

const clampSimulationCardCount = (value: number): number =>
  Math.max(1, Math.min(60, Math.round(value)));

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getRandomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFutureIso = (minSeconds: number, maxSeconds: number): string =>
  new Date(Date.now() + getRandomInt(minSeconds, maxSeconds) * 1000).toISOString();

const randomPastIso = (minSeconds: number, maxSeconds: number): string =>
  new Date(Date.now() - getRandomInt(minSeconds, maxSeconds) * 1000).toISOString();

const getRollingResetAt = (
  baseResetAtMs: number,
  cycleSeconds: number,
  nowMs: number,
): string => {
  const cycleMs = cycleSeconds * 1000;
  if (baseResetAtMs > nowMs) {
    return new Date(baseResetAtMs).toISOString();
  }

  const cyclesPassed = Math.floor((nowMs - baseResetAtMs) / cycleMs) + 1;
  return new Date(baseResetAtMs + cyclesPassed * cycleMs).toISOString();
};

const buildSimulatedQuota = (
  baseResetAtMs: number,
  cycleSeconds: number,
  nowMs: number,
): UsageQuota => ({
  percentUsed: 0,
  resetAt: getRollingResetAt(baseResetAtMs, cycleSeconds, nowMs),
  source: 'live',
  label: null,
  configured: true,
});

const buildSimulatedProfileSeeds = (
  count: number,
  selectedPlanTypes: SimulationPlanType[],
): SimulatedProfileSeed[] => {
  if (selectedPlanTypes.length === 0) {
    return [];
  }

  return Array.from({ length: clampSimulationCardCount(count) }, (_, index) => {
    const prefix = LOCAL_SIMULATION_PREFIXES[index % LOCAL_SIMULATION_PREFIXES.length];
    const suffix = String((index * 17 + getRandomInt(11, 96)) % 100).padStart(2, '0');
    const name = `${prefix}${suffix}`;
    const simulatedPlanType = selectedPlanTypes[index % selectedPlanTypes.length];
    const lastActivatedAt = randomPastIso(15 * 60, 8 * 24 * 60 * 60);
    const updatedAt = randomPastIso(5 * 60, 5 * 24 * 60 * 60);
    const usageUpdatedAt = randomPastIso(60, 3 * 60 * 60);
    const createdAt = randomPastIso(20 * 24 * 60 * 60, 120 * 24 * 60 * 60);

    return {
      id: `sim:${name}:${index}`,
      storageDirName: `sim-${name}-${index + 1}`,
      name,
      workspaceName: name,
      notes: '',
      planType: LOCAL_SIMULATION_PLAN_TYPE_MAP[simulatedPlanType],
      simulatedPlanType,
      authFilePath: `C:\\simulated\\${name}\\auth.json`,
      createdAt,
      updatedAt,
      usageUpdatedAt,
      lastActivatedAt,
      weeklyBaseResetAtMs: new Date(randomFutureIso(30 * 60, 7 * 24 * 60 * 60)).getTime(),
      weeklyCycleSeconds: 7 * 24 * 60 * 60,
      fiveHourBaseResetAtMs: new Date(randomFutureIso(8 * 60, 5 * 60 * 60)).getTime(),
      fiveHourCycleSeconds: 5 * 60 * 60,
      reviewBaseResetAtMs: new Date(randomFutureIso(2 * 60 * 60, 6 * 24 * 60 * 60)).getTime(),
      reviewCycleSeconds: 7 * 24 * 60 * 60,
    };
  });
};

const materializeSimulatedProfiles = (
  seeds: SimulatedProfileSeed[],
  nowMs: number,
): DisplayProfile[] =>
  seeds.map((seed) => ({
    id: seed.id,
    storageDirName: seed.storageDirName,
    name: seed.name,
    workspaceName: seed.workspaceName,
    notes: seed.notes,
    planType: seed.planType,
    manuallyDisabled: false,
    simulatedPlanType: seed.simulatedPlanType,
    authFilePath: seed.authFilePath,
    weeklyQuota: buildSimulatedQuota(seed.weeklyBaseResetAtMs, seed.weeklyCycleSeconds, nowMs),
    fiveHourQuota: buildSimulatedQuota(seed.fiveHourBaseResetAtMs, seed.fiveHourCycleSeconds, nowMs),
    reviewQuota: buildSimulatedQuota(seed.reviewBaseResetAtMs, seed.reviewCycleSeconds, nowMs),
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
    usageUpdatedAt: seed.usageUpdatedAt,
    usageError: null,
    lastActivatedAt: seed.lastActivatedAt,
    authStatus: 'ok',
    isActive: false,
  }));

const isSimulatedProfile = (profile: Pick<ProfileSummary, 'id'>): boolean => profile.id.startsWith('sim:');

const getQuotaAlertSuggestion = (
  profiles: ProfileSummary[],
  threshold: number,
  enabled: boolean,
): QuotaAlertSuggestion | null => {
  if (!enabled) {
    return null;
  }

  const activeProfile = profiles.find((profile) => profile.isActive);
  if (!activeProfile) {
    return null;
  }

  const weeklyRemaining = getRemainingPercentOrNull(activeProfile.weeklyQuota);
  const fiveHourRemaining = getRemainingPercentOrNull(activeProfile.fiveHourQuota);
  const breachedLabels = [
    weeklyRemaining !== null && weeklyRemaining <= threshold ? '周额度' : null,
    fiveHourRemaining !== null && fiveHourRemaining <= threshold ? '5 小时额度' : null,
  ].filter((value): value is string => Boolean(value));

  if (breachedLabels.length === 0) {
    return null;
  }

  const recommendedProfile = [...profiles]
    .filter((profile) => {
      if (profile.id === activeProfile.id) {
        return false;
      }

      const weeklyRemaining = getRemainingPercentOrNull(profile.weeklyQuota);
      const fiveHourRemaining = getRemainingPercentOrNull(profile.fiveHourQuota);

      if (
        breachedLabels.includes('周额度') &&
        weeklyRemaining !== null &&
        weeklyRemaining <= threshold
      ) {
        return false;
      }

      if (
        breachedLabels.includes('5 小时额度') &&
        fiveHourRemaining !== null &&
        fiveHourRemaining <= threshold
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => getRecommendationScore(right) - getRecommendationScore(left))[0];

  if (!recommendedProfile || !Number.isFinite(getRecommendationScore(recommendedProfile))) {
    return null;
  }

  return {
    activeProfile,
    recommendedProfile,
    threshold,
    breachedLabels,
    warningKey: [
      activeProfile.id,
      recommendedProfile.id,
      threshold,
      breachedLabels.join('|'),
      weeklyRemaining ?? 'na',
      fiveHourRemaining ?? 'na',
    ].join(':'),
  };
};

export default function App() {
  if (IS_TRAY_CARD_VIEW) {
    return <TrayHoverCardApp />;
  }

  if (IS_LICENSE_HOST_VIEW) {
    return <LicenseHostView />;
  }

  const isLocalSimulationAvailable = import.meta.env.DEV;
  const initialLocalSimulationSettings = isLocalSimulationAvailable
    ? loadLocalSimulationSettings()
    : {
        enabled: DEFAULT_LOCAL_SIMULATION_SETTINGS.enabled,
        cardCount: DEFAULT_LOCAL_SIMULATION_SETTINGS.cardCount,
        planTypes: [...DEFAULT_LOCAL_SIMULATION_SETTINGS.planTypes],
      };
  const [state, setState] = useState<ProfilesState>(createEmptyState);
  const [busyAction, setBusyAction] = useState<BusyAction>('initial');
  const [updateBusyAction, setUpdateBusyAction] = useState<'check' | 'install' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [updateState, setUpdateState] = useState<UpdateState>(createEmptyUpdateState);
  const [authState, setAuthState] = useState<AuthState>(createEmptyAuthState);
  const [authBusyAction, setAuthBusyAction] = useState<
    'login' | 'register' | 'forgot' | 'activation' | 'reward' | 'request-invite' | 'redeem-invite' | 'claim-reward' | null
  >(null);
  const [authMode, setAuthMode] = useState<AuthFormMode>('login');
  const [authForm, setAuthForm] = useState<UserCenterAuthForm>(createInitialAuthForm);
  const [authGateActivationCode, setAuthGateActivationCode] = useState('');
  const [authGateRewardCode, setAuthGateRewardCode] = useState('');
  const [authGateInviteCode, setAuthGateInviteCode] = useState('');
  const [authGateNowMs, setAuthGateNowMs] = useState(() => Date.now());
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [userCenterOpen, setUserCenterOpen] = useState(false);
  const [licenseCenterOpen, setLicenseCenterOpen] = useState(false);
  const [footerHelpOpen, setFooterHelpOpen] = useState(false);
  const [authGateQrPreviewItem, setAuthGateQrPreviewItem] = useState<FooterHelpCardQrItem | null>(null);
  const [avatarImageSrc, setAvatarImageSrc] = useState<string | null>(null);
  const [userCenterBrandFrameEnabled, setUserCenterBrandFrameEnabled] = useState(() =>
    loadUserCenterBrandFrameEnabled(),
  );
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);
  const [avatarUploadDraft, setAvatarUploadDraft] = useState<AvatarUploadDraft | null>(null);
  const [avatarAdjustOpen, setAvatarAdjustOpen] = useState(false);
  const [avatarAdjustDraft, setAvatarAdjustDraft] = useState<AvatarUploadDraft | null>(null);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);
  const [avatarUploadDragging, setAvatarUploadDragging] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilterValue>('ALL');
  const [menuProfileId, setMenuProfileId] = useState<string | null>(null);
  const [activeInfoTarget, setActiveInfoTarget] = useState<ProfileSummary | null>(null);
  const [switchTarget, setSwitchTarget] = useState<ProfileSummary | null>(null);
  const [switchOpenClawModel, setSwitchOpenClawModel] = useState('');
  const [switchProgressRunId, setSwitchProgressRunId] = useState<string | null>(null);
  const [switchProgressEvents, setSwitchProgressEvents] = useState<SwitchProgressEvent[]>([]);
  const [switchSuccessNotice, setSwitchSuccessNotice] = useState<SwitchSuccessNotice | null>(null);
  const [quotaAlertTarget, setQuotaAlertTarget] = useState<QuotaAlertSuggestion | null>(null);
  const [dismissedQuotaAlertKey, setDismissedQuotaAlertKey] = useState<string | null>(null);
  const [autoSwitchPrompt, setAutoSwitchPrompt] = useState<AutoSwitchPromptState | null>(null);
  const [dismissedAutoSwitchKey, setDismissedAutoSwitchKey] = useState<string | null>(null);
  const [autoSwitchThresholdDraft, setAutoSwitchThresholdDraft] = useState(18);
  const [autoSwitchCountdownDraft, setAutoSwitchCountdownDraft] = useState(30);
  const [centerNotice, setCenterNotice] = useState<CenterNotice | null>(null);
  const [recentlyResetKeys, setRecentlyResetKeys] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<ProfileSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileSummary | null>(null);
  const [removeFilesOnDelete, setRemoveFilesOnDelete] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogInitialValues, setAddDialogInitialValues] =
    useState<Partial<ProfileFormValues> | null>(null);
  const [addDialogDiscoveryHint, setAddDialogDiscoveryHint] = useState(false);
  const [pendingAddOverwrite, setPendingAddOverwrite] =
    useState<PendingAddOverwriteState | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [usageWarmupDone, setUsageWarmupDone] = useState(false);
  const [unrecognizedAuthPrompted, setUnrecognizedAuthPrompted] = useState(false);
  const [warningThresholdDraft, setWarningThresholdDraft] = useState(30);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(true);
  const [windowState, setWindowState] = useState<WindowState>({
    maximized: false,
    visible: true,
  });
  const [localSimulationEnabled, setLocalSimulationEnabled] = useState(
    initialLocalSimulationSettings.enabled,
  );
  const [localSimulationCardCount, setLocalSimulationCardCount] = useState(
    initialLocalSimulationSettings.cardCount,
  );
  const [localSimulationPlanTypes, setLocalSimulationPlanTypes] = useState<SimulationPlanType[]>(
    initialLocalSimulationSettings.planTypes,
  );
  const [simulationNowMs, setSimulationNowMs] = useState(() => Date.now());
  const [hiddenModeUnlocked, setHiddenModeUnlocked] = useState(false);
  const [hiddenModeStoredPassword, setHiddenModeStoredPassword] = useState(() =>
    isLocalSimulationAvailable ? loadHiddenModePassword() : '',
  );
  const [hiddenModeDialogOpen, setHiddenModeDialogOpen] = useState(false);
  const [hiddenModeDialogMode, setHiddenModeDialogMode] =
    useState<HiddenModeDialogMode>('unlock');
  const [hiddenModePasswordDraft, setHiddenModePasswordDraft] = useState('');
  const [hiddenModePasswordConfirmDraft, setHiddenModePasswordConfirmDraft] = useState('');
  const [hiddenModeDialogError, setHiddenModeDialogError] = useState<string | null>(null);
  const previousProfilesRef = useRef<ProfileSummary[]>([]);
  const switchProgressRunIdRef = useRef<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const openClawSwitchModelOptions = useMemo(
    () =>
      buildOpenClawSwitchModelOptions(
        state.summary.openclawAvailableModels,
        state.summary.openclawCurrentModel,
      ),
    [state.summary.openclawAvailableModels, state.summary.openclawCurrentModel],
  );
  const suggestedAddInitialValues = useMemo<Partial<ProfileFormValues>>(() => {
    const shouldUseDetectedAuth = state.summary.currentAuthExists && !state.summary.authRecognized;
    const detectedName = shouldUseDetectedAuth
      ? state.summary.currentAuthSuggestedWorkspaceName ?? state.summary.currentAuthSuggestedName ?? ''
      : '';

    return {
      authSourcePath: shouldUseDetectedAuth ? state.summary.currentAuthPath : '',
      name: detectedName,
      workspaceName: detectedName,
      planType: shouldUseDetectedAuth ? state.summary.currentAuthSuggestedPlanType ?? 'Unknown' : 'Unknown',
    };
  }, [
    state.summary.authRecognized,
    state.summary.currentAuthExists,
    state.summary.currentAuthPath,
    state.summary.currentAuthSuggestedName,
    state.summary.currentAuthSuggestedPlanType,
    state.summary.currentAuthSuggestedWorkspaceName,
  ]);

  const latestSwitchProgressEvent = useMemo(() => {
    if (switchProgressEvents.length === 0) {
      return null;
    }

    return switchProgressEvents[switchProgressEvents.length - 1] ?? null;
  }, [switchProgressEvents]);

  const openAddDialog = (discoveryHint = false) => {
    setAddDialogInitialValues(suggestedAddInitialValues);
    setAddDialogDiscoveryHint(discoveryHint);
    setAddDialogOpen(true);
    setMenuProfileId(null);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
    setAddDialogInitialValues(null);
    setAddDialogDiscoveryHint(false);
    setPendingAddOverwrite(null);
  };

  useEffect(() => {
    void loadState('initial');
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!switchTarget || state.settings.switchMode !== 'openclaw') {
      setSwitchOpenClawModel('');
      return;
    }

    const currentModel = state.summary.openclawCurrentModel;
    const currentModelExists = openClawSwitchModelOptions.some((option) => option.key === currentModel);
    const nextModel =
      currentModel && currentModelExists
        ? currentModel
        : openClawSwitchModelOptions[0]?.key ?? '';

    setSwitchOpenClawModel(nextModel);
  }, [
    switchTarget?.id,
    state.settings.switchMode,
    state.summary.openclawCurrentModel,
    openClawSwitchModelOptions,
  ]);

  useEffect(() => {
    switchProgressRunIdRef.current = switchProgressRunId;
  }, [switchProgressRunId]);

  useEffect(() => {
    const subscribeSwitchProgress = window.codexWorkspace?.onSwitchProgress;
    if (typeof subscribeSwitchProgress !== 'function') {
      return;
    }

    return subscribeSwitchProgress((event) => {
      if (!event.runId || event.runId !== switchProgressRunIdRef.current) {
        return;
      }

      setSwitchProgressEvents((current) => upsertSwitchProgressEvent(current, event));
    });
  }, []);

  useEffect(() => {
    const runtimeApi = window.codexWorkspace as Partial<typeof window.codexWorkspace>;
    let active = true;

    if (typeof runtimeApi.getUpdateState === 'function') {
      runtimeApi
        .getUpdateState()
        .then((nextState) => {
          if (active) {
            setUpdateState(nextState);
          }
        })
        .catch(() => {
          // Keep the current shell usable even if update preload wiring is stale.
        });
    }

    if (typeof runtimeApi.onUpdateStateChange !== 'function') {
      return () => {
        active = false;
      };
    }

    const unsubscribe = runtimeApi.onUpdateStateChange((nextState) => {
      if (active) {
        setUpdateState(nextState);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (updateState.blockedByMandatory) {
      setUpdateDialogOpen(true);
    }
  }, [updateState.blockedByMandatory]);

  useEffect(() => {
    let active = true;

    authClient
      .getState()
      .then((nextState) => {
        if (active) {
          setAuthState(nextState);
        }
      })
      .catch(() => {
        // Keep the current shell usable even if auth preload wiring is stale.
      });

    const unsubscribe = authClient.onStateChange((nextState) => {
      if (active) {
        setAuthState(nextState);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const runHeartbeat = async () => {
      try {
        const result = await authClient.heartbeat();
        if (!disposed) {
          setAuthState(result.state);
        }
      } catch {
        // Ignore transient auth heartbeat errors and keep the shell interactive.
      }
    };

    void runHeartbeat();
    const timer = window.setInterval(() => {
      void runHeartbeat();
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!authState.bootstrap.mandatoryUpdate) {
      return;
    }

    setCenterNotice({
      id: 'auth-min-supported-version',
      message: `授权服务要求最低版本 ${authState.bootstrap.minSupportedVersion ?? '未知'}，请先完成更新。`,
    });
    setUpdateDialogOpen(true);
  }, [authState.bootstrap.mandatoryUpdate, authState.bootstrap.minSupportedVersion]);

  useEffect(() => {
    const runtimeApi = window.codexWorkspace as Partial<typeof window.codexWorkspace>;
    let active = true;

    if (typeof runtimeApi.getWindowState === 'function') {
      runtimeApi
        .getWindowState()
        .then((nextState) => {
          if (active) {
            setWindowState(nextState);
          }
        })
        .catch(() => {
          // Ignore stale preload state and keep the main UI usable.
        });
    }

    if (typeof runtimeApi.onWindowStateChange !== 'function') {
      return () => {
        active = false;
      };
    }

    const unsubscribe = runtimeApi.onWindowStateChange((nextState) => {
      if (active) {
        setWindowState(nextState);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!centerNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCenterNotice(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [centerNotice]);

  useEffect(() => {
    setWarningThresholdDraft(state.settings.lowQuotaWarningThreshold);
  }, [state.settings.lowQuotaWarningThreshold]);

  useEffect(() => {
    setAutoSwitchThresholdDraft(state.settings.autoSwitchThreshold);
  }, [state.settings.autoSwitchThreshold]);

  useEffect(() => {
    setAutoSwitchCountdownDraft(state.settings.autoSwitchCountdownSeconds);
  }, [state.settings.autoSwitchCountdownSeconds]);

  useEffect(() => {
    if (!(isLocalSimulationAvailable && localSimulationEnabled)) {
      return;
    }

    const timer = window.setInterval(() => {
      setSimulationNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLocalSimulationAvailable, localSimulationEnabled]);

  useEffect(() => {
    if (!isLocalSimulationAvailable) {
      return;
    }

    persistHiddenModePassword(hiddenModeStoredPassword);
  }, [hiddenModeStoredPassword, isLocalSimulationAvailable]);

  useEffect(() => {
    if (!isLocalSimulationAvailable) {
      return;
    }

    persistLocalSimulationSettings({
      enabled: localSimulationEnabled,
      cardCount: localSimulationCardCount,
      planTypes: localSimulationPlanTypes,
    });
  }, [
    isLocalSimulationAvailable,
    localSimulationCardCount,
    localSimulationEnabled,
    localSimulationPlanTypes,
  ]);

  useEffect(() => {
    if (usageWarmupDone || busyAction !== null) {
      return;
    }

    setUsageWarmupDone(true);
    if (state.profiles.length === 0) {
      return;
    }

    void syncUsage(true);
  }, [busyAction, state.profiles.length, usageWarmupDone]);

  useEffect(() => {
    if (state.profiles.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      void syncUsage(true);
    }, 120_000);

    return () => window.clearInterval(timer);
  }, [state.profiles.length]);

  useEffect(() => {
    const previousProfiles = previousProfilesRef.current;
    previousProfilesRef.current = state.profiles;

    if (previousProfiles.length === 0) {
      return;
    }

    const previousById = new Map(previousProfiles.map((profile) => [profile.id, profile]));
    const resetEvents: Array<{ key: string; message: string }> = [];

    for (const profile of state.profiles) {
      const previous = previousById.get(profile.id);
      if (!previous) {
        continue;
      }

      if (didQuotaReset(previous.weeklyQuota, profile.weeklyQuota)) {
        resetEvents.push({
          key: `${profile.id}:weekly`,
          message: `${getProfileDisplayName(profile)} 空间周额度已重置`,
        });
      }

      if (didQuotaReset(previous.fiveHourQuota, profile.fiveHourQuota)) {
        resetEvents.push({
          key: `${profile.id}:five-hour`,
          message: `${getProfileDisplayName(profile)} 空间 5 小时额度已重置`,
        });
      }
    }

    if (resetEvents.length === 0) {
      return;
    }

    setRecentlyResetKeys((current) => {
      const next = { ...current };
      for (const event of resetEvents) {
        next[event.key] = true;
      }
      return next;
    });

    setCenterNotice({
      id: `${Date.now()}`,
      message: resetEvents[0].message,
    });

    window.setTimeout(() => {
      setRecentlyResetKeys((current) => {
        const next = { ...current };
        for (const event of resetEvents) {
          delete next[event.key];
        }
        return next;
      });
    }, 1800);
  }, [state.profiles]);

  useEffect(() => {
    if (state.summary.authRecognized) {
      setUnrecognizedAuthPrompted(false);
      return;
    }

    if (
      unrecognizedAuthPrompted ||
      busyAction !== null ||
      addDialogOpen ||
      editDialogOpen ||
      !state.summary.currentAuthExists ||
      state.summary.authRecognized ||
      state.summary.profilesCount === 0
    ) {
      return;
    }

    setUnrecognizedAuthPrompted(true);
    setAddDialogInitialValues(suggestedAddInitialValues);
    setAddDialogDiscoveryHint(true);
    setAddDialogOpen(true);
    setToast({ tone: 'info', message: '检测到新的登录空间，请确认名称后保存。' });
  }, [
    addDialogOpen,
    busyAction,
    editDialogOpen,
    suggestedAddInitialValues,
    state.summary.authRecognized,
    state.summary.currentAuthExists,
    state.summary.profilesCount,
    unrecognizedAuthPrompted,
  ]);

  const hasHiddenModePassword = hiddenModeStoredPassword.trim().length > 0;
  const simulatedProfileSeeds = useMemo(
    () =>
      isLocalSimulationAvailable && localSimulationEnabled
        ? buildSimulatedProfileSeeds(localSimulationCardCount, localSimulationPlanTypes)
        : [],
    [
      isLocalSimulationAvailable,
      localSimulationCardCount,
      localSimulationEnabled,
      localSimulationPlanTypes,
    ],
  );
  const simulatedProfiles = useMemo<DisplayProfile[]>(
    () => materializeSimulatedProfiles(simulatedProfileSeeds, simulationNowMs),
    [simulatedProfileSeeds, simulationNowMs],
  );
  const displayProfiles = useMemo<DisplayProfile[]>(
    () => {
      const activeProfiles = state.profiles.filter((profile) => !profile.manuallyDisabled);
      const manuallyDisabledProfiles = state.profiles.filter((profile) => profile.manuallyDisabled);
      return [...activeProfiles, ...simulatedProfiles, ...manuallyDisabledProfiles];
    },
    [state.profiles, simulatedProfiles],
  );
  const availablePlanFilters = useMemo(() => DISPLAY_PLAN_FILTER_ORDER, []);

  useEffect(() => {
    if (planFilter === 'ALL') {
      return;
    }

    if (!availablePlanFilters.includes(planFilter as DisplayPlanType)) {
      setPlanFilter('ALL');
    }
  }, [availablePlanFilters, planFilter]);

  const filteredProfiles = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return displayProfiles.filter((profile) => {
      const matchesPlan = planFilter === 'ALL' || getDisplayPlanType(profile) === planFilter;
      const haystack =
        `${profile.name} ${profile.workspaceName ?? ''} ${profile.notes} ${profile.storageDirName}`.toLowerCase();
      const matchesKeyword = !keyword || haystack.includes(keyword);
      return matchesPlan && matchesKeyword;
    });
  }, [displayProfiles, planFilter, searchValue]);
  const quotaAlertSuggestion = useMemo(
    () =>
      getQuotaAlertSuggestion(
        state.profiles,
        state.settings.lowQuotaWarningThreshold,
        state.settings.lowQuotaWarningEnabled &&
          !(state.settings.switchMode === 'openclaw' && state.settings.autoSwitchEnabled),
      ),
    [
      state.profiles,
      state.settings.autoSwitchEnabled,
      state.settings.lowQuotaWarningEnabled,
      state.settings.lowQuotaWarningThreshold,
      state.settings.switchMode,
    ],
  );
  const autoSwitchSuggestion = useMemo(
    () =>
      state.settings.switchMode === 'openclaw'
        ? getQuotaAlertSuggestion(
            state.profiles,
            state.settings.autoSwitchThreshold,
            state.settings.autoSwitchEnabled,
          )
        : null,
    [
      state.profiles,
      state.settings.autoSwitchEnabled,
      state.settings.autoSwitchThreshold,
      state.settings.switchMode,
    ],
  );
  const recommendedProfileId =
    autoSwitchSuggestion?.recommendedProfile.id ?? quotaAlertSuggestion?.recommendedProfile.id ?? null;

  useEffect(() => {
    if (!quotaAlertSuggestion) {
      setQuotaAlertTarget(null);
      setDismissedQuotaAlertKey(null);
      return;
    }

    if (
      quotaAlertTarget?.warningKey === quotaAlertSuggestion.warningKey ||
      dismissedQuotaAlertKey === quotaAlertSuggestion.warningKey ||
      busyAction !== null ||
      addDialogOpen ||
      editDialogOpen ||
      Boolean(autoSwitchPrompt) ||
      Boolean(switchTarget) ||
      Boolean(deleteTarget) ||
      Boolean(activeInfoTarget)
    ) {
      return;
    }

    setQuotaAlertTarget(quotaAlertSuggestion);
  }, [
    activeInfoTarget,
    addDialogOpen,
    autoSwitchPrompt,
    busyAction,
    deleteTarget,
    dismissedQuotaAlertKey,
    editDialogOpen,
    quotaAlertSuggestion,
    quotaAlertTarget,
    switchTarget,
  ]);

  useEffect(() => {
    if (!autoSwitchPrompt) {
      return;
    }

    const tick = window.setInterval(() => {
      if (Date.now() >= autoSwitchPrompt.deadlineAt) {
        window.clearInterval(tick);
        setDismissedAutoSwitchKey(autoSwitchPrompt.suggestion.warningKey);
        void executeSwitchProfile(autoSwitchPrompt.suggestion.recommendedProfile, 'auto');
      } else {
        setAutoSwitchPrompt((current) => (current ? { ...current } : current));
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [autoSwitchPrompt]);

  useEffect(() => {
    if (!autoSwitchSuggestion || !state.settings.autoSwitchEnabled || state.settings.switchMode !== 'openclaw') {
      setAutoSwitchPrompt(null);
      setDismissedAutoSwitchKey(null);
      return;
    }

    if (
      autoSwitchPrompt?.suggestion.warningKey === autoSwitchSuggestion.warningKey ||
      dismissedAutoSwitchKey === autoSwitchSuggestion.warningKey ||
      busyAction !== null ||
      addDialogOpen ||
      editDialogOpen ||
      Boolean(switchTarget) ||
      Boolean(deleteTarget) ||
      Boolean(activeInfoTarget) ||
      Boolean(switchSuccessNotice)
    ) {
      return;
    }

    setAutoSwitchPrompt({
      suggestion: autoSwitchSuggestion,
      startedAt: Date.now(),
      deadlineAt: Date.now() + state.settings.autoSwitchCountdownSeconds * 1000,
    });
    setQuotaAlertTarget(null);
  }, [
    activeInfoTarget,
    addDialogOpen,
    autoSwitchPrompt,
    autoSwitchSuggestion,
    busyAction,
    deleteTarget,
    dismissedAutoSwitchKey,
    editDialogOpen,
    state.settings.autoSwitchCountdownSeconds,
    state.settings.autoSwitchEnabled,
    state.settings.switchMode,
    switchSuccessNotice,
    switchTarget,
  ]);

  const latestBackup = state.backups[0] ?? null;
  const activeProfile =
    state.profiles.find((profile) => profile.isActive) ??
    state.profiles[0] ??
    null;
  const isCodexMode = state.settings.switchMode === 'codex';
  const isOpenClawMode = state.settings.switchMode === 'openclaw';
  const quotaSourceSummary = useMemo(() => {
    const quotas = state.profiles.flatMap((profile) => [
      profile.weeklyQuota,
      profile.fiveHourQuota,
      profile.reviewQuota,
    ]);

    if (quotas.some((quota) => quota.source === 'live')) {
      return '实时同步';
    }

    if (quotas.some((quota) => quota.source === 'detected')) {
      return '本地缓存';
    }

    if (quotas.some((quota) => hasQuotaData(quota))) {
      return '手动维护';
    }

    return '未识别';
  }, [state.profiles]);
  const autoSwitchSecondsLeft = autoSwitchPrompt
    ? Math.max(0, Math.ceil((autoSwitchPrompt.deadlineAt - Date.now()) / 1000))
    : 0;
  const updateStatusLabel = mapUpdateAvailabilityLabel(updateState);
  const updateSourceLabel = mapUpdateSourceLabel(updateState.sourceName);
  const updateChannelLabel = mapUpdateChannelLabel(updateState.channel);
  const updatePrimaryActionLabel =
    updateState.currentPlatform === 'win' ? '下载安装更新' : '下载更新包';
  const updateBadgeVisible = updateState.updateAvailable || updateState.blockedByMandatory;
  const platformTags = useMemo(
    () => [
      updateState.currentPlatform === 'win'
        ? 'Windows'
        : updateState.currentPlatform === 'mac'
          ? 'macOS'
          : 'Unknown',
      'Electron',
      'React',
      updateChannelLabel,
    ],
    [updateChannelLabel, updateState.currentPlatform],
  );
  const userCenterSession = useMemo(
    () => mapAuthStateToUserCenterSession(authState),
    [authState],
  );
  const avatarPreviewSrc = avatarUploadDraft?.sourceDataUrl ?? avatarImageSrc;
  const avatarPreviewMetrics = useMemo(
    () =>
      avatarUploadDraft
        ? buildAvatarRenderMetrics(
            avatarUploadDraft.sourceWidth,
            avatarUploadDraft.sourceHeight,
            avatarUploadDraft.scale,
          )
        : null,
    [avatarUploadDraft],
  );
  const avatarPreviewStyle =
    avatarUploadDraft && avatarPreviewMetrics
      ? {
          width: `${avatarPreviewMetrics.renderWidth}px`,
          height: `${avatarPreviewMetrics.renderHeight}px`,
          transform: `translate(calc(-50% + ${avatarUploadDraft.offsetX}px), calc(-50% + ${avatarUploadDraft.offsetY}px))`,
        }
      : undefined;
  const avatarAdjustPreviewSrc = avatarAdjustDraft?.sourceDataUrl ?? avatarPreviewSrc;
  const avatarAdjustMetrics = useMemo(
    () =>
      avatarAdjustDraft
        ? buildAvatarRenderMetrics(
            avatarAdjustDraft.sourceWidth,
            avatarAdjustDraft.sourceHeight,
            avatarAdjustDraft.scale,
          )
        : null,
    [avatarAdjustDraft],
  );
  const avatarAdjustStyle =
    avatarAdjustDraft && avatarAdjustMetrics
      ? {
          width: `${avatarAdjustMetrics.renderWidth}px`,
          height: `${avatarAdjustMetrics.renderHeight}px`,
          transform: `translate(calc(-50% + ${avatarAdjustDraft.offsetX}px), calc(-50% + ${avatarAdjustDraft.offsetY}px))`,
        }
      : undefined;
  const avatarPreviewTitle = avatarUploadDraft
    ? '待确认预览'
    : avatarImageSrc
      ? '当前头像'
      : '等待上传';
  const licenseCenterSnapshot = useMemo(
    () => mapAuthStateToLicenseSnapshot(authState),
    [authState],
  );
  const authGateVisible = useMemo(
    () => !isWorkspaceAuthorized(authState),
    [authState],
  );
  const authCenterOverlayVisible = authGateVisible || licenseCenterOpen;
  const authCenterUrgentAlert = useMemo(() => {
    if (!authGateVisible) {
      return false;
    }

    if (authState.license.permanent || authState.license.status === 'active') {
      return false;
    }

    if (!authState.license.expiresAt) {
      return true;
    }

    const expiresAtMs = new Date(authState.license.expiresAt).getTime();
    return Number.isNaN(expiresAtMs) || expiresAtMs <= authGateNowMs;
  }, [
    authGateNowMs,
    authGateVisible,
    authState.license.expiresAt,
    authState.license.permanent,
    authState.license.status,
  ]);
  const authCenterHeroEyebrow = authGateVisible ? '未授权访问' : 'Authorization Center';
  const authCenterHeroTitle = authGateVisible ? '先完成账号验证和授权激活' : '账号验证与授权中心';
  const authCenterHeroDescription = authGateVisible
    ? '当前完整切换界面暂不开放。你可以先登录或注册账号，再录入授权码；如果还没有授权，右侧直接提供联系客服、帮助说明和获取途径。'
    : '当前设备已经有可用授权。你可以在这里查看剩余时长、复制设备信息、补录授权码；确认无误后可直接返回主页。';
  const authCenterAlertMessage = authCenterUrgentAlert
    ? '当前已没有可用授权时长，完整主界面已锁定。请尽快录入授权码，或直接联系客服续期与获取正式授权。'
    : null;
  const authGateCountdownText = useMemo(
    () => formatPreciseCountdown(authState.license.expiresAt, authGateNowMs),
    [authGateNowMs, authState.license.expiresAt],
  );
  const headerLicenseText = useMemo(() => {
    if (authState.license.permanent) {
      return '永久';
    }

    if (!authState.license.expiresAt) {
      return authState.license.status === 'inactive' ? '未授权' : authState.license.remainingLabel;
    }

    return formatPreciseCountdown(authState.license.expiresAt, authGateNowMs);
  }, [
    authGateNowMs,
    authState.license.expiresAt,
    authState.license.permanent,
    authState.license.remainingLabel,
    authState.license.status,
  ]);
  const headerLicenseTone = useMemo(() => {
    if (authState.license.permanent) {
      return 'permanent';
    }

    if (!authState.license.expiresAt) {
      return authState.license.status === 'inactive' ? 'danger' : 'idle';
    }

    return getCountdownTone(authState.license.expiresAt, authGateNowMs);
  }, [authGateNowMs, authState.license.expiresAt, authState.license.permanent, authState.license.status]);
  const authGatePrimaryActionLabel = useMemo(() => {
    switch (authMode) {
      case 'register':
        return '注册并继续';
      case 'forgot':
        return '发送重置邮件';
      default:
        return '登录并验证账号';
    }
  }, [authMode]);

  useEffect(() => {
    if (!authState.profile) {
      return;
    }

    setAuthForm((current) => ({
      ...current,
      displayName: authState.profile?.displayName ?? current.displayName,
      email: authState.profile?.email ?? current.email,
    }));
  }, [authState.profile?.displayName, authState.profile?.email]);

  useEffect(() => {
    setAvatarImageSrc(loadStoredAvatar(authState.profile));
  }, [authState.profile?.id, authState.profile?.email]);

  useEffect(() => {
    if (authMode === 'forgot') {
      setAuthForm((current) => ({
        ...current,
        password: '',
      }));
    }
  }, [authMode]);

  useEffect(() => {
    setAuthGateNowMs(Date.now());

    if (authState.license.permanent && !authCenterOverlayVisible) {
      return;
    }

    const timer = window.setInterval(() => {
      setAuthGateNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [authCenterOverlayVisible, authState.license.permanent]);

  useEffect(() => {
    if (!authGateVisible) {
      return;
    }

    setUserCenterOpen(false);
    setLicenseCenterOpen(false);
  }, [authGateVisible]);

  function handleSimulationOnlyAction(message: string) {
    setToast({ tone: 'info', message });
    setMenuProfileId(null);
  }

  function resetHiddenModeDialogState() {
    setHiddenModePasswordDraft('');
    setHiddenModePasswordConfirmDraft('');
    setHiddenModeDialogError(null);
  }

  function openHiddenModeDialog(mode: HiddenModeDialogMode) {
    setHiddenModeDialogMode(mode);
    resetHiddenModeDialogState();
    setHiddenModeDialogOpen(true);
  }

  function handleRequestHiddenModeAccess() {
    openHiddenModeDialog(hasHiddenModePassword ? 'unlock' : 'setup');
  }

  function handleLockHiddenMode() {
    setHiddenModeUnlocked(false);
    setToast({ tone: 'info', message: '特殊功能已重新隐藏。' });
  }

  function handleHiddenModeDialogOpenChange(open: boolean) {
    setHiddenModeDialogOpen(open);
    if (!open) {
      resetHiddenModeDialogState();
    }
  }

  function handleSubmitHiddenModeDialog() {
    const nextPassword = hiddenModePasswordDraft.trim();

    if (hiddenModeDialogMode === 'unlock') {
      if (!hasHiddenModePassword) {
        setHiddenModeDialogMode('setup');
        setHiddenModeDialogError('当前还没有设置密码，请先创建特殊功能密码。');
        return;
      }

      if (!nextPassword) {
        setHiddenModeDialogError('请输入特殊功能密码。');
        return;
      }

      if (nextPassword !== hiddenModeStoredPassword) {
        setHiddenModeDialogError('密码不正确，请重新输入。');
        return;
      }

      setHiddenModeUnlocked(true);
      setHiddenModeDialogOpen(false);
      resetHiddenModeDialogState();
      setToast({ tone: 'success', message: '特殊功能已解锁。' });
      return;
    }

    if (nextPassword.length < 4) {
      setHiddenModeDialogError('密码至少需要 4 位。');
      return;
    }

    if (nextPassword !== hiddenModePasswordConfirmDraft.trim()) {
      setHiddenModeDialogError('两次输入的密码不一致。');
      return;
    }

    setHiddenModeStoredPassword(nextPassword);
    setHiddenModeUnlocked(true);
    setHiddenModeDialogOpen(false);
    resetHiddenModeDialogState();
    setToast({
      tone: 'success',
      message:
        hiddenModeDialogMode === 'change'
          ? '特殊功能密码已更新。'
          : '特殊功能密码已设置，并已解锁。',
    });
  }

  async function loadState(nextBusyAction: BusyAction) {
    try {
      setBusyAction(nextBusyAction);
      setErrorMessage(null);
      const nextState = await window.codexWorkspace.getAppState();
      setState(nextState);
    } catch (error) {
      const message = error instanceof Error ? error.message : '读取应用状态失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshState() {
    try {
      setBusyAction('refresh');
      const nextState = await window.codexWorkspace.refreshProfiles();
      setState(nextState);
      setToast({ tone: 'info', message: '已刷新 profiles 目录，并尝试同步实时额度。' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '刷新失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function syncUsage(silent = false) {
    try {
      if (!silent) {
        setBusyAction('refresh');
      }

      const result = await window.codexWorkspace.syncUsage();
      setState(result.state);
      if (!silent) {
        setToast({ tone: 'success', message: result.message });
      }
    } catch (error) {
      if (silent) {
        return;
      }

      const message = error instanceof Error ? error.message : '同步实时额度失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      if (!silent) {
        setBusyAction(null);
      }
    }
  }

  async function handleImportCurrentAuth() {
    try {
      setBusyAction('add');
      const result = await window.codexWorkspace.importCurrentAuth();
      setState(result.state);
      setToast({ tone: 'success', message: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : '扫描当前 auth.json 失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePickAuthFile() {
    const result = await window.codexWorkspace.chooseAuthFile();
    return result.canceled ? null : result.filePath ?? null;
  }

  async function handleAddProfile(values: ProfileFormValues) {
    const trimmedName = values.name.trim();
    const normalizedValues: ProfileFormValues = {
      ...values,
      name: trimmedName,
      workspaceName: trimmedName,
    };
    const normalizedName = trimmedName.toLowerCase();
    const duplicateProfile = normalizedName
      ? state.profiles.find((profile) => {
          const candidates = [profile.name, profile.workspaceName]
            .map((value) => value?.trim().toLowerCase())
            .filter((value): value is string => Boolean(value));
          return candidates.includes(normalizedName);
        }) ?? null
      : null;

    if (duplicateProfile) {
      setPendingAddOverwrite({
        target: duplicateProfile,
        values: normalizedValues,
      });
      return;
    }

    try {
      setBusyAction('add');
      const nextState = await window.codexWorkspace.addProfile(normalizedValues);
      setState(nextState);
      closeAddDialog();
      setUsageWarmupDone(true);
      setToast({ tone: 'success', message: `已导入 profile：${normalizedValues.name}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '添加 profile 失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleConfirmAddOverwrite() {
    if (!pendingAddOverwrite) {
      return;
    }

    try {
      setBusyAction('add');
      const { target, values } = pendingAddOverwrite;
      const nextState = await window.codexWorkspace.updateProfile({
        id: target.id,
        name: values.name,
        workspaceName: values.name,
        authSourcePath: values.authSourcePath || undefined,
        notes: values.notes,
        planType: values.planType,
        manuallyDisabled: values.manuallyDisabled,
        weeklyQuota: values.weeklyQuota,
        fiveHourQuota: values.fiveHourQuota,
        reviewQuota: values.reviewQuota,
      });
      setState(nextState);
      closeAddDialog();
      setUsageWarmupDone(true);
      setToast({ tone: 'success', message: `已覆盖同命名空间：${values.name}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '覆盖同命名空间失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
      setPendingAddOverwrite(null);
    }
  }

  async function handleEditProfile(values: ProfileFormValues) {
    if (!editTarget) {
      return;
    }

    try {
      setBusyAction('edit');
      const nextState = await window.codexWorkspace.updateProfile({
        id: editTarget.id,
        name: values.name,
        workspaceName: values.name,
        authSourcePath: values.authSourcePath || undefined,
        notes: values.notes,
        planType: values.planType,
        manuallyDisabled: values.manuallyDisabled,
        weeklyQuota: values.weeklyQuota,
        fiveHourQuota: values.fiveHourQuota,
        reviewQuota: values.reviewQuota,
      });
      setState(nextState);
      setEditDialogOpen(false);
      setEditTarget(null);
      setToast({ tone: 'success', message: `已更新 profile：${values.name}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '编辑 profile 失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function executeSwitchProfile(
    targetProfile: ProfileSummary,
    trigger: 'manual' | 'auto' = 'manual',
    openclawModel?: string | null,
  ) {
    const runId = `${Date.now()}-${targetProfile.id}`;

    try {
      setBusyAction('switch');
      setSwitchProgressRunId(runId);
      setSwitchProgressEvents([]);
      switchProgressRunIdRef.current = runId;
      const result = await window.codexWorkspace.switchProfile({
        profileId: targetProfile.id,
        openclawModel,
        runId,
      });
      setState(result.state);
      setSwitchTarget(null);
      setSwitchOpenClawModel('');
      setAutoSwitchPrompt(null);
      setSwitchProgressRunId(null);
      switchProgressRunIdRef.current = null;
      setSwitchProgressEvents([]);
      setSwitchSuccessNotice({
        name: targetProfile.name,
        workspaceName: getProfileDisplayName(targetProfile),
        activatedAt: result.activatedAt,
        switchMode: result.switchMode,
        codexTraeAutoRestart: result.codexTraeAutoRestart,
        restartedDesktopApps: result.restartedDesktopApps,
        openclawSynced: result.openclawSynced,
        openclawGatewayRestarted: result.openclawGatewayRestarted,
        openclawModel: result.openclawModel,
        openclawModelLabel: result.openclawModel
          ? getOpenClawModelLabel(result.openclawModel, result.state.summary.openclawAvailableModels)
          : null,
        openclawModelChanged: result.openclawModelChanged,
        warnings: result.warnings,
      });
      setToast({
        tone: 'success',
        message:
          trigger === 'auto'
            ? `已自动切换到 ${getProfileDisplayName(targetProfile)}。`
            : `已切换到 ${getProfileDisplayName(targetProfile)}。请先不要重复点击登录。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换 profile 失败。';
      setSwitchProgressEvents((current) =>
        upsertSwitchProgressEvent(current, {
          runId,
          targetProfileId: targetProfile.id,
          switchMode: state.settings.switchMode,
          stepKey: 'complete',
          title: '切换失败',
          detail: message,
          status: 'error',
          timestamp: new Date().toISOString(),
        }),
      );
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSwitchProfile() {
    if (!switchTarget) {
      return;
    }

    const currentOpenClawModel =
      state.summary.openclawCurrentModel &&
      openClawSwitchModelOptions.some((option) => option.key === state.summary.openclawCurrentModel)
        ? state.summary.openclawCurrentModel
        : null;

    await executeSwitchProfile(
      switchTarget,
      'manual',
      state.settings.switchMode === 'openclaw'
        ? switchOpenClawModel || currentOpenClawModel
        : null,
    );
  }

  async function handleDeleteProfile() {
    if (!deleteTarget) {
      return;
    }

    try {
      setBusyAction('delete');
      const nextState = await window.codexWorkspace.deleteProfile({
        profileId: deleteTarget.id,
        removeFiles: removeFilesOnDelete,
      });
      setState(nextState);
      setDeleteTarget(null);
      setRemoveFilesOnDelete(false);
      setToast({
        tone: 'success',
        message: removeFilesOnDelete
          ? `已删除 profile 和文件夹：${deleteTarget.name}`
          : `已删除 profile 元数据：${deleteTarget.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除 profile 失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleChangeRootDirectory() {
    try {
      setBusyAction('root');
      const picked = await window.codexWorkspace.chooseRootDirectory();
      if (picked.canceled || !picked.filePath) {
        return;
      }

      const nextState = await window.codexWorkspace.setProfilesRootDir(picked.filePath);
      setState(nextState);
      setUsageWarmupDone(false);
      setToast({ tone: 'success', message: `根目录已切换到：${picked.filePath}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换根目录失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleOpenPath(targetPath: string) {
    const result = await window.codexWorkspace.openPath(targetPath);
    if (!result.ok) {
      setToast({ tone: 'error', message: result.error ?? '打开目录失败。' });
    }
  }

  async function handleOpenExternal(targetUrl: string) {
    const result = await window.codexWorkspace.openExternal(targetUrl);
    if (!result.ok) {
      setToast({ tone: 'error', message: result.error ?? '打开外部链接失败。' });
    }
  }

  async function handleCopyValue(label: string, value: string) {
    if (!value.trim()) {
      setToast({ tone: 'error', message: `${label} 当前为空。` });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setToast({ tone: 'success', message: `${label} 已复制成功。` });
    } catch (error) {
      const message = error instanceof Error ? error.message : '复制失败。';
      setToast({ tone: 'error', message });
    }
  }

  async function handleCheckForUpdates() {
    try {
      setUpdateBusyAction('check');
      const result = await window.codexWorkspace.checkForUpdates();
      setUpdateState(result.state);
      if (result.state.updateAvailable || result.state.blockedByMandatory) {
        setUpdateDialogOpen(true);
      }
      setToast({ tone: getUpdateActionTone(result), message: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查更新失败。';
      setToast({ tone: 'error', message });
    } finally {
      setUpdateBusyAction(null);
    }
  }

  async function handleDownloadAndInstallUpdate() {
    try {
      setUpdateBusyAction('install');
      const result = await window.codexWorkspace.downloadAndInstallUpdate();
      setUpdateState(result.state);
      setToast({ tone: getUpdateActionTone(result), message: result.message });
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载安装更新失败。';
      setToast({ tone: 'error', message });
    } finally {
      setUpdateBusyAction(null);
    }
  }

  async function handleOpenUpdateNotes() {
    const result = await window.codexWorkspace.openUpdateNotes();
    if (!result.ok) {
      setToast({ tone: 'error', message: result.error ?? '打开更新说明失败。' });
    }
  }

  function handleOpenAboutDialog() {
    setFooterHelpOpen(false);
    setUserCenterOpen(false);
    setLicenseCenterOpen(false);
    setUpdateDialogOpen(false);
    setAboutDialogOpen(true);
  }

  function handleOpenUpdateDialog() {
    setFooterHelpOpen(false);
    setAboutDialogOpen(false);
    setUserCenterOpen(false);
    setUpdateDialogOpen(true);
  }

  function handleOpenLicenseCenter() {
    setUserCenterOpen(false);
    setFooterHelpOpen(false);
    setAboutDialogOpen(false);
    setUpdateDialogOpen(false);
    setLicenseCenterOpen(true);
  }

  function handleOpenAuthGateQrPreview(item: FooterHelpCardQrItem) {
    if (!item.imageSrc) {
      return;
    }

    setAuthGateQrPreviewItem(item);
  }

  function handleCloseAuthCenterOverlay() {
    setLicenseCenterOpen(false);
  }

  function handleUserCenterBrandFrameEnabledChange(enabled: boolean) {
    setUserCenterBrandFrameEnabled(enabled);
    persistUserCenterBrandFrameEnabled(enabled);
  }

  function resetAvatarUploadState() {
    setAvatarUploadDraft(null);
    setAvatarAdjustDraft(null);
    setAvatarAdjustOpen(false);
    setAvatarUploadBusy(false);
    setAvatarUploadDragging(false);
    setAvatarUploadError(null);
  }

  function handleAvatarUploadOpenChange(open: boolean) {
    if (open) {
      setAvatarUploadOpen(true);
      return;
    }

    setAvatarUploadOpen(false);
    resetAvatarUploadState();
  }

  function handleEditAvatar() {
    if (!authState.profile) {
      setToast({ tone: 'error', message: '请先登录后再设置头像。' });
      return;
    }

    resetAvatarUploadState();
    setAvatarUploadOpen(true);
  }

  function handlePickAvatarFile() {
    avatarInputRef.current?.click();
  }

  function handleAvatarDraftChange(patch: Partial<AvatarUploadDraft>) {
    setAvatarAdjustDraft((current) => (current ? clampAvatarUploadDraft({ ...current, ...patch }) : current));
  }

  function handleResetAvatarDraftPosition() {
    setAvatarAdjustDraft((current) =>
      current
        ? {
            ...current,
            scale: current.minScale,
            offsetX: 0,
            offsetY: 0,
          }
        : current,
    );
  }

  function handleAvatarAdjustOpenChange(open: boolean) {
    if (open) {
      if (avatarUploadDraft) {
        setAvatarAdjustDraft({ ...avatarUploadDraft });
        setAvatarAdjustOpen(true);
      }
      return;
    }

    setAvatarAdjustOpen(false);
    setAvatarAdjustDraft(null);
  }

  function handleConfirmAvatarAdjust() {
    if (!avatarAdjustDraft) {
      return;
    }

    setAvatarUploadDraft(clampAvatarUploadDraft({ ...avatarAdjustDraft }));
    setAvatarAdjustOpen(false);
    setAvatarAdjustDraft(null);
  }

  async function handleAvatarFileSelection(selectedFile: File) {
    if (!selectedFile) {
      return;
    }

    if (!authState.profile) {
      setAvatarUploadError('当前账号未登录，不能保存头像。');
      return;
    }

    try {
      setAvatarUploadBusy(true);
      setAvatarUploadError(null);
      const draft = await prepareAvatarUploadDraft(selectedFile);
      const normalizedDraft = clampAvatarUploadDraft(draft);
      setAvatarUploadDraft(normalizedDraft);
      setAvatarAdjustDraft({ ...normalizedDraft });
      setAvatarAdjustOpen(true);
    } catch (error) {
      setAvatarUploadError(error instanceof Error ? error.message : '头像预处理失败。');
    } finally {
      setAvatarUploadBusy(false);
      setAvatarUploadDragging(false);
    }
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) {
      return;
    }

    await handleAvatarFileSelection(selectedFile);
  }

  function handleAvatarDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!avatarUploadDragging) {
      setAvatarUploadDragging(true);
    }
  }

  function handleAvatarDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setAvatarUploadDragging(false);
  }

  function handleAvatarDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (!selectedFile) {
      setAvatarUploadDragging(false);
      return;
    }

    void handleAvatarFileSelection(selectedFile);
  }

  async function handleConfirmAvatarUpload() {
    if (!authState.profile) {
      setAvatarUploadError('当前账号未登录，不能保存头像。');
      return;
    }

    if (!avatarUploadDraft) {
      setAvatarUploadError('请先拖入头像或手动选择一张图片。');
      return;
    }

    try {
      setAvatarUploadBusy(true);
      setAvatarUploadError(null);
      const avatarDataUrl = await buildAvatarDataUrl(avatarUploadDraft);
      persistStoredAvatar(authState.profile, avatarDataUrl);
      setAvatarImageSrc(avatarDataUrl);
      setToast({ tone: 'success', message: '头像已更新。' });
      setAvatarUploadOpen(false);
      resetAvatarUploadState();
    } catch (error) {
      setAvatarUploadError(error instanceof Error ? error.message : '头像保存失败。');
    } finally {
      setAvatarUploadBusy(false);
    }
  }

  function handleAuthFormChange(patch: Partial<UserCenterAuthForm>) {
    setAuthForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function applyAuthResult(
    action: typeof authBusyAction,
    request: Promise<AuthActionResult>,
  ) {
    try {
      setAuthBusyAction(action);
      const result = await request;
      setAuthState(result.state);
      setToast({ tone: 'success', message: result.message });
      if (action === 'login' || action === 'register') {
        setUserCenterOpen(false);
        setAuthForm((current) => ({
          ...current,
          password: '',
          verificationCode: '',
        }));
      }
      if (
        action === 'activation' ||
        action === 'reward' ||
        action === 'redeem-invite' ||
        action === 'claim-reward'
      ) {
        setLicenseCenterOpen(false);
      }
      if (isWorkspaceAuthorized(result.state)) {
        setUserCenterOpen(false);
        setLicenseCenterOpen(false);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '授权操作失败。';
      setToast({ tone: 'error', message });
      return null;
    } finally {
      setAuthBusyAction(null);
    }
  }

  async function handleSubmitAuth() {
    if (authMode === 'register') {
      await applyAuthResult(
        'register',
        authClient.register({
          displayName: authForm.displayName,
          email: authForm.email,
          password: authForm.password,
          verificationCode: authForm.verificationCode,
        }),
      );
      return;
    }

    if (authMode === 'forgot') {
      await applyAuthResult(
        'forgot',
        authClient.requestPasswordReset({
          email: authForm.email,
          verificationCode: authForm.verificationCode,
        }),
      );
      return;
    }

    await applyAuthResult(
      'login',
      authClient.login({
        email: authForm.email,
        password: authForm.password,
        rememberMe: authForm.rememberMe,
        verificationCode: authForm.verificationCode,
      }),
    );
  }

  async function handleApplyActivationCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      setToast({ tone: 'error', message: '请先输入授权码。' });
      return;
    }

    const result = await applyAuthResult(
      'activation',
      authClient.applyActivationCode({
        code: trimmed,
      }),
    );
    if (result) {
      setAuthGateActivationCode('');
    }
  }

  async function handleApplyRewardCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      setToast({ tone: 'error', message: '请先输入奖励码。' });
      return;
    }

    const result = await applyAuthResult(
      'reward',
      authClient.applyRewardCode({
        code: trimmed,
      }),
    );
    if (result) {
      setAuthGateRewardCode('');
    }
  }

  async function handleRequestInviteCode() {
    await applyAuthResult('request-invite', authClient.requestInviteCode());
  }

  async function handleRedeemInviteCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      setToast({ tone: 'error', message: '请先输入邀请码。' });
      return;
    }

    const result = await applyAuthResult(
      'redeem-invite',
      authClient.redeemInviteCode({
        code: trimmed,
      }),
    );
    if (result) {
      setAuthGateInviteCode('');
    }
  }

  async function handleClaimInviteReward() {
    await applyAuthResult('claim-reward', authClient.claimInviteReward());
  }

  async function handleUpdateWarningSettings(
    patch: Partial<ProfilesState['settings']>,
    successMessage?: string,
  ) {
    try {
      const nextState = await window.codexWorkspace.updateSettings({
        backupBeforeSwitch: patch.backupBeforeSwitch,
        switchMode: patch.switchMode,
        lowQuotaWarningEnabled: patch.lowQuotaWarningEnabled,
        lowQuotaWarningThreshold: patch.lowQuotaWarningThreshold,
        codexExecutablePathOverride: patch.codexExecutablePathOverride,
        traeExecutablePathOverride: patch.traeExecutablePathOverride,
        codexTraeAutoRestart: patch.codexTraeAutoRestart,
        openclawStateDirOverride: patch.openclawStateDirOverride,
        openclawAutoRestartGateway: patch.openclawAutoRestartGateway,
        autoSwitchEnabled: patch.autoSwitchEnabled,
        autoSwitchThreshold: patch.autoSwitchThreshold,
        autoSwitchCountdownSeconds: patch.autoSwitchCountdownSeconds,
      });
      setState(nextState);
      if (successMessage) {
        setToast({ tone: 'success', message: successMessage });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新设置失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    }
  }

  async function handleCommitWarningThreshold() {
    await handleUpdateWarningSettings(
      { lowQuotaWarningThreshold: warningThresholdDraft },
      `额度预警阈值已更新为 ${warningThresholdDraft}%`,
    );
  }

  async function handleCommitAutoSwitchThreshold() {
    await handleUpdateWarningSettings(
      { autoSwitchThreshold: autoSwitchThresholdDraft },
      `自动切换阈值已更新为 ${autoSwitchThresholdDraft}%`,
    );
  }

  async function handleCommitAutoSwitchCountdown() {
    await handleUpdateWarningSettings(
      { autoSwitchCountdownSeconds: autoSwitchCountdownDraft },
      `自动切换倒计时已更新为 ${autoSwitchCountdownDraft} 秒`,
    );
  }

  async function handlePickOpenClawDirectory() {
    try {
      const picked = await window.codexWorkspace.chooseDirectory();
      if (picked.canceled || !picked.filePath) {
        return;
      }

      await handleUpdateWarningSettings(
        { openclawStateDirOverride: picked.filePath },
        `已更新 OpenClaw 状态目录：${picked.filePath}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '选择 OpenClaw 目录失败。';
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    }
  }

  async function handlePickManagedAppExecutable(target: 'codex' | 'trae') {
    try {
      const picked = await chooseExecutableFileWithFallback(
        target === 'codex' ? '选择 Codex 可执行文件' : '选择 Trae 可执行文件',
      );
      if (picked.canceled || !picked.filePath) {
        return;
      }

      await handleUpdateWarningSettings(
        target === 'codex'
          ? { codexExecutablePathOverride: picked.filePath }
          : { traeExecutablePathOverride: picked.filePath },
        `${target === 'codex' ? 'Codex' : 'Trae'} 路径已更新：${picked.filePath}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `选择 ${target === 'codex' ? 'Codex' : 'Trae'} 可执行文件失败。`;
      setErrorMessage(message);
      setToast({ tone: 'error', message });
    }
  }

  async function handleWindowMinimize() {
    const runtimeApi = window.codexWorkspace as Partial<typeof window.codexWorkspace>;
    if (typeof runtimeApi.minimizeWindow !== 'function') {
      return;
    }

    try {
      const nextState = await runtimeApi.minimizeWindow();
      setWindowState(nextState);
    } catch {
      // Ignore desktop shell failures and keep the renderer responsive.
    }
  }

  async function handleWindowToggleMaximize() {
    const runtimeApi = window.codexWorkspace as Partial<typeof window.codexWorkspace>;
    if (typeof runtimeApi.toggleMaximizeWindow !== 'function') {
      return;
    }

    try {
      const nextState = await runtimeApi.toggleMaximizeWindow();
      setWindowState(nextState);
    } catch {
      // Ignore desktop shell failures and keep the renderer responsive.
    }
  }

  async function handleWindowHide() {
    const runtimeApi = window.codexWorkspace as Partial<typeof window.codexWorkspace>;
    if (typeof runtimeApi.hideWindow !== 'function') {
      return;
    }

    try {
      const nextState = await runtimeApi.hideWindow();
      setWindowState(nextState);
    } catch {
      // Ignore desktop shell failures and keep the renderer responsive.
    }
  }

  return (
    <div className="shell-app">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void handleAvatarFileChange(event)}
      />
      <div
        className="shell-windowbar"
        onDoubleClick={() => {
          void handleWindowToggleMaximize();
        }}
      >
        <div className="shell-windowbar__title">
          <span className="shell-windowbar__brand" aria-hidden="true">
            <OpenAIKnotIcon />
          </span>
          <span>{APP_DISPLAY_NAME}</span>
        </div>
        <div className="shell-windowbar__actions">
          <button
            type="button"
            className="window-dot window-dot--minimize"
            title="最小化窗口"
            aria-label="最小化窗口"
            onClick={() => {
              void handleWindowMinimize();
            }}
          />
          <button
            type="button"
            className={`window-dot window-dot--maximize${windowState.maximized ? ' is-active' : ''}`}
            title={windowState.maximized ? '还原窗口' : '最大化窗口'}
            aria-label={windowState.maximized ? '还原窗口' : '最大化窗口'}
            onClick={() => {
              void handleWindowToggleMaximize();
            }}
          />
          <button
            type="button"
            className="window-dot window-dot--close"
            title="关闭窗口并保留托盘驻留"
            aria-label="关闭窗口并保留托盘驻留"
            onClick={() => {
              void handleWindowHide();
            }}
          />
        </div>
      </div>
      <header className="shell-header">
        <div className="shell-header__left">
          <button
            type="button"
            className="brand-icon brand-icon--button"
            onClick={handleOpenAboutDialog}
            title="打开关于页"
          >
            <OpenAIKnotIcon />
            {updateBadgeVisible ? <span className="header-indicator-dot header-indicator-dot--brand" /> : null}
          </button>
          <div>
            <h1 className="brand-title">{APP_DISPLAY_NAME.toUpperCase()}</h1>
            <div className="brand-subtitle">{APP_SUBTITLE}</div>
          </div>
          <span className="brand-divider" />
          <div className="active-indicator">
            <span className="active-indicator__dot" />
            <span>
              当前激活:{' '}
              <strong>
                {state.summary.activeProfileName ??
                  (state.summary.currentAuthExists ? '已检测到待导入' : '未检测到')}
              </strong>
            </span>
          </div>
        </div>

        <div className="shell-header__right">
          <label className="header-mode-select">
            <span className="header-mode-select__label">模式</span>
            <select
              className="header-mode-select__control"
              value={state.settings.switchMode}
              onChange={(event) => {
                const nextMode = event.target.value as SwitchMode;
                void handleUpdateWarningSettings(
                  { switchMode: nextMode },
                  `切换模式已更新为 ${mapSwitchModeLabel(nextMode)}`,
                );
              }}
            >
              <option value="codex">Codex / Trae</option>
              <option value="openclaw">OpenClaw</option>
            </select>
          </label>
          <div
            className={`header-license-pill is-${headerLicenseTone}`}
            title={
              authState.license.permanent
                ? `${authState.license.licenseTypeLabel} / 永久授权`
                : authState.license.expiresAt
                  ? `${authState.license.licenseTypeLabel} / 到期时间：${formatDateTime(authState.license.expiresAt)}`
                  : authState.license.licenseTypeLabel
            }
          >
            <span className="header-license-pill__label">{authState.license.licenseTypeLabel}</span>
            <strong>{headerLicenseText}</strong>
          </div>
          <div className="header-actions">
            <HeaderIconButton title="客服支持" onClick={() => setFooterHelpOpen(true)}>
              <BadgeHelp size={18} strokeWidth={1.8} />
            </HeaderIconButton>
            <HeaderIconButton
              title="添加 Profile"
              onClick={() => openAddDialog()}
            >
              <Plus size={18} strokeWidth={1.8} />
            </HeaderIconButton>
                <HeaderIconButton title="刷新列表" onClick={() => void refreshState()}>
              {busyAction === 'refresh' ? (
                <LoaderCircle size={18} strokeWidth={1.8} className="spin" />
              ) : (
                <RefreshCw size={18} strokeWidth={1.8} />
              )}
            </HeaderIconButton>
            <HeaderIconButton
              title={settingsPanelOpen ? '收起参数面板' : '展开参数面板'}
              onClick={() => setSettingsPanelOpen((current) => !current)}
            >
              <Settings size={18} strokeWidth={1.8} />
            </HeaderIconButton>
            <HeaderIconButton title="更新状态" onClick={handleOpenUpdateDialog}>
              {updateBusyAction === 'check' ? (
                <LoaderCircle size={18} strokeWidth={1.8} className="spin" />
              ) : (
                <ArrowUpCircle size={18} strokeWidth={1.8} />
              )}
            </HeaderIconButton>
          </div>
          <button
            type="button"
            className={`user-avatar user-avatar--button${
              userCenterSession.status === 'authenticated' ? ' is-authenticated' : ' is-guest'
            }${avatarImageSrc ? ' has-image' : ''}`}
            onClick={() => setUserCenterOpen(true)}
            title="打开用户中心"
          >
            {avatarImageSrc ? (
              <img className="user-avatar__image" src={avatarImageSrc} alt="" />
            ) : (
              <span className="user-avatar__text">{userCenterSession.avatarText}</span>
            )}
            {userCenterSession.hasAlert ? (
              <span className="header-indicator-dot header-indicator-dot--avatar" />
            ) : null}
          </button>
        </div>
      </header>

      <div className="shell-core">
        <aside className="shell-left">
          <section className="active-profile-card">
            <div className="active-profile-card__brand" aria-hidden="true">
              <OpenAIKnotIcon />
            </div>
            <div className="section-kicker">当前 Profile</div>
            <div className="active-profile-title">
              {activeProfile?.name ??
                (state.summary.currentAuthExists ? '已检测到当前 auth.json' : '未识别 auth.json')}
            </div>
            <div className="active-profile-subtitle">
              空间名: {getProfileDisplayName(activeProfile)} / 套餐:{' '}
              {activeProfile ? mapPlanLabel(activeProfile.planType) : 'UNKNOWN'}
            </div>
            <div className="active-profile-meta">
              {state.summary.authRecognized
                ? `目录: ${activeProfile?.storageDirName ?? '未记录'} / auth: ${state.summary.currentAuthPath}`
                : state.summary.currentAuthExists
                  ? '已检测到当前 auth.json，但还没纳入 profiles'
                  : '当前 .codex 目录下未检测到 auth.json'}
            </div>
            {state.summary.currentAuthExists && !state.summary.authRecognized ? (
              <button
                type="button"
                className="active-profile-action"
                onClick={() => void handleImportCurrentAuth()}
              >
                {busyAction === 'add' ? (
                  <LoaderCircle size={14} strokeWidth={1.8} className="spin" />
                ) : (
                  <Plus size={14} strokeWidth={1.8} />
                )}
                扫描并导入当前 auth
              </button>
            ) : null}
          </section>

          <section className="sidebar-section">
            <h2 className="sidebar-section__title">当前状态</h2>
            <div className="sidebar-metrics">
              <SidebarMetric
                label="auth 已识别"
                value={
                  state.summary.authRecognized
                    ? '已纳入 profile'
                    : state.summary.currentAuthExists
                      ? '已检测到未纳入'
                      : '未检测到'
                }
                green={state.summary.currentAuthExists}
              />
              <SidebarMetric label="Profile 数量" value={String(state.summary.profilesCount)} />
              <SidebarMetric
                label="备份策略"
                value={state.summary.backupBeforeSwitch ? '切换前备份' : '未启用'}
              />
              <SidebarMetric
                label="最近切换"
                value={formatDateTime(state.summary.lastSwitchedAt)}
              />
              <SidebarMetric
                label="总体剩余额度"
                value={
                  state.summary.overallRemainingPercent !== null
                    ? `${state.summary.overallRemainingPercent}%`
                    : '未设置'
                }
                green={(state.summary.overallRemainingPercent ?? 0) >= 50}
              />
            </div>
          </section>

          <section className="sidebar-section">
            <h2 className="sidebar-section__title">最近备份</h2>
            <div className="storage-progress">
              <div
                className="storage-progress__bar"
                style={{
                  width: `${
                    latestBackup
                      ? Math.min(100, Math.max(8, state.backups.length * 8))
                      : 8
                  }%`,
                }}
              />
            </div>
            <div className="storage-meta">
              <span>{latestBackup ? latestBackup.name : '暂无备份'}</span>
              <span>{latestBackup ? formatFileSize(latestBackup.sizeBytes) : '0MB'}</span>
            </div>
          </section>

          {errorMessage ? <div className="sidebar-error">{errorMessage}</div> : null}
        </aside>

        <main className="shell-main">
          <div className="main-toolbar">
            <h2 className="main-toolbar__title">Codex空间池</h2>
            <div className="main-toolbar__controls">
              <input
                className="search-input"
                placeholder="搜索 profile..."
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              <select
                className="plan-select"
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value as PlanFilterValue)}
              >
                <option value="ALL">全部套餐</option>
                {availablePlanFilters.map((planType) => (
                  <option key={planType} value={planType}>
                    {planType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="main-status-bar">
            <div className="main-status-chip">
              扫描时间: <strong>{formatDateTime(state.lastScannedAt)}</strong>
            </div>
            <div className="main-status-chip">
              卡片数量: <strong>{filteredProfiles.length}</strong>
            </div>
            <div className="main-status-chip is-orange">
              额度来源: <strong>{quotaSourceSummary}</strong>
            </div>
            <div className="main-status-chip">
              更新渠道: <strong>{updateChannelLabel}</strong>
            </div>
            <div
              className={`main-status-chip${
                updateState.blockedByMandatory
                  ? ' is-danger'
                  : updateState.updateAvailable
                    ? ' is-blue'
                    : ''
              }`}
            >
              更新状态: <strong>{updateStatusLabel}</strong>
            </div>
            <div className="main-status-chip">
              更新源: <strong>{updateSourceLabel}</strong>
            </div>
            <div className="main-status-chip">
              上次检查: <strong>{formatDateTime(updateState.lastCheckedAt)}</strong>
            </div>
            {state.summary.currentAuthExists && !state.summary.authRecognized ? (
              <button
                type="button"
                className="main-status-action"
                onClick={() => void handleImportCurrentAuth()}
              >
                {busyAction === 'add' ? (
                  <LoaderCircle size={13} strokeWidth={1.8} className="spin" />
                ) : (
                  <Plus size={13} strokeWidth={1.8} />
                )}
                纳入当前登录
              </button>
            ) : null}
            <button
              type="button"
              className="main-status-action"
              onClick={() => void handleCheckForUpdates()}
            >
              {updateBusyAction === 'check' ? (
                <LoaderCircle size={13} strokeWidth={1.8} className="spin" />
              ) : (
                <RefreshCw size={13} strokeWidth={1.8} />
              )}
              检查更新
            </button>
            {updateState.updateAvailable ? (
              <button
                type="button"
                className="main-status-action"
                onClick={() => void handleDownloadAndInstallUpdate()}
              >
                {updateBusyAction === 'install' ? (
                  <LoaderCircle size={13} strokeWidth={1.8} className="spin" />
                ) : (
                  <RefreshCw size={13} strokeWidth={1.8} />
                )}
                {updatePrimaryActionLabel}
              </button>
            ) : null}
            {updateState.manifest?.notesUrl ? (
              <button
                type="button"
                className="main-status-action"
                onClick={() => void handleOpenUpdateNotes()}
              >
                查看更新说明
              </button>
            ) : null}
          </div>

          <section className="cards-grid">
            {filteredProfiles.length === 0 ? (
              <div className="empty-grid-card">
                <h3>还没有可用的 Profile</h3>
                <p>
                  当前根目录下没有扫描到任何 auth.json。先点击右上角“添加 Profile”，导入一份
                  auth.json，再回来确认卡片和切换流程。
                </p>
                <button
                  type="button"
                  className="sidebar-button"
                  onClick={() => openAddDialog()}
                >
                  <Plus size={16} />
                  添加第一个 Profile
                </button>
                {state.summary.currentAuthExists ? (
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => void handleImportCurrentAuth()}
                  >
                    <RefreshCw size={16} />
                    扫描当前 auth.json
                  </button>
                ) : null}
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <ProfileShellCard
                  key={profile.id}
                  profile={profile}
                  isRecommended={recommendedProfileId === profile.id}
                  weeklyJustReset={Boolean(recentlyResetKeys[`${profile.id}:weekly`])}
                  fiveHourJustReset={Boolean(recentlyResetKeys[`${profile.id}:five-hour`])}
                  menuOpen={menuProfileId === profile.id}
                  onOpenMenu={(profileId) =>
                    setMenuProfileId((current) => (current === profileId ? null : profileId))
                  }
                  onSwitch={(target) => {
                    if (isSimulatedProfile(target)) {
                      handleSimulationOnlyAction('模拟卡片仅用于本地展示，不会执行真实切换。');
                      return;
                    }
                    setMenuProfileId(null);
                    setSwitchTarget(target);
                  }}
                  onActiveInfo={(target) => {
                    setMenuProfileId(null);
                    setActiveInfoTarget(target);
                  }}
                  onEdit={(target) => {
                    if (isSimulatedProfile(target)) {
                      handleSimulationOnlyAction('模拟卡片不接后端存储，不能编辑。');
                      return;
                    }
                    setMenuProfileId(null);
                    setEditTarget(target);
                    setEditDialogOpen(true);
                  }}
                  onDelete={(target) => {
                    if (isSimulatedProfile(target)) {
                      handleSimulationOnlyAction('模拟卡片关闭模拟模式后就会消失，不需要删除。');
                      return;
                    }
                    setMenuProfileId(null);
                    setDeleteTarget(target);
                    setRemoveFilesOnDelete(false);
                  }}
                  onOpenDir={(target) => {
                    if (isSimulatedProfile(target)) {
                      handleSimulationOnlyAction('模拟卡片没有真实目录，只用于本地展示。');
                      return;
                    }
                    setMenuProfileId(null);
                    void handleOpenPath(target.authFilePath.replace(/[\\/]auth\.json$/i, ''));
                  }}
                />
              ))
            )}
          </section>
        </main>

        <aside className={`shell-right${settingsPanelOpen ? '' : ' is-collapsed'}`}>
          <SidebarPanel defaultOpen title="根目录管理">
            <div className="root-box">
              <div className="root-box__label">主目录</div>
              <code className="root-box__value">{state.settings.profilesRootDir}</code>
            </div>
            <button className="sidebar-button" type="button" onClick={() => void handleChangeRootDirectory()}>
              {busyAction === 'root' ? (
                <LoaderCircle size={14} strokeWidth={1.8} className="spin" />
              ) : null}
              {busyAction === 'root' ? '选择中...' : '更改根目录'}
            </button>
            <button
              className="sidebar-button sidebar-button--secondary"
              type="button"
              onClick={() => void handleOpenPath(state.settings.profilesRootDir)}
            >
              <FolderOpen size={14} strokeWidth={1.8} />
              打开目录
            </button>
          </SidebarPanel>

          <SidebarPanel defaultOpen title="预警设置">
            <div className="settings-stack">
              <label className="settings-toggle">
                <span className="settings-toggle__label">启用额度预警</span>
                <span className="settings-switch">
                  <input
                    className="settings-switch__input"
                    type="checkbox"
                    checked={state.settings.lowQuotaWarningEnabled}
                    onChange={(event) => {
                      void handleUpdateWarningSettings(
                        { lowQuotaWarningEnabled: event.target.checked },
                        event.target.checked ? '已启用额度预警。' : '已关闭额度预警。',
                      );
                    }}
                  />
                  <span className="settings-switch__track" />
                  <span className="settings-switch__thumb" />
                </span>
              </label>

              <div className="settings-threshold">
                <div className="settings-threshold__label">剩余低于此值时提醒切换</div>
                <div className="settings-threshold__controls">
                  <input
                    className="settings-input"
                    type="number"
                    min={5}
                    max={95}
                    step={1}
                    value={warningThresholdDraft}
                    onChange={(event) =>
                      setWarningThresholdDraft(
                        Math.max(5, Math.min(95, Number(event.target.value) || 5)),
                      )
                    }
                    onBlur={() => void handleCommitWarningThreshold()}
                  />
                  <span className="settings-suffix">%</span>
                </div>
              </div>

              <div className="settings-note">
                当前空间的周额度或 5 小时额度剩余低于阈值时，会弹出推荐切换提示，并高亮最适合切换的空间。
              </div>

              <div className="settings-divider" />

              {isCodexMode ? (
                <>
                  <div className="settings-group-title">Codex / Trae 自动重启</div>
                  <label className="settings-toggle">
                    <span className="settings-toggle__label">切换后自动重启运行中的 Codex / Trae</span>
                    <span className="settings-switch">
                      <input
                        className="settings-switch__input"
                        type="checkbox"
                        checked={state.settings.codexTraeAutoRestart}
                        onChange={(event) => {
                          void handleUpdateWarningSettings(
                            { codexTraeAutoRestart: event.target.checked },
                            event.target.checked
                              ? '已启用 Codex / Trae 自动重启。'
                              : '已关闭 Codex / Trae 自动重启。',
                          );
                        }}
                      />
                      <span className="settings-switch__track" />
                      <span className="settings-switch__thumb" />
                    </span>
                  </label>

                  <div className="root-box">
                    <div className="root-box__label">Codex 可执行文件</div>
                    <code className="root-box__value">{state.summary.codexExecutablePath ?? '未识别'}</code>
                    <div className="root-box__hint">
                      {mapExecutableSourceLabel(state.summary.codexExecutablePathSource)}
                    </div>
                  </div>
                  <div className="settings-inline-actions">
                    <button
                      className="sidebar-button"
                      type="button"
                      onClick={() => void handlePickManagedAppExecutable('codex')}
                    >
                      选择 Codex
                    </button>
                    <button
                      className="sidebar-button sidebar-button--secondary"
                      type="button"
                      onClick={() =>
                        void handleUpdateWarningSettings(
                          { codexExecutablePathOverride: null },
                          '已恢复为自动识别 Codex 路径。',
                        )
                      }
                    >
                      自动识别
                    </button>
                  </div>

                  <div className="root-box">
                    <div className="root-box__label">Trae 可执行文件</div>
                    <code className="root-box__value">{state.summary.traeExecutablePath ?? '未识别'}</code>
                    <div className="root-box__hint">
                      {mapExecutableSourceLabel(state.summary.traeExecutablePathSource)}
                    </div>
                  </div>
                  <div className="settings-inline-actions">
                    <button
                      className="sidebar-button"
                      type="button"
                      onClick={() => void handlePickManagedAppExecutable('trae')}
                    >
                      选择 Trae
                    </button>
                    <button
                      className="sidebar-button sidebar-button--secondary"
                      type="button"
                      onClick={() =>
                        void handleUpdateWarningSettings(
                          { traeExecutablePathOverride: null },
                          '已恢复为自动识别 Trae 路径。',
                        )
                      }
                    >
                      自动识别
                    </button>
                  </div>

                  <div className="settings-note">
                    切换前会先提示你保存当前 CLI、IDE 或对话内容；确认后仅会重启当前正在运行的 Codex / Trae。
                  </div>
                </>
              ) : (
                <>
                  <div className="settings-group-title">OpenClaw 自动切换</div>
                  <label className="settings-toggle">
                    <span className="settings-toggle__label">启用自动切换</span>
                    <span className="settings-switch">
                      <input
                        className="settings-switch__input"
                        type="checkbox"
                        checked={state.settings.autoSwitchEnabled}
                        onChange={(event) => {
                          void handleUpdateWarningSettings(
                            { autoSwitchEnabled: event.target.checked },
                            event.target.checked ? '已启用 OpenClaw 自动切换。' : '已关闭 OpenClaw 自动切换。',
                          );
                        }}
                      />
                      <span className="settings-switch__track" />
                      <span className="settings-switch__thumb" />
                    </span>
                  </label>

                  <div className="settings-threshold">
                    <div className="settings-threshold__label">剩余低于此值时开始 30 秒自动切换</div>
                    <div className="settings-threshold__controls">
                      <input
                        className="settings-input"
                        type="number"
                        min={5}
                        max={95}
                        step={1}
                        value={autoSwitchThresholdDraft}
                        onChange={(event) =>
                          setAutoSwitchThresholdDraft(
                            Math.max(5, Math.min(95, Number(event.target.value) || 5)),
                          )
                        }
                        onBlur={() => void handleCommitAutoSwitchThreshold()}
                      />
                      <span className="settings-suffix">%</span>
                    </div>
                  </div>

                  <div className="settings-threshold">
                    <div className="settings-threshold__label">自动切换倒计时</div>
                    <div className="settings-threshold__controls">
                      <input
                        className="settings-input"
                        type="number"
                        min={5}
                        max={180}
                        step={1}
                        value={autoSwitchCountdownDraft}
                        onChange={(event) =>
                          setAutoSwitchCountdownDraft(
                            Math.max(5, Math.min(180, Number(event.target.value) || 5)),
                          )
                        }
                        onBlur={() => void handleCommitAutoSwitchCountdown()}
                      />
                      <span className="settings-suffix">秒</span>
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-group-title">OpenClaw 同步</div>
                  <div className="root-box">
                    <div className="root-box__label">状态目录</div>
                    <code className="root-box__value">{state.summary.openclawStateDir}</code>
                  </div>
                  <div className="settings-inline-actions">
                    <button className="sidebar-button" type="button" onClick={() => void handlePickOpenClawDirectory()}>
                      选择目录
                    </button>
                    <button
                      className="sidebar-button sidebar-button--secondary"
                      type="button"
                      onClick={() =>
                        void handleUpdateWarningSettings(
                          { openclawStateDirOverride: null },
                          '已恢复为自动识别 OpenClaw 状态目录。',
                        )
                      }
                    >
                      自动识别
                    </button>
                  </div>

                  <label className="settings-toggle">
                    <span className="settings-toggle__label">切换后自动重启网关</span>
                    <span className="settings-switch">
                      <input
                        className="settings-switch__input"
                        type="checkbox"
                        checked={state.settings.openclawAutoRestartGateway}
                        onChange={(event) => {
                          void handleUpdateWarningSettings(
                            { openclawAutoRestartGateway: event.target.checked },
                            event.target.checked
                              ? 'OpenClaw 切换后将自动重启网关。'
                              : '已关闭 OpenClaw 网关自动重启。',
                          );
                        }}
                      />
                      <span className="settings-switch__track" />
                      <span className="settings-switch__thumb" />
                    </span>
                  </label>

                  <div className="settings-note">
                    网关命令：{state.summary.openclawGatewayAvailable ? '已检测到' : '未检测到'}
                    {state.summary.openclawGatewayCommandPath
                      ? ` (${state.summary.openclawGatewayCommandPath})`
                      : ''}
                  </div>
                </>
              )}
            </div>
          </SidebarPanel>

          {isLocalSimulationAvailable ? (
            <SidebarPanel defaultOpen title="特殊功能">
              <div className={`hidden-mode-shell${hiddenModeUnlocked ? ' is-unlocked' : ''}`}>
                <div className={`hidden-mode-shell__content${hiddenModeUnlocked ? '' : ' is-obscured'}`}>
                  <div className="settings-stack">
                    <div className="settings-inline-actions hidden-mode-toolbar">
                      <button
                        className="sidebar-button sidebar-button--secondary"
                        type="button"
                        onClick={() => openHiddenModeDialog(hiddenModeStoredPassword ? 'change' : 'setup')}
                      >
                        {hiddenModeStoredPassword ? '修改密码' : '设置密码'}
                      </button>
                      <button
                        className="sidebar-button sidebar-button--secondary"
                        type="button"
                        onClick={() => handleLockHiddenMode()}
                      >
                        重新隐藏
                      </button>
                    </div>

                    <div className="settings-note">
                      仅当前本地开发环境可见，密码只保存在当前设备浏览器存储里；重新隐藏后只会收起这块菜单，已启用的模拟卡片会继续保留。
                    </div>

                    <div className="settings-toggle settings-toggle--with-inline-input">
                      <div className="settings-toggle__main">
                        <span className="settings-toggle__label">启用模拟卡片</span>
                        <div className="settings-note">
                          关闭后模拟卡片会立即消失，也不会写入任何后端文件。
                        </div>
                      </div>
                      <div className="settings-toggle__inline">
                        <div className="settings-count-chip">
                          <input
                            className="settings-input settings-input--compact"
                            type="number"
                            min={1}
                            max={60}
                            step={1}
                            value={localSimulationCardCount}
                            onChange={(event) =>
                              setLocalSimulationCardCount(
                                clampSimulationCardCount(Number(event.target.value) || 1),
                              )
                            }
                          />
                          <span className="settings-suffix">个</span>
                        </div>
                        <span className="settings-switch">
                          <input
                            className="settings-switch__input"
                            type="checkbox"
                            checked={localSimulationEnabled}
                            onChange={(event) => {
                              const nextChecked = event.target.checked;
                              const nextCount =
                                nextChecked && localSimulationPlanTypes.length > 0
                                  ? clampSimulationCardCount(localSimulationCardCount)
                                  : 0;
                              setLocalSimulationEnabled(nextChecked);
                              setToast({
                                tone: 'info',
                                message: nextChecked
                                  ? `已启用本地模拟模式，追加 ${nextCount} 张模拟卡片。`
                                  : '已关闭本地模拟模式，模拟卡片已全部移除。',
                              });
                            }}
                          />
                          <span className="settings-switch__track" />
                          <span className="settings-switch__thumb" />
                        </span>
                      </div>
                    </div>

                    <div className="settings-note">
                      模拟卡片会排在正常真实卡片后面，手动停用的真实卡片会继续沉到最后；名称按 axx / bxx / cxx 这种格式随机生成，最近登录、同步时间、5 小时额度、周额度和重置倒计时都会单独随机。
                    </div>

                    <div className="settings-threshold">
                      <div className="settings-threshold__label">显示这些模拟套餐</div>
                      <div className="settings-inline-actions settings-inline-actions--simulation-plans">
                        {LOCAL_SIMULATION_PLAN_TYPES.map((planType) => {
                          const selected = localSimulationPlanTypes.includes(planType);
                          return (
                            <button
                              key={planType}
                              className={selected ? 'sidebar-button' : 'sidebar-button sidebar-button--secondary'}
                              type="button"
                              aria-pressed={selected}
                              onClick={() =>
                                setLocalSimulationPlanTypes((current) => toggleSimulationPlanType(current, planType))
                              }
                            >
                              {planType}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="settings-note">
                      只会生成你当前选中的套餐；未选中的套餐不会出现在模拟卡片里。模拟卡片的周额度和 5 小时额度固定按满额展示，重置倒计时会按各自的随机重置时间持续走动。
                    </div>
                  </div>
                </div>

                {!hiddenModeUnlocked ? (
                  <div className="hidden-mode-shell__overlay">
                    <button
                      className="hidden-mode-shell__enter"
                      type="button"
                      onClick={() => handleRequestHiddenModeAccess()}
                    >
                      特殊功能
                    </button>
                    <div className="hidden-mode-shell__note">
                        {hasHiddenModePassword
                          ? '输入密码后才能查看本地测试菜单；已启用的模拟卡片不会因为重新隐藏而消失。'
                          : '首次进入会先让你设置一个仅保存在本机的密码。'}
                    </div>
                  </div>
                ) : null}
              </div>
            </SidebarPanel>
          ) : null}

          <SidebarPanel defaultOpen title="备份历史">
            <div className="backup-list">
              {state.backups.length === 0 ? (
                <div className="empty-side-note">还没有备份记录，切换 profile 后会自动写入。</div>
              ) : (
                state.backups.slice(0, 6).map((item) => (
                  <BackupRow key={item.filePath} item={item} />
                ))
              )}
            </div>
          </SidebarPanel>

          <SidebarPanel title="最近操作">
            <div className="side-log-list">
              {state.logs.slice(0, 6).map((item) => (
                <div key={item.id} className={`side-log-item is-${item.level}`}>
                  <div className="side-log-item__time">{formatDateTime(item.createdAt)}</div>
                  <div className="side-log-item__message">{item.message}</div>
                </div>
              ))}
            </div>
          </SidebarPanel>

          <SidebarPanel title="安全提示">
            <div className="security-tip">
              不展示 access_token 或 refresh_token。当前工具只执行 auth.json 复制、备份和元数据维护。
            </div>
          </SidebarPanel>
        </aside>
      </div>

      {authCenterOverlayVisible ? (
        <div className="auth-gate" role="dialog" aria-modal="true" aria-live="polite">
          <div className="auth-gate__backdrop" />
          <div className="auth-gate__panel glass-panel">
            <section className="auth-gate__hero">
              <div className="auth-gate__hero-copy">
                <div className={`auth-gate__eyebrow${authCenterUrgentAlert ? ' is-danger' : ''}`}>
                  {authCenterHeroEyebrow}
                </div>
                <h2 className="auth-gate__title">{authCenterHeroTitle}</h2>
                <p className="auth-gate__description">{authCenterHeroDescription}</p>
              </div>
              {!authGateVisible ? (
                <div className="auth-gate__hero-entry">
                  <div className="auth-gate-entry-slot__hint">
                    当前设备已经处于有效授权期，可以直接返回主界面继续使用。
                  </div>
                  <button
                    type="button"
                    className="sidebar-button auth-gate-entry-button is-pulsing"
                    onClick={handleCloseAuthCenterOverlay}
                  >
                    <CheckCircle2 size={18} />
                    进入应用主页
                  </button>
                </div>
              ) : null}
              <div className="auth-gate__hero-meta">
                <button
                  type="button"
                  className="auth-gate-meta-chip is-copyable"
                  onClick={() => void handleCopyValue('设备编号', authState.device.deviceId)}
                >
                  <span>设备编号</span>
                  <strong>{authState.device.deviceId}</strong>
                </button>
                <button
                  type="button"
                  className="auth-gate-meta-chip is-copyable"
                  onClick={() => void handleCopyValue('机器指纹', authState.device.fingerprintHash)}
                >
                  <span>机器指纹</span>
                  <strong>{authState.device.fingerprintSummary}</strong>
                </button>
                <div className="auth-gate-meta-chip">
                  <span>当前状态</span>
                  <strong>{authState.license.licenseTypeLabel}</strong>
                </div>
                <div className={`auth-gate-meta-chip${authCenterUrgentAlert ? ' is-danger is-blinking' : ''}`}>
                  <span>剩余时间</span>
                  <strong>{authGateCountdownText}</strong>
                </div>
              </div>
            </section>

            {authCenterAlertMessage ? (
              <div className="auth-gate-alert-banner" role="alert">
                <CircleAlert size={16} />
                <span>{authCenterAlertMessage}</span>
              </div>
            ) : null}

            <div className="auth-gate__grid">
              <section className="auth-gate-card auth-gate-card--account">
                <div className="auth-gate-card__header">
                  <div className="auth-gate-card__icon">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <div className="auth-gate-card__eyebrow">Step 1</div>
                    <h3 className="auth-gate-card__title">登录 / 注册</h3>
                  </div>
                </div>

                {authState.sessionStatus === 'authenticated' ? (
                  <div className="auth-gate-account-summary">
                    <div className="auth-gate-account-summary__main">
                      <strong>{authState.profile?.displayName ?? '已登录账号'}</strong>
                      <span>{authState.profile?.email ?? '当前账号邮箱未记录'}</span>
                    </div>
                    <span className="badge badge--role-current">已完成登录验证</span>
                  </div>
                ) : (
                  <div className="auth-gate-note">
                    还没有登录账号时，可以先注册或直接登录；账号验证完成后，仍需录入授权码才能进入完整主界面。
                  </div>
                )}

                <div className="auth-gate-tabs">
                  <button
                    type="button"
                    className={`about-qr-tab${authMode === 'login' ? ' is-active' : ''}`}
                    onClick={() => setAuthMode('login')}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    className={`about-qr-tab${authMode === 'register' ? ' is-active' : ''}`}
                    onClick={() => setAuthMode('register')}
                  >
                    注册
                  </button>
                  <button
                    type="button"
                    className={`about-qr-tab${authMode === 'forgot' ? ' is-active' : ''}`}
                    onClick={() => setAuthMode('forgot')}
                  >
                    忘记密码
                  </button>
                </div>

                <div className="auth-gate-form">
                  {authMode === 'register' ? (
                    <label className="auth-gate-field">
                      <span className="auth-gate-field__label">用户名</span>
                      <input
                        className="license-input"
                        placeholder="输入用户名"
                        value={authForm.displayName}
                        onChange={(event) => handleAuthFormChange({ displayName: event.target.value })}
                      />
                    </label>
                  ) : null}

                  <label className="auth-gate-field">
                    <span className="auth-gate-field__label">邮箱</span>
                    <input
                      className="license-input"
                      placeholder="输入邮箱"
                      value={authForm.email}
                      onChange={(event) => handleAuthFormChange({ email: event.target.value })}
                    />
                  </label>

                  {authMode !== 'forgot' ? (
                    <label className="auth-gate-field">
                      <span className="auth-gate-field__label">密码</span>
                      <input
                        className="license-input"
                        placeholder="输入密码"
                        type="password"
                        value={authForm.password}
                        onChange={(event) => handleAuthFormChange({ password: event.target.value })}
                      />
                    </label>
                  ) : null}

                  <label className="auth-gate-field">
                    <span className="auth-gate-field__label">验证码（预留）</span>
                    <input
                      className="license-input"
                      placeholder="后续接真实短信/邮箱验证码"
                      value={authForm.verificationCode}
                      onChange={(event) => handleAuthFormChange({ verificationCode: event.target.value })}
                    />
                  </label>

                  {authMode !== 'forgot' ? (
                    <label className="user-drawer-remember auth-gate-remember">
                      <input
                        type="checkbox"
                        checked={authForm.rememberMe}
                        onChange={(event) => handleAuthFormChange({ rememberMe: event.target.checked })}
                      />
                      <span>记住我</span>
                    </label>
                  ) : null}

                  <button type="button" className="sidebar-button auth-gate-primary" onClick={() => void handleSubmitAuth()}>
                    {authBusyAction === 'login' || authBusyAction === 'register' || authBusyAction === 'forgot' ? (
                      <LoaderCircle size={15} strokeWidth={1.8} className="spin" />
                    ) : (
                      <UserRound size={15} />
                    )}
                    {authGatePrimaryActionLabel}
                  </button>
                </div>

                {authState.bootstrap.notice ? (
                  <div className="auth-gate-footnote">{authState.bootstrap.notice}</div>
                ) : null}

                {!authGateVisible ? (
                  <div className="auth-gate-entry-slot auth-gate-entry-slot--panel">
                    <div className="auth-gate-entry-slot__hint">
                      当前设备已经处于有效授权期，可以直接返回主界面继续使用。
                    </div>
                    <button
                      type="button"
                      className="sidebar-button auth-gate-entry-button is-pulsing"
                      onClick={handleCloseAuthCenterOverlay}
                    >
                      <CheckCircle2 size={18} />
                      进入应用主页
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="auth-gate-card auth-gate-card--license">
                <div className="auth-gate-card__header">
                  <div className="auth-gate-card__icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="auth-gate-card__eyebrow">Step 2</div>
                    <h3 className="auth-gate-card__title">授权中心</h3>
                  </div>
                </div>

                <div className={`auth-gate-license-status${authCenterUrgentAlert ? ' is-danger' : ''}`}>
                  <div className="auth-gate-license-status__main">
                    <strong>{authState.license.licenseTypeLabel}</strong>
                    <span>
                      来源：{authState.license.sourceLabel} / 阶段：{authState.license.stageLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => void handleCopyValue('设备编号', authState.device.deviceId)}
                  >
                    <Copy size={14} />
                    复制设备编号
                  </button>
                </div>

                <div className="auth-gate-metrics">
                  <div className={`about-metric-card${authCenterUrgentAlert ? ' metric-card--danger is-blinking' : ''}`}>
                    <span className="about-metric-card__label">剩余倒计时</span>
                    <strong className="about-metric-card__value">{authGateCountdownText}</strong>
                  </div>
                  <div className="about-metric-card">
                    <span className="about-metric-card__label">到期时间</span>
                    <strong className="about-metric-card__value">
                      {authState.license.permanent
                        ? '永久'
                        : formatDateTime(authState.license.expiresAt)}
                    </strong>
                  </div>
                </div>

                <div className="auth-gate-form">
                  <label className="auth-gate-field">
                    <span className="auth-gate-field__label">授权码</span>
                    <input
                      className="license-input"
                      placeholder="粘贴 activation code"
                      value={authGateActivationCode}
                      onChange={(event) => setAuthGateActivationCode(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="sidebar-button auth-gate-primary"
                    onClick={() => void handleApplyActivationCode(authGateActivationCode)}
                  >
                    {authBusyAction === 'activation' ? (
                      <LoaderCircle size={15} strokeWidth={1.8} className="spin" />
                    ) : (
                      <KeyRound size={15} />
                    )}
                    应用授权码
                  </button>

                  <label className="auth-gate-field">
                    <span className="auth-gate-field__label">奖励码</span>
                    <input
                      className="license-input"
                      placeholder="录入 reward code"
                      value={authGateRewardCode}
                      onChange={(event) => setAuthGateRewardCode(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => void handleApplyRewardCode(authGateRewardCode)}
                  >
                    {authBusyAction === 'reward' ? (
                      <LoaderCircle size={15} strokeWidth={1.8} className="spin" />
                    ) : (
                      <Ticket size={15} />
                    )}
                    录入奖励码
                  </button>

                  <label className="auth-gate-field">
                    <span className="auth-gate-field__label">邀请码兑换</span>
                    <input
                      className="license-input"
                      placeholder="输入邀请码兑换体验时长"
                      value={authGateInviteCode}
                      onChange={(event) => setAuthGateInviteCode(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => void handleRedeemInviteCode(authGateInviteCode)}
                  >
                    {authBusyAction === 'redeem-invite' ? (
                      <LoaderCircle size={15} strokeWidth={1.8} className="spin" />
                    ) : (
                      <Ticket size={15} />
                    )}
                    兑换邀请码
                  </button>
                </div>

                <div className="auth-gate-inline-note">
                  当前邀请码：
                  <strong>{licenseCenterSnapshot.requestedInviteCode ?? licenseCenterSnapshot.inviteCode}</strong>
                  <button
                    type="button"
                    className="auth-gate-inline-link"
                    onClick={() =>
                      void handleCopyValue(
                        '邀请码',
                        licenseCenterSnapshot.requestedInviteCode ?? licenseCenterSnapshot.inviteCode,
                      )
                    }
                  >
                    复制
                  </button>
                </div>
                <div className="auth-gate-footnote">
                  邀请进度 {licenseCenterSnapshot.inviteProgressLabel}，{licenseCenterSnapshot.inviteSlotsText}
                  {licenseCenterSnapshot.nextRewardLabel
                    ? `，下一档奖励 ${licenseCenterSnapshot.nextRewardLabel}`
                    : ''}
                </div>
              </section>

              <section className="auth-gate-card auth-gate-card--support">
                <div className="auth-gate-card__header">
                  <div className="auth-gate-card__icon">
                    <BadgeHelp size={18} />
                  </div>
                  <div>
                    <div className="auth-gate-card__eyebrow">Support</div>
                    <h3 className="auth-gate-card__title">获取授权 / 联系客服</h3>
                  </div>
                </div>

                <div className="auth-gate-support-grid">
                  <button
                    type="button"
                    className="auth-gate-support-button"
                    onClick={() => void handleOpenExternal(`mailto:${APP_SUPPORT_EMAIL}`)}
                  >
                    <Mail size={16} />
                    <span>联系客服邮箱</span>
                    <strong>{APP_SUPPORT_EMAIL}</strong>
                  </button>
                  <button
                    type="button"
                    className="auth-gate-support-button"
                    onClick={() => void handleOpenExternal(APP_REPOSITORY_URL)}
                  >
                    <ExternalLink size={16} />
                    <span>项目仓库 / 发布页</span>
                    <strong>打开 GitHub</strong>
                  </button>
                  <button
                    type="button"
                    className="auth-gate-support-button"
                    onClick={() => {
                      setFooterHelpOpen(true);
                      setAboutDialogOpen(false);
                    }}
                  >
                    <BadgeHelp size={16} />
                    <span>帮助入口</span>
                    <strong>打开客服与群二维码卡片</strong>
                  </button>
                  <button
                    type="button"
                    className="auth-gate-support-button"
                    onClick={handleOpenAboutDialog}
                  >
                    <ShieldCheck size={16} />
                    <span>关于 / 授权说明</span>
                    <strong>查看说明与更新入口</strong>
                  </button>
                </div>

                <div className="auth-gate-support-note">
                  如果你还没有正式授权，建议先完成账号验证，再联系我获取授权码；客服、帮助和群入口都在这一区域，不需要先进入完整主界面。
                </div>

                <div className="auth-gate-qr-grid">
                  {FOOTER_HELP_QR_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`auth-gate-qr-card${item.imageSrc ? ' is-clickable' : ''}`}
                      onClick={() => handleOpenAuthGateQrPreview(item)}
                      disabled={!item.imageSrc}
                    >
                      <div className="auth-gate-qr-card__box">
                        {item.imageSrc ? (
                          <img src={item.imageSrc} alt={item.title} className="auth-gate-qr-card__image" />
                        ) : (
                          <span className="auth-gate-qr-card__empty">敬请期待</span>
                        )}
                      </div>
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                      <p>{item.hint}</p>
                    </button>
                  ))}
                </div>

                <div className="auth-gate-action-row">
                  <button type="button" className="sidebar-button" onClick={() => void handleCheckForUpdates()}>
                    {updateBusyAction === 'check' ? (
                      <LoaderCircle size={15} strokeWidth={1.8} className="spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    检查更新
                  </button>
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => void handleCopyValue('机器指纹', authState.device.fingerprintSummary)}
                  >
                    <Copy size={14} />
                    复制机器指纹摘要
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {updateState.blockedByMandatory ? (
        <div className="update-guard" role="alert" aria-live="assertive">
          <div className="update-guard__panel">
            <div className="update-guard__eyebrow">必须更新后继续</div>
            <h3 className="update-guard__title">
              {updateState.updateKind === 'patch' ? '发现必须安装的新修复' : '发现必须安装的新版本'}
            </h3>
            <p className="update-guard__copy">
              当前版本 {updateState.currentVersion}
              {updateState.manifest ? `，最新版本 ${updateState.manifest.version}` : ''}
              {updateState.minSupportedVersion
                ? `，最低支持版本 ${updateState.minSupportedVersion}`
                : ''}
              。请先完成更新，再继续使用核心切换功能。
            </p>
            {updateState.errorMessage ? (
              <div className="update-guard__error">{updateState.errorMessage}</div>
            ) : null}
            <div className="update-guard__meta">
              <span>渠道：{updateChannelLabel}</span>
              <span>来源：{updateSourceLabel}</span>
              <span>发布时间：{formatDateTime(updateState.manifest?.releaseTime)}</span>
            </div>
            <div className="update-guard__actions">
              <button
                type="button"
                className="sidebar-button"
                onClick={() => void handleDownloadAndInstallUpdate()}
              >
                {updateBusyAction === 'install' ? (
                  <LoaderCircle size={15} strokeWidth={1.8} className="spin" />
                ) : null}
                {updatePrimaryActionLabel}
              </button>
              <button
                type="button"
                className="sidebar-button sidebar-button--secondary"
                onClick={() => void handleCheckForUpdates()}
              >
                检查更新
              </button>
              {updateState.manifest?.notesUrl ? (
                <button
                  type="button"
                  className="sidebar-button sidebar-button--secondary"
                  onClick={() => void handleOpenUpdateNotes()}
                >
                  查看更新说明
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <footer className="console-footer">
        <div className="console-label">
          <TerminalSquare size={13} strokeWidth={2} />
          <span>控制台</span>
        </div>
        <div className="console-stream">
          {state.logs.length === 0 ? (
            <span className="console-entry">
              <span className="console-entry__time">[--:--:--]</span>
              等待操作日志...
            </span>
          ) : (
            state.logs.slice(0, 12).map((entry) => (
              <span
                key={entry.id}
                className={`console-entry${entry.level === 'success' ? ' is-success' : ''}${
                  entry.level === 'info' ? ' is-info' : ''
                }${entry.level === 'warn' ? ' is-warn' : ''}${entry.level === 'error' ? ' is-error' : ''}`}
              >
                <span className="console-entry__time">[{formatDateTime(entry.createdAt)}]</span>
                {entry.message}
              </span>
            ))
          )}
        </div>
        <button
          type="button"
          className="console-version console-version--button"
          onClick={() => setFooterHelpOpen((current) => !current)}
        >
          v{updateState.currentVersion}
        </button>
      </footer>

      <FooterHelpCard
        open={footerHelpOpen}
        versionLabel={`当前版本 v${updateState.currentVersion}`}
        updateBadgeVisible={updateBadgeVisible}
        checkingUpdate={updateBusyAction === 'check'}
        qrItems={FOOTER_HELP_QR_ITEMS}
        onClose={() => setFooterHelpOpen(false)}
        onOpenAbout={handleOpenAboutDialog}
        onCheckForUpdates={() => void handleCheckForUpdates()}
      />

      <AboutDialog
        open={aboutDialogOpen}
        appName={APP_DISPLAY_NAME}
        subtitle={APP_SUBTITLE}
        buildChannelLabel={updateChannelLabel}
        platformTags={platformTags}
        versionLabel={`版本 ${updateState.currentVersion}`}
        updateState={updateState}
        updateBusyAction={updateBusyAction}
        links={ABOUT_CONTACT_LINKS}
        qrItems={ABOUT_QR_ITEMS}
        products={ABOUT_PRODUCT_ITEMS}
        onOpenChange={setAboutDialogOpen}
        onCheckForUpdates={() => void handleCheckForUpdates()}
        onInstallUpdate={() => void handleDownloadAndInstallUpdate()}
        onOpenUpdateNotes={() => void handleOpenUpdateNotes()}
        onOpenExternal={(url) => void handleOpenExternal(url)}
        onCopyValue={(label, value) => void handleCopyValue(label, value)}
      />

      <UpdateDialog
        open={updateDialogOpen}
        updateState={updateState}
        busyAction={updateBusyAction}
        onOpenChange={setUpdateDialogOpen}
        onCheckForUpdates={() => void handleCheckForUpdates()}
        onInstallUpdate={() => void handleDownloadAndInstallUpdate()}
        onOpenNotes={() => void handleOpenUpdateNotes()}
      />

      <Dialog.Root open={avatarUploadOpen} onOpenChange={handleAvatarUploadOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="avatar-upload-dialog-overlay" />
          <Dialog.Content className="avatar-upload-dialog-panel">
            <header className="shell-dialog-header avatar-upload-dialog-panel__header">
              <div>
                <div className="shell-dialog-eyebrow">Avatar Upload</div>
                <Dialog.Title className="shell-dialog-title">上传头像</Dialog.Title>
                <Dialog.Description className="shell-dialog-description">
                  先拖入预览或手动选择图片，确认无误后再正式保存。系统会居中裁切并输出
                  {' '}192 × 192{' '}头像。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="shell-dialog-close"
                  aria-label="关闭头像上传卡片"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </header>

            <div className="shell-dialog-body avatar-upload-dialog-body">
              <div className="avatar-upload-dialog-grid">
                <section className="avatar-upload-card avatar-upload-card--preview">
                  <div className="avatar-upload-card__eyebrow">PREVIEW</div>
                  <h3 className="avatar-upload-card__title">{avatarPreviewTitle}</h3>
                  <p className="avatar-upload-card__copy">
                    这里展示最终保存时的方形头像效果。未确认前不会写入本地。
                  </p>
                  <div className="avatar-upload-preview-frame">
                    {avatarPreviewSrc ? (
                      <div className="avatar-upload-preview-frame__crop-shell">
                        <img
                          className={`avatar-upload-preview-frame__image${avatarUploadDraft ? ' is-adjustable' : ''}`}
                          src={avatarPreviewSrc}
                          alt=""
                          style={avatarPreviewStyle}
                        />
                      </div>
                    ) : (
                      <span className="avatar-upload-preview-frame__fallback">
                        {userCenterSession.avatarText}
                      </span>
                    )}
                  </div>
                  <div className="avatar-upload-preview-caption">
                    <span>当前账号</span>
                    <strong>{userCenterSession.displayName}</strong>
                    <small>{userCenterSession.email ?? '未绑定邮箱'}</small>
                  </div>
                </section>

                <section className="avatar-upload-card avatar-upload-card--controls">
                  <div className="avatar-upload-card__eyebrow">UPLOAD</div>
                  <h3 className="avatar-upload-card__title">拖入上传或手动选择</h3>
                  <div
                    className={`avatar-upload-dropzone${avatarUploadDragging ? ' is-dragging' : ''}${avatarUploadBusy ? ' is-busy' : ''}`}
                    onDragOver={handleAvatarDragOver}
                    onDragLeave={handleAvatarDragLeave}
                    onDrop={handleAvatarDrop}
                  >
                    <ArrowUpCircle size={28} />
                    <strong>{avatarUploadBusy ? '正在处理图片...' : '把头像拖到这里'}</strong>
                    <span>支持 PNG / JPG / WEBP，最大 5 MB。</span>
                    <button
                      type="button"
                      className="sidebar-button"
                      onClick={handlePickAvatarFile}
                      disabled={avatarUploadBusy}
                    >
                      {avatarUploadDraft ? <Pencil size={16} /> : <Plus size={16} />}
                      {avatarUploadDraft ? '重新选择图片' : '手动上传图片'}
                    </button>
                  </div>

                  <div className="avatar-upload-metrics">
                    <div className="avatar-upload-metric">
                      <span>原始尺寸</span>
                      <strong>
                        {avatarUploadDraft
                          ? `${avatarUploadDraft.sourceWidth} × ${avatarUploadDraft.sourceHeight}`
                          : '等待选择'}
                      </strong>
                    </div>
                    <div className="avatar-upload-metric">
                      <span>原始体积</span>
                      <strong>
                        {avatarUploadDraft
                          ? formatAvatarFileSize(avatarUploadDraft.fileSize)
                          : '等待选择'}
                      </strong>
                    </div>
                    <div className="avatar-upload-metric">
                      <span>输出尺寸</span>
                      <strong>{AVATAR_OUTPUT_SIZE} × {AVATAR_OUTPUT_SIZE}</strong>
                    </div>
                    <div className="avatar-upload-metric">
                      <span>格式限制</span>
                      <strong>图片 / ≤ 5 MB</strong>
                    </div>
                  </div>

                  <div className="avatar-upload-file-meta">
                    <div>
                      <span>当前文件</span>
                      <strong>{avatarUploadDraft?.fileName ?? '尚未选择头像文件'}</strong>
                    </div>
                    <div>
                      <span>文件类型</span>
                      <strong>{avatarUploadDraft?.sourceType ?? 'image/*'}</strong>
                    </div>
                  </div>

                  {avatarUploadDraft ? (
                    <div className="avatar-upload-adjustment-summary">
                      <div className="avatar-upload-adjustment-summary__copy">
                        <strong>图片构图</strong>
                        <span>如需缩放或调整位置，请打开二级弹窗处理后再保存头像。</span>
                      </div>
                      <button
                        type="button"
                        className="sidebar-button sidebar-button--secondary"
                        onClick={() => handleAvatarAdjustOpenChange(true)}
                      >
                        <Pencil size={16} />
                        调整缩放与位置
                      </button>
                    </div>
                  ) : null}

                  <div className="avatar-upload-note-list">
                    <div className="avatar-upload-note-item">
                      <CheckCircle2 size={16} />
                      <span>点击“确认保存头像”后才会正式保存到当前账号本地头像。</span>
                    </div>
                    <div className="avatar-upload-note-item">
                      <CheckCircle2 size={16} />
                      <span>如需改构图，会另外弹出一张调整卡片，不会把控制条直接塞进当前主卡。</span>
                    </div>
                    <div className="avatar-upload-note-item">
                      <CheckCircle2 size={16} />
                      <span>关闭或取消本卡片，不会覆盖你现在正在使用的头像。</span>
                    </div>
                  </div>

                  {avatarUploadError ? (
                    <div className="avatar-upload-error">
                      <CircleAlert size={16} />
                      <span>{avatarUploadError}</span>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>

            <footer className="shell-dialog-footer avatar-upload-dialog-footer">
              <div className="shell-dialog-footer__hint">
                头像只保存在当前账号本地资料里；如果你不点确认，系统不会写入新的头像记录。
              </div>
              <div className="shell-dialog-footer__actions">
                <button
                  type="button"
                  className="sidebar-button--secondary"
                  onClick={() => handleAvatarUploadOpenChange(false)}
                  disabled={avatarUploadBusy}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="sidebar-button avatar-upload-dialog__primary"
                  onClick={() => void handleConfirmAvatarUpload()}
                  disabled={avatarUploadBusy || !avatarUploadDraft}
                >
                  {avatarUploadBusy ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  确认保存头像
                </button>
              </div>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={avatarAdjustOpen} onOpenChange={handleAvatarAdjustOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="avatar-adjust-dialog-overlay" />
          <Dialog.Content className="avatar-adjust-dialog-panel">
            <header className="shell-dialog-header avatar-adjust-dialog-panel__header">
              <div>
                <div className="shell-dialog-eyebrow">Avatar Adjust</div>
                <Dialog.Title className="shell-dialog-title">调整头像构图</Dialog.Title>
                <Dialog.Description className="shell-dialog-description">
                  在这里单独调缩放和位置。确认后回写到上一张上传卡，再决定是否正式保存头像。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="shell-dialog-close" aria-label="关闭头像构图调整弹窗">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </header>

            <div className="shell-dialog-body avatar-adjust-dialog-body">
              <div className="avatar-adjust-dialog-grid">
                <section className="avatar-upload-card avatar-upload-card--preview">
                  <div className="avatar-upload-card__eyebrow">CROP PREVIEW</div>
                  <h3 className="avatar-upload-card__title">构图预览</h3>
                  <p className="avatar-upload-card__copy">
                    这里看到的就是保存到头像位的最终取景效果。
                  </p>
                  <div className="avatar-upload-preview-frame avatar-adjust-dialog__preview-frame">
                    {avatarAdjustPreviewSrc ? (
                      <div className="avatar-upload-preview-frame__crop-shell">
                        <img
                          className={`avatar-upload-preview-frame__image${avatarAdjustDraft ? ' is-adjustable' : ''}`}
                          src={avatarAdjustPreviewSrc}
                          alt=""
                          style={avatarAdjustStyle}
                        />
                      </div>
                    ) : (
                      <span className="avatar-upload-preview-frame__fallback">
                        {userCenterSession.avatarText}
                      </span>
                    )}
                  </div>
                </section>

                <section className="avatar-upload-card avatar-upload-card--controls">
                  <div className="avatar-upload-card__eyebrow">ADJUST</div>
                  <h3 className="avatar-upload-card__title">缩放与位置</h3>
                  {avatarAdjustDraft && avatarAdjustMetrics ? (
                    <div className="avatar-upload-adjustments avatar-upload-adjustments--dialog">
                      <div className="avatar-upload-adjustment">
                        <div className="avatar-upload-adjustment__label-row">
                          <span>缩放</span>
                          <strong>{Math.round(avatarAdjustDraft.scale * 100)}%</strong>
                        </div>
                        <input
                          className="avatar-upload-adjustment__slider"
                          type="range"
                          min={avatarAdjustDraft.minScale}
                          max={avatarAdjustDraft.maxScale}
                          step="0.01"
                          value={avatarAdjustDraft.scale}
                          onChange={(event) => {
                            handleAvatarDraftChange({ scale: Number(event.target.value) });
                          }}
                        />
                      </div>

                      <div className="avatar-upload-adjustment">
                        <div className="avatar-upload-adjustment__label-row">
                          <span>水平位置</span>
                          <strong>{avatarAdjustDraft.offsetX}px</strong>
                        </div>
                        <input
                          className="avatar-upload-adjustment__slider"
                          type="range"
                          min={-avatarAdjustMetrics.maxOffsetX}
                          max={avatarAdjustMetrics.maxOffsetX}
                          step="1"
                          value={avatarAdjustDraft.offsetX}
                          onChange={(event) => {
                            handleAvatarDraftChange({ offsetX: Number(event.target.value) });
                          }}
                        />
                      </div>

                      <div className="avatar-upload-adjustment">
                        <div className="avatar-upload-adjustment__label-row">
                          <span>垂直位置</span>
                          <strong>{avatarAdjustDraft.offsetY}px</strong>
                        </div>
                        <input
                          className="avatar-upload-adjustment__slider"
                          type="range"
                          min={-avatarAdjustMetrics.maxOffsetY}
                          max={avatarAdjustMetrics.maxOffsetY}
                          step="1"
                          value={avatarAdjustDraft.offsetY}
                          onChange={(event) => {
                            handleAvatarDraftChange({ offsetY: Number(event.target.value) });
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="sidebar-button sidebar-button--secondary avatar-upload-adjustment__reset"
                        onClick={handleResetAvatarDraftPosition}
                      >
                        重置缩放与位置
                      </button>
                    </div>
                  ) : (
                    <div className="avatar-adjust-dialog__empty">请先在上一张卡片中选择一张图片。</div>
                  )}
                </section>
              </div>
            </div>

            <footer className="shell-dialog-footer avatar-adjust-dialog-footer">
              <div className="shell-dialog-footer__hint">
                这里的调整只会先回写到上传卡预览，不会立即保存到账号头像。
              </div>
              <div className="shell-dialog-footer__actions">
                <button
                  type="button"
                  className="sidebar-button--secondary"
                  onClick={() => handleAvatarAdjustOpenChange(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="sidebar-button avatar-upload-dialog__primary"
                  onClick={handleConfirmAvatarAdjust}
                  disabled={!avatarAdjustDraft}
                >
                  <CheckCircle2 size={16} />
                  应用当前构图
                </button>
              </div>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <UserCenterDrawer
        open={userCenterOpen}
        session={userCenterSession}
        avatarImageSrc={avatarImageSrc}
        brandFrameEnabled={userCenterBrandFrameEnabled}
        authMode={authMode}
        authForm={authForm}
        updateBadgeVisible={updateBadgeVisible}
        updateActionBusy={updateBusyAction === 'check'}
        authBusyAction={
          authBusyAction === 'login' || authBusyAction === 'register' || authBusyAction === 'forgot'
            ? authBusyAction
            : null
        }
        onOpenChange={setUserCenterOpen}
        onAuthModeChange={setAuthMode}
        onAuthFormChange={handleAuthFormChange}
        onSubmitAuth={() => void handleSubmitAuth()}
        onEditAvatar={handleEditAvatar}
        onBrandFrameEnabledChange={handleUserCenterBrandFrameEnabledChange}
        onCopyDeviceCode={() => void handleCopyValue('设备编号', userCenterSession.deviceId)}
        onCopyFingerprint={() => void handleCopyValue('机器指纹', userCenterSession.fingerprintHash)}
        onOpenLicenseCenter={handleOpenLicenseCenter}
        onCheckForUpdates={() => void handleCheckForUpdates()}
        onOpenAbout={handleOpenAboutDialog}
        onOpenHelp={() => {
          setUserCenterOpen(false);
          setFooterHelpOpen(true);
        }}
        onRestartApp={() => {
          window.codexWorkspace.restartApp();
        }}
      />

      <AddProfileDialog
        open={addDialogOpen}
        mode="add"
        initialValues={addDialogInitialValues}
        discoveryHint={addDialogDiscoveryHint}
        busy={busyAction === 'add'}
        onOpenChange={(open) => {
          if (open) {
            setAddDialogOpen(true);
            return;
          }

          closeAddDialog();
        }}
        onPickAuthFile={handlePickAuthFile}
        onSubmit={handleAddProfile}
      />

      <AddProfileDialog
        open={editDialogOpen}
        mode="edit"
        initialProfile={editTarget}
        busy={busyAction === 'edit'}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditTarget(null);
          }
        }}
        onPickAuthFile={handlePickAuthFile}
        onSubmit={handleEditProfile}
      />

      <ConfirmActionDialog
        open={Boolean(pendingAddOverwrite)}
        eyebrow="覆盖同命名空间"
        title={
          pendingAddOverwrite
            ? `发现同命名空间：${getProfileDisplayName(pendingAddOverwrite.target)}`
            : '发现同命名空间'
        }
        description={
          pendingAddOverwrite
            ? `当前准备导入的空间名称与已有空间“${getProfileDisplayName(pendingAddOverwrite.target)}”相同。确认后会直接覆盖原空间的 auth、套餐和备注，不会再额外新增一张卡片。`
            : ''
        }
        confirmLabel="确认覆盖"
        cancelLabel="继续编辑"
        busy={busyAction === 'add'}
        onConfirm={() => {
          void handleConfirmAddOverwrite();
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAddOverwrite(null);
          }
        }}
        extraContent={
          pendingAddOverwrite ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">已有空间</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {getProfileDisplayName(pendingAddOverwrite.target)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  套餐 {mapPlanLabel(pendingAddOverwrite.target.planType)} / 目录{' '}
                  {pendingAddOverwrite.target.storageDirName}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">准备导入</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {pendingAddOverwrite.values.name}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  套餐 {mapPlanLabel(pendingAddOverwrite.values.planType)} / 文件{' '}
                  {pendingAddOverwrite.values.authSourcePath}
                </div>
              </div>
            </div>
          ) : null
        }
      />

      <ConfirmActionDialog
        open={Boolean(autoSwitchPrompt)}
        eyebrow="自动切换预警"
        title="即将自动切换到推荐空间"
        description={
          autoSwitchPrompt
            ? `当前空间的${autoSwitchPrompt.suggestion.breachedLabels.join('、')}已低于自动切换阈值。若不取消，系统会在倒计时结束后自动切到更充足的空间。`
            : ''
        }
        confirmLabel="立即切换"
        cancelLabel="取消自动切换"
        busy={busyAction === 'switch'}
        onConfirm={() => {
          if (!autoSwitchPrompt) {
            return;
          }

          setDismissedAutoSwitchKey(autoSwitchPrompt.suggestion.warningKey);
          void executeSwitchProfile(autoSwitchPrompt.suggestion.recommendedProfile, 'auto');
        }}
        onOpenChange={(open) => {
          if (!open && autoSwitchPrompt) {
            setDismissedAutoSwitchKey(autoSwitchPrompt.suggestion.warningKey);
            setAutoSwitchPrompt(null);
          }
        }}
        extraContent={
          autoSwitchPrompt ? (
            <div className="grid gap-4">
              <div className="auto-switch-countdown">
                <div className="auto-switch-countdown__value">{autoSwitchSecondsLeft}s</div>
                <div className="auto-switch-countdown__label">倒计时结束后自动切换</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">当前空间</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {getProfileDisplayName(autoSwitchPrompt.suggestion.activeProfile)}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    周额度剩余 {getRemainingPercent(autoSwitchPrompt.suggestion.activeProfile.weeklyQuota)}% / 5 小时剩余{' '}
                    {getRemainingPercent(autoSwitchPrompt.suggestion.activeProfile.fiveHourQuota)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">推荐切换</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {getProfileDisplayName(autoSwitchPrompt.suggestion.recommendedProfile)}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    周额度剩余 {getRemainingPercent(autoSwitchPrompt.suggestion.recommendedProfile.weeklyQuota)}% / 5 小时剩余{' '}
                    {getRemainingPercent(autoSwitchPrompt.suggestion.recommendedProfile.fiveHourQuota)}%
                  </div>
                </div>
              </div>
              <div className="text-xs leading-6 text-slate-300">
                当前模式：OpenClaw。自动切换后会同步认证到 OpenClaw；如果你开启了自动重启网关，也会继续执行。
              </div>
            </div>
          ) : null
        }
      />

      <ConfirmActionDialog
        open={Boolean(quotaAlertTarget)}
        eyebrow="额度预警"
        title="建议切换到更充足的空间"
        description={
          quotaAlertTarget
            ? `当前空间的${quotaAlertTarget.breachedLabels.join('、')}剩余已低于 ${quotaAlertTarget.threshold}%。为避免中途掉线，建议现在切换。`
            : ''
        }
        confirmLabel="查看推荐切换"
        cancelLabel="稍后再说"
        onConfirm={() => {
          if (!quotaAlertTarget) {
            return;
          }

          setDismissedQuotaAlertKey(quotaAlertTarget.warningKey);
          setSwitchTarget(quotaAlertTarget.recommendedProfile);
          setQuotaAlertTarget(null);
        }}
        onOpenChange={(open) => {
          if (!open && quotaAlertTarget) {
            setDismissedQuotaAlertKey(quotaAlertTarget.warningKey);
            setQuotaAlertTarget(null);
          }
        }}
        extraContent={
          quotaAlertTarget ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">当前空间</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {getProfileDisplayName(quotaAlertTarget.activeProfile)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  周额度剩余 {getRemainingPercent(quotaAlertTarget.activeProfile.weeklyQuota)}% / 5 小时剩余{' '}
                  {getRemainingPercent(quotaAlertTarget.activeProfile.fiveHourQuota)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">推荐切换</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {getProfileDisplayName(quotaAlertTarget.recommendedProfile)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  周额度剩余 {getRemainingPercent(quotaAlertTarget.recommendedProfile.weeklyQuota)}% / 5 小时剩余{' '}
                  {getRemainingPercent(quotaAlertTarget.recommendedProfile.fiveHourQuota)}%
                </div>
              </div>
            </div>
          ) : null
        }
      />

      <ConfirmActionDialog
        open={Boolean(activeInfoTarget)}
        eyebrow="当前空间"
        title={activeInfoTarget ? `${getProfileDisplayName(activeInfoTarget)} 已在使用中` : '当前空间'}
        description="这个空间已经是当前登录状态，不需要重复切换。你可以直接选择其他空间继续切换。"
        confirmLabel="知道了"
        showCancel={false}
        onConfirm={() => setActiveInfoTarget(null)}
        extraContent={
          activeInfoTarget ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">当前空间</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {getProfileDisplayName(activeInfoTarget)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">套餐</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {mapPlanLabel(activeInfoTarget.planType)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">最近登录</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {formatDateTime(activeInfoTarget.lastActivatedAt || activeInfoTarget.updatedAt)}
                </div>
              </div>
            </div>
          ) : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setActiveInfoTarget(null);
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(switchTarget)}
        eyebrow="切换工作区"
        title="确认切换登录状态"
        description={
          switchTarget
            ? isOpenClawMode
              ? '将使用该空间的认证信息替换当前登录状态，并同步到 OpenClaw 认证存储。你还可以在下方直接选择本次切换要生效的模型。'
              : state.settings.codexTraeAutoRestart
                ? '将使用该空间的认证信息替换当前登录状态。确认后会自动重启当前正在运行的 Codex / Trae，请先保存 CLI、IDE 或对话中的未保存内容。'
              : '将使用该空间的认证信息替换当前登录状态。切换后建议重启相关工具，以确保认证生效。'
            : ''
        }
        confirmLabel={busyAction === 'switch' ? latestSwitchProgressEvent?.title ?? '切换中...' : '立即切换'}
        busy={busyAction === 'switch'}
        extraContent={
          switchTarget ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">目标空间</div>
                  <div className="mt-2 text-sm font-semibold text-white">{switchTarget.name}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">套餐</div>
                  <div className="mt-2 text-sm font-semibold text-white">{mapPlanLabel(switchTarget.planType)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">空间名</div>
                  <div className="mt-2 text-sm font-semibold text-white">{getProfileDisplayName(switchTarget)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">切换模式</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {mapSwitchModeLabel(state.settings.switchMode)}
                  </div>
                </div>
              </div>

              {isCodexMode && state.settings.codexTraeAutoRestart ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Codex 路径</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {state.summary.codexExecutablePath ?? '未识别'}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {mapExecutableSourceLabel(state.summary.codexExecutablePathSource)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Trae 路径</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {state.summary.traeExecutablePath ?? '未识别'}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {mapExecutableSourceLabel(state.summary.traeExecutablePathSource)}
                    </div>
                  </div>
                </div>
              ) : null}

              {isOpenClawMode ? (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">OpenClaw 模型</div>
                  {openClawSwitchModelOptions.length > 0 ? (
                    <>
                      <select
                        className="plan-select mt-2 w-full"
                        value={switchOpenClawModel}
                        onChange={(event) => setSwitchOpenClawModel(event.target.value)}
                      >
                        {openClawSwitchModelOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-xs text-slate-400">
                        当前默认：{getOpenClawModelLabel(
                          state.summary.openclawCurrentModel,
                          state.summary.openclawAvailableModels,
                        )}
                        。确认切换后会把认证和所选模型一起写入 OpenClaw。
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-sm text-slate-300">
                      当前未读取到 ChatGPT Codex 相关模型列表，本次切换将只同步认证，不额外修改模型。
                    </div>
                  )}
                </div>
              ) : null}

              {switchProgressEvents.length > 0 ? (
                <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">实时进度</div>
                  <div className="mt-3 grid gap-2.5">
                    {switchProgressEvents.map((item) => (
                      <div
                        key={item.stepKey}
                        className="flex items-start justify-between gap-3 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 text-slate-300">
                            {item.status === 'active' ? (
                              <LoaderCircle className="h-4 w-4 animate-spin text-blue-400" />
                            ) : item.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <CircleAlert
                                className={`h-4 w-4 ${item.status === 'error' ? 'text-rose-400' : 'text-amber-300'}`}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] tracking-[0.08em] text-slate-500">
                          {getSwitchProgressStatusText(item.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null
        }
        onConfirm={() => void handleSwitchProfile()}
        onOpenChange={(open) => {
          if (!open) {
            setSwitchTarget(null);
            setSwitchOpenClawModel('');
            setSwitchProgressRunId(null);
            switchProgressRunIdRef.current = null;
            setSwitchProgressEvents([]);
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(switchSuccessNotice)}
        eyebrow="切换完成"
        title="登录状态已切换"
        description={
          switchSuccessNotice
            ? switchSuccessNotice.switchMode === 'openclaw'
              ? switchSuccessNotice.openclawModelLabel
                ? `已切换到 ${switchSuccessNotice.workspaceName}，并已处理 OpenClaw 同步；当前模型为 ${switchSuccessNotice.openclawModelLabel}。请先不要重复点击登录，先等几秒确认网关恢复。`
                : `已切换到 ${switchSuccessNotice.workspaceName}，并已处理 OpenClaw 同步。请先不要重复点击登录，先等几秒确认网关恢复。`
              : switchSuccessNotice.codexTraeAutoRestart
                ? switchSuccessNotice.restartedDesktopApps.length > 0
                  ? `已切换到 ${switchSuccessNotice.workspaceName}，并已自动重启 ${switchSuccessNotice.restartedDesktopApps.join(' / ')}。`
                  : `已切换到 ${switchSuccessNotice.workspaceName}。当前没有检测到需要自动重启的 Codex / Trae 运行实例。`
                : `已切换到 ${switchSuccessNotice.workspaceName}。现在先不要重复点击登录，建议直接重启 Codex CLI、VSCode 插件等相关工具。`
            : ''
        }
        confirmLabel="知道了"
        showCancel={false}
        onConfirm={() => setSwitchSuccessNotice(null)}
        extraContent={
          switchSuccessNotice ? (
            <div className="grid gap-4">
              <div
                className={
                  switchSuccessNotice.switchMode === 'openclaw'
                    ? 'grid gap-4 sm:grid-cols-4'
                    : 'grid gap-4 sm:grid-cols-3'
                }
              >
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">当前已切换到</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {switchSuccessNotice.workspaceName}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    生效时间 {formatDateTime(switchSuccessNotice.activatedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">切换模式</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {mapSwitchModeLabel(switchSuccessNotice.switchMode)}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {switchSuccessNotice.switchMode === 'openclaw'
                      ? switchSuccessNotice.openclawSynced
                        ? 'OpenClaw 认证已同步'
                        : 'OpenClaw 认证未同步'
                      : '已覆盖 Codex 认证文件'}
                  </div>
                </div>

                {switchSuccessNotice.switchMode === 'openclaw' ? (
                  <>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">当前模型</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {switchSuccessNotice.openclawModelLabel ?? '未修改'}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {switchSuccessNotice.openclawModelChanged ? '本次切换已写入新的 OpenClaw 模型' : '本次切换沿用了当前 OpenClaw 模型'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">网关状态</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {switchSuccessNotice.openclawGatewayRestarted ? '已自动重启' : '未自动重启'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">软件重启</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {switchSuccessNotice.codexTraeAutoRestart
                        ? switchSuccessNotice.restartedDesktopApps.length > 0
                          ? switchSuccessNotice.restartedDesktopApps.join(' / ')
                          : '未检测到运行实例'
                        : '未开启自动重启'}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">建议操作</div>
                <div className="mt-2 space-y-1 text-sm text-slate-200">
                  {switchSuccessNotice.switchMode === 'openclaw' ? (
                    <>
                      <div>1. 先等几秒，确认 OpenClaw 网关和模型都已刷新</div>
                      <div>2. 若仍断流，重启 OpenClaw 或手动重启网关</div>
                      <div>3. 还不行时，再关开代理 / TUN</div>
                    </>
                  ) : (
                    switchSuccessNotice.codexTraeAutoRestart ? (
                      <>
                        <div>1. 已自动重启的软件先等几秒完成恢复</div>
                        <div>2. 若当前仍未生效，重新打开 Codex / Trae 再确认登录状态</div>
                        <div>3. 若还断流，再关开代理 / TUN 或手动重启相关工具</div>
                      </>
                    ) : (
                      <>
                        <div>1. 重启 Codex CLI / VSCode 插件</div>
                        <div>2. 若短暂提示登录，先等几秒，不要立刻点登录</div>
                        <div>3. 还断流时，重启软件，或关开代理 / TUN 再试</div>
                      </>
                    )
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">附加提示</div>
                <div className="mt-2 space-y-1 text-sm text-slate-200">
                  {switchSuccessNotice.warnings.length > 0 ? (
                    switchSuccessNotice.warnings.map((warning) => <div key={warning}>- {warning}</div>)
                  ) : (
                    <div>未检测到额外警告。</div>
                  )}
                </div>
              </div>
              </div>
            </div>
          ) : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setSwitchSuccessNotice(null);
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        eyebrow="删除配置"
        title={deleteTarget ? `删除 ${deleteTarget.name}` : '删除配置'}
        description={
          deleteTarget
            ? `这会从列表中移除这个 profile。你也可以选择连同本地文件夹和 auth.json 一起删除。`
            : ''
        }
        confirmLabel="确认删除"
        tone="danger"
        busy={busyAction === 'delete'}
        extraContent={
          <label className="delete-checkbox">
            <input
              type="checkbox"
              checked={removeFilesOnDelete}
              onChange={(event) => setRemoveFilesOnDelete(event.target.checked)}
            />
            <span>同时删除本地 profile 文件夹与 auth.json</span>
          </label>
        }
        onConfirm={() => void handleDeleteProfile()}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setRemoveFilesOnDelete(false);
          }
        }}
      />

      <Dialog.Root
        open={hiddenModeDialogOpen}
        onOpenChange={(open) => handleHiddenModeDialogOpenChange(open)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="special-mode-dialog-overlay" />
          <div className="special-mode-dialog-shell">
            <Dialog.Content
              className="glass-panel special-mode-dialog-panel"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmitHiddenModeDialog();
                }
              }}
            >
              <header className="special-mode-dialog-panel__header">
                <div>
                  <Dialog.Title className="special-mode-dialog-panel__title">
                    {hiddenModeDialogMode === 'unlock'
                      ? '验证特殊功能访问'
                      : hiddenModeDialogMode === 'change'
                        ? '修改特殊功能密码'
                        : '设置特殊功能密码'}
                  </Dialog.Title>
                  <Dialog.Description className="special-mode-dialog-panel__description">
                    {hiddenModeDialogMode === 'unlock'
                      ? '输入本地密码后，才会显示模拟菜单和临时卡片。'
                      : hiddenModeDialogMode === 'change'
                        ? '新的密码只保存在当前设备的浏览器本地存储里，不会写进后端或 profiles 文件。'
                        : '第一次打开特殊功能前，需要先设置一个仅保存在本机的密码。'}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="special-mode-dialog-panel__close"
                    aria-label="关闭特殊功能弹窗"
                  >
                    ×
                  </button>
                </Dialog.Close>
              </header>

              <main className="special-mode-dialog-panel__body">
                <div className="special-mode-dialog-panel__grid">
                  <section className="soft-card special-mode-dialog-card">
                    <p className="special-mode-dialog-card__eyebrow">本地访问验证</p>
                    <h2 className="special-mode-dialog-card__headline">特殊功能</h2>
                    <p className="special-mode-dialog-card__copy">
                      这里只用于当前开发环境的本地模拟菜单和临时卡片展示，不会向后端写入测试文件，也不会同步到真实 profile 数据。
                    </p>

                    <div className="special-mode-dialog-card__stats">
                      <div className="status-tile">
                        <p className="tile-label">当前状态</p>
                        <p className="special-mode-dialog-card__stat-value">
                          {hiddenModeUnlocked ? '已显示' : '已隐藏'}
                        </p>
                      </div>
                      <div className="status-tile">
                        <p className="tile-label">密码存储</p>
                        <p className="special-mode-dialog-card__stat-value">仅本机浏览器</p>
                      </div>
                    </div>
                  </section>

                  <section className="soft-card special-mode-dialog-card special-mode-dialog-card--form">
                    <div className="special-mode-dialog-fields">
                      <label className="special-mode-dialog-field">
                        <span className="special-mode-dialog-field__label">
                          {hiddenModeDialogMode === 'unlock' ? '特殊功能密码' : '新密码'}
                        </span>
                        <input
                          className="surface-input special-mode-dialog-field__input"
                          type="password"
                          autoComplete="off"
                          value={hiddenModePasswordDraft}
                          onChange={(event) => {
                            setHiddenModePasswordDraft(event.target.value);
                            if (hiddenModeDialogError) {
                              setHiddenModeDialogError(null);
                            }
                          }}
                        />
                      </label>

                      {hiddenModeDialogMode !== 'unlock' ? (
                        <label className="special-mode-dialog-field">
                          <span className="special-mode-dialog-field__label">确认密码</span>
                          <input
                            className="surface-input special-mode-dialog-field__input"
                            type="password"
                            autoComplete="off"
                            value={hiddenModePasswordConfirmDraft}
                            onChange={(event) => {
                              setHiddenModePasswordConfirmDraft(event.target.value);
                              if (hiddenModeDialogError) {
                                setHiddenModeDialogError(null);
                              }
                            }}
                          />
                        </label>
                      ) : null}

                      <div className="special-mode-dialog-note">
                        密码只保存在当前设备的浏览器本地存储里，用来隐藏本地测试菜单，不会进入后端文件，也不会写入安装包环境。
                      </div>

                      {hiddenModeDialogError ? (
                        <div className="special-mode-dialog-error">{hiddenModeDialogError}</div>
                      ) : null}
                    </div>
                  </section>
                </div>
              </main>

              <footer className="special-mode-dialog-panel__footer">
                <Dialog.Close asChild>
                  <button type="button" className="special-mode-dialog-panel__secondary">
                    取消
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  className="primary-button special-mode-dialog-panel__primary"
                  onClick={() => handleSubmitHiddenModeDialog()}
                >
                  {hiddenModeDialogMode === 'unlock'
                    ? '验证并显示'
                    : hiddenModeDialogMode === 'change'
                      ? '保存新密码'
                      : '设置并显示'}
                </button>
              </footer>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      {toast ? <ToastBanner toast={toast} /> : null}
      {centerNotice ? <CenterNoticeBanner notice={centerNotice} /> : null}

      <Dialog.Root
        open={Boolean(authGateQrPreviewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setAuthGateQrPreviewItem(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="shell-dialog-overlay" />
          <Dialog.Content className="shell-dialog-panel qr-preview-dialog-panel">
            <header className="shell-dialog-header">
              <div>
                <div className="shell-dialog-eyebrow">Qr Preview</div>
                <Dialog.Title className="shell-dialog-title">
                  {authGateQrPreviewItem?.title ?? '二维码预览'}
                </Dialog.Title>
                <Dialog.Description className="shell-dialog-description">
                  {authGateQrPreviewItem?.hint ?? '请使用手机直接扫码。'}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="shell-dialog-close" aria-label="关闭二维码预览">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </header>

            <div className="shell-dialog-body qr-preview-dialog-body">
              {authGateQrPreviewItem?.imageSrc ? (
                <div className="qr-preview-dialog-image-shell">
                  <img
                    src={authGateQrPreviewItem.imageSrc}
                    alt={authGateQrPreviewItem.title}
                    className="qr-preview-dialog-image"
                  />
                </div>
              ) : null}
              <div className="qr-preview-dialog-meta">
                <strong>{authGateQrPreviewItem?.subtitle ?? '客服联系入口'}</strong>
                <span>手机扫码后即可继续联系或添加客服。</span>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function TrayHoverCardApp() {
  const [trayState, setTrayState] = useState<TrayCardState | null>(null);
  const [trayError, setTrayError] = useState<string | null>(null);

  useEffect(() => {
    const runtimeApi = window.codexWorkspace as Partial<typeof window.codexWorkspace>;
    let active = true;

    const applyState = (nextState: TrayCardState) => {
      if (!active) {
        return;
      }

      setTrayState(nextState);
      setTrayError(null);
    };

    if (typeof runtimeApi.getTrayCardState === 'function') {
      runtimeApi
        .getTrayCardState()
        .then((nextState) => {
          applyState(nextState);
        })
        .catch(() => {
          if (active) {
            setTrayError('当前托盘卡片暂时不可用，请回到主窗口查看。');
          }
        });
    } else {
      setTrayError('当前托盘卡片暂时不可用，请回到主窗口查看。');
    }

    const unsubscribe =
      typeof runtimeApi.onTrayCardStateChange === 'function'
        ? runtimeApi.onTrayCardStateChange((nextState) => {
            applyState(nextState);
          })
        : null;

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const profile = trayState?.activeProfile ?? null;
  const roleBadge = profile ? getProfileRoleBadge(profile) : null;
  const availability = profile ? getProfileAvailability(profile) : null;
  const detectedName =
    trayState?.currentAuthSuggestedWorkspaceName ??
    trayState?.currentAuthSuggestedName ??
    '待导入空间';

  return (
    <div className="tray-hover-view">
      <div className="tray-hover-window">
        <div className="tray-hover-window__halo" aria-hidden="true" />
        <section className={`tray-hover-card${profile ? '' : ' is-empty'}`}>
          <div className="tray-hover-card__topbar">
            <span className="tray-hover-card__eyebrow">当前卡片</span>
            <span className="tray-hover-card__stamp">
              {formatDateTime(trayState?.lastScannedAt ?? null)}
            </span>
          </div>

          {profile ? (
            <div className="tray-hover-card__panel">
              <div className="tray-hover-card__badges">
                <span
                  className={`badge badge--plan${
                    getPlanBadgeClassName(profile.planType)
                      ? ` ${getPlanBadgeClassName(profile.planType)}`
                      : ''
                  }`}
                >
                  {mapPlanLabel(profile.planType)}
                </span>
                {roleBadge ? <span className={`badge ${roleBadge.className}`}>{roleBadge.label}</span> : null}
                {availability?.badgeLabel ? (
                  <span className="badge badge--disabled">{availability.badgeLabel}</span>
                ) : null}
              </div>

              <div className="tray-hover-card__title-row">
                <h2 className="tray-hover-card__title">{getProfileDisplayName(profile)}</h2>
                <span className={`footer-auth-status is-${getProfileAuthToneClassName(profile)}`}>
                  {getAuthStatusText(profile)}
                </span>
              </div>

              <p className="tray-hover-card__subtitle">
                {profile.workspaceName ? `空间名：${profile.workspaceName}` : '悬停托盘图标即可查看当前激活卡片。'}
              </p>

              <div className="tray-hover-card__stats">
                <div className="tray-hover-stat">
                  <span className="tray-hover-stat__label">最近登录</span>
                  <strong className="tray-hover-stat__value">
                    {formatDateTime(profile.lastActivatedAt || profile.updatedAt)}
                  </strong>
                </div>
                <div className="tray-hover-stat">
                  <span className="tray-hover-stat__label">总剩余额度</span>
                  <strong className="tray-hover-stat__value">
                    {trayState?.overallRemainingPercent ?? '--'}%
                  </strong>
                </div>
              </div>

              <div className="tray-hover-card__quota-stack">
                <QuotaRow label="5 小时额度" quota={profile.fiveHourQuota} compact showCountdown />
                <QuotaRow label="周额度" quota={profile.weeklyQuota} compact showCountdown />
              </div>

              <div className="tray-hover-card__footer">
                <span>
                  {profile.notes?.trim() || '当前托盘卡片与主窗口的玻璃弹窗框架保持一致。'}
                </span>
                <span>{availability?.footerText || '当前正在使用'}</span>
              </div>
            </div>
          ) : (
            <div className="tray-hover-card__panel tray-hover-card__panel--empty">
              <h2 className="tray-hover-card__title">
                {trayState?.currentAuthExists ? '检测到待导入空间' : '暂未识别当前登录'}
              </h2>
              <p className="tray-hover-card__subtitle">
                {trayError
                  ? trayError
                  : trayState?.currentAuthExists
                    ? `当前 auth 尚未匹配到已保存卡片，建议回主窗口确认导入「${detectedName}」。`
                    : '当前没有检测到可用 auth 信息，请先在主窗口完成登录或导入。'}
              </p>

              <div className="tray-hover-card__stats">
                <div className="tray-hover-stat">
                  <span className="tray-hover-stat__label">卡片数量</span>
                  <strong className="tray-hover-stat__value">{trayState?.profilesCount ?? 0}</strong>
                </div>
                <div className="tray-hover-stat">
                  <span className="tray-hover-stat__label">建议名称</span>
                  <strong className="tray-hover-stat__value">{detectedName}</strong>
                </div>
              </div>

              <div className="tray-hover-card__empty-note">
                托盘卡片只做当前状态预览，不会替代主窗口里的完整切换和编辑流程。
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HeaderIconButton({
  children,
  className,
  onClick,
  title,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`header-icon-button${className ? ` ${className}` : ''}`}
      title={title}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OpenAIKnotIcon() {
  return (
    <img
      src={OPENAI_BRAND_ICON_SRC}
      className="brand-icon__svg"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

function SidebarMetric({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="sidebar-metric">
      <span className="sidebar-metric__label">{label}</span>
      <span className={green ? 'sidebar-metric__value is-green' : 'sidebar-metric__value'}>
        {value}
      </span>
    </div>
  );
}

function ProfileShellCard({
  profile,
  isRecommended,
  weeklyJustReset,
  fiveHourJustReset,
  menuOpen,
  onOpenMenu,
  onSwitch,
  onActiveInfo,
  onEdit,
  onDelete,
  onOpenDir,
}: {
  profile: DisplayProfile;
  isRecommended: boolean;
  weeklyJustReset: boolean;
  fiveHourJustReset: boolean;
  menuOpen: boolean;
  onOpenMenu: (profileId: string) => void;
  onSwitch: (profile: DisplayProfile) => void;
  onActiveInfo: (profile: DisplayProfile) => void;
  onEdit: (profile: DisplayProfile) => void;
  onDelete: (profile: DisplayProfile) => void;
  onOpenDir: (profile: DisplayProfile) => void;
}) {
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const roleBadge = getProfileRoleBadge(profile);
  const availability = getProfileAvailability(profile);
  const quotaSources = [profile.weeklyQuota, profile.fiveHourQuota, profile.reviewQuota];
  const primaryQuotaStatus = quotaSources.some((quota) => quota.source === 'live')
    ? '实时同步'
    : quotaSources.some((quota) => quota.source === 'detected')
      ? '本地缓存'
      : quotaSources.some((quota) => hasQuotaData(quota))
        ? '手动维护'
        : '未识别';
  const displayNote =
    profile.notes && !profile.notes.startsWith('由当前 %USERPROFILE%') ? profile.notes : '';
  const displayTitle =
    getProfileDisplayName(profile);
  const stampTime = formatDateTime(profile.lastActivatedAt || profile.updatedAt);
  const isRecentMirrorProfile =
    profile.storageDirName.startsWith('current-auth') || profile.notes.includes('当前');
  const usageStateText = profile.usageError
    ? '同步失败'
    : profile.usageUpdatedAt
      ? `同步 ${formatDateTime(profile.usageUpdatedAt)}`
      : '尚未同步';

  return (
    <article
      className={`profile-card${profile.isActive ? ' is-active' : ''}${
        profile.authStatus !== 'ok' || profile.manuallyDisabled ? ' is-disabled' : ''
      }${!profile.isActive && isRecentMirrorProfile ? ' is-backup' : ''}${
        availability.isUnavailable ? ' is-unavailable' : ''
      }${isRecommended ? ' is-recommended' : ''}${reviewExpanded ? ' is-review-expanded' : ''}`}
      onClick={() => {
        if (profile.authStatus === 'ok' && !availability.isUnavailable) {
          if (profile.isActive) {
            onActiveInfo(profile);
            return;
          }

          onSwitch(profile);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          (event.key === 'Enter' || event.key === ' ') &&
          profile.authStatus === 'ok' &&
          !availability.isUnavailable
        ) {
          event.preventDefault();
          if (profile.isActive) {
            onActiveInfo(profile);
            return;
          }

          onSwitch(profile);
        }
      }}
    >
      <div className="profile-card__header">
        <div>
          <div className="profile-card__meta-row">
            <div className="profile-badges">
              {availability.badgeLabel ? (
                <span className="badge badge--disabled">{availability.badgeLabel}</span>
              ) : null}
              {isRecommended ? <span className="badge badge--recommended">推荐切换</span> : null}
              <span
                className={`badge badge--plan${
                  getPlanBadgeClassName(getDisplayPlanType(profile))
                    ? ` ${getPlanBadgeClassName(getDisplayPlanType(profile))}`
                    : ''
                }`}
              >
                {mapPlanLabel(getDisplayPlanType(profile))}
              </span>
              <span className="badge badge--manual">{primaryQuotaStatus}</span>
              <span className={`badge ${roleBadge.className}`}>{roleBadge.label}</span>
            </div>
          </div>
          <div className="profile-card__title-row">
            <h3 className="profile-card__title">{displayTitle}</h3>
            <span className="profile-card__stamp-time">{`最近登录 ${stampTime}`}</span>
          </div>
          {displayNote ? <p className="profile-card__note">{displayNote}</p> : null}
        </div>

        <div className="card-menu-wrap">
          <button
            className="menu-button"
            type="button"
            title="更多操作"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMenu(profile.id);
            }}
          >
            <EllipsisVertical size={20} strokeWidth={2} />
          </button>

          {menuOpen ? (
            <div className="card-menu" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => onEdit(profile)}>
                <Pencil size={14} />
                编辑
              </button>
              <button type="button" onClick={() => onOpenDir(profile)}>
                <FolderOpen size={14} />
                打开目录
              </button>
              <button type="button" onClick={() => onDelete(profile)} className="is-danger">
                <Trash2 size={14} />
                删除
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="profile-card__content">
        <QuotaRow
          label="5 小时额度"
          quota={profile.fiveHourQuota}
          showCountdown
          animateReset={fiveHourJustReset}
        />
        <QuotaRow
          label="周额度"
          quota={profile.weeklyQuota}
          showCountdown
          animateReset={weeklyJustReset}
        />
        <div className={`quota-fold${reviewExpanded ? ' is-open' : ''}`}>
          <button
            className="quota-fold__toggle"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setReviewExpanded((current) => !current);
            }}
          >
            <span className="quota-fold__line" />
            <ChevronDown
              className={`quota-fold__chevron${reviewExpanded ? ' is-open' : ''}`}
              size={15}
              strokeWidth={2}
            />
          </button>

          {reviewExpanded ? (
            <div className="quota-fold__popover" onClick={(event) => event.stopPropagation()}>
              <div className="quota-fold__popover-title">代码审查额度</div>
              <QuotaRow
                label="代码审查额度"
                quota={profile.reviewQuota}
                compact
                assumeFullWhenUnknown
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="profile-card__footer">
        <span className={`footer-auth-status is-${getProfileAuthToneClassName(profile)}`}>
          {getAuthStatusText(profile)}
        </span>
        <span className="footer-expiry">{usageStateText}</span>
        <span className="footer-expiry">
          {availability.footerText || (profile.isActive ? '当前正在使用' : '可切换到此空间')}
        </span>
      </div>
    </article>
  );
}

function QuotaRow({
  label,
  quota,
  compact = false,
  assumeFullWhenUnknown = false,
  showCountdown = false,
  animateReset = false,
}: {
  label: string;
  quota: UsageQuota;
  compact?: boolean;
  assumeFullWhenUnknown?: boolean;
  showCountdown?: boolean;
  animateReset?: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!showCountdown || !quota.resetAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [quota.resetAt, showCountdown]);

  const treatAsFull = !hasQuotaData(quota) && assumeFullWhenUnknown;
  const remainingPercent = getRemainingPercent(quota);
  const countdownText = showCountdown ? formatCountdown(quota.resetAt, nowMs) : null;
  const countdownTone = showCountdown ? getCountdownTone(quota.resetAt, nowMs) : 'idle';

  if (!hasQuotaData(quota) && !treatAsFull) {
    return (
      <div className={`quota-row${compact ? ' is-compact' : ''}`}>
        <div className="quota-row__meta">
          <span className="quota-row__meta-main">{label}</span>
          <div className="quota-row__meta-side">
            <strong className="quota-value is-muted">未识别</strong>
          </div>
        </div>
        <div className="quota-row__track">
          <div className={getQuotaBarClassName(quota)} style={{ width: '18%' }} />
        </div>
        <div className="quota-row__submeta">
          <span>{getQuotaSourceText(quota)}</span>
          <span>可在编辑中维护</span>
        </div>
      </div>
    );
  }

  const displayRemainingPercent = treatAsFull ? 100 : remainingPercent;
  const displayPercentUsed = treatAsFull ? 0 : quota.percentUsed;
  const displaySourceText = treatAsFull ? '默认满额' : getQuotaSourceText(quota);
  const displayResetAt = treatAsFull ? '未限制' : formatDateTime(quota.resetAt);
  const displayBarClassName = treatAsFull ? 'quota-fill is-ok' : getQuotaBarClassName(quota);

  return (
      <div className={`quota-row${compact ? ' is-compact' : ''}`}>
        <div className="quota-row__meta">
          <span className="quota-row__meta-main">{label}</span>
          {countdownText ? (
            <span className={`quota-row__countdown is-${countdownTone}`}>{countdownText}</span>
          ) : (
            <span className="quota-row__meta-spacer" />
          )}
          <div className="quota-row__meta-side">
            <strong className="quota-value">剩余 {displayRemainingPercent}%</strong>
          </div>
        </div>
      <div className="quota-row__track">
        <div
          className={`${displayBarClassName}${animateReset ? ' is-resetting' : ''}`}
          style={{ width: `${displayRemainingPercent}%` }}
        />
      </div>
      <div className="quota-row__submeta">
        <span>
          {displaySourceText}
          {!treatAsFull && quota.label ? ` / ${quota.label}` : ''}
          {' / '}已用 {displayPercentUsed}%
        </span>
        <span>{displayResetAt}</span>
      </div>
    </div>
  );
}

function SidebarPanel({
  children,
  defaultOpen = false,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  title: string;
}) {
  return (
    <details className="sidebar-panel" open={defaultOpen}>
      <summary className="sidebar-panel__summary">
        <span>{title}</span>
        <ChevronDown className="sidebar-panel__chevron" size={16} strokeWidth={2} />
      </summary>
      <div className="sidebar-panel__body">{children}</div>
    </details>
  );
}

function BackupRow({ item }: { item: BackupEntry }) {
  return (
    <div className="backup-row">
      <div className="backup-row__main">
        <span>{item.name}</span>
        <small>{formatDateTime(item.createdAt)}</small>
      </div>
      <span>{formatFileSize(item.sizeBytes)}</span>
    </div>
  );
}

function ToastBanner({ toast }: { toast: ToastState }) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className={`shell-toast is-${toast.tone}`}>
      {toast.message}
    </div>,
    document.body,
  );
}

function CenterNoticeBanner({ notice }: { notice: CenterNotice }) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(<div className="center-notice-banner">{notice.message}</div>, document.body);
}
