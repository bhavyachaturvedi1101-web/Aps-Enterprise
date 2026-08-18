const { spawn } = require('child_process');
const path = require('path');

console.log(`
╔═════════════════════════════════════════════════════════════════╗
║          APS Enterprise — Fullstack AI Admin System             ║
║               Starting Backend (5000) & Frontend               ║
╚═════════════════════════════════════════════════════════════════╝
`);

const runProcess = (name, command, args, cwd, colorCode) => {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'cmd.exe' : command;
  const cmdArgs = isWin ? ['/c', command, ...args] : args;

  const proc = spawn(cmd, cmdArgs, {
    cwd: path.resolve(__dirname, '..', cwd),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });


  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m `;

  proc.stdout.on('data', (data) => {
    process.stdout.write(prefix + data.toString().replace(/\n/g, `\n${prefix}`));
  });

  proc.stderr.on('data', (data) => {
    process.stderr.write(prefix + data.toString().replace(/\n/g, `\n${prefix}`));
  });

  proc.on('close', (code) => {
    console.log(`${prefix} Process exited with code ${code}`);
  });

  return proc;
};

// Start Backend
runProcess('BACKEND ', 'npm', ['run', 'dev'], 'backend', '36'); // Cyan

// Start Frontend
runProcess('FRONTEND', 'npm', ['run', 'dev'], 'frontend', '32'); // Green
