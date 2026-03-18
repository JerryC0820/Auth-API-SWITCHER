import crypto from 'node:crypto';
import type {
  HostLicenseDurationKey,
  LicenseHostDurationOption,
  LicenseDurationKey,
} from '../../shared/types';
import { summarizeFingerprint } from './device-identity';

export interface LicenseDurationDefinition {
  key: HostLicenseDurationKey;
  label: string;
  description: string;
  days: number;
  permanent: boolean;
  licenseTypeLabel: string;
}

export interface SignedLicensePayload {
  version: 'aas-license-v1';
  issuerId: string;
  issuedAt: string;
  targetLabel: string;
  deviceFingerprintHash: string;
  deviceFingerprintSummary: string;
  deviceId: string | null;
  durationKey: HostLicenseDurationKey;
  licenseTypeLabel: string;
  permanent: boolean;
  expiresAt: string | null;
  note: string | null;
}

export interface VerifiedLicenseCode {
  payload: SignedLicensePayload;
  signature: string;
}

const LICENSE_CODE_PREFIX = 'AAS1';

const HOST_LICENSE_DURATION_DEFINITIONS: Record<HostLicenseDurationKey, LicenseDurationDefinition> = {
  'one-day': {
    key: 'one-day',
    label: '1 天',
    description: '适合短期测试或临时放行。',
    days: 1,
    permanent: false,
    licenseTypeLabel: '日授权',
  },
  'one-week': {
    key: 'one-week',
    label: '7 天',
    description: '适合小范围试用或排障阶段。',
    days: 7,
    permanent: false,
    licenseTypeLabel: '周授权',
  },
  'half-month': {
    key: 'half-month',
    label: '15 天',
    description: '适合短期项目或阶段性交付。',
    days: 15,
    permanent: false,
    licenseTypeLabel: '半月授权',
  },
  'one-month': {
    key: 'one-month',
    label: '30 天',
    description: '适合月度订阅或标准测试周期。',
    days: 30,
    permanent: false,
    licenseTypeLabel: '月度授权',
  },
  'half-year': {
    key: 'half-year',
    label: '180 天',
    description: '适合半年期授权或长期内测。',
    days: 180,
    permanent: false,
    licenseTypeLabel: '半年授权',
  },
  permanent: {
    key: 'permanent',
    label: '永久',
    description: '永久授权，不再计算到期时间。',
    days: 0,
    permanent: true,
    licenseTypeLabel: '永久授权',
  },
};

export const getHostLicenseDurationOptions = (): LicenseHostDurationOption[] =>
  (Object.values(HOST_LICENSE_DURATION_DEFINITIONS) as LicenseDurationDefinition[]).map((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
  }));

export const getHostLicenseDurationDefinition = (
  key: HostLicenseDurationKey,
): LicenseDurationDefinition => HOST_LICENSE_DURATION_DEFINITIONS[key];

export const toLicenseDurationKey = (key: HostLicenseDurationKey): LicenseDurationKey => key;

export const buildHostIdFromPublicKey = (publicKeyPem: string): string =>
  `HOST-${crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 8).toUpperCase()}`;

export const summarizePublicKey = (publicKeyPem: string): string =>
  crypto.createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 12).toUpperCase();

const encodePayload = (payload: SignedLicensePayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decodePayload = (raw: string): SignedLicensePayload => {
  const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as SignedLicensePayload;
  if (parsed.version !== 'aas-license-v1') {
    throw new Error('授权码版本不受支持。');
  }
  return parsed;
};

export const issueSignedLicenseCode = (
  privateKeyPem: string,
  payload: Omit<SignedLicensePayload, 'version' | 'deviceFingerprintSummary'>,
): string => {
  const normalized: SignedLicensePayload = {
    ...payload,
    version: 'aas-license-v1',
    deviceFingerprintSummary: summarizeFingerprint(payload.deviceFingerprintHash),
  };
  const encodedPayload = encodePayload(normalized);
  const signature = crypto
    .sign(null, Buffer.from(encodedPayload, 'utf8'), privateKeyPem)
    .toString('base64url');
  return `${LICENSE_CODE_PREFIX}.${encodedPayload}.${signature}`;
};

export const verifySignedLicenseCode = (
  code: string,
  publicKeyPem: string,
): VerifiedLicenseCode | null => {
  if (!code.startsWith(`${LICENSE_CODE_PREFIX}.`)) {
    return null;
  }

  const parts = code.split('.');
  if (parts.length !== 3) {
    throw new Error('授权码格式不正确。');
  }

  const [, encodedPayload, signature] = parts;
  const verified = crypto.verify(
    null,
    Buffer.from(encodedPayload, 'utf8'),
    publicKeyPem,
    Buffer.from(signature, 'base64url'),
  );

  if (!verified) {
    throw new Error('授权码签名校验失败。');
  }

  return {
    payload: decodePayload(encodedPayload),
    signature,
  };
};
