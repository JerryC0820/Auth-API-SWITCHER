import path from 'node:path';
import { app, shell } from 'electron';
import fs from 'fs-extra';
import type { OpenPathResult, UpdateActionResult, UpdateManifest, UpdateState } from '../../shared/types';
import { downloadUpdateArtifact } from './update-downloader';
import { readResolvedUpdateChannelState } from './update-channel';
import {
  fetchSignedManifest,
  getManifestSourceCandidates,
  getManifestVerificationPublicKey,
  mapRuntimePlatform,
  selectPlatformAsset,
} from './update-manifest';
import { launchWindowsInstaller, revealDownloadedArtifact } from './update-installer';
import type { UpdateRuntimeCache } from './update-types';
import { verifyFileSha256 } from './update-verifier';

const UPDATE_RUNTIME_STATE_FILE_NAME = 'update-state.json';

const normalizeText = (value?: string | null): string => value?.trim() ?? '';

const normalizeIsoTime = (value?: string | null): string | null => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const compareReleaseTimes = (left?: string | null, right?: string | null): number => {
  const leftTime = normalizeIsoTime(left);
  const rightTime = normalizeIsoTime(right);
  if (!leftTime || !rightTime) {
    return 0;
  }

  return new Date(leftTime).getTime() - new Date(rightTime).getTime();
};

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  raw: string;
}

const parseVersion = (version: string): ParsedVersion => {
  const normalized = normalizeText(version).replace(/^v/i, '');
  const match =
    /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?$/.exec(normalized);

  if (!match) {
    return {
      major: 0,
      minor: 0,
      patch: 0,
      prerelease: normalized || null,
      raw: normalized,
    };
  }

  return {
    major: Number(match[1] ?? 0),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
    prerelease: normalizeText(match[4]) || null,
    raw: normalized,
  };
};

const comparePrerelease = (left: string | null, right: string | null): number => {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
};

const compareVersions = (leftVersion: string, rightVersion: string): number => {
  const left = parseVersion(leftVersion);
  const right = parseVersion(rightVersion);

  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  if (left.patch !== right.patch) {
    return left.patch - right.patch;
  }

  const prereleaseDiff = comparePrerelease(left.prerelease, right.prerelease);
  if (prereleaseDiff !== 0) {
    return prereleaseDiff;
  }

  return left.raw.localeCompare(right.raw, 'en', { numeric: true, sensitivity: 'base' });
};

