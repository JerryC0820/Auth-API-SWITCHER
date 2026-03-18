const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRceditPath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error('LOCALAPPDATA is not set.');
  }

  const cacheRoot = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign');
  const entries = await fs.readdir(cacheRoot, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('winCodeSign-'))
    .map((entry) => path.join(cacheRoot, entry.name, 'rcedit-x64.exe'));

  for (const candidate of candidates.reverse()) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate rcedit-x64.exe in the electron-builder cache.');
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const appInfo = context.packager.appInfo;
  const executablePath = path.join(context.appOutDir, `${appInfo.productFilename}.exe`);
  if (!(await exists(executablePath))) {
    return;
  }

  const iconPath = path.join(context.packager.buildResourcesDir, 'icon.ico');
  const args = [
    executablePath,
    '--set-version-string',
    'FileDescription',
    appInfo.productName,
    '--set-version-string',
    'ProductName',
    appInfo.productName,
    '--set-version-string',
    'LegalCopyright',
    appInfo.copyright || '',
    '--set-file-version',
    appInfo.shortVersion || appInfo.buildVersion,
    '--set-product-version',
    appInfo.shortVersionWindows || appInfo.getVersionInWeirdWindowsForm(),
    '--set-version-string',
    'InternalName',
    appInfo.productFilename,
    '--set-version-string',
    'OriginalFilename',
    '',
  ];

  if (await exists(iconPath)) {
    args.push('--set-icon', iconPath);
  }

  const rceditPath = await resolveRceditPath();
  let lastDetail = 'rcedit failed.';

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const result = spawnSync(rceditPath, args, {
      encoding: 'utf8',
      windowsHide: true,
    });

    if (!result.error && result.status === 0) {
      return;
    }

    lastDetail = (result.stderr || result.stdout || result.error?.message || 'rcedit failed.').trim();
    if (attempt < 12 && /Unable to commit changes/i.test(lastDetail)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    throw new Error(lastDetail);
  }

  throw new Error(lastDetail);
};
