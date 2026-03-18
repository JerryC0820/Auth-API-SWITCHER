import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  FolderOpen,
  KeyRound,
  MonitorSmartphone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  HostLicenseDurationKey,
  IssueLicenseCodeInput,
  LicenseHostIssuedRecord,
  LicenseHostState,
  WindowState,
} from '../../shared/types';

const APP_ICON_SRC = '/assets/icons/openai.png';

interface HostFormState {
  durationKey: HostLicenseDurationKey;
  targetLabel: string;
  deviceFingerprintHash: string;
  deviceId: string;
  note: string;
}

const createEmptyHostState = (): LicenseHostState => ({
  initialized: false,
  hostId: 'HOST-UNSET',
  hostName: '本地授权主机',
  hostCreatedAt: null,
  publicKeySummary: '未初始化',
  publicKeyPem: '',
  publicKeyPath: '',
  storagePath: '',
  currentDevice: {
    deviceId: 'DEV-UNKNOWN',
    fingerprintHash: '',
    fingerprintSummary: 'UNKN-OWNS-IGN',
    hostLabel: 'unknown',
    platformLabel: 'Unknown',
    machineName: 'Unknown',
  },
  lastIssuedAt: null,
  issuedCount: 0,
  supportedDurations: [],
  recentRecords: [],
});

const createInitialForm = (): HostFormState => ({
  durationKey: 'permanent',
  targetLabel: '',
  deviceFingerprintHash: '',
  deviceId: '',
  note: '',
});

const formatDateTime = (value: string | null): string => {
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

const copyText = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};

