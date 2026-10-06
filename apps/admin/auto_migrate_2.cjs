const { spawn } = require('child_process');

const child = spawn('npx', ['payload', 'migrate:create', 'phase_2_website'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
  env: { ...process.env, CI: 'false' }
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Is') && output.includes('table created or renamed')) {
    console.log('Answering prompt...');
    child.stdin.write('\n');
  }
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
