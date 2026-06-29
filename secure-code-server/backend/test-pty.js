const pty = require('node-pty');
const ptyProcess = pty.spawn('powershell.exe', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: 'd:\\Design Sequence\\secure-code\\secure-code-server\\workspaces\\Test',
  env: process.env
});

ptyProcess.onData((data) => {
  process.stdout.write(data);
});

ptyProcess.write('git status\r');
setTimeout(() => process.exit(0), 3000);
