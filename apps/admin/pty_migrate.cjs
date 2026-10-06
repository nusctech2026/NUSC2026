const pty = require('node-pty');

const ptyProcess = pty.spawn('npx.cmd', ['payload', 'migrate:create', 'phase_2_website'], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});

ptyProcess.onData((data) => {
  process.stdout.write(data);
  // Any prompt ending with a question mark from Drizzle kit
  if (data.includes('?') && data.includes('❯')) {
    ptyProcess.write('\r'); // Sending Enter
  }
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`Process exited with code ${exitCode}`);
  process.exit(exitCode);
});
