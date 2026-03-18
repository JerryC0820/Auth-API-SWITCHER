import type {
  UpdateChannel,
  UpdateChannelOverride,
  UpdateManifest,
  UpdatePlatform,
  UpdateSourceName,
} from '../../shared/types';

export interface UpdateSourceCandidate {
  name: UpdateSourceName;
  url: string;
}

export interface ResolvedUpdateChannelState {
  channel: UpdateChannel;
  override: UpdateChannelOverride | null;
  allowPrerelease: boolean;
  testerId: string | null;
}

export interface UpdateRuntimeCache {
  lastCheckedAt: string | null;
  lastDownloadedAt: string | null;
  downloadFilePath: string | null;
}

export interface FetchedUpdateManifest {
  manifest: UpdateManifest;
  source: UpdateSourceCandidate;
}

export interface SelectedPlatformAsset {
  platform: UpdatePlatform;
  url: string | null;
  fileName: string;
  installMode: 'installer' | 'manual';
}
