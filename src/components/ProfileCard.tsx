import * as Progress from '@radix-ui/react-progress';
import { Check, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import type { ProfileSummary } from '../../shared/types';
import { cn } from '../lib/cn';

interface ProfileCardProps {
  profile: ProfileSummary;
  busy?: boolean;
  onActivate: (profile: ProfileSummary) => void;
  onEdit: (profile: ProfileSummary) => void;
  onDelete: (profile: ProfileSummary) => void;
}

const formatResetAt = (value: string | null): string => {
  if (!value) {
    return '未设置';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '未设置';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const getRemainingPercent = (percentUsed: number): number => Math.max(0, 100 - percentUsed);

const progressTone = (percentUsed: number): string => {
  const remainingPercent = getRemainingPercent(percentUsed);

  if (remainingPercent <= 20) {
    return 'bg-red-400';
  }

  if (remainingPercent <= 45) {
    return 'bg-amber-400';
  }

  return 'bg-emerald-400';
};

const authStatusLabel = (profile: ProfileSummary): string => {
  switch (profile.authStatus) {
    case 'path-error':
      return '路径异常';
    case 'missing':
      return '文件缺失';
    default:
      return '认证正常';
  }
};

function QuotaMeter({
  title,
  percentUsed,
  resetAt,
}: {
  title: string;
  percentUsed: number;
  resetAt: string | null;
}) {
  const remainingPercent = getRemainingPercent(percentUsed);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {remainingPercent}%
          </p>
        </div>
        <div className="text-right text-xs leading-5 text-slate-400">
          <p>已用 {percentUsed}%</p>
          <p>到期 {formatResetAt(resetAt)}</p>
        </div>
      </div>

      <Progress.Root className="relative h-2.5 overflow-hidden rounded-full bg-white/8">
        <Progress.Indicator
          className={cn('h-full rounded-full transition-all', progressTone(percentUsed))}
          style={{ width: `${remainingPercent}%` }}
        />
      </Progress.Root>
    </div>
  );
}

export function ProfileCard({
  profile,
  busy = false,
  onActivate,
  onEdit,
  onDelete,
}: ProfileCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => {
        if (profile.authStatus === 'ok' && !busy) {
          onActivate(profile);
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && profile.authStatus === 'ok' && !busy) {
          event.preventDefault();
          onActivate(profile);
        }
      }}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[30px] border bg-panel-radial p-6 shadow-[0_20px_60px_rgba(0,0,0,0.26)] transition',
        profile.isActive
          ? 'border-emerald-400/45 bg-[#111b17] shadow-[0_20px_70px_rgba(52,211,153,0.18)]'
          : 'border-white/8 bg-[#0f141b] hover:border-orange-400/30 hover:-translate-y-1',
        profile.authStatus !== 'ok' ? 'cursor-not-allowed opacity-70' : '',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_35%),linear-gradient(180deg,transparent,rgba(2,6,23,0.4))]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-orange-200">
              {profile.planType}
            </span>
            {profile.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                <Check className="h-3.5 w-3.5" />
                当前使用中
              </span>
            ) : null}
            {profile.authStatus !== 'ok' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200">
                <TriangleAlert className="h-3.5 w-3.5" />
                {authStatusLabel(profile)}
              </span>
            ) : null}
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-white">{profile.name}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {profile.notes || '点击卡片即可切换到这个 workspace。'}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(profile);
            }}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            aria-label={`编辑 ${profile.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(profile);
            }}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
            aria-label={`删除 ${profile.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative mt-8 space-y-6">
        <QuotaMeter
          title="周限额"
          percentUsed={profile.weeklyQuota.percentUsed}
          resetAt={profile.weeklyQuota.resetAt}
        />
        <QuotaMeter
          title="5 小时限额"
          percentUsed={profile.fiveHourQuota.percentUsed}
          resetAt={profile.fiveHourQuota.resetAt}
        />
        <QuotaMeter
          title="Code Review"
          percentUsed={profile.reviewQuota.percentUsed}
          resetAt={profile.reviewQuota.resetAt}
        />
      </div>

      <div className="relative mt-8 flex items-end justify-between gap-3 border-t border-white/8 pt-5 text-xs text-slate-400">
        <div className="space-y-1">
          <p>目录: {profile.storageDirName}</p>
          <p>auth.json: {profile.authFilePath}</p>
        </div>
        <div className="text-right">
          <p>上次切换</p>
          <p className="mt-1 text-slate-300">
            {profile.lastActivatedAt ? formatResetAt(profile.lastActivatedAt) : '尚未切换'}
          </p>
        </div>
      </div>
    </article>
  );
}
