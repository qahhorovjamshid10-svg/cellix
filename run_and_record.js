const { spawn } = require('child_process');
const http = require('http');

console.log('Starting Next.js dev server...');
const nextProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true
});

nextProcess.stdout.on('data', (data) => {
  console.log(`[Next] ${data}`);
});

nextProcess.stderr.on('data', (data) => {
  console.error(`[Next ERROR] ${data}`);
});

const checkServer = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:3000', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
};

const waitForServer = async () => {
  console.log('Waiting for server to be ready...');
  for (let i = 0; i < 30; i++) {
    const isReady = await checkServer();
    if (isReady) {
      console.log('Server is ready!');
      return true;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
};

const runRecording = () => {
  console.log('Running recording script...');
  return new Promise((resolve, reject) => {
    const recordProcess = spawn('node', ['record_video.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    recordProcess.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Recording failed with code ${code}`));
    });
  });
};

(async () => {
  try {
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Server did not start in time.');
    }
    await runRecording();
    console.log('Process completed successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Killing Next.js server...');
    // On Windows we might need to kill the tree, but let's try standard kill
    nextProcess.kill('SIGINT');
    process.exit(0);
  }
})();
