import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    channel: 'stable',
    mandatory: false,
    minSupportedVersion: '',
    baseUrl: process.env.AUTH_SWITCHER_RELEASE_BASE_URL ?? '',
    githubBaseUrl: process.env.AUTH_SWITCHER_RELEASE_GITHUB_BASE_URL ?? '',
    giteeBaseUrl: process.env.AUTH_SWITCHER_RELEASE_GITEE_BASE_URL ?? '',
    notesBaseUrl: process.env.AUTH_SWITCHER_RELEASE_NOTES_BASE_URL ?? '',
    releaseTime: new Date().toISOString(),
    signature: process.env.AUTH_SWITCHER_UPDATE_SIGNATURE ?? '',
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    const next = args[index + 1];
    if (current === '--channel' && next) {
      options.channel = next;
      index += 1;
    } else if (current === '--mandatory') {
      options.mandatory = true;
    } else if (current === '--min-supported-version' && next) {
      options.minSupportedVersion = next;
      index += 1;
    } else if (current === '--base-url' && next) {
      options.baseUrl = next;
      index += 1;
    } else if (current === '--github-base-url' && next) {
      options.githubBaseUrl = next;
      index += 1;
    } else if (current === '--gitee-base-url' && next) {
      options.giteeBaseUrl = next;
      index += 1;
    } else if (current === '--notes-base-url' && next) {
      options.notesBaseUrl = next;
      index += 1;
    } else if (current === '--release-time' && next) {
      options.releaseTime = next;
      index += 1;
    } else if (current === '--signature' && next) {
      options.signature = next;
      index += 1;
    }
  }

  return options;
};

const ensureTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);

const toPosixRelative = (targetPath) =>
  path.relative(projectRoot, targetPath).split(path.sep).join('/');

const toPublicUrl = (relativePath, baseUrl) => {
  const cleanRelative = relativePath.replace(/^\.?\//, '');
  if (!baseUrl) {
    return cleanRelative;
  }

  return new URL(cleanRelative, ensureTrailingSlash(baseUrl)).toString();
};

const hashFile = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
};

const readPackageJson = async () => {
  const packagePath = path.join(projectRoot, 'package.json');
  const raw = await fs.readFile(packagePath, 'utf8');
  return JSON.parse(raw);
};

const findArtifacts = async (directoryPath, extensions) => {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const fullPath = path.join(directoryPath, entry.name);
          const stat = await fs.stat(fullPath);
          return { fullPath, name: entry.name, stat };
        }),
    );

    return files
      .filter((file) => extensions.some((extension) => file.name.toLowerCase().endsWith(extension)))
      .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
  } catch {
    return [];
  }
};

const writeChecksums = async (targetPath, entries) => {
  if (entries.length === 0) {
    return;
  }

  const content = entries.map((entry) => `${entry.sha256}  ${entry.relativePath}`).join('\n');
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${content}\n`, 'utf8');
};

const main = async () => {
  const options = parseArgs();
  const pkg = await readPackageJson();
  const version = pkg.version;
  const appId = pkg.build?.appId ?? pkg.name;
  const minSupportedVersion = options.minSupportedVersion || version;

  const winArtifacts = await findArtifacts(path.join(projectRoot, 'release-artifacts', 'win'), ['.exe', '.zip']);
  const macArtifacts = await findArtifacts(path.join(projectRoot, 'release-artifacts', 'mac'), ['.dmg', '.zip']);

  const winInstaller = winArtifacts.find((item) => item.name.toLowerCase().endsWith('.exe')) ?? null;
  const winPortable = winArtifacts.find((item) => item.name.toLowerCase().endsWith('.zip')) ?? null;
  const macDmg = macArtifacts.find((item) => item.name.toLowerCase().endsWith('.dmg')) ?? null;
  const macZip = macArtifacts.find((item) => item.name.toLowerCase().endsWith('.zip')) ?? null;

  if (!winInstaller && !macDmg && !macZip) {
    throw new Error('release-artifacts 下未找到可用产物，无法生成 latest.json。');
  }

  const checksumEntries = [];
  for (const artifact of [winInstaller, winPortable, macDmg, macZip].filter(Boolean)) {
    const sha256 = await hashFile(artifact.fullPath);
    checksumEntries.push({
      sha256,
      relativePath: toPosixRelative(artifact.fullPath),
    });
    artifact.sha256 = sha256;
  }

  const notesDirectory = path.join(projectRoot, 'release-notes');
  const notesPath = path.join(notesDirectory, `${version}.md`);
  try {
    await fs.access(notesPath);
  } catch {
    await fs.mkdir(notesDirectory, { recursive: true });
    await fs.writeFile(
      notesPath,
      [`# ${version}`, '', '- TODO: add release notes here.'].join('\n'),
      'utf8',
    );
  }

  await writeChecksums(path.join(projectRoot, 'release-artifacts', 'checksums.txt'), checksumEntries);

  const manifest = {
    appId,
    channel: options.channel,
    version,
    minSupportedVersion,
    mandatory: options.mandatory,
    releaseTime: options.releaseTime,
    notes: `Release ${version}`,
    notesUrl: toPublicUrl(toPosixRelative(notesPath), options.notesBaseUrl || options.baseUrl),
    sha256:
      winInstaller?.sha256 ??
      macDmg?.sha256 ??
      macZip?.sha256 ??
      winPortable?.sha256 ??
      '',
    signature: options.signature,
    mirrors: {
      github: options.githubBaseUrl ? ensureTrailingSlash(options.githubBaseUrl) : null,
      gitee: options.giteeBaseUrl ? ensureTrailingSlash(options.giteeBaseUrl) : null,
    },
    platforms: {
      ...(winInstaller
        ? {
            win: {
              installerUrl: toPublicUrl(
                toPosixRelative(winInstaller.fullPath),
                options.baseUrl,
              ),
              portableUrl: winPortable
                ? toPublicUrl(toPosixRelative(winPortable.fullPath), options.baseUrl)
                : null,
              sha256: winInstaller.sha256,
            },
          }
        : {}),
      ...((macDmg || macZip)
        ? {
            mac: {
              dmgUrl: macDmg
                ? toPublicUrl(toPosixRelative(macDmg.fullPath), options.baseUrl)
                : '',
              zipUrl: macZip
                ? toPublicUrl(toPosixRelative(macZip.fullPath), options.baseUrl)
                : null,
              sha256: macDmg?.sha256 ?? macZip?.sha256 ?? '',
            },
          }
        : {}),
    },
  };

  const manifestPath = path.join(
    projectRoot,
    'release-manifests',
    options.channel,
    'latest.json',
  );
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${path.relative(projectRoot, manifestPath)}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
