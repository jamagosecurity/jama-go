import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const nodeDir = join(root, '.tools', 'node');
const nodeExe =
  process.platform === 'win32' ? join(nodeDir, 'node.exe') : join(nodeDir, 'bin', 'node');
const npmCli =
  process.platform === 'win32'
    ? join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
    : join(nodeDir, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');

if (!existsSync(nodeExe)) {
  console.error('Local Node runtime is missing. Run: npm run setup:node');
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/run-with-node.mjs <command> [...args]');
  process.exit(1);
}

const env = { ...process.env };
const localBin = join(root, 'node_modules', '.bin');
if (process.platform === 'win32') {
  env.PATH = `${nodeDir};${localBin};${env.PATH ?? ''}`;
} else {
  env.PATH = `${join(nodeDir, 'bin')}:${localBin}:${env.PATH ?? ''}`;
}

let result;
if (command === 'npm') {
  result = spawnSync(nodeExe, [npmCli, ...args], { stdio: 'inherit', env, cwd: root, shell: false });
} else if (command.endsWith('.cmd') || command.endsWith('.ps1')) {
  result = spawnSync(command, args, { stdio: 'inherit', env, cwd: root, shell: true });
} else {
  const bin =
    process.platform === 'win32'
      ? join(nodeDir, `${command}.cmd`)
      : join(nodeDir, 'bin', command);
  const executable = existsSync(bin) ? bin : command;
  result = spawnSync(executable, args, { stdio: 'inherit', env, cwd: root, shell: process.platform === 'win32' });
}

process.exit(result.status ?? 1);
