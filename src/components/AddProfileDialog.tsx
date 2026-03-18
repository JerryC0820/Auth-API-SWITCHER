import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { PlanType, ProfileSummary, UsageQuota } from '../../shared/types';
import './add-profile-dialog-stitch.css';

export interface ProfileFormValues {
  name: string;
  workspaceName: string;
  authSourcePath: string;
  notes: string;
  planType: PlanType;
  manuallyDisabled: boolean;
  weeklyQuota: UsageQuota;
  fiveHourQuota: UsageQuota;
  reviewQuota: UsageQuota;
}

interface AddProfileDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  initialProfile?: ProfileSummary | null;
  initialValues?: Partial<ProfileFormValues> | null;
  discoveryHint?: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onPickAuthFile: () => Promise<string | null>;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
}

type EditablePlanType = Extract<PlanType, 'Free' | 'Plus' | 'Pro' | 'Team' | 'Business'>;

const EDITABLE_PLAN_OPTIONS: ReadonlyArray<{ value: EditablePlanType; label: string }> = [
  { value: 'Free', label: 'Free' },
  { value: 'Plus', label: 'Plus' },
  { value: 'Pro', label: 'Pro' },
  { value: 'Team', label: 'Team' },
  { value: 'Business', label: 'Bussiness' },
];

const resolveEditablePlanType = (planType?: PlanType | null): EditablePlanType => {
  switch (planType) {
    case 'Free':
    case 'Plus':
    case 'Pro':
    case 'Team':
    case 'Business':
      return planType;
    default:
      return 'Free';
  }
};

const pad = (value: number): string => String(value).padStart(2, '0');

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatQuotaResetText = (value: string | null | undefined): string => {
  if (!value) {
    return '待识别';
  }

  return formatDateTime(value);
};

const hasQuotaData = (quota: UsageQuota): boolean =>
  Boolean(quota.configured) || quota.source === 'detected' || quota.source === 'live';

const getQuotaPercentUsed = (quota: UsageQuota): number =>
  hasQuotaData(quota) ? Math.max(0, Math.min(100, quota.percentUsed)) : 0;

const getResolvedAuthPath = (authSourcePath: string, fallbackPath?: string | null): string =>
  authSourcePath.trim() || fallbackPath?.trim() || '';

const getCurrentFileName = (authSourcePath: string, fallbackPath?: string | null): string => {
  const resolvedPath = getResolvedAuthPath(authSourcePath, fallbackPath);
  if (!resolvedPath) {
    return '';
  }

  const segments = resolvedPath.split(/[/\\]/);
  return segments[segments.length - 1] || '';
};

const resolveProfileName = (
  profile?: ProfileSummary | null,
  initialValues?: Partial<ProfileFormValues> | null,
): string => {
  const candidates = [
    initialValues?.name,
    initialValues?.workspaceName,
    profile?.name,
    profile?.workspaceName,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return value;
    }
  }

  return '';
};

const createInitialValues = (
  profile?: ProfileSummary | null,
  initialValues?: Partial<ProfileFormValues> | null,
): ProfileFormValues => {
  const resolvedName = resolveProfileName(profile, initialValues);

  return {
    name: resolvedName,
    workspaceName: resolvedName,
    authSourcePath: initialValues?.authSourcePath ?? profile?.authFilePath ?? '',
    notes: initialValues?.notes ?? profile?.notes ?? '',
    planType: resolveEditablePlanType(initialValues?.planType ?? profile?.planType ?? 'Free'),
    manuallyDisabled: initialValues?.manuallyDisabled ?? profile?.manuallyDisabled ?? false,
    weeklyQuota: {
      percentUsed:
        initialValues?.weeklyQuota?.percentUsed ?? profile?.weeklyQuota.percentUsed ?? 0,
      resetAt: initialValues?.weeklyQuota?.resetAt ?? profile?.weeklyQuota.resetAt ?? null,
      source: initialValues?.weeklyQuota?.source ?? profile?.weeklyQuota.source ?? 'unknown',
      configured:
        initialValues?.weeklyQuota?.configured ?? profile?.weeklyQuota.configured ?? false,
    },
    fiveHourQuota: {
      percentUsed:
        initialValues?.fiveHourQuota?.percentUsed ?? profile?.fiveHourQuota.percentUsed ?? 0,
      resetAt: initialValues?.fiveHourQuota?.resetAt ?? profile?.fiveHourQuota.resetAt ?? null,
      source:
        initialValues?.fiveHourQuota?.source ?? profile?.fiveHourQuota.source ?? 'unknown',
      configured:
        initialValues?.fiveHourQuota?.configured ?? profile?.fiveHourQuota.configured ?? false,
    },
    reviewQuota: {
      percentUsed:
        initialValues?.reviewQuota?.percentUsed ?? profile?.reviewQuota.percentUsed ?? 0,
      resetAt: initialValues?.reviewQuota?.resetAt ?? profile?.reviewQuota.resetAt ?? null,
      source: initialValues?.reviewQuota?.source ?? profile?.reviewQuota.source ?? 'unknown',
      configured:
        initialValues?.reviewQuota?.configured ?? profile?.reviewQuota.configured ?? false,
    },
  };
};

