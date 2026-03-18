import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  BadgeHelp,
  Copy,
  KeyRound,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import type { AuthFormMode } from '../../shared/types';

export interface UserCenterSession {
  status: 'guest' | 'authenticated';
  displayName: string;
  email: string | null;
  avatarText: string;
  hasAlert: boolean;
  licenseLabel: string;
  remainingLabel: string;
  expiresAt: string | null;
  deviceId: string;
  fingerprintSummary: string;
  fingerprintHash: string;
  inviteCode: string;
  invitedCount: number;
  inviteProgressLabel: string;
  bootstrapNotice: string | null;
}

export interface UserCenterAuthForm {
  displayName: string;
  email: string;
  password: string;
  verificationCode: string;
  rememberMe: boolean;
}

interface UserCenterDrawerProps {
  open: boolean;
  session: UserCenterSession;
  avatarImageSrc: string | null;
  brandIconSrc: string;
  brandFrameEnabled: boolean;
  authMode: AuthFormMode;
  authForm: UserCenterAuthForm;
  updateBadgeVisible: boolean;
  updateActionBusy: boolean;
  authBusyAction: 'login' | 'register' | 'forgot' | null;
  onOpenChange: (open: boolean) => void;
  onAuthModeChange: (mode: AuthFormMode) => void;
  onAuthFormChange: (patch: Partial<UserCenterAuthForm>) => void;
  onSubmitAuth: () => void;
  onEditAvatar: () => void;
  onBrandFrameEnabledChange: (enabled: boolean) => void;
  onCopyDeviceCode: () => void;
  onCopyFingerprint: () => void;
  onOpenLicenseCenter: () => void;
  onCheckForUpdates: () => void;
  onOpenAbout: () => void;
  onOpenHelp: () => void;
  onRestartApp: () => void;
}

