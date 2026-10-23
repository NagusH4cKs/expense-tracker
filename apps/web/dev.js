import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Expense Tracker (Backend + Frontend)...');
console.log('\x1b[36m%s\x1b[0m', '==================================================');

const processes = [];

function startProcess(name, cwd, script, colorCode) {
  const proc = spawn(npmCommand, ['run', script], {
    cwd,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  processes.push(proc);

  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m `;

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${prefix}${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${prefix}${line}`);
      }
    });
  });

  proc.on('close', (code) => {
    if (code !== 0 && code !== null && code !== 4294967295 && code !== 130) {
      console.log(`${prefix}Process exited with code ${code}`);
    }
  });

  return proc;
}

// 1. Start Backend (Color 35 = Magenta)
startProcess('Backend', path.join(__dirname, 'backend'), 'dev', '35');

// 2. Start Frontend (Color 36 = Cyan)
startProcess('Frontend', path.join(__dirname, 'frontend'), 'dev:vite', '36');

// Clean exit on termination
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down services...');
  processes.forEach((proc) => {
    if (proc && !proc.killed) {
      if (isWindows && proc.pid) {
        spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { shell: true });
      } else {
        proc.kill('SIGTERM');
      }
    }
  });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
