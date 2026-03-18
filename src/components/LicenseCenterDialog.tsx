import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Copy,
  Gift,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';

export interface LicenseCenterRecordItem {
  id: string;
  time: string;
  target: string;
  result: string;
  reward: string;
}

export interface LicenseCenterSnapshot {
  licenseType: string;
  expiresAt: string | null;
  permanent: boolean;
  sourceLabel: string;
  stageLabel: string;
  remainingLabel: string;
  deviceId: string;
  fingerprintSummary: string;
  inviteCode: string;
  requestedInviteCode: string | null;
  inviteRule: string;
  inviteProgressLabel: string;
  rewardPreview: string[];
  inviteSlotsText: string;
  pendingRewardCount: number;
  eligibleForInvite: boolean;
  nextRewardLabel: string | null;
  inviteRecords: LicenseCenterRecordItem[];
  rewardRecords: LicenseCenterRecordItem[];
  bootstrapNotice: string | null;
}

interface LicenseCenterDialogProps {
  open: boolean;
  snapshot: LicenseCenterSnapshot;
  busyAction:
    | 'activation'
    | 'reward'
    | 'request-invite'
    | 'redeem-invite'
    | 'claim-reward'
    | null;
  onOpenChange: (open: boolean) => void;
  onCopyInviteCode: () => void;
  onApplyActivationCode: (code: string) => void;
  onApplyRewardCode: (code: string) => void;
  onRequestInviteCode: () => void;
  onRedeemInviteCode: (code: string) => void;
  onClaimInviteReward: () => void;
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

const BusyIcon = () => <RefreshCw size={14} className="spin" />;

export function LicenseCenterDialog({
  open,
  snapshot,
  busyAction,
  onOpenChange,
  onCopyInviteCode,
  onApplyActivationCode,
  onApplyRewardCode,
  onRequestInviteCode,
  onRedeemInviteCode,
  onClaimInviteReward,
}: LicenseCenterDialogProps) {
  const [activationCode, setActivationCode] = useState('');
  const [rewardCode, setRewardCode] = useState('');
  const [redeemInviteCode, setRedeemInviteCode] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!open) {
      return;
    }

    setActivationCode('');
    setRewardCode('');
    setRedeemInviteCode('');
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  const countdownText = useMemo(
    () => formatCountdown(snapshot.expiresAt, nowMs),
    [snapshot.expiresAt, nowMs],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="shell-dialog-overlay" />
        <Dialog.Content className="shell-dialog-panel shell-dialog-panel--license">
          <header className="shell-dialog-header">
            <div>
              <div className="shell-dialog-eyebrow">License Center</div>
              <Dialog.Title className="shell-dialog-title">授权中心</Dialog.Title>
              <Dialog.Description className="shell-dialog-description">
                当前已接入本地授权底座与 mock 在线邀请层，后续可直接替换成真实 API。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="shell-dialog-close" aria-label="关闭授权中心">
                <X size={18} />
              </button>
            </Dialog.Close>
          </header>

          <div className="shell-dialog-body shell-dialog-body--license">
            <section className="license-hero-grid">
              <div className="license-status-card">
                <div className="license-status-card__header">
                  <div className="license-status-card__icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="license-status-card__eyebrow">Current License</div>
                    <strong className="license-status-card__title">{snapshot.licenseType}</strong>
                  </div>
                </div>
                <div className="license-status-card__metrics">
                  <div className="about-metric-card">
                    <span className="about-metric-card__label">剩余倒计时</span>
                    <strong className="about-metric-card__value">{countdownText}</strong>
                  </div>
                  <div className="about-metric-card">
                    <span className="about-metric-card__label">到期时间</span>
                    <strong className="about-metric-card__value">
                      {snapshot.permanent ? '永久' : formatDateTime(snapshot.expiresAt)}
                    </strong>
                  </div>
                  <div className="about-metric-card">
                    <span className="about-metric-card__label">设备编号</span>
                    <strong className="about-metric-card__value">{snapshot.deviceId}</strong>
                  </div>
                  <div className="about-metric-card">
                    <span className="about-metric-card__label">机器指纹</span>
                    <strong className="about-metric-card__value">
                      {snapshot.fingerprintSummary}
                    </strong>
                  </div>
                </div>
                <div className="license-status-card__meta">
                  <span>来源：{snapshot.sourceLabel}</span>
                  <span>阶段：{snapshot.stageLabel}</span>
                  <span>展示剩余：{snapshot.remainingLabel}</span>
                </div>
                {snapshot.bootstrapNotice ? (
                  <div className="license-section-footnote">{snapshot.bootstrapNotice}</div>
                ) : null}
              </div>

              <div className="license-input-stack">
                <div className="license-input-card">
                  <div className="license-input-card__header">
                    <KeyRound size={16} />
                    <strong>输入授权码</strong>
                  </div>
                  <input
                    value={activationCode}
                    onChange={(event) => setActivationCode(event.target.value)}
                    placeholder="粘贴 activation code"
                    className="license-input"
                  />
                  <button
                    type="button"
                    className="sidebar-button"
                    onClick={() => onApplyActivationCode(activationCode)}
                  >
                    {busyAction === 'activation' ? <BusyIcon /> : null}
                    应用授权
                  </button>
                </div>

                <div className="license-input-card">
                  <div className="license-input-card__header">
                    <Gift size={16} />
                    <strong>输入奖励码</strong>
                  </div>
                  <input
                    value={rewardCode}
                    onChange={(event) => setRewardCode(event.target.value)}
                    placeholder="粘贴 reward code"
                    className="license-input"
                  />
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => onApplyRewardCode(rewardCode)}
                  >
                    {busyAction === 'reward' ? <BusyIcon /> : null}
                    录入奖励
                  </button>
                </div>