const formatCountdown = (targetAt: string | null, nowMs: number): string => {
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

const getAuthActionLabel = (mode: AuthFormMode): string => {
  switch (mode) {
    case 'register':
      return '注册并进入用户中心';
    case 'forgot':
      return '发送重置邮件';
    default:
      return '登录';
  }
};

export function UserCenterDrawer({
  open,
  session,
  avatarImageSrc,
  brandIconSrc,
  brandFrameEnabled,
  authMode,
  authForm,
  updateBadgeVisible,
  updateActionBusy,
  authBusyAction,
  onOpenChange,
  onAuthModeChange,
  onAuthFormChange,
  onSubmitAuth,
  onEditAvatar,
  onBrandFrameEnabledChange,
  onCopyDeviceCode,
  onCopyFingerprint,
  onOpenLicenseCenter,
  onCheckForUpdates,
  onOpenAbout,
  onOpenHelp,
  onRestartApp,
}: UserCenterDrawerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!open || session.status !== 'authenticated') {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, session.status]);

  const countdownText = useMemo(
    () => formatCountdown(session.expiresAt, nowMs),
    [session.expiresAt, nowMs],
  );

  const authActionLabel = getAuthActionLabel(authMode);
  const ambientStyle = useMemo(
    () =>
      ({
        ['--brand-icon-mask' as string]: `url("${brandIconSrc}")`,
      }) as CSSProperties,
    [brandIconSrc],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <div
          className={`user-drawer-ambient${brandFrameEnabled ? ' is-framed' : ' is-borderless'}`}
          style={ambientStyle}
          aria-hidden="true"
        >
          <div className="user-drawer-ambient__halo" />
          <div className="user-drawer-ambient__stage">
            <span className="user-drawer-ambient__ripple user-drawer-ambient__ripple--outer" />
            <span className="user-drawer-ambient__ripple user-drawer-ambient__ripple--inner" />
            <span
              className={`user-drawer-ambient__mark${brandFrameEnabled ? '' : ' is-borderless'}`}
            >
              <span className="user-drawer-ambient__icon" />
            </span>
          </div>
        </div>
        <Dialog.Content className="user-drawer">
          <header className="user-drawer__header">
            <div>
              <div className="shell-dialog-eyebrow">User Center</div>
              <Dialog.Title className="user-drawer__title">用户中心</Dialog.Title>
              <Dialog.Description className="user-drawer__description">
                右侧滑出的账号、授权和邀请信息入口。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="shell-dialog-close" aria-label="关闭用户中心">
                <X size={18} />
              </button>
            </Dialog.Close>
          </header>

          <div className="user-drawer__body">
            <section className="user-drawer-profile">
              <button
                type="button"
                className={`user-drawer-profile__avatar user-drawer-profile__avatar--button${avatarImageSrc ? ' has-image' : ''}`}
                onClick={onEditAvatar}
                title="修改头像"
              >
                {avatarImageSrc ? (
                  <img className="user-drawer-profile__avatar-image" src={avatarImageSrc} alt="" />
                ) : (
                  session.avatarText
                )}
              </button>
              <div className="user-drawer-profile__main">
                <strong>{session.status === 'authenticated' ? session.displayName : '未登录'}</strong>
                <span>{session.email ?? '登录后可查看邮箱与设备归属'}</span>
                <button
                  type="button"
                  className="user-drawer-profile__edit-button"
                  onClick={onEditAvatar}
                >
                  <PencilLine size={14} />
                  修改头像
                </button>
              </div>
              {session.hasAlert ? <span className="user-drawer-profile__badge" /> : null}
            </section>

            {session.bootstrapNotice ? (
              <div className="license-section-footnote">{session.bootstrapNotice}</div>
            ) : null}

            {session.status === 'authenticated' ? (
              <>
                <section className="user-drawer-section">
                  <div className="user-drawer-section__header">
                    <span>当前授权</span>
                    <span className="badge badge--role-current">{session.licenseLabel}</span>
                  </div>
                  <div className="user-drawer-metric-grid">
                    <div className="about-metric-card">
                      <span className="about-metric-card__label">到期倒计时</span>
                      <strong className="about-metric-card__value">{countdownText}</strong>
                    </div>
                    <div className="about-metric-card">
                      <span className="about-metric-card__label">剩余展示</span>
                      <strong className="about-metric-card__value">{session.remainingLabel}</strong>
                    </div>
                    <button
                      type="button"
                      className="about-metric-card copy-metric-card"
                      onClick={onCopyDeviceCode}
                      title="点击复制完整设备编号"
                    >
                      <span className="about-metric-card__label">设备编号</span>
                      <strong className="about-metric-card__value">{session.deviceId}</strong>
                      <span className="copy-metric-card__hint">点击卡片复制完整设备编号</span>
                    </button>
                    <button
                      type="button"
                      className="about-metric-card copy-metric-card"
                      onClick={onCopyFingerprint}
                      title="点击复制完整机器指纹"
                    >
                      <span className="about-metric-card__label">机器指纹</span>
                      <strong className="about-metric-card__value">
                        {session.fingerprintSummary}
                      </strong>
                      <span className="copy-metric-card__hint">显示缩略，点击复制完整哈希</span>
                    </button>
                  </div>
                </section>

                <section className="user-drawer-section">
                  <div className="user-drawer-section__header">
                    <span>视觉主题</span>
                    <span className="badge badge--manual">
                      {brandFrameEnabled ? '玻璃框开启' : '无边框'}
                    </span>
                  </div>
                  <label className="user-drawer-toggle">
                    <div className="user-drawer-toggle__main">
                      <span className="user-drawer-toggle__label">品牌图标玻璃框</span>
                      <span className="user-drawer-toggle__hint">
                        关闭后只保留中间悬浮的 OpenAI 图标与柔光，不再显示外层玻璃框。
                      </span>
                    </div>
                    <span className="settings-switch">
                      <input
                        className="settings-switch__input"
                        type="checkbox"
                        checked={brandFrameEnabled}
                        onChange={(event) => onBrandFrameEnabledChange(event.target.checked)}
                      />
                      <span className="settings-switch__track" />
                      <span className="settings-switch__thumb" />
                    </span>
                  </label>
                </section>

                <section className="user-drawer-section">
                  <div className="user-drawer-section__header">
                    <span>邀请进度</span>
                    {updateBadgeVisible ? <span className="badge badge--recommended">有更新</span> : null}
                  </div>
                  <div className="user-drawer-inline">
                    <div className="user-drawer-inline__main">
                      <strong>{session.inviteCode}</strong>
                      <span>
                        已邀请 {session.invitedCount} 人 / 当前进度 {session.inviteProgressLabel}
                      </span>
                    </div>
                    <div className="user-drawer-inline__actions">
                      <button
                        type="button"
                        className="sidebar-button sidebar-button--secondary"
                        onClick={onCopyDeviceCode}
                      >
                        <Copy size={14} />
                        复制设备码
                      </button>
                      <button
                        type="button"
                        className="sidebar-button sidebar-button--secondary"
                        onClick={onCopyFingerprint}
                      >
                        <Copy size={14} />
                        复制机器指纹
                      </button>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className="user-drawer-section">
                <div className="user-drawer-section__header">
                  <span>登录入口</span>
                  <span className="badge badge--manual">mock 在线层</span>
                </div>
                <div className="user-drawer-guest-card">
                  <div className="user-drawer-guest-card__tabs">
                    <button
                      type="button"
                      className={`about-qr-tab${authMode === 'login' ? ' is-active' : ''}`}
                      onClick={() => onAuthModeChange('login')}
                    >
                      登录
                    </button>
                    <button
                      type="button"
                      className={`about-qr-tab${authMode === 'register' ? ' is-active' : ''}`}
                      onClick={() => onAuthModeChange('register')}
                    >
                      注册
                    </button>
                    <button
                      type="button"
                      className={`about-qr-tab${authMode === 'forgot' ? ' is-active' : ''}`}
                      onClick={() => onAuthModeChange('forgot')}
                    >
                      忘记密码
                    </button>
                  </div>

                  {authMode === 'register' ? (
                    <input
                      className="license-input"
                      placeholder="用户名"
                      value={authForm.displayName}
                      onChange={(event) => onAuthFormChange({ displayName: event.target.value })}
                    />
                  ) : null}

                  <input
                    className="license-input"
                    placeholder="邮箱"
                    value={authForm.email}
                    onChange={(event) => onAuthFormChange({ email: event.target.value })}
                  />

                  {authMode !== 'forgot' ? (
                    <input
                      className="license-input"
                      placeholder="密码"
                      type="password"
                      value={authForm.password}
                      onChange={(event) => onAuthFormChange({ password: event.target.value })}
                    />
                  ) : null}

                  <input
                    className="license-input"
                    placeholder="验证码（预留）"
                    value={authForm.verificationCode}
                    onChange={(event) => onAuthFormChange({ verificationCode: event.target.value })}
                  />

                  {authMode !== 'forgot' ? (
                    <label className="user-drawer-remember">
                      <input
                        type="checkbox"
                        checked={authForm.rememberMe}
                        onChange={(event) => onAuthFormChange({ rememberMe: event.target.checked })}
                      />
                      <span>记住我</span>
                    </label>
                  ) : null}

                  <button type="button" className="sidebar-button" onClick={onSubmitAuth}>
                    {authBusyAction ? <RefreshCw size={14} className="spin" /> : <UserRound size={14} />}
                    {authActionLabel}
                  </button>
                </div>
              </section>
            )}

            <section className="user-drawer-actions">
              <button type="button" className="user-drawer-action" onClick={onEditAvatar}>
                <PencilLine size={16} />
                <span>修改头像</span>
              </button>
              <button type="button" className="user-drawer-action" onClick={onOpenLicenseCenter}>
                <KeyRound size={16} />
                <span>打开授权中心</span>
              </button>
              <button type="button" className="user-drawer-action" onClick={onCheckForUpdates}>
                {updateActionBusy ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                <span>检查更新</span>
              </button>
              <button type="button" className="user-drawer-action" onClick={onOpenAbout}>
                <ShieldCheck size={16} />
                <span>关于</span>
              </button>
              <button type="button" className="user-drawer-action" onClick={onOpenHelp}>
                <BadgeHelp size={16} />
                <span>帮助</span>
              </button>
              <button type="button" className="user-drawer-action" onClick={onRestartApp}>
                <RefreshCw size={16} />
                <span>重启应用</span>
              </button>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
