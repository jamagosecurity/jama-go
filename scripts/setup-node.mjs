import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const toolsDir = join(root, '.tools');
const targetDir = join(toolsDir, 'node');
const versionFile = join(toolsDir, 'node-version.txt');
const version = 'v26.5.0';
const platform = process.platform === 'win32' ? 'win' : process.platform;
const architecture = process.arch === 'arm64' ? 'arm64' : 'x64';
const extension = process.platform === 'win32' ? 'zip' : process.platform === 'darwin' ? 'tar.gz' : 'tar.xz';
const archiveName = `node-${version}-${platform}-${architecture}.${extension}`;
const url = `https://nodejs.org/dist/${version}/${archiveName}`;
const nodeExecutable = process.platform === 'win32' ? join(targetDir, 'node.exe') : join(targetDir, 'bin', 'node');

async function download(downloadUrl, destination) {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${downloadUrl}: ${response.status}`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

function installedVersionMatches() {
  if (!existsSync(nodeExecutable) || !existsSync(versionFile)) {
    return false;
  }
  return readFileSync(versionFile, 'utf8').trim() === version;
}

function extractArchive(archivePath, extractRoot) {
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path '${archivePath.replace(/'/g, "''")}' -DestinationPath '${extractRoot.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: 'inherit' },
    );
    return;
  }

  const compressionFlag = extension === 'tar.gz' ? '-xzf' : '-xJf';
  execFileSync('tar', [compressionFlag, archivePath, '-C', extractRoot], { stdio: 'inherit' });
}

async function main() {
  if (installedVersionMatches()) {
    console.log(`Local Node ${version} already installed at .tools/node`);
    return;
  }

  mkdirSync(toolsDir, { recursive: true });
  const archivePath = join(toolsDir, archiveName);
  const extractRoot = join(toolsDir, 'extract');

  console.log(`Downloading Node ${version} for ${platform}-${architecture}...`);
  await download(url, archivePath);

  rmSync(extractRoot, { recursive: true, force: true });
  mkdirSync(extractRoot, { recursive: true });

  console.log('Extracting Node runtime...');
  extractArchive(archivePath, extractRoot);

  const extractedName = (await readdir(extractRoot)).find((name) => name.startsWith('node-'));
  if (!extractedName) {
    throw new Error('Could not find extracted Node directory');
  }

  rmSync(targetDir, { recursive: true, force: true });
  await rename(join(extractRoot, extractedName), targetDir);
  writeFileSync(versionFile, version, 'utf8');

  rmSync(archivePath, { force: true });
  rmSync(extractRoot, { recursive: true, force: true });

  console.log(`Installed Node ${version} to .tools/node`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
