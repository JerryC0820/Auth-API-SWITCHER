import crypto from 'node:crypto';
import os from 'node:os';
import type { DeviceIdentity } from '../../shared/types';

const formatPlatformLabel = (): string => {
  switch (process.platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Unknown';
  }
};

export const summarizeFingerprint = (hash: string): string =>
  hash
    .slice(0, 12)
    .toUpperCase()
    .match(/.{1,4}/g)
    ?.join('-') ?? 'UNKN-OWNS-IGN';

export const buildDeviceIdentity = (): DeviceIdentity => {
  const source = [
    os.hostname(),
    os.userInfo().username,
    process.platform,
    process.arch,
    os.release(),
  ].join('|');
  const fingerprintHash = crypto.createHash('sha256').update(source).digest('hex');
  const fingerprintSummary = summarizeFingerprint(fingerprintHash);
  const deviceId = `DEV-${fingerprintHash.slice(0, 8).toUpperCase()}`;

  return {
    deviceId,
    fingerprintHash,
    fingerprintSummary,
    hostLabel: os.hostname(),
    platformLabel: formatPlatformLabel(),
    machineName: `${formatPlatformLabel()} / ${process.arch}`,
  };
};