const createInitialUpdateState = (appId: string): UpdateState => ({
  appId,
  currentVersion: app.getVersion(),
  currentReleaseTime: null,
  currentPlatform: mapRuntimePlatform(),
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

const readPackageReleaseTime = async (): Promise<string | null> => {
  const candidatePaths = [
    path.join(app.getAppPath(), 'package.json'),
    path.join(process.cwd(), 'package.json'),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      if (!(await fs.pathExists(candidatePath))) {
        continue;
      }

      const rawPackage = await fs.readJson(candidatePath);
      const releaseTime =
        normalizeText(rawPackage.releaseTime) ||
        normalizeText(rawPackage.build?.releaseTime) ||
        normalizeText(rawPackage.buildTime);

      if (releaseTime) {
        return normalizeIsoTime(releaseTime);
      }
    } catch {
      // Ignore malformed local package metadata and fall back to file timestamps.
    }
  }

  return null;
};

const readExecutableReleaseTime = async (): Promise<string | null> => {
  try {
    const stat = await fs.stat(app.getPath('exe'));
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
};

const resolveCurrentReleaseTime = async (): Promise<string | null> =>
  (await readPackageReleaseTime()) ?? (await readExecutableReleaseTime());

const createRuntimeCache = (): UpdateRuntimeCache => ({
  lastCheckedAt: null,
  lastDownloadedAt: null,
  downloadFilePath: null,
});

export class UpdateService {
  private state: UpdateState;
  private readonly runtimeStatePath: string;
  private readonly listeners = new Set<(state: UpdateState) => void>();
  private initialized = false;
  private startupCheckTimer: NodeJS.Timeout | null = null;
  private checkingPromise: Promise<UpdateActionResult> | null = null;
  private downloadPromise: Promise<UpdateActionResult> | null = null;

  constructor(private readonly appId: string) {
    this.state = createInitialUpdateState(appId);
    this.runtimeStatePath = path.join(app.getPath('userData'), UPDATE_RUNTIME_STATE_FILE_NAME);
  }

  private emitState(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setState(nextState: UpdateState): void {
    this.state = nextState;
    this.emitState();
  }

  private async readRuntimeCache(): Promise<UpdateRuntimeCache> {
    try {
      if (!(await fs.pathExists(this.runtimeStatePath))) {
        return createRuntimeCache();
      }

      const raw = await fs.readJson(this.runtimeStatePath);
      return {
        lastCheckedAt: normalizeIsoTime(raw.lastCheckedAt),
        lastDownloadedAt: normalizeIsoTime(raw.lastDownloadedAt),
        downloadFilePath: normalizeText(raw.downloadFilePath) || null,
      };
    } catch {
      return createRuntimeCache();
    }
  }

  private async writeRuntimeCache(): Promise<void> {
    await fs.writeJson(
      this.runtimeStatePath,
      {
        lastCheckedAt: this.state.lastCheckedAt,
        lastDownloadedAt: this.state.lastDownloadedAt,
        downloadFilePath: this.state.downloadFilePath,
      },
      { spaces: 2 },
    );
  }

  private getUnconfiguredMessage(channel = this.state.channel): string | null {
    if (!normalizeText(getManifestVerificationPublicKey())) {
      return '未配置 manifest 验签公钥。';
    }

    if (getManifestSourceCandidates(channel).length === 0) {
      return `渠道 ${channel} 还没有配置 manifest 源地址。`;
    }

    return null;
  }

  private async applyBaseState(): Promise<void> {
    const runtimeCache = await this.readRuntimeCache();
    const channelState = await readResolvedUpdateChannelState();
    const currentReleaseTime = await resolveCurrentReleaseTime();
    const unconfiguredMessage = this.getUnconfiguredMessage(channelState.channel);

    this.setState({
      ...this.state,
      appId: this.appId,
      currentVersion: app.getVersion(),
      currentReleaseTime,
      currentPlatform: mapRuntimePlatform(),
      channel: channelState.channel,
      override: channelState.override,
      allowPrerelease: channelState.allowPrerelease,
      testerId: channelState.testerId,
      lastCheckedAt: runtimeCache.lastCheckedAt,
      lastDownloadedAt: runtimeCache.lastDownloadedAt,
      downloadFilePath: runtimeCache.downloadFilePath,
      availability:
        unconfiguredMessage && this.state.availability === 'idle'
          ? 'unconfigured'
          : this.state.availability,
      errorMessage:
        unconfiguredMessage && this.state.availability === 'idle'
          ? unconfiguredMessage
          : this.state.errorMessage,
    });
  }

  async initialize(): Promise<UpdateState> {
    if (this.initialized) {
      return this.state;
    }

    await this.applyBaseState();
    this.initialized = true;
    return this.state;
  }

  subscribe(listener: (state: UpdateState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getState(): Promise<UpdateState> {
    await this.initialize();
    return this.state;
  }

  scheduleStartupCheck(delayMs = 12_000): void {
    if (this.startupCheckTimer) {
      clearTimeout(this.startupCheckTimer);
    }

    this.startupCheckTimer = setTimeout(() => {
      void this.checkForUpdates();
    }, delayMs);
  }

  private buildSuccessResult(message: string): UpdateActionResult {
    return {
      state: this.state,
      message,
    };
  }

  private evaluateManifest(manifest: UpdateManifest): {
    availability: UpdateState['availability'];
    updateAvailable: boolean;
    updateKind: UpdateState['updateKind'];
    blockedByMandatory: boolean;
    message: string;
  } {
    const remoteVersionDiff = compareVersions(manifest.version, this.state.currentVersion);
    const belowMinSupported =
      manifest.minSupportedVersion !== null &&
      compareVersions(this.state.currentVersion, manifest.minSupportedVersion) < 0;
    const sameVersionPatch =
      remoteVersionDiff === 0 &&
      compareReleaseTimes(manifest.releaseTime, this.state.currentReleaseTime) > 0;
    const updateAvailable = remoteVersionDiff > 0 || sameVersionPatch || belowMinSupported;
    const updateKind = remoteVersionDiff > 0 ? 'version' : sameVersionPatch ? 'patch' : null;
    const blockedByMandatory = belowMinSupported || (updateAvailable && manifest.mandatory);

    if (belowMinSupported) {
      return {
        availability: 'required',
        updateAvailable: true,
        updateKind: remoteVersionDiff > 0 ? 'version' : updateKind,
        blockedByMandatory: true,
        message: `当前版本过低，最低支持版本为 ${manifest.minSupportedVersion}。`,
      };
    }

    if (remoteVersionDiff > 0) {
      return {
        availability: manifest.mandatory ? 'required' : 'available',
        updateAvailable: true,
        updateKind: 'version',
        blockedByMandatory,
        message: `发现新版本 ${manifest.version}。`,
      };
    }

    if (sameVersionPatch) {
      return {
        availability: manifest.mandatory ? 'required' : 'available',
        updateAvailable: true,
        updateKind: 'patch',
        blockedByMandatory,
        message: `发现同版本新修复，可更新到 ${manifest.version}。`,
      };
    }

    return {
      availability: 'up-to-date',
      updateAvailable: false,
      updateKind: null,
      blockedByMandatory: false,
      message: '当前已是最新版本。',
    };
  }

  async checkForUpdates(): Promise<UpdateActionResult> {
    await this.initialize();

    if (this.checkingPromise) {
      return this.checkingPromise;
    }

    this.checkingPromise = this.performCheckForUpdates().finally(() => {
      this.checkingPromise = null;
    });

    return this.checkingPromise;
  }

  private async performCheckForUpdates(): Promise<UpdateActionResult> {
    const channelState = await readResolvedUpdateChannelState();
    const unconfiguredMessage = this.getUnconfiguredMessage(channelState.channel);

    this.setState({
      ...this.state,
      channel: channelState.channel,
      override: channelState.override,
      allowPrerelease: channelState.allowPrerelease,
      testerId: channelState.testerId,
      availability: unconfiguredMessage ? 'unconfigured' : 'checking',
      errorMessage: unconfiguredMessage,
    });

    if (unconfiguredMessage) {
      return this.buildSuccessResult(unconfiguredMessage);
    }

    try {
      const { manifest, source } = await fetchSignedManifest(
        channelState.channel,
        getManifestVerificationPublicKey(),
      );

      if (manifest.appId !== this.appId) {
        throw new Error(`manifest appId 不匹配：${manifest.appId}`);
      }

      const asset = selectPlatformAsset(manifest, this.state.currentPlatform);
      const evaluation = this.evaluateManifest(manifest);
      if (evaluation.updateAvailable && !asset.url) {
        throw new Error('当前平台暂未提供可用的更新包。');
      }

      const lastCheckedAt = new Date().toISOString();
      this.setState({
        ...this.state,
        availability: evaluation.availability,
        updateAvailable: evaluation.updateAvailable,
        updateKind: evaluation.updateKind,
        blockedByMandatory: evaluation.blockedByMandatory,
        mandatory: manifest.mandatory,
        minSupportedVersion: manifest.minSupportedVersion,
        lastCheckedAt,
        sourceName: source.name,
        sourceUrl: source.url,
        errorMessage: null,
        manifest,
        downloadFilePath:
          this.state.downloadFilePath &&
          this.state.manifest?.version === manifest.version &&
          this.state.manifest?.releaseTime === manifest.releaseTime
            ? this.state.downloadFilePath
            : null,
      });

      await this.writeRuntimeCache();
      return this.buildSuccessResult(evaluation.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查更新失败。';
      this.setState({
        ...this.state,
        availability: 'error',
        updateAvailable: false,
        updateKind: null,
        blockedByMandatory: false,
        errorMessage: message,
        sourceName: null,
        sourceUrl: null,
      });

      return this.buildSuccessResult(message);
    }
  }

  async downloadAndInstallUpdate(): Promise<UpdateActionResult> {
    await this.initialize();

    if (this.downloadPromise) {
      return this.downloadPromise;
    }

    this.downloadPromise = this.performDownloadAndInstall().finally(() => {
      this.downloadPromise = null;
    });

    return this.downloadPromise;
  }

  private async performDownloadAndInstall(): Promise<UpdateActionResult> {
    if (!this.state.manifest || !this.state.updateAvailable) {
      const checkResult = await this.checkForUpdates();
      if (!checkResult.state.manifest || !checkResult.state.updateAvailable) {
        return checkResult;
      }
    }

    const manifest = this.state.manifest as UpdateManifest;
    const asset = selectPlatformAsset(manifest, this.state.currentPlatform);
    if (!asset.url) {
      throw new Error('当前平台没有可下载的更新包。');
    }

    this.setState({
      ...this.state,
      availability: 'downloading',
      errorMessage: null,
    });

    const filePath = await downloadUpdateArtifact({
      url: asset.url,
      userDataPath: app.getPath('userData'),
      channel: this.state.channel,
      version: manifest.version,
      fileName: asset.fileName,
    });

    try {
      await verifyFileSha256(filePath, manifest.sha256);
    } catch (error) {
      await fs.remove(filePath);
      throw error;
    }

    const lastDownloadedAt = new Date().toISOString();
    this.setState({
      ...this.state,
      availability: 'ready',
      lastDownloadedAt,
      downloadFilePath: filePath,
      errorMessage: null,
    });

    await this.writeRuntimeCache();

    if (asset.installMode === 'installer' && this.state.currentPlatform === 'win') {
      launchWindowsInstaller(filePath);
      return this.buildSuccessResult('更新安装器已校验通过，应用即将退出并启动安装。');
    }

    await revealDownloadedArtifact(filePath);
    return this.buildSuccessResult('更新包已下载完成，请按引导手动完成替换安装。');
  }

  async openUpdateNotes(): Promise<OpenPathResult> {
    await this.initialize();

    const targetUrl =
      this.state.manifest?.notesUrl ?? this.state.sourceUrl ?? this.state.manifest?.mirrors.github ?? null;
    if (!targetUrl) {
      return {
        ok: false,
        error: '当前没有可打开的更新说明链接。',
      };
    }

    try {
      await shell.openExternal(targetUrl);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '打开更新说明失败。',
      };
    }
  }
}
