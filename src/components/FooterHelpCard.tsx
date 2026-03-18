import { ArrowUpRight, QrCode, RefreshCw, X } from 'lucide-react';

export interface FooterHelpCardQrItem {
  id: string;
  title: string;
  subtitle: string;
  hint: string;
  imageSrc?: string | null;
}

interface FooterHelpCardProps {
  open: boolean;
  versionLabel: string;
  updateBadgeVisible: boolean;
  checkingUpdate: boolean;
  qrItems: FooterHelpCardQrItem[];
  onClose: () => void;
  onOpenAbout: () => void;
  onCheckForUpdates: () => void;
}

export function FooterHelpCard({
  open,
  versionLabel,
  updateBadgeVisible,
  checkingUpdate,
  qrItems,
  onClose,
  onOpenAbout,
  onCheckForUpdates,
}: FooterHelpCardProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="footer-help-card-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="footer-help-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="帮助与支持"
      >
        <div className="footer-help-card__header">
          <div>
            <div className="shell-dialog-eyebrow">Help</div>
            <strong className="footer-help-card__title">帮助与支持</strong>
          </div>
          <button type="button" className="shell-dialog-close" onClick={onClose} aria-label="关闭帮助卡">
            <X size={16} />
          </button>
        </div>

        <div className="footer-help-card__version">{versionLabel}</div>

        <div className="footer-help-card__qr-grid">
          {qrItems.map((item) => (
            <div key={item.id} className="footer-help-card__qr-item">
              <div className="footer-help-card__qr-box">
                {item.imageSrc ? (
                  <img src={item.imageSrc} alt={item.title} className="footer-help-card__qr-image" />
                ) : (
                  <span className="footer-help-card__qr-empty">敬请期待</span>
                )}
              </div>
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
              <p>{item.hint}</p>
            </div>
          ))}
        </div>

        <div className="footer-help-card__actions">
          <button type="button" className="sidebar-button sidebar-button--secondary" onClick={onOpenAbout}>
            <ArrowUpRight size={14} />
            关于
          </button>
          <button type="button" className="sidebar-button" onClick={onCheckForUpdates}>
            {checkingUpdate ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
            检查更新
          </button>
        </div>

        {updateBadgeVisible ? (
          <div className="footer-help-card__notice">当前有新的版本或修复可安装。</div>
        ) : null}
      </div>
    </div>
  );
}
