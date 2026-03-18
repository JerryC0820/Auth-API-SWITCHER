import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Download, RefreshCw, ShieldAlert, X } from 'lucide-react';
import type { UpdateState } from '../../shared/types';

interface UpdateDialogProps {
  open: boolean;
  updateState: UpdateState;
  busyAction: 'check' | 'install' | null;
  onOpenChange: (open: boolean) => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  onOpenNotes: () => void;
}

const formatDateTime = (value?: string | null): string => {
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

export function UpdateDialog({
  open,
  updateState,
  busyAction,
  onOpenChange,
  onCheckForUpdates,
  onInstallUpdate,
  onOpenNotes,
}: UpdateDialogProps) {
  const isMandatory = updateState.blockedByMandatory;
  const title =
    updateState.updateKind === 'patch' ? '发现新修复' : '发现新版本';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="shell-dialog-overlay" />
        <Dialog.Content
          className="shell-dialog-panel shell-dialog-panel--update"
          onPointerDownOutside={(event) => {
            if (isMandatory) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isMandatory) {
              event.preventDefault();
            }
          }}
        >
          <header className="shell-dialog-header">
            <div>
              <div className="shell-dialog-eyebrow">Update</div>
              <Dialog.Title className="shell-dialog-title">
                {updateState.updateAvailable ? title : '更新状态'}
              </Dialog.Title>
              <Dialog.Description className="shell-dialog-description">
                {updateState.updateAvailable
                  ? isMandatory
                    ? '当前版本已经低于允许继续使用的范围，请先完成更新。'
                    : '已检测到可安装的新版本或新修复。'
                  : '这里会展示最新版本、发布时间和更新说明摘要。'}
              </Dialog.Description>
            </div>

            {!isMandatory ? (
              <Dialog.Close asChild>
                <button type="button" className="shell-dialog-close" aria-label="关闭更新弹窗">
                  <X size={18} />
                </button>
              </Dialog.Close>
            ) : null}
          </header>

          <div className="shell-dialog-body">
            <section className="update-dialog-banner">
              <div className="update-dialog-banner__icon">
                <ShieldAlert size={20} />
              </div>
              <div className="update-dialog-banner__content">
                <strong>{updateState.updateAvailable ? title : '暂未发现更新'}</strong>
                <span>
                  当前 {updateState.currentVersion}
                  {updateState.manifest ? `，最新 ${updateState.manifest.version}` : ''}
                  {updateState.minSupportedVersion
                    ? `，最低支持 ${updateState.minSupportedVersion}`
                    : ''}
                </span>
              </div>
            </section>

            <div className="update-dialog-metrics">
              <div className="about-metric-card">
                <span className="about-metric-card__label">当前版本</span>
                <strong className="about-metric-card__value">{updateState.currentVersion}</strong>
              </div>
              <div className="about-metric-card">
                <span className="about-metric-card__label">最新版本</span>
                <strong className="about-metric-card__value">
                  {updateState.manifest?.version ?? '未检查'}
                </strong>
              </div>
              <div className="about-metric-card">
                <span className="about-metric-card__label">发布时间</span>
                <strong className="about-metric-card__value">
                  {formatDateTime(updateState.manifest?.releaseTime)}
                </strong>
              </div>
              <div className="about-metric-card">
                <span className="about-metric-card__label">上次检查</span>
                <strong className="about-metric-card__value">
                  {formatDateTime(updateState.lastCheckedAt)}
                </strong>
              </div>
            </div>

            <div className="update-dialog-copy">
              <div className="update-dialog-copy__section">
                <div className="update-dialog-copy__label">更新来源</div>
                <p>
                  {updateState.sourceName ? updateState.sourceName.toUpperCase() : '未记录'}
                  {updateState.sourceUrl ? ` / ${updateState.sourceUrl}` : ''}
                </p>
              </div>
              <div className="update-dialog-copy__section">
                <div className="update-dialog-copy__label">更新摘要</div>
                <p>
                  {updateState.manifest?.notes ||
                    updateState.errorMessage ||
                    '当前还没有拿到更新说明摘要。'}
                </p>
              </div>
            </div>
          </div>

          <footer className="shell-dialog-footer">
            <div className="shell-dialog-footer__hint">
              {isMandatory
                ? '必须更新时不会提供“稍后再说”，但你仍可查看完整更新说明。'
                : '普通更新可稍后再说；点击完整说明会跳到外部日志页面。'}
            </div>
            <div className="shell-dialog-footer__actions">
              <button
                type="button"
                className="sidebar-button sidebar-button--secondary"
                onClick={onCheckForUpdates}
              >
                {busyAction === 'check' ? (
                  <RefreshCw size={15} className="spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                检查更新
              </button>
              <button
                type="button"
                className="sidebar-button sidebar-button--secondary"
                onClick={onOpenNotes}
                disabled={!updateState.manifest?.notesUrl}
              >
                <ArrowUpRight size={15} />
                查看完整说明
              </button>
              {!isMandatory ? (
                <Dialog.Close asChild>
                  <button type="button" className="sidebar-button sidebar-button--secondary">
                    稍后再说
                  </button>
                </Dialog.Close>
              ) : null}
              <button
                type="button"
                className="sidebar-button"
                onClick={onInstallUpdate}
                disabled={!updateState.updateAvailable}
              >
                {busyAction === 'install' ? (
                  <RefreshCw size={15} className="spin" />
                ) : (
                  <Download size={15} />
                )}
                {updateState.currentPlatform === 'win' ? '立即更新' : '下载更新包'}
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
