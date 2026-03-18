import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const buildDir = path.join(projectRoot, 'build');
const sourcePngPath = path.join(projectRoot, 'public', 'assets', 'icons', 'openai.png');
const fallbackPngPath = path.join(projectRoot, 'openai.png');

const ensurePngSource = async () => {
  for (const candidate of [sourcePngPath, fallbackPngPath]) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile() && stat.size > 0) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('未找到可用的 openai.png，无法生成 build 图标资源。');
};

const readPngDimensions = (buffer) => {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('图标源文件不是有效 PNG。');
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const buildIcoFromPng = (pngBuffer) => {
  const { width, height } = readPngDimensions(pngBuffer);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directoryEntry = Buffer.alloc(16);
  directoryEntry.writeUInt8(width >= 256 ? 0 : width, 0);
  directoryEntry.writeUInt8(height >= 256 ? 0 : height, 1);
  directoryEntry.writeUInt8(0, 2);
  directoryEntry.writeUInt8(0, 3);
  directoryEntry.writeUInt16LE(1, 4);
  directoryEntry.writeUInt16LE(32, 6);
  directoryEntry.writeUInt32LE(pngBuffer.length, 8);
  directoryEntry.writeUInt32LE(header.length + directoryEntry.length, 12);

  return Buffer.concat([header, directoryEntry, pngBuffer]);
};

const tryBuildIcoWithMagick = async (sourcePath, targetPath) => {
  const probe = spawnSync('magick', ['-version'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (probe.error || probe.status !== 0) {
    return false;
  }

  const result = spawnSync(
    'magick',
    [
      sourcePath,
      '-background',
      'none',
      '-define',
      'icon:auto-resize=256,128,64,48,32,16',
      targetPath,
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || 'ImageMagick icon conversion failed.';
    throw new Error(detail.trim());
  }

  return true;
};

const writeDefaultLicense = async () => {
  const licensePath = path.join(buildDir, 'license.txt');
  try {
    await fs.access(licensePath);
  } catch {
    await fs.writeFile(
      licensePath,
      [
        'Auth API Switcher',
        '',
        'Temporary placeholder license file.',
        'Replace build/license.txt with your final EULA or license text before release.',
      ].join('\n'),
      'utf8',
    );
  }
};

const main = async () => {
  await fs.mkdir(buildDir, { recursive: true });
  const source = await ensurePngSource();
  const pngBuffer = await fs.readFile(source);

  await fs.writeFile(path.join(buildDir, 'icon.png'), pngBuffer);
  const iconIcoPath = path.join(buildDir, 'icon.ico');
  const usedMagick = await tryBuildIcoWithMagick(source, iconIcoPath);
  const icoBuffer = usedMagick
    ? await fs.readFile(iconIcoPath)
    : buildIcoFromPng(pngBuffer);

  if (!usedMagick) {
    await fs.writeFile(iconIcoPath, icoBuffer);
  }

  await fs.writeFile(path.join(buildDir, 'installerIcon.ico'), icoBuffer);
  await fs.writeFile(path.join(buildDir, 'uninstallerIcon.ico'), icoBuffer);
  await fs.writeFile(path.join(buildDir, 'installerHeaderIcon.ico'), icoBuffer);
  await writeDefaultLicense();

  console.log(
    `Prepared build resources from ${path.relative(projectRoot, source)} (${usedMagick ? 'magick ico' : 'png ico fallback'})`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