export function LicenseHostView() {
  const [hostState, setHostState] = useState<LicenseHostState>(createEmptyHostState);
  const [form, setForm] = useState<HostFormState>(createInitialForm);
  const [generatedCode, setGeneratedCode] = useState('');
  const [busy, setBusy] = useState<'loading' | 'issuing' | null>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [windowState, setWindowState] = useState<WindowState>({ maximized: false, visible: true });
  const [recordSearch, setRecordSearch] = useState('');
  const [recordSearchBusy, setRecordSearchBusy] = useState(false);
  const [recordSearchResults, setRecordSearchResults] = useState<LicenseHostIssuedRecord[] | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const nextState = await window.codexWorkspace.getLicenseHostState();
        if (cancelled) {
          return;
        }

        setHostState(nextState);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : '授权主机初始化失败。');
      } finally {
        if (!cancelled) {
          setBusy(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let active = true;

    void window.codexWorkspace.getWindowState().then((state) => {
      if (active) {
        setWindowState(state);
      }
    });

    const unsubscribe = window.codexWorkspace.onWindowStateChange((state) => {
      if (active) {
        setWindowState(state);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!recordSearch.trim()) {
      setRecordSearchResults(null);
      setRecordSearchBusy(false);
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      setRecordSearchBusy(true);
      void window.codexWorkspace
        .searchLicenseHostRecords(recordSearch)
        .then((result) => {
          if (!cancelled) {
            setRecordSearchResults(result.records);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setErrorMessage(error instanceof Error ? error.message : '搜索签发记录失败。');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setRecordSearchBusy(false);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [recordSearch, hostState]);

  const currentDuration = useMemo(
    () => hostState.supportedDurations.find((item) => item.key === form.durationKey) ?? null,
    [hostState.supportedDurations, form.durationKey],
  );
  const visibleRecords = recordSearch.trim() ? recordSearchResults ?? [] : hostState.recentRecords;

  const applyCurrentDevice = () => {
    setForm((current) => ({
      ...current,
      targetLabel: current.targetLabel || `主机本机 / ${hostState.currentDevice.deviceId}`,
      deviceFingerprintHash: hostState.currentDevice.fingerprintHash,
      deviceId: hostState.currentDevice.deviceId,
    }));
  };

  const handleCopy = async (text: string, successText: string) => {
    try {
      await copyText(text);
      setToastMessage(successText);
    } catch {
      setErrorMessage('复制失败，请检查系统剪贴板权限。');
    }
  };

  const handleIssue = async () => {
    const payload: IssueLicenseCodeInput = {
      durationKey: form.durationKey,
      targetLabel: form.targetLabel,
      deviceFingerprintHash: form.deviceFingerprintHash,
      deviceId: form.deviceId || null,
      note: form.note || '',
    };

    try {
      setBusy('issuing');
      setErrorMessage(null);
      const result = await window.codexWorkspace.issueLicenseCode(payload);
      setHostState(result.state);
      setGeneratedCode(result.generatedCode ?? '');
      setToastMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '生成授权码失败。');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="license-host">
      <div className="license-host__shell">
        <div
          className="license-host__windowbar"
          onDoubleClick={() => {
            void window.codexWorkspace.toggleMaximizeWindow();
          }}
        >
          <div className="license-host__windowbar-title">
            <img src={APP_ICON_SRC} alt="" className="license-host__windowbar-icon" />
            <span>本地授权主机</span>
          </div>
          <div className="license-host__windowbar-actions">
            <button
              type="button"
              className="window-dot window-dot--minimize"
              title="最小化窗口"
              aria-label="最小化窗口"
              onClick={() => {
                void window.codexWorkspace.minimizeWindow();
              }}
            />
            <button
              type="button"
              className={`window-dot window-dot--maximize${windowState.maximized ? ' is-active' : ''}`}
              title={windowState.maximized ? '还原窗口' : '最大化窗口'}
              aria-label={windowState.maximized ? '还原窗口' : '最大化窗口'}
              onClick={() => {
                void window.codexWorkspace.toggleMaximizeWindow();
              }}
            />
            <button
              type="button"
              className="window-dot window-dot--close"
              title="关闭授权主机"
              aria-label="关闭授权主机"
              onClick={() => {
                void window.codexWorkspace.closeWindow();
              }}
            />
          </div>
        </div>

        <header className="license-host__header">
          <div className="license-host__brand">
            <img src={APP_ICON_SRC} alt="Auth API Switcher" className="license-host__icon" />
            <div>
              <div className="shell-dialog-eyebrow">Local License Host</div>
              <h1 className="license-host__title">本地授权主机</h1>
              <p className="license-host__subtitle">
                使用当前项目的本地密钥对生成签名授权码，继续保持深色毛玻璃风格，不引入外部云端依赖。
              </p>
            </div>
          </div>

          <div className="license-host__header-actions">
            <button
              type="button"
              className="sidebar-button sidebar-button--secondary"
              onClick={() => {
                void window.codexWorkspace.restartLicenseHost();
              }}
            >
              <RefreshCw size={14} />
              重启主机
            </button>
          </div>
        </header>

        <section className="license-host__hero">
          <div className="license-host__hero-copy">
            <div className="license-host__eyebrow">Host Ready</div>
            <strong>{hostState.hostName}</strong>
            <span>
              当前主机 ID：{hostState.hostId}，最近一次签发 {formatDateTime(hostState.lastIssuedAt)}。
            </span>
          </div>
          <div className="license-host__hero-metrics">
            <div className="about-metric-card">
              <span className="about-metric-card__label">主机标识</span>
              <strong className="about-metric-card__value">{hostState.hostId}</strong>
            </div>
            <div className="about-metric-card">
              <span className="about-metric-card__label">公钥摘要</span>
              <strong className="about-metric-card__value">{hostState.publicKeySummary}</strong>
            </div>
            <div className="about-metric-card">
              <span className="about-metric-card__label">签发数量</span>
              <strong className="about-metric-card__value">{hostState.issuedCount}</strong>
            </div>
            <div className="about-metric-card">
              <span className="about-metric-card__label">当前设备</span>
              <strong className="about-metric-card__value">
                {hostState.currentDevice.deviceId}
              </strong>
            </div>
          </div>
        </section>

        <div className="license-host__grid">
          <section className="license-host-card">
            <div className="license-host-card__header">
              <div className="license-host-card__icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>签发授权码</strong>
                <span>给当前设备或指定设备生成本地签名授权。</span>
              </div>
            </div>

            <div className="license-host__duration-grid">
              {hostState.supportedDurations.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`license-host__duration-chip${
                    form.durationKey === option.key ? ' is-active' : ''
                  }`}
                  onClick={() => setForm((current) => ({ ...current, durationKey: option.key }))}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>

            <label className="license-host__field">
              <span>目标设备名称</span>
              <input
                className="license-input"
                value={form.targetLabel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, targetLabel: event.target.value }))
                }
                placeholder="例如：Jerry 主力机"
              />
            </label>

            <label className="license-host__field">
              <span>设备编号</span>
              <input
                className="license-input"
                value={form.deviceId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, deviceId: event.target.value }))
                }
                placeholder="例如：DEV-1234ABCD"
              />
            </label>

            <label className="license-host__field">
              <span>机器指纹哈希</span>
              <textarea
                className="license-host__textarea"
                value={form.deviceFingerprintHash}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deviceFingerprintHash: event.target.value,
                  }))
                }
                placeholder="粘贴目标设备的 64 位机器指纹哈希"
              />
            </label>

            <label className="license-host__field">
              <span>备注</span>
              <textarea
                className="license-host__textarea license-host__textarea--compact"
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="可写客户名、用途、项目备注"
              />
            </label>

            <div className="license-host__quick-actions">
              <button
                type="button"
                className="sidebar-button sidebar-button--secondary"
                onClick={applyCurrentDevice}
              >
                <MonitorSmartphone size={14} />
                带入主机本机
              </button>
              <button
                type="button"
                className="sidebar-button sidebar-button--secondary"
                onClick={() =>
                  void handleCopy(
                    hostState.currentDevice.fingerprintHash,
                    '主机本机指纹已复制。',
                  )
                }
              >
                <Copy size={14} />
                复制主机本机指纹
              </button>
            </div>

            {currentDuration ? (
              <div className="license-host__hint">
                <Sparkles size={14} />
                本次将生成 {currentDuration.label} 授权码。客户设备的设备编号与机器指纹应先在客户端复制，再回到这里签发授权码。
              </div>
            ) : null}

            <button
              type="button"
              className="sidebar-button license-host__submit"
              onClick={handleIssue}
              disabled={busy === 'issuing'}
            >
              {busy === 'issuing' ? <RefreshCw size={14} className="spin" /> : <KeyRound size={14} />}
              {busy === 'issuing' ? '正在生成授权码' : '生成授权码'}
            </button>
          </section>

          <section className="license-host-card">
            <div className="license-host-card__header">
              <div className="license-host-card__icon">
                <KeyRound size={18} />
              </div>
              <div>
                <strong>主机输出</strong>
                <span>查看导出的公钥路径、最新授权码和最近签发记录。</span>
              </div>
            </div>

            <div className="license-host__meta-grid">
              <div className="license-host__meta-card">
                <span>公钥路径</span>
                <strong>{hostState.publicKeyPath || '待初始化'}</strong>
                <button
                  type="button"
                  className="sidebar-button sidebar-button--secondary"
                  onClick={() => void window.codexWorkspace.openPath(hostState.publicKeyPath)}
                  disabled={!hostState.publicKeyPath}
                >
                  <FolderOpen size={14} />
                  打开公钥目录
                </button>
              </div>

              <div className="license-host__meta-card">
                <span>主机存储</span>
                <strong>{hostState.storagePath || '待初始化'}</strong>
                <button
                  type="button"
                  className="sidebar-button sidebar-button--secondary"
                  onClick={() => void window.codexWorkspace.openPath(hostState.storagePath)}
                  disabled={!hostState.storagePath}
                >
                  <FolderOpen size={14} />
                  打开主机目录
                </button>
              </div>
            </div>

            <div className="license-host__output">
              <div className="license-host-card__subheader">
                <strong>最新生成的授权码</strong>
                <button
                  type="button"
                  className="sidebar-button sidebar-button--secondary"
                  onClick={() => void handleCopy(generatedCode, '授权码已复制。')}
                  disabled={!generatedCode}
                >
                  <Copy size={14} />
                  复制授权码
                </button>
              </div>
              <textarea
                className="license-host__textarea license-host__textarea--output"
                readOnly
                value={generatedCode}
                placeholder="生成后的签名授权码会显示在这里。"
              />
            </div>

            <div className="license-host__records">
              <div className="license-host-card__subheader">
                <div>
                  <strong>{recordSearch.trim() ? '搜索签发记录' : '最近签发记录'}</strong>
                  <span>
                    {recordSearch.trim()
                      ? `匹配 ${visibleRecords.length} 条 / 共 ${hostState.issuedCount} 条`
                      : `最近 ${hostState.recentRecords.length} 条 / 共 ${hostState.issuedCount} 条`}
                  </span>
                </div>
                <div className="license-host__record-search">
                  <Search size={14} />
                  <input
                    className="license-input"
                    value={recordSearch}
                    onChange={(event) => setRecordSearch(event.target.value)}
                    placeholder="搜索设备名 / 设备编号 / 指纹 / 备注"
                  />
                </div>
              </div>
              {recordSearchBusy ? (
                <div className="license-host__empty">正在搜索签发记录...</div>
              ) : visibleRecords.length > 0 ? (
                <div className="license-host__record-list">
                  {visibleRecords.map((record) => (
                    <article key={record.id} className="license-host__record-card">
                      <div className="license-host__record-row">
                        <strong>{record.targetLabel}</strong>
                        <span>{formatDateTime(record.createdAt)}</span>
                      </div>
                      <div className="license-host__record-row">
                        <span>{record.durationLabel}</span>
                        <span>{record.targetFingerprintSummary}</span>
                      </div>
                      <div className="license-host__record-code">{record.codePreview}</div>
                      {record.note ? (
                        <div className="license-host__record-note">{record.note}</div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="license-host__empty">
                  {recordSearch.trim()
                    ? '没有找到匹配的签发记录。可以改搜设备名、设备编号、指纹摘要或备注。'
                    : '当前还没有签发记录。先选择时长并为设备生成一枚授权码。'}
                </div>
              )}
            </div>
          </section>
        </div>

        {errorMessage ? <div className="license-host__banner is-error">{errorMessage}</div> : null}
        {toastMessage ? <div className="license-host__banner is-success">{toastMessage}</div> : null}
      </div>
    </div>
  );
}
