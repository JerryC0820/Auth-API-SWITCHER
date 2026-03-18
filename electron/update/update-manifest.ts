import path from 'node:path';
import type {
  UpdateChannel,
  UpdateManifest,
  UpdatePlatform,
  UpdateSourceName,
} from '../../shared/types';
import type {
  FetchedUpdateManifest,
  SelectedPlatformAsset,
  UpdateSourceCandidate,
} from './update-types';
import { verifyManifestSignature } from './update-verifier';

const normalizeText = (value?: string | null): string => value?.trim() ?? '';

const parseUrlList = (value?: string | null): string[] =>
  normalizeText(value)
    .split(/[\r\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const toSourceName = (url: string): UpdateSourceName => {
  const normalizedUrl = url.toLowerCase();
  if (normalizedUrl.includes('gitee.com')) {
    return 'gitee';
  }

  if (normalizedUrl.includes('github.com') || normalizedUrl.includes('githubusercontent.com')) {
    return 'github';
  }

  return 'custom';
};

const uniqueSources = (sources: UpdateSourceCandidate[]): UpdateSourceCandidate[] => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = source.url.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getBaseUrlCandidates = (channel: UpdateChannel): UpdateSourceCandidate[] => {
  const baseUrls = parseUrlList(
    process.env.CODEX_WORKSPACE_UPDATE_BASE_URLS ?? process.env.CWS_UPDATE_BASE_URLS,
  );

  return baseUrls.map((baseUrl) => ({
    name: toSourceName(baseUrl),
    url: `${baseUrl.replace(/\/+$/, '')}/${channel}/latest.json`,
  }));
};

export const getManifestSourceCandidates = (channel: UpdateChannel): UpdateSourceCandidate[] => {
  const upperChannel = channel.toUpperCase();
  const channelSpecific = parseUrlList(
    process.env[`CODEX_WORKSPACE_UPDATE_${upperChannel}_URLS`] ??
      process.env[`CWS_UPDATE_${upperChannel}_URLS`],
  ).map((url) => ({
    name: toSourceName(url),
    url,
  }));

  return uniqueSources([...channelSpecific, ...getBaseUrlCandidates(channel)]);
};

export const getManifestVerificationPublicKey = (): string =>
  normalizeText(process.env.CODEX_WORKSPACE_UPDATE_PUBLIC_KEY ?? process.env.CWS_UPDATE_PUBLIC_KEY);

const asStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
};

const asBoolean = (value: unknown): boolean => value === true;

const parsePlatforms = (value: unknown): UpdateManifest['platforms'] => {
  if (!value || typeof value !== 'object') {
    throw new Error('manifest 缺少 platforms 定义。');
  }

  const raw = value as Record<string, unknown>;
  const rawWin = raw.win as Record<string, unknown> | undefined;
  const rawMac = raw.mac as Record<string, unknown> | undefined;

  return {
    win: rawWin?.installerUrl
      ? {
          installerUrl: String(rawWin.installerUrl),
          portableUrl: asStringOrNull(rawWin.portableUrl),
        }
      : undefined,
    mac: rawMac?.dmgUrl
      ? {
          dmgUrl: String(rawMac.dmgUrl),
          zipUrl: asStringOrNull(rawMac.zipUrl),
        }
      : undefined,
  };
};

const normalizeManifest = (value: unknown): UpdateManifest => {
  if (!value || typeof value !== 'object') {
    throw new Error('manifest 不是有效的 JSON 对象。');
  }

  const raw = value as Record<string, unknown>;
  const appId = asStringOrNull(raw.appId);
  const channel = asStringOrNull(raw.channel);
  const version = asStringOrNull(raw.version);
  const releaseTime = asStringOrNull(raw.releaseTime);
  const sha256 = asStringOrNull(raw.sha256);
  const signature = asStringOrNull(raw.signature);

  if (!appId || !channel || !version || !releaseTime || !sha256 || !signature) {
    throw new Error('manifest 缺少必要字段。');
  }

  return {
    appId,
    channel: channel as UpdateChannel,
    version,
    minSupportedVersion: asStringOrNull(raw.minSupportedVersion),
    mandatory: asBoolean(raw.mandatory),
    releaseTime,
    notes: asStringOrNull(raw.notes),
    notesUrl: asStringOrNull(raw.notesUrl),
    sha256,
    signature,
    mirrors:
      raw.mirrors && typeof raw.mirrors === 'object'
        ? {
            github: asStringOrNull((raw.mirrors as Record<string, unknown>).github),
            gitee: asStringOrNull((raw.mirrors as Record<string, unknown>).gitee),
          }
        : {},
    platforms: parsePlatforms(raw.platforms),
  };
};

export const fetchSignedManifest = async (
  channel: UpdateChannel,
  publicKeyPem: string,
): Promise<FetchedUpdateManifest> => {
  const sources = getManifestSourceCandidates(channel);
  if (sources.length === 0) {
    throw new Error(`渠道 ${channel} 还没有配置 manifest 源地址。`);
  }

  let lastErrorMessage = '';

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = normalizeManifest(await response.json());
      verifyManifestSignature(payload, publicKeyPem);
      return {
        manifest: payload,
        source,
      };
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : '未知错误';
    }
  }

  throw new Error(`更新清单拉取失败：${lastErrorMessage || '没有可用的更新源。'}`);
};

export const mapRuntimePlatform = (): UpdatePlatform => {
  if (process.platform === 'win32') {
    return 'win';
  }

  if (process.platform === 'darwin') {
    return 'mac';
  }

  return 'unknown';
};

export const selectPlatformAsset = (
  manifest: UpdateManifest,
  platform: UpdatePlatform,
): SelectedPlatformAsset => {
  if (platform === 'win') {
    const url = manifest.platforms.win?.installerUrl ?? null;
    const fileNameFromUrl = url ? path.basename(new URL(url).pathname) : '';
    return {
      platform,
      url,
      fileName: fileNameFromUrl || `installer-${manifest.version}.exe`,
      installMode: 'installer',
    };
  }

  if (platform === 'mac') {
    const url = manifest.platforms.mac?.dmgUrl ?? manifest.platforms.mac?.zipUrl ?? null;
    const fileNameFromUrl = url ? path.basename(new URL(url).pathname) : '';
    return {
      platform,
      url,
      fileName: fileNameFromUrl || `installer-${manifest.version}.dmg`,
      installMode: 'manual',
    };
  }

  return {
    platform,
    url: null,
    fileName: `update-${manifest.version}.bin`,
    installMode: 'manual',
  };
};
