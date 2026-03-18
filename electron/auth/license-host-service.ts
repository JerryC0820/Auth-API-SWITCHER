import crypto from 'node:crypto';
import path from 'node:path';
import { app } from 'electron';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import type {
  HostLicenseDurationKey,
  IssueLicenseCodeInput,
  LicenseHostActionResult,
  LicenseHostIssuedRecord,
  LicenseHostRecordsResult,
  LicenseHostState,
} from '../../shared/types';
import { buildDeviceIdentity, summarizeFingerprint } from './device-identity';
import {
  buildHostIdFromPublicKey,
  getHostLicenseDurationDefinition,
  getHostLicenseDurationOptions,
  issueSignedLicenseCode,
  summarizePublicKey,
} from './license-code';

interface StoredHostKeys {
  createdAt: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface StoredHostDb {
  hostName: string;
  records: LicenseHostIssuedRecord[];
}

const LICENSE_HOST_DIR = 'license-host';
const CANONICAL_LICENSE_HOST_APP_DIR = 'codex-workspace-switcher';
const LEGACY_STANDALONE_LICENSE_HOST_APP_DIR = 'codex-workspace-switcher-license-host';
const HOST_KEYS_FILE = 'host-keys.json';
const HOST_DB_FILE = 'host-db.json';
const HOST_PUBLIC_KEY_FILE = 'public-key.pem';
const RECENT_RECORD_LIMIT = 12;

const normalizeFingerprintHash = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-f0-9]/g, '');

const getCanonicalLicenseHostRootPath = (): string =>
  path.join(app.getPath('appData'), CANONICAL_LICENSE_HOST_APP_DIR, LICENSE_HOST_DIR);

const getLegacyStandaloneLicenseHostRootPath = (): string =>
  path.join(app.getPath('appData'), LEGACY_STANDALONE_LICENSE_HOST_APP_DIR, LICENSE_HOST_DIR);

const getLicenseHostRootPath = (): string => getCanonicalLicenseHostRootPath();

const getLicenseHostPublicKeyPath = (): string =>
  path.join(getLicenseHostRootPath(), HOST_PUBLIC_KEY_FILE);

const getHostKeysPath = (): string => path.join(getLicenseHostRootPath(), HOST_KEYS_FILE);

const getHostDbPath = (): string => path.join(getLicenseHostRootPath(), HOST_DB_FILE);

const getHostKeysPathForRoot = (rootPath: string): string => path.join(rootPath, HOST_KEYS_FILE);

const getHostDbPathForRoot = (rootPath: string): string => path.join(rootPath, HOST_DB_FILE);

const getHostPublicKeyPathForRoot = (rootPath: string): string =>
  path.join(rootPath, HOST_PUBLIC_KEY_FILE);

const ensureHostKeys = async (): Promise<StoredHostKeys> => {
  const hostKeysPath = getHostKeysPath();
  if (await fs.pathExists(hostKeysPath)) {
    return (await fs.readJson(hostKeysPath)) as StoredHostKeys;
  }

  const pair = crypto.generateKeyPairSync('ed25519');
  const nextKeys: StoredHostKeys = {
    createdAt: new Date().toISOString(),
    publicKeyPem: pair.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    privateKeyPem: pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  };

  await fs.ensureDir(getLicenseHostRootPath());
  await fs.writeJson(hostKeysPath, nextKeys, { spaces: 2 });
  await fs.writeFile(getLicenseHostPublicKeyPath(), nextKeys.publicKeyPem, 'utf8');
  return nextKeys;
};

const readHostKeysFromRoot = async (rootPath: string): Promise<StoredHostKeys | null> => {
  const hostKeysPath = getHostKeysPathForRoot(rootPath);
  if (!(await fs.pathExists(hostKeysPath))) {
    return null;
  }

  return (await fs.readJson(hostKeysPath)) as StoredHostKeys;
};

