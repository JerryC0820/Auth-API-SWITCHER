import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fs from 'fs-extra';

const normalizeText = (value?: string | null): string => value?.trim() ?? '';

export const getUpdateCacheRoot = (userDataPath: string): string =>
  path.join(userDataPath, 'update-cache');

export const downloadUpdateArtifact = async (options: {
  url: string;
  userDataPath: string;
  channel: string;
  version: string;
  fileName: string;
}): Promise<string> => {
  const targetDir = path.join(
    getUpdateCacheRoot(options.userDataPath),
    options.channel,
    options.version,
  );
  const normalizedFileName = normalizeText(options.fileName) || `update-${options.version}.bin`;
  const targetPath = path.join(targetDir, normalizedFileName);
  const tempPath = `${targetPath}.download`;

  await fs.ensureDir(targetDir);
  await fs.remove(tempPath);

  const response = await fetch(options.url, { cache: 'no-store' });
  if (!response.ok || !response.body) {
    throw new Error(`下载更新包失败：HTTP ${response.status}`);
  }

  const writable = createWriteStream(tempPath);
  await pipeline(Readable.fromWeb(response.body as never), writable);
  await fs.move(tempPath, targetPath, { overwrite: true });
  return targetPath;
};