                <div className="license-input-card">
                  <div className="license-input-card__header">
                    <Ticket size={16} />
                    <strong>兑换邀请码 / 模拟新设备兑换</strong>
                  </div>
                  <input
                    value={redeemInviteCode}
                    onChange={(event) => setRedeemInviteCode(event.target.value)}
                    placeholder="输入邀请码；输入当前邀请码可模拟成功邀请"
                    className="license-input"
                  />
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={() => onRedeemInviteCode(redeemInviteCode)}
                  >
                    {busyAction === 'redeem-invite' ? <BusyIcon /> : null}
                    兑换邀请码
                  </button>
                </div>
              </div>
            </section>

            <section className="license-grid-section">
              <div className="about-section-card">
                <div className="about-section-card__header">
                  <div>
                    <div className="about-section-card__eyebrow">Invite</div>
                    <h3 className="about-section-card__title">邀请码与奖励</h3>
                  </div>
                  <Ticket size={16} />
                </div>

                <div className="license-invite-code">
                  <code>{snapshot.requestedInviteCode ?? snapshot.inviteCode}</code>
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={onCopyInviteCode}
                  >
                    <Copy size={14} />
                    复制邀请码
                  </button>
                </div>
                <p className="license-paragraph">{snapshot.inviteRule}</p>
                <div className="license-reward-preview">
                  {snapshot.rewardPreview.map((item) => (
                    <div key={item} className="license-reward-chip">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="license-section-footnote">
                  进度：{snapshot.inviteProgressLabel}，{snapshot.inviteSlotsText}
                  {snapshot.nextRewardLabel ? `，下一档奖励 ${snapshot.nextRewardLabel}` : ''}
                  {snapshot.pendingRewardCount > 0
                    ? `，当前待领奖 ${snapshot.pendingRewardCount} 条`
                    : ''}
                </div>
                <div className="license-action-row">
                  <button
                    type="button"
                    className="sidebar-button"
                    onClick={onRequestInviteCode}
                    disabled={!snapshot.eligibleForInvite}
                  >
                    {busyAction === 'request-invite' ? <BusyIcon /> : null}
                    申请邀请码
                  </button>
                  <button
                    type="button"
                    className="sidebar-button sidebar-button--secondary"
                    onClick={onClaimInviteReward}
                    disabled={snapshot.pendingRewardCount <= 0}
                  >
                    {busyAction === 'claim-reward' ? <BusyIcon /> : null}
                    领取邀请奖励
                  </button>
                </div>
              </div>

              <div className="about-section-card">
                <div className="about-section-card__header">
                  <div>
                    <div className="about-section-card__eyebrow">Records</div>
                    <h3 className="about-section-card__title">授权记录 / 邀请记录</h3>
                  </div>
                </div>

                <div className="license-record-list">
                  {[...snapshot.inviteRecords, ...snapshot.rewardRecords].map((item) => (
                    <div key={item.id} className="license-record-item">
                      <div className="license-record-item__time">{formatDateTime(item.time)}</div>
                      <div className="license-record-item__main">
                        <strong>{item.target}</strong>
                        <span>{item.result}</span>
                      </div>
                      <div className="license-record-item__reward">{item.reward}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