const ensureHostDb = async (): Promise<StoredHostDb> => {
  const hostDbPath = getHostDbPath();
  if (await fs.pathExists(hostDbPath)) {
    return (await fs.readJson(hostDbPath)) as StoredHostDb;
  }

  const nextDb: StoredHostDb = {
    hostName: '本地授权主机',
    records: [],
  };
  await fs.ensureDir(getLicenseHostRootPath());
  await fs.writeJson(hostDbPath, nextDb, { spaces: 2 });
  return nextDb;
};

const readHostDbFromRoot = async (rootPath: string): Promise<StoredHostDb | null> => {
  const hostDbPath = getHostDbPathForRoot(rootPath);
  if (!(await fs.pathExists(hostDbPath))) {
    return null;
  }

  return (await fs.readJson(hostDbPath)) as StoredHostDb;
};

const mergeHostRecords = (records: LicenseHostIssuedRecord[]): LicenseHostIssuedRecord[] => {
  const seen = new Set<string>();
  const merged: LicenseHostIssuedRecord[] = [];

  for (const record of records) {
    const identity = [
      record.id,
      record.createdAt,
      record.targetLabel,
      record.targetDeviceId ?? '',
      record.targetFingerprintSummary,
      record.durationKey,
      record.codePreview,
    ].join('|');

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    merged.push(record);
  }

  return merged.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const maybeMigrateLegacyStandaloneHostData = async (): Promise<void> => {
  const canonicalRoot = getCanonicalLicenseHostRootPath();
  const legacyRoot = getLegacyStandaloneLicenseHostRootPath();

  if (canonicalRoot === legacyRoot || !(await fs.pathExists(legacyRoot))) {
    return;
  }

  const [canonicalKeys, legacyKeys, canonicalDb, legacyDb] = await Promise.all([
    readHostKeysFromRoot(canonicalRoot),
    readHostKeysFromRoot(legacyRoot),
    readHostDbFromRoot(canonicalRoot),
    readHostDbFromRoot(legacyRoot),
  ]);

  if (!legacyKeys && !legacyDb) {
    return;
  }

  await fs.ensureDir(canonicalRoot);

  if (!canonicalKeys && legacyKeys) {
    await fs.writeJson(getHostKeysPathForRoot(canonicalRoot), legacyKeys, { spaces: 2 });
    await fs.writeFile(
      getHostPublicKeyPathForRoot(canonicalRoot),
      legacyKeys.publicKeyPem,
      'utf8',
    );
  }

  const mergedDb: StoredHostDb = {
    hostName:
      canonicalDb?.hostName ||
      legacyDb?.hostName ||
      '本地授权主机',
    records: mergeHostRecords([...(canonicalDb?.records ?? []), ...(legacyDb?.records ?? [])]),
  };

  if (!canonicalDb || mergedDb.records.length !== canonicalDb.records.length) {
    await fs.writeJson(getHostDbPathForRoot(canonicalRoot), mergedDb, { spaces: 2 });
  }
};

const persistHostDb = async (db: StoredHostDb): Promise<void> => {
  await fs.ensureDir(getLicenseHostRootPath());
  await fs.writeJson(getHostDbPath(), db, { spaces: 2 });
};

const buildState = (keys: StoredHostKeys, db: StoredHostDb): LicenseHostState => ({
  initialized: true,
  hostId: buildHostIdFromPublicKey(keys.publicKeyPem),
  hostName: db.hostName,
  hostCreatedAt: keys.createdAt,
  publicKeySummary: summarizePublicKey(keys.publicKeyPem),
  publicKeyPem: keys.publicKeyPem,
  publicKeyPath: getLicenseHostPublicKeyPath(),
  storagePath: getLicenseHostRootPath(),
  currentDevice: buildDeviceIdentity(),
  lastIssuedAt: db.records[0]?.createdAt ?? null,
  issuedCount: db.records.length,
  supportedDurations: getHostLicenseDurationOptions(),
  recentRecords: db.records.slice(0, RECENT_RECORD_LIMIT),
});

export const readLocalLicenseHostPublicKey = async (): Promise<string | null> => {
  const publicKeyPath = getLicenseHostPublicKeyPath();
  if (!(await fs.pathExists(publicKeyPath))) {
    return null;
  }

  const content = await fs.readFile(publicKeyPath, 'utf8');
  return content.trim() || null;
};

export class LicenseHostService {
  private keys: StoredHostKeys | null = null;

  private db: StoredHostDb | null = null;

  async initialize(): Promise<void> {
    if (this.keys && this.db) {
      return;
    }

    await maybeMigrateLegacyStandaloneHostData();
    this.keys = await ensureHostKeys();
    this.db = await ensureHostDb();
  }

  async getState(): Promise<LicenseHostState> {
    await this.ensureReady();
    return buildState(this.keys as StoredHostKeys, this.db as StoredHostDb);
  }

  async issueCode(input: IssueLicenseCodeInput): Promise<LicenseHostActionResult> {
    await this.ensureReady();
    const fingerprintHash = normalizeFingerprintHash(input.deviceFingerprintHash);
    if (fingerprintHash.length !== 64) {
      throw new Error('机器指纹格式不正确，请粘贴完整的 64 位指纹哈希。');
    }

    const targetLabel = input.targetLabel.trim() || input.deviceId?.trim() || '未命名设备';
    const duration = getHostLicenseDurationDefinition(input.durationKey as HostLicenseDurationKey);
    const issuedAt = new Date().toISOString();
    const expiresAt = duration.permanent
      ? null
      : new Date(Date.now() + duration.days * 24 * 60 * 60 * 1000).toISOString();
    const code = issueSignedLicenseCode((this.keys as StoredHostKeys).privateKeyPem, {
      issuerId: buildHostIdFromPublicKey((this.keys as StoredHostKeys).publicKeyPem),
      issuedAt,
      targetLabel,
      deviceFingerprintHash: fingerprintHash,
      deviceId: input.deviceId?.trim() || null,
      durationKey: duration.key,
      licenseTypeLabel: duration.licenseTypeLabel,
      permanent: duration.permanent,
      expiresAt,
      note: input.note?.trim() || null,
    });

    const nextRecord: LicenseHostIssuedRecord = {
      id: nanoid(10),
      createdAt: issuedAt,
      targetLabel,
      targetDeviceId: input.deviceId?.trim() || null,
      targetFingerprintSummary: summarizeFingerprint(fingerprintHash),
      durationKey: duration.key,
      durationLabel: duration.licenseTypeLabel,
      note: input.note?.trim() || null,
      codePreview: `${code.slice(0, 18)}...${code.slice(-10)}`,
    };

    this.db = {
      ...(this.db as StoredHostDb),
      records: mergeHostRecords([nextRecord, ...(this.db as StoredHostDb).records]),
    };
    await persistHostDb(this.db);

    return {
      state: buildState(this.keys as StoredHostKeys, this.db),
      message: duration.permanent
        ? `已为 ${targetLabel} 生成永久授权码。`
        : `已为 ${targetLabel} 生成 ${duration.label} 授权码。`,
      generatedCode: code,
    };
  }

  async searchRecords(query: string): Promise<LicenseHostRecordsResult> {
    await this.ensureReady();
    const normalizedQuery = query.trim().toLowerCase();
    const records = (this.db as StoredHostDb).records.filter((record) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        record.targetLabel,
        record.targetDeviceId ?? '',
        record.targetFingerprintSummary,
        record.durationLabel,
        record.note ?? '',
        record.codePreview,
        record.createdAt,
      ]
        .join('\n')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return {
      query,
      records,
      totalCount: (this.db as StoredHostDb).records.length,
    };
  }

  private async ensureReady(): Promise<void> {
    if (!this.keys || !this.db) {
      await this.initialize();
    }
  }
}