const normalizeQuotaForComparison = (quota: UsageQuota) => ({
  percentUsed: quota.percentUsed,
  resetAt: quota.resetAt ?? null,
  source: quota.source ?? 'unknown',
  configured: quota.configured ?? false,
});

const normalizeFormValuesForComparison = (values: ProfileFormValues) => ({
  name: values.name.trim(),
  workspaceName: values.workspaceName.trim(),
  authSourcePath: values.authSourcePath.trim(),
  notes: values.notes.trim(),
  planType: values.planType,
  manuallyDisabled: values.manuallyDisabled,
  weeklyQuota: normalizeQuotaForComparison(values.weeklyQuota),
  fiveHourQuota: normalizeQuotaForComparison(values.fiveHourQuota),
  reviewQuota: normalizeQuotaForComparison(values.reviewQuota),
});

const getAuthStatusText = (
  mode: 'add' | 'edit',
  profile: ProfileSummary | null,
  hasAuthFile: boolean,
): string => {
  if (mode === 'edit') {
    if (profile?.authStatus === 'ok') {
      return '已生效';
    }
    if (profile?.authStatus === 'missing') {
      return '文件缺失';
    }
    if (profile?.authStatus === 'path-error') {
      return '路径异常';
    }
    return hasAuthFile ? '待确认' : '未选择';
  }

  return hasAuthFile ? '待导入' : '未选择';
};

