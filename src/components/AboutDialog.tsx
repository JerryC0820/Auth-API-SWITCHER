import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowUpRight,
  Copy,
  Mail,
  Package,
  QrCode,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import type { UpdateState } from '../../shared/types';

export interface AboutDialogLinkItem {
  id: string;
  label: string;
  description: string;
  value: string;
  action: 'external' | 'copy' | 'disabled';
}

export interface AboutDialogQrItem {
  id: string;
  title: string;
  subtitle: string;
  hint: string;
  imageSrc?: string | null;
  copyValue?: string | null;
}

export interface AboutDialogProductItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  url: string;
}

interface AboutDialogProps {
  open: boolean;
  appName: string;
  subtitle: string;
  buildChannelLabel: string;
  platformTags: string[];
  versionLabel: string;
  updateState: UpdateState;
  updateBusyAction: 'check' | 'install' | null;
  links: AboutDialogLinkItem[];
  qrItems: AboutDialogQrItem[];
  products: AboutDialogProductItem[];
  onOpenChange: (open: boolean) => void;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  onOpenUpdateNotes: () => void;
  onOpenExternal: (url: string) => void;
  onCopyValue: (label: string, value: string) => void;
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

const mapUpdateStatusLabel = (updateState: UpdateState): string => {
  switch (updateState.availability) {
    case 'checking':
      return '检查中';
    case 'available':
      return updateState.updateKind === 'patch' ? '发现新修复' : '发现新版本';
    case 'downloading':
      return '下载中';
    case 'ready':
      return updateState.currentPlatform === 'win' ? '安装器就绪' : '更新包已下载';
    case 'required':
      return '必须更新';
    case 'up-to-date':
      return '已是最新';
    case 'error':
      return '检查失败';
    case 'unconfigured':
      return '未配置';
    default:
      return '待检查';
  }
};

export function AboutDialog({
  open,
  appName,
  subtitle,
  buildChannelLabel,
  platformTags,
  versionLabel,
  updateState,
  updateBusyAction,
  links,
  qrItems,
  products,
  onOpenChange,
  onCheckForUpdates,
  onInstallUpdate,
  onOpenUpdateNotes,
  onOpenExternal,
  onCopyValue,
}: AboutDialogProps) {
  const [activeQrId, setActiveQrId] = useState(() => qrItems[0]?.id ?? '');

  const activeQr = useMemo(
    () => qrItems.find((item) => item.id === activeQrId) ?? qrItems[0] ?? null,
    [activeQrId, qrItems],
  );
  const updateStatusLabel = mapUpdateStatusLabel(updateState);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="shell-dialog-overlay" />
        <Dialog.Content className="shell-dialog-panel shell-dialog-panel--about">
          <header className="shell-dialog-header">
            <div>
              <div className="shell-dialog-eyebrow">About</div>
              <Dialog.Title className="shell-dialog-title">关于与更新</Dialog.Title>
              <Dialog.Description className="shell-dialog-description">
                延续当前暗色玻璃风格的产品信息、更新入口和联系通道。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="shell-dialog-close" aria-label="关闭关于弹窗">
                <X size={18} />
              </button>
            </Dialog.Close>
          </header>

          <div className="shell-dialog-body shell-dialog-body--about">
            <section className="about-hero-card">
              <div className="about-hero-card__icon">
                <Sparkles size={22} strokeWidth={1.9} />
              </div>
              <div className="about-hero-card__content">
                <div className="about-hero-card__eyebrow">Product Identity</div>
                <h2 className="about-hero-card__title">{appName}</h2>
                <p className="about-hero-card__subtitle">{subtitle}</p>
                <div className="about-hero-card__meta">
                  <span className="badge badge--role-current">{buildChannelLabel}</span>
                  <span className="badge badge--manual">{versionLabel}</span>
                  {platformTags.map((tag) => (
                    <span key={tag} className="badge badge--plan">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="about-section-card">
              <div className="about-section-card__header">
                <div>
                  <div className="about-section-card__eyebrow">Update Status</div>
                  <h3 className="about-section-card__title">更新状态</h3>
                </div>
                <span
                  className={`about-status-badge${
                    updateState.blockedByMandatory
                      ? ' is-danger'
                      : updateState.updateAvailable
                        ? ' is-active'
                        : ''
                  }`}
                >
                  {updateStatusLabel}
                </span>
              </div>

              <div className="about-metric-grid">
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
                  <span className="about-metric-card__label">上次检查</span>
                  <strong className="about-metric-card__value">
                    {formatDateTime(updateState.lastCheckedAt)}
                  </strong>
                </div>
                <div className="about-metric-card">
                  <span className="about-metric-card__label">更新来源</span>
                  <strong className="about-metric-card__value">
                    {updateState.sourceName ? updateState.sourceName.toUpperCase() : '未检查'}
                  </strong>
                </div>
              </div>

              <div className="about-update-actions">
                <button
                  type="button"
                  className="sidebar-button"
                  onClick={onCheckForUpdates}
                >
                  {updateBusyAction === 'check' ? (
                    <RefreshCw size={15} className="spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  检查更新
                </button>
                <button
                  type="button"
                  className="sidebar-button sidebar-button--secondary"
                  onClick={onInstallUpdate}
                  disabled={!updateState.updateAvailable}
                >
                  <Package size={15} />
                  {updateState.currentPlatform === 'win' ? '立即更新' : '下载更新包'}
                </button>
                <button
                  type="button"
                  className="sidebar-button sidebar-button--secondary"
                  onClick={onOpenUpdateNotes}
                  disabled={!updateState.manifest?.notesUrl}
                >
                  <ArrowUpRight size={15} />
                  查看更新日志
                </button>
              </div>
              <p className="about-section-card__footnote">
                {updateState.manifest?.notes ||
                  updateState.errorMessage ||
                  '更新说明摘要会在接入正式 release notes 后显示在这里。'}
              </p>
            </section>

            <section className="about-grid-section">
              <div className="about-section-card">
                <div className="about-section-card__header">
                  <div>
                    <div className="about-section-card__eyebrow">Support</div>
                    <h3 className="about-section-card__title">联系方式</h3>
                  </div>
                  <Mail size={16} />
                </div>

                <div className="about-link-list">
                  {links.map((item) => (
                    <div key={item.id} className="about-link-item">
                      <div className="about-link-item__copy">
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </div>
                      {item.action === 'external' ? (
                        <button
                          type="button"
                          className="sidebar-button sidebar-button--secondary"
                          onClick={() => onOpenExternal(item.value)}
                        >
                          <ArrowUpRight size={14} />
                          打开
                        </button>
                      ) : item.action === 'copy' ? (
                        <button
                          type="button"
                          className="sidebar-button sidebar-button--secondary"
                          onClick={() => onCopyValue(item.label, item.value)}
                        >
                          <Copy size={14} />
                          复制
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sidebar-button sidebar-button--secondary"
                          disabled
                        >
                          <Copy size={14} />
                          待配置
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="about-section-card">
                <div className="about-section-card__header">
                  <div>
                    <div className="about-section-card__eyebrow">Qr Tabs</div>
                    <h3 className="about-section-card__title">二维码</h3>
                  </div>
                  <QrCode size={16} />
                </div>

                <div className="about-qr-tabs">
                  {qrItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`about-qr-tab${item.id === activeQr?.id ? ' is-active' : ''}`}
                      onClick={() => setActiveQrId(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>

                {activeQr ? (
                  <div className="about-qr-panel">
                    <div className="about-qr-placeholder">
                      {activeQr.imageSrc ? (
                        <img src={activeQr.imageSrc} alt={activeQr.title} className="about-qr-image" />
                      ) : (
                        <div className="about-qr-placeholder__text">
                          <span>暂未开放</span>
                        </div>
                      )}
                    </div>
                    <div className="about-qr-panel__meta">
                      <strong>{activeQr.title}</strong>
                      <span>{activeQr.subtitle}</span>
                      <p>{activeQr.hint}</p>
                    </div>
                    {activeQr.copyValue ? (
                      <button
                        type="button"
                        className="sidebar-button sidebar-button--secondary"
                        onClick={() => onCopyValue(activeQr.title, activeQr.copyValue ?? '')}
                      >
                        <Copy size={14} />
                        复制联系信息
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="about-section-card">
              <div className="about-section-card__header">
                <div>
                  <div className="about-section-card__eyebrow">Products</div>
                  <h3 className="about-section-card__title">相关产品</h3>
                </div>
              </div>

              <div className="about-product-grid">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="about-product-card"
                    onClick={() => onOpenExternal(product.url)}
                  >
                    <span className="badge badge--recommended">{product.tag}</span>
                    <strong>{product.title}</strong>
                    <p>{product.description}</p>
                    <span className="about-product-card__action">
                      查看详情
                      <ArrowUpRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
