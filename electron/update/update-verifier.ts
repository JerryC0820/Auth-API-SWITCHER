import crypto from 'node:crypto';
import fs from 'fs-extra';
import type { UpdateManifest } from '../../shared/types';

const normalizeText = (value?: string | null): string => value?.trim() ?? '';

const sortJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortJsonValue((value as Record<string, unknown>)[key]);
      return result;
    }, {});
};

const buildSignedManifestPayload = (manifest: UpdateManifest): string => {
  const { signature, ...unsignedManifest } = manifest;
  return JSON.stringify(sortJsonValue(unsignedManifest));
};

const toBufferFromSignature = (signature: string): Buffer => {
  const normalized = normalizeText(signature);
  if (!normalized) {
    throw new Error('manifest 缺少签名字段。');
  }

  try {
    return Buffer.from(normalized, 'base64');
  } catch {
    throw new Error('manifest 签名不是有效的 Base64 字符串。');
  }
};

export const verifyManifestSignature = (
  manifest: UpdateManifest,
  publicKeyPem: string,
): void => {
  const normalizedKey = normalizeText(publicKeyPem).replace(/\\n/g, '\n');
  if (!normalizedKey) {
    throw new Error('未配置 manifest 验签公钥。');
  }

  const publicKey = crypto.createPublicKey(normalizedKey);
  const signatureBuffer = toBufferFromSignature(manifest.signature);
  const payload = Buffer.from(buildSignedManifestPayload(manifest), 'utf8');
  const algorithm =
    publicKey.asymmetricKeyType === 'ed25519' || publicKey.asymmetricKeyType === 'ed448'
      ? null
      : 'sha256';

  const verified = crypto.verify(algorithm, payload, publicKey, signatureBuffer);
  if (!verified) {
    throw new Error('manifest 验签失败，已拒绝本次更新。');
  }
};

export const verifyFileSha256 = async (filePath: string, expectedSha256: string): Promise<void> => {
  const normalizedExpected = normalizeText(expectedSha256).toLowerCase();
  if (!normalizedExpected) {
    throw new Error('更新包缺少 SHA-256 校验值。');
  }

  const fileBuffer = await fs.readFile(filePath);
  const actualSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();
  if (actualSha256 !== normalizedExpected) {
    throw new Error('更新包 SHA-256 校验失败，已拒绝执行安装。');
  }
};
