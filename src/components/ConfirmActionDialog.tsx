import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { BellRing, LoaderCircle, Trash2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import './add-profile-dialog-stitch.css';
import './confirm-action-dialog-stitch.css';

interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  eyebrow?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  tone?: 'accent' | 'danger';
  busy?: boolean;
  extraContent?: ReactNode;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const modalClassName =
  'fixed left-1/2 top-1/2 z-[90] flex max-h-[80vh] w-[min(96vw,1180px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(30,30,30,0.7)_0%,rgba(20,20,20,0.8)_100%)] text-gray-100 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur-[40px]';

const cardClassName =
  'rounded-[20px] border border-white/10 bg-[rgba(45,45,45,0.6)] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-[30px] transition duration-200 hover:-translate-y-[2px] hover:shadow-[0_18px_36px_rgba(0,0,0,0.3)]';

const workspaceSwitchEyebrows = new Set([
  '切换工作区',
  '自动切换预警',
  '额度预警',
  '当前空间',
  '切换完成',
  '删除配置',
  '覆盖同命名空间',
]);

function SummaryMetric({
  label,
  value,
  dot = false,
}: {
  label: string;
  value: string;
  dot?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {dot ? <span className="h-2 w-2 rounded-full bg-green-500" /> : null}
        <p className="text-sm text-gray-200">{value}</p>
      </div>
    </div>
  );
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  eyebrow = '确认操作',
  cancelLabel = '取消',
  showCancel = true,
  tone = 'accent',
  busy = false,
  extraContent,
  onConfirm,
  onOpenChange,
}: ConfirmActionDialogProps) {
  const AccentIcon = tone === 'danger' ? Trash2 : BellRing;
  const useWorkspaceSwitchFrame = workspaceSwitchEyebrows.has(eyebrow);
  const statusText = busy
    ? '处理中'
    : eyebrow === '切换完成'
      ? '已完成'
      : eyebrow === '当前空间'
        ? '无需切换'
        : '等待确认';
  const actionTypeText =
    tone === 'danger'
      ? '危险操作'
      : eyebrow === '覆盖同命名空间'
        ? '覆盖确认'
        : eyebrow === '切换完成'
          ? '结果提示'
          : '切换提示';
  const shortcutText = showCancel ? '⌘ + Enter' : 'Enter';
  const overviewSummary =
    tone === 'danger'
      ? '当前将执行删除确认。确认后会按你的勾选项移除这个 profile，并可选择连同本地文件夹与 auth.json 一并删除。'
      : eyebrow === '覆盖同命名空间'
        ? '当前将执行同名空间覆盖确认。确认后会直接覆盖原空间的 auth、套餐和备注，不会再额外新增一张卡片。'
      : '当前将执行与登录状态切换相关的确认动作。确认后会按照当前模式处理认证同步，并刷新本地状态展示。';
  const overviewCards = [
    { label: '当前提示', value: eyebrow },
    { label: '执行状态', value: statusText, dot: !busy && eyebrow !== '切换完成' },
    { label: '操作类型', value: actionTypeText },
    { label: '快捷确认', value: shortcutText },
  ];

  if (useWorkspaceSwitchFrame) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="confirm-action-dialog-overlay" />
          <Dialog.Content asChild>
            <div className="confirm-action-dialog-shell">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />
                <div className="absolute right-[-120px] top-24 h-80 w-80 rounded-full bg-blue-500/[0.07] blur-3xl" />
                <div className="absolute bottom-[-140px] left-1/2 h-96 w-[30rem] -translate-x-1/2 rounded-full bg-blue-400/[0.04] blur-3xl" />
              </div>

              <div className="relative flex min-h-screen items-center justify-center px-5 py-8 lg:px-10">
                <div
                  id="confirm-action-modal"
                  className="glass-panel flex h-[78vh] w-full max-w-[1220px] flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_28px_120px_rgba(0,0,0,0.5)]"
                >
                  <header className="flex items-center justify-between border-b border-white/10 px-10 py-7">
                    <div>
                      <Dialog.Title asChild>
                        <h1 className="text-[2.25rem] font-semibold tracking-[-0.04em] text-white">
                          {title}
                        </h1>
                      </Dialog.Title>
                      <Dialog.Description asChild>
                        <p className="mt-2 text-base text-gray-400">{description}</p>
                      </Dialog.Description>
                    </div>

                    <Dialog.Close asChild>
                      <button
                        id="confirm-action-close-button"
                        type="button"
                        aria-label="关闭弹窗"
                        className="rounded-full p-3 text-white/90 transition hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-7 w-7" strokeWidth={2.1} />
                      </button>
                    </Dialog.Close>
                  </header>

                  <main className="soft-scrollbar flex-1 overflow-y-auto px-10 py-8">
                    <div className="confirm-action-dialog-grid">
                      <section className="confirm-action-dialog-grid__overview">
                        <div className="soft-card confirm-action-overview-card">
                          <div className="confirm-action-overview-card__head">
                            <span
                              className={cn(
                                'confirm-action-overview-card__icon',
                                tone === 'danger' && 'confirm-action-overview-card__icon--danger',
                              )}
                            >
                              <AccentIcon className="h-5 w-5" strokeWidth={1.9} />
                            </span>
                            <div>
                              <div className="confirm-action-overview-card__eyebrow">
                                {eyebrow}
                              </div>
                              <div className="confirm-action-overview-card__action">
                                {confirmLabel}
                              </div>
                            </div>
                          </div>

                          <div className="confirm-action-overview-card__summary">
                            {overviewSummary}
                          </div>

                          <div className="confirm-action-overview-card__metrics">
                            {overviewCards.map((item) => (
                              <div key={item.label} className="status-tile">
                                <p className="tile-label">{item.label}</p>
                                <div className="mt-3 flex items-center gap-2.5">
                                  {item.dot ? (
                                    <span className="status-dot ready" />
                                  ) : null}
                                  <p className="text-[1.02rem] font-semibold text-gray-100">
                                    {item.value}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      <section className="confirm-action-dialog-grid__content">
                        <div className="soft-card confirm-action-copy-card">
                          <h2 className="text-[15px] font-medium tracking-[0.08em] text-gray-300">
                            提示说明
                          </h2>

                          <div className="confirm-action-copy-card__highlight">
                            <div className="confirm-action-copy-card__meta">
                              <span className="confirm-action-copy-card__meta-label">
                                当前操作
                              </span>
                              <span className="confirm-action-copy-card__meta-value">
                                {confirmLabel}
                              </span>
                            </div>
                            <div className="confirm-action-copy-card__meta">
                              <span className="confirm-action-copy-card__meta-label">
                                当前状态
                              </span>
                              <span className="confirm-action-copy-card__meta-value">
                                {statusText}
                              </span>
                            </div>
                          </div>

                          <p className="confirm-action-copy-card__description">{description}</p>
                        </div>

                        <div className="soft-card confirm-action-detail-card">
                          <h2 className="text-[15px] font-medium tracking-[0.08em] text-gray-300">
                            详细信息
                          </h2>

                          <div className="confirm-action-detail-body">
                            {extraContent ? (
                              extraContent
                            ) : (
                              <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                  <div className="text-[10px] uppercase">确认方式</div>
                                  <div className="mt-2 text-sm font-semibold text-white">
                                    {confirmLabel}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase">次要操作</div>
                                  <div className="mt-2 text-sm font-semibold text-white">
                                    {showCancel ? cancelLabel : '无'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase">当前状态</div>
                                  <div className="mt-2 text-sm font-semibold text-white">
                                    {statusText}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                  </main>

                  <footer className="flex flex-col gap-5 border-t border-white/10 bg-black/20 px-10 py-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <div className="confirm-action-shortcut">
                        <kbd className="confirm-action-shortcut__key">
                          ⌘
                        </kbd>
                        <span className="confirm-action-shortcut__plus">+</span>
                        <kbd className="confirm-action-shortcut__key">
                          Enter
                        </kbd>
                        <span className="confirm-action-shortcut__label">快速确认</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      {showCancel ? (
                        <Dialog.Close asChild>
                          <button
                            id="confirm-action-cancel-button"
                            type="button"
                            className="secondary-button min-w-[108px] px-7 py-3 text-[15px] font-medium text-gray-200"
                          >
                            {cancelLabel}
                          </button>
                        </Dialog.Close>
                      ) : null}

                      <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className="primary-button inline-flex min-w-[152px] items-center justify-center gap-2 px-9 py-3 text-[15px] font-semibold"
                      >
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        {confirmLabel}
                      </button>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(3,6,12,0.52)] backdrop-blur-[14px]" />
        <Dialog.Content className={modalClassName}>
          <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
            <div>
              <Dialog.Title className="text-[24px] font-semibold tracking-tight text-white">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-400">
                {description}
              </Dialog.Description>
            </div>

            <Dialog.Close
              aria-label="Close"
              className="rounded-full p-2 transition-colors duration-200 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Dialog.Close>
          </header>

          <main className="flex-grow overflow-y-auto px-8 py-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <section className="space-y-6 lg:col-span-5">
                <div className={cardClassName}>
                  <div className="mb-6 flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex h-11 w-11 items-center justify-center rounded-[16px] border',
                        tone === 'danger'
                          ? 'border-red-400/25 bg-red-400/12 text-red-200'
                          : 'border-[#007AFF]/25 bg-[#007AFF]/12 text-[#88c0ff]',
                      )}
                    >
                      <AccentIcon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-300">{eyebrow}</div>
                      <div className="mt-1 text-base font-semibold text-white">{confirmLabel}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SummaryMetric label="当前提示" value={eyebrow} />
                    <SummaryMetric
                      label="执行状态"
                      value={busy ? '处理中' : '等待确认'}
                      dot={!busy}
                    />
                    <SummaryMetric
                      label="操作类型"
                      value={tone === 'danger' ? '危险操作' : '普通提示'}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6 lg:col-span-7">
                <div className={cardClassName}>
                  <h2 className="mb-6 text-sm font-medium uppercase tracking-[0.18em] text-gray-400">
                    提示说明
                  </h2>

                  <div className="rounded-[18px] border border-white/10 bg-white/[0.05] p-4">
                    <div className="text-sm font-medium text-gray-200">当前操作：{confirmLabel}</div>
                    <div className="mt-1 text-xs text-gray-500">提示类型：{eyebrow}</div>
                  </div>

                  <div className="mt-4 text-[15px] leading-7 text-gray-200">{description}</div>
                </div>

                <div className={cardClassName}>
                  <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-gray-400">
                    详细信息
                  </h2>

                  <div
                    className={cn(
                      'space-y-4 text-sm text-gray-200',
                      '[&_.delete-checkbox]:flex [&_.delete-checkbox]:items-start [&_.delete-checkbox]:gap-3 [&_.delete-checkbox]:rounded-[16px] [&_.delete-checkbox]:border [&_.delete-checkbox]:border-white/10 [&_.delete-checkbox]:bg-black/20 [&_.delete-checkbox]:px-4 [&_.delete-checkbox]:py-3',
                      '[&_.delete-checkbox_input]:mt-0.5',
                      '[&>.grid]:gap-4',
                      '[&>.grid>div]:rounded-[18px] [&>.grid>div]:border [&>.grid>div]:border-white/10 [&>.grid>div]:bg-black/20 [&>.grid>div]:p-4',
                    )}
                  >
                    {extraContent ? (
                      extraContent
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-[10px] uppercase">确认方式</div>
                          <div className="mt-2 text-sm font-semibold text-white">{confirmLabel}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase">次要操作</div>
                          <div className="mt-2 text-sm font-semibold text-white">
                            {showCancel ? cancelLabel : '无'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase">当前状态</div>
                          <div className="mt-2 text-sm font-semibold text-white">
                            {busy ? '处理中' : '已就绪'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </main>

          <footer className="flex items-center justify-between border-t border-white/10 bg-black/20 px-8 py-5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <kbd className="rounded border border-white/10 bg-white/[0.1] px-1.5 py-0.5">
                ⌘
              </kbd>
              +
              <kbd className="rounded border border-white/10 bg-white/[0.1] px-1.5 py-0.5">
                Enter
              </kbd>
              快速确认
            </div>

            <div className="flex gap-4">
              {showCancel ? (
                <Dialog.Close className="rounded-[16px] border border-transparent px-6 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-white/10">
                  {cancelLabel}
                </Dialog.Close>
              ) : null}

              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={cn(
                  'inline-flex items-center gap-2 rounded-[16px] px-8 py-2 text-sm font-semibold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-55',
                  tone === 'danger'
                    ? 'bg-red-500 shadow-[0_12px_24px_rgba(239,68,68,0.18)] hover:bg-red-400'
                    : 'bg-[#007AFF] shadow-[0_12px_24px_rgba(0,122,255,0.2)] hover:bg-blue-600',
                )}
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