export function AddProfileDialog({
  open,
  mode,
  initialProfile = null,
  initialValues = null,
  discoveryHint = false,
  busy = false,
  onOpenChange,
  onPickAuthFile,
  onSubmit,
}: AddProfileDialogProps) {
  const [draft, setDraft] = useState<ProfileFormValues>(() =>
    createInitialValues(initialProfile, initialValues),
  );
  const [manualDisableConfirmOpen, setManualDisableConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(createInitialValues(initialProfile, initialValues));
    setManualDisableConfirmOpen(false);
    setCloseConfirmOpen(false);
  }, [initialProfile, initialValues, open]);

  const initialSnapshot = JSON.stringify(
    normalizeFormValuesForComparison(createInitialValues(initialProfile, initialValues)),
  );
  const draftSnapshot = JSON.stringify(normalizeFormValuesForComparison(draft));
  const isDirty = draftSnapshot !== initialSnapshot;
  const initialAuthPath = getResolvedAuthPath(
    createInitialValues(initialProfile, initialValues).authSourcePath,
    initialProfile?.authFilePath ?? null,
  );
  const resolvedAuthPath = getResolvedAuthPath(
    draft.authSourcePath,
    initialProfile?.authFilePath ?? null,
  );
  const currentFileName = getCurrentFileName(
    draft.authSourcePath,
    initialProfile?.authFilePath ?? null,
  );
  const hasAuthFile = Boolean(resolvedAuthPath);
  const authFileDirty = resolvedAuthPath !== initialAuthPath;
  const authModifiedAt =
    !hasAuthFile
      ? '未记录'
      : mode === 'add' || authFileDirty
        ? '待保存'
        : formatDateTime(initialProfile?.updatedAt ?? null);
  const submitDisabled = busy || !draft.name.trim() || (mode === 'add' && !hasAuthFile);
  const authStatusText =
    draft.manuallyDisabled
      ? '已停用'
      : mode === 'edit' && authFileDirty
      ? '待保存'
      : getAuthStatusText(mode, initialProfile, hasAuthFile);
  const authStatusDotClassName = draft.manuallyDisabled
    ? 'status-dot disabled'
    : authStatusText === '已生效'
      ? 'status-dot ready'
      : 'status-dot pending';
  const weeklyQuotaPercent = getQuotaPercentUsed(draft.weeklyQuota);
  const weeklyQuotaUsedText = hasQuotaData(draft.weeklyQuota)
    ? `${Math.round(weeklyQuotaPercent)}%`
    : '未识别';
  const weeklyQuotaTotalText = hasQuotaData(draft.weeklyQuota) ? '100%' : '待识别';
  const weeklyQuotaResetText = formatQuotaResetText(draft.weeklyQuota.resetAt);
  const configFileText = !hasAuthFile
    ? '等待导入'
    : mode === 'add'
      ? '1 份待导入'
      : authFileDirty
        ? '1 份待保存'
        : initialProfile?.authStatus === 'missing'
          ? '文件缺失'
          : initialProfile?.authStatus === 'path-error'
            ? '路径异常'
            : '1 份已加载';
  const recognitionSignals = [
    mode === 'edit' ? initialProfile?.authStatus === 'ok' && !authFileDirty : false,
    hasQuotaData(draft.weeklyQuota),
    hasQuotaData(draft.fiveHourQuota),
    hasQuotaData(draft.reviewQuota),
  ];
  const recognitionPercent = Math.round(
    (recognitionSignals.filter(Boolean).length / recognitionSignals.length) * 100,
  );
  const accuracyText = !hasAuthFile
    ? '等待识别'
    : mode === 'add'
      ? '导入后识别'
      : authFileDirty
        ? '保存后重识别'
        : recognitionPercent > 0
          ? `${recognitionPercent}% 已识别`
          : '等待识别';
  const autoIdentifyChecked =
    mode === 'edit'
      ? hasAuthFile &&
        !authFileDirty &&
        initialProfile?.authStatus !== 'missing' &&
        initialProfile?.authStatus !== 'path-error'
      : Boolean(draft.authSourcePath.trim());
  const saveIndicatorDirty = busy || isDirty || (mode === 'add' && hasAuthFile);
  const saveIndicatorText = busy
    ? mode === 'add'
      ? '正在导入空间...'
      : '正在保存更改...'
    : isDirty
      ? '有未保存更改'
      : mode === 'add'
        ? hasAuthFile
          ? '新空间待保存'
          : '等待填写基本信息'
        : '已同步到本地草稿';
  const currentFileCodeText = currentFileName || '未选择';
  const saveButtonText = busy
    ? mode === 'add'
      ? '导入中...'
      : '保存中...'
    : '保存更改';
  const dialogTitle = mode === 'add' ? (discoveryHint ? '发现新空间' : '添加 Codex 空间') : '编辑 Codex 空间';
  const dialogDescription =
    mode === 'add' && discoveryHint
      ? '检测到一个新的登录空间，请确认名称与套餐后再保存。'
      : '配置 Codex Space 的认证与环境信息';
  const manualDisableSummaryText = draft.manuallyDisabled
    ? '卡片会保留在空间池里，但会以灰态显示并禁止切换。'
    : '可手动标记那些已经停用、但目前没有被自动识别出来的空间。';

  const handlePickFile = async () => {
    const filePath = await onPickAuthFile();
    if (!filePath) {
      return;
    }

    setDraft((current) => ({ ...current, authSourcePath: filePath }));
  };

  const handleManualDisableToggle = (nextChecked: boolean) => {
    if (nextChecked) {
      setManualDisableConfirmOpen(true);
      return;
    }

    setDraft((current) => ({
      ...current,
      manuallyDisabled: false,
    }));
  };

  const handleConfirmManualDisable = () => {
    setDraft((current) => ({
      ...current,
      manuallyDisabled: true,
    }));
    setManualDisableConfirmOpen(false);
  };

  const handleDirectClose = () => {
    setCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const handleRequestClose = () => {
    if (busy) {
      return;
    }

    if (isDirty) {
      setCloseConfirmOpen(true);
      return;
    }

    handleDirectClose();
  };

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    handleRequestClose();
  };

  const submitDraft = async () => {
    if (submitDisabled) {
      return;
    }

    const trimmedName = draft.name.trim();

    await onSubmit({
      ...draft,
      name: trimmedName,
      workspaceName: trimmedName,
      notes: draft.notes.trim(),
      weeklyQuota: {
        percentUsed: draft.weeklyQuota.percentUsed,
        resetAt: draft.weeklyQuota.configured ? draft.weeklyQuota.resetAt : null,
        source: draft.weeklyQuota.configured ? 'manual' : draft.weeklyQuota.source,
        configured: draft.weeklyQuota.configured ?? false,
      },
      fiveHourQuota: {
        percentUsed: draft.fiveHourQuota.percentUsed,
        resetAt: draft.fiveHourQuota.configured ? draft.fiveHourQuota.resetAt : null,
        source: draft.fiveHourQuota.configured ? 'manual' : draft.fiveHourQuota.source,
        configured: draft.fiveHourQuota.configured ?? false,
      },
      reviewQuota: {
        percentUsed: draft.reviewQuota.percentUsed,
        resetAt: draft.reviewQuota.configured ? draft.reviewQuota.resetAt : null,
        source: draft.reviewQuota.configured ? 'manual' : draft.reviewQuota.source,
        configured: draft.reviewQuota.configured ?? false,
      },
    });
  };

  const handleSubmit = async () => {
    if (mode === 'edit' && !isDirty) {
      handleDirectClose();
      return;
    }

    await submitDraft();
  };

  const handleSaveAndClose = async () => {
    if (mode === 'edit' && !isDirty) {
      handleDirectClose();
      return;
    }

    setCloseConfirmOpen(false);
    await submitDraft();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenStateChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="add-profile-dialog-overlay" />
        <Dialog.Content asChild>
          <div className="add-profile-dialog-shell">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />
              <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-blue-500/[0.07] blur-3xl" />
              <div className="absolute bottom-[-140px] left-1/2 h-96 w-[30rem] -translate-x-1/2 rounded-full bg-blue-400/[0.04] blur-3xl" />
            </div>

            <div
              className="relative flex min-h-screen items-center justify-center px-5 py-8 lg:px-10"
              onPointerDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }

                event.preventDefault();
                handleRequestClose();
              }}
            >
              <div
                id="edit-codex-modal"
                className="glass-panel flex h-[82vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_28px_120px_rgba(0,0,0,0.5)]"
              >
                <header className="flex items-center justify-between border-b border-white/10 px-10 py-7">
                  <div>
                    <Dialog.Title asChild>
                      <h1 className="text-[2.25rem] font-semibold tracking-[-0.04em] text-white">
                        {dialogTitle}
                      </h1>
                    </Dialog.Title>
                    <Dialog.Description asChild>
                      <p className="mt-2 text-base text-gray-400">
                        {dialogDescription}
                      </p>
                    </Dialog.Description>
                  </div>
                  <button
                    id="close-modal-button"
                    type="button"
                    aria-label="关闭弹窗"
                    className="rounded-full p-3 text-white/90 transition hover:bg-white/10 hover:text-white"
                    onClick={() => handleRequestClose()}
                  >
                    <svg
                      className="h-7 w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 6L18 18" />
                      <path d="M18 6L6 18" />
                    </svg>
                  </button>
                </header>

                <main className="soft-scrollbar flex-1 overflow-y-auto px-10 py-8">
                  <div className="grid grid-cols-1 gap-7 xl:grid-cols-12">
                    <section className="xl:col-span-5">
                      <div className="soft-card rounded-[24px] p-7">
                        <h2 className="text-[15px] font-medium tracking-[0.08em] text-gray-300">
                          基本信息
                        </h2>

                        <div className="mt-8 space-y-7">
                          <div>
                            <label
                              htmlFor="space-name"
                              className="mb-3 block text-[15px] font-medium text-gray-200"
                            >
                              空间名称 (Space Name)
                            </label>
                            <input
                              id="space-name"
                              type="text"
                              value={draft.name}
                              className="surface-input h-14 px-5 text-[1.05rem]"
                              placeholder="输入空间名称"
                              onChange={(event) => {
                                const nextName = event.target.value;
                                setDraft((current) => ({
                                  ...current,
                                  name: nextName,
                                  workspaceName: nextName,
                                }));
                              }}
                            />
                          </div>

                          <div>
                            <p className="mb-3 text-[15px] font-medium text-gray-200">
                              Plan Type
                            </p>
                            <div
                              className="plan-type-slider-shell soft-scrollbar"
                              role="tablist"
                              aria-label="Plan type selector"
                            >
                              <div className="plan-type-slider-track">
                                {EDITABLE_PLAN_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    className={
                                      draft.planType === option.value
                                        ? 'plan-type-pill active'
                                        : 'plan-type-pill'
                                    }
                                    aria-pressed={draft.planType === option.value}
                                    onClick={() => {
                                      setDraft((current) => ({
                                        ...current,
                                        planType: option.value,
                                      }));
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="auth-file-display"
                              className="mb-3 block text-[15px] font-medium text-gray-200"
                            >
                              认证文件 (Auth File)
                            </label>
                            <div className="flex gap-3">
                              <input
                                id="auth-file-display"
                                type="text"
                                value={currentFileName}
                                readOnly
                                className="surface-input h-14 flex-1 px-5 text-[15px] text-gray-300"
                                placeholder="尚未选择认证文件"
                              />
                              <button
                                id="choose-auth-file-button"
                                type="button"
                                className="secondary-button h-14 min-w-[90px] px-6 text-[15px] font-medium"
                                onClick={() => {
                                  void handlePickFile();
                                }}
                              >
                                选择
                              </button>
                            </div>
                          </div>

                          {mode === 'edit' ? (
                            <div className="auto-identify-row status-flag-row mt-0 flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-5 py-4">
                              <div className="status-flag-row__content">
                                <span className="auto-identify-label text-[15px] text-gray-300">
                                  手动标记停用
                                </span>
                                <p className="status-flag-row__note">{manualDisableSummaryText}</p>
                              </div>
                              <label className="toggle-switch relative inline-flex cursor-pointer items-center">
                                <input
                                  id="manual-disabled"
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={draft.manuallyDisabled}
                                  onChange={(event) =>
                                    handleManualDisableToggle(event.target.checked)
                                  }
                                />
                                <span className="toggle-switch-track h-8 w-14 rounded-full bg-white/15 transition-colors duration-200 peer-checked:bg-accent-blue" />
                                <span className="toggle-switch-thumb pointer-events-none absolute left-[4px] top-[4px] h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.28)] transition-transform duration-200 peer-checked:translate-x-6" />
                              </label>
                            </div>
                          ) : null}

                          <div>
                            <label
                              htmlFor="notes"
                              className="mb-3 block text-[15px] font-medium text-gray-200"
                            >
                              备注 (Notes)
                            </label>
                            <textarea
                              id="notes"
                              rows={6}
                              className="surface-input min-h-[170px] resize-none px-5 py-4 text-[15px]"
                              placeholder="添加空间描述..."
                              value={draft.notes}
                              onChange={(event) => {
                                setDraft((current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-7 xl:col-span-7">
                      <div className="soft-card rounded-[24px] p-7">
                        <h2 className="text-[15px] font-medium tracking-[0.08em] text-gray-300">
                          认证配置
                        </h2>

                        <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-[1.02rem] font-medium text-gray-100">
                              当前文件:
                              <code
                                id="current-file-code"
                                className="rounded-lg bg-black/35 px-2.5 py-1 text-[0.96rem] text-[#38a0ff]"
                              >
                                {currentFileCodeText}
                              </code>
                            </p>
                            <p id="file-modified-text" className="mt-2 text-sm text-gray-500">
                              最近修改: {authModifiedAt}
                            </p>
                          </div>
                          <button
                            id="switch-file-button"
                            type="button"
                            className="text-[15px] font-medium text-[#38a0ff] transition hover:text-[#69b6ff]"
                            onClick={() => {
                              void handlePickFile();
                            }}
                          >
                            切换文件
                          </button>
                        </div>

                        <div className="auto-identify-row mt-7 flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] px-5 py-4">
                          <span className="auto-identify-label text-[15px] text-gray-300">
                            自动识别认证状态 (Auto-identify)
                          </span>
                          <label className="toggle-switch relative inline-flex cursor-pointer items-center">
                            <input
                              id="auto-identify"
                              type="checkbox"
                              className="peer sr-only"
                              checked={autoIdentifyChecked}
                              readOnly
                            />
                            <span className="toggle-switch-track h-8 w-14 rounded-full bg-white/15 transition-colors duration-200 peer-checked:bg-accent-blue" />
                            <span className="toggle-switch-thumb pointer-events-none absolute left-[4px] top-[4px] h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.28)] transition-transform duration-200 peer-checked:translate-x-6" />
                          </label>
                        </div>
                      </div>

                      <div className="soft-card rounded-[24px] p-7">
                        <h2 className="text-[15px] font-medium tracking-[0.08em] text-gray-300">
                          资源配额
                        </h2>

                        <div className="mt-7 space-y-5">
                          <div className="flex items-end justify-between gap-4">
                            <span className="text-[15px] text-gray-300">
                              每周配额 (Weekly Quota)
                            </span>
                            <span className="text-[1.02rem] font-medium text-gray-100">
                              <span id="quota-used-label">{weeklyQuotaUsedText}</span>
                              <span className="text-gray-500">
                                / <span id="quota-total-label">{weeklyQuotaTotalText}</span>
                              </span>
                            </span>
                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-black/35">
                            <div
                              id="quota-progress"
                              className="h-full rounded-full bg-gradient-to-r from-[#3d7cff] to-[#0a84ff]"
                              style={{ width: `${weeklyQuotaPercent}%` }}
                            />
                          </div>

                          <p className="text-sm text-gray-500">
                            下次重置时间:{' '}
                            <span id="quota-reset-text" className="text-gray-300">
                              {weeklyQuotaResetText}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="soft-card rounded-[24px] p-7">
                        <h2 className="text-[15px] font-medium tracking-[0.08em] text-gray-300">
                          环境状态
                        </h2>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="status-tile">
                            <p className="tile-label">认证状态</p>
                            <div className="mt-3 flex items-center gap-2.5">
                              <span id="auth-status-dot" className={authStatusDotClassName} />
                              <p
                                id="auth-status-text"
                                className="text-[1.02rem] font-semibold text-gray-100"
                              >
                                {authStatusText}
                              </p>
                            </div>
                          </div>

                          <div className="status-tile">
                            <p className="tile-label">配置文件</p>
                            <p
                              id="config-count-text"
                              className="mt-3 text-[1.02rem] font-semibold text-gray-100"
                            >
                              {configFileText}
                            </p>
                          </div>

                          <div className="status-tile">
                            <p className="tile-label">识别率</p>
                            <p
                              id="accuracy-text"
                              className="mt-3 text-[1.02rem] font-semibold text-gray-100"
                            >
                              {accuracyText}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </main>

                <footer className="flex flex-col gap-5 border-t border-white/10 bg-black/20 px-10 py-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <div className="add-profile-shortcut">
                      <kbd className="add-profile-shortcut__key">
                        ⌘
                      </kbd>
                      <span className="add-profile-shortcut__plus">+</span>
                      <kbd className="add-profile-shortcut__key">
                        S
                      </kbd>
                      <span className="add-profile-shortcut__label">快速保存</span>
                    </div>
                    <span
                      id="save-indicator"
                      className={saveIndicatorDirty ? 'save-indicator dirty' : 'save-indicator'}
                    >
                      {saveIndicatorText}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <button
                      id="cancel-button"
                      type="button"
                      className="rounded-[18px] px-7 py-3 text-[15px] font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                      onClick={() => handleRequestClose()}
                    >
                      取消
                    </button>
                    <button
                      id="save-button"
                      type="button"
                      className="primary-button px-9 py-3 text-[15px] font-semibold"
                      onClick={() => {
                        void handleSubmit();
                      }}
                      disabled={submitDisabled}
                      aria-busy={busy}
                    >
                      {saveButtonText}
                    </button>
                  </div>
                </footer>
              </div>
            </div>

            <Dialog.Root
              open={manualDisableConfirmOpen}
              onOpenChange={setManualDisableConfirmOpen}
            >
              <Dialog.Portal>
                <Dialog.Overlay className="add-profile-dialog-overlay manual-disable-dialog-overlay" />
                <div className="add-profile-dialog-shell manual-disable-dialog-shell">
                  <Dialog.Content className="glass-panel manual-disable-dialog-panel">
                    <header className="manual-disable-dialog-panel__header">
                      <div>
                        <Dialog.Title className="manual-disable-dialog-panel__title">
                          确认标记已停用
                        </Dialog.Title>
                        <Dialog.Description className="manual-disable-dialog-panel__description">
                          标记后，这个空间会继续保留在列表里，但会变成灰态并禁止切换。之后如果你需要，也可以再回来重新启用。
                        </Dialog.Description>
                      </div>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="manual-disable-dialog-panel__close"
                          aria-label="关闭确认"
                        >
                          ×
                        </button>
                      </Dialog.Close>
                    </header>

                    <main className="manual-disable-dialog-panel__body">
                      <div className="soft-card manual-disable-dialog-panel__card">
                        <p className="manual-disable-dialog-panel__eyebrow">当前空间</p>
                        <p className="manual-disable-dialog-panel__name">
                          {draft.name.trim() || initialProfile?.name || '未命名空间'}
                        </p>
                        <p className="manual-disable-dialog-panel__note">
                          这只会改变当前工具里的空间状态，不会删除本地目录，也不会删掉 auth.json 文件。
                        </p>
                      </div>
                    </main>

                    <footer className="manual-disable-dialog-panel__footer">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="manual-disable-dialog-panel__secondary"
                        >
                          取消
                        </button>
                      </Dialog.Close>
                      <button
                        type="button"
                        className="primary-button manual-disable-dialog-panel__primary"
                        onClick={() => handleConfirmManualDisable()}
                      >
                        确认已停用
                      </button>
                    </footer>
                  </Dialog.Content>
                </div>
              </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
              <Dialog.Portal>
                <Dialog.Overlay className="add-profile-dialog-overlay manual-disable-dialog-overlay" />
                <div className="add-profile-dialog-shell manual-disable-dialog-shell">
                  <Dialog.Content className="glass-panel manual-disable-dialog-panel">
                    <header className="manual-disable-dialog-panel__header">
                      <div>
                        <Dialog.Title className="manual-disable-dialog-panel__title">
                          退出前保存更改
                        </Dialog.Title>
                        <Dialog.Description className="manual-disable-dialog-panel__description">
                          当前空间还有未保存内容。你可以先保存再退出，也可以直接退出并放弃这次修改。
                        </Dialog.Description>
                      </div>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="manual-disable-dialog-panel__close"
                          aria-label="关闭确认"
                        >
                          ×
                        </button>
                      </Dialog.Close>
                    </header>

                    <main className="manual-disable-dialog-panel__body">
                      <div className="soft-card manual-disable-dialog-panel__card">
                        <p className="manual-disable-dialog-panel__eyebrow">当前空间</p>
                        <p className="manual-disable-dialog-panel__name">
                          {draft.name.trim() || initialProfile?.name || '未命名空间'}
                        </p>
                        <p className="manual-disable-dialog-panel__note">
                          {submitDisabled
                            ? '当前内容还不能保存，你可以继续编辑，或者直接退出放弃本次修改。'
                            : '选择“保存并退出”会先保存当前表单，再关闭这个空间弹窗。'}
                        </p>
                      </div>
                    </main>

                    <footer className="manual-disable-dialog-panel__footer">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="manual-disable-dialog-panel__secondary"
                        >
                          继续编辑
                        </button>
                      </Dialog.Close>
                      <button
                        type="button"
                        className="manual-disable-dialog-panel__secondary"
                        onClick={() => handleDirectClose()}
                      >
                        直接退出
                      </button>
                      <button
                        type="button"
                        className="primary-button manual-disable-dialog-panel__primary"
                        onClick={() => {
                          void handleSaveAndClose();
                        }}
                        disabled={submitDisabled}
                      >
                        保存并退出
                      </button>
                    </footer>
                  </Dialog.Content>
                </div>
              </Dialog.Portal>
            </Dialog.Root>

            <input
              id="auth-file-picker"
              type="file"
              accept=".json,application/json"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div id="toast" className="toast" role="status" aria-live="polite" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
