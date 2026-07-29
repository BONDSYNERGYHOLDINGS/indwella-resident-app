const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_AVD = process.env.ANDROID_AVD || 'Pixel_5_2';
const BOOT_TIMEOUT_MS = Number(process.env.ANDROID_BOOT_TIMEOUT_MS || 240000);
const POLL_INTERVAL_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getAndroidHome = () => {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (home) {
    return home;
  }

  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
  }

  return path.join(os.homedir(), 'Android', 'Sdk');
};

const commandPath = (base, command) => {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  return path.join(base, `${command}${suffix}`);
};

const sdkRoot = getAndroidHome();
const adb = commandPath(path.join(sdkRoot, 'platform-tools'), 'adb');
const emulator = commandPath(path.join(sdkRoot, 'emulator'), 'emulator');

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    windowsHide: true,
  });

  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
};

const ensureAndroidTools = () => {
  const missing = [];
  if (!fs.existsSync(adb)) {
    missing.push(adb);
  }
  if (!fs.existsSync(emulator)) {
    missing.push(emulator);
  }

  if (missing.length > 0) {
    console.error('Android SDK tools were not found:');
    missing.forEach((tool) => console.error(`- ${tool}`));
    console.error('Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK folder.');
    process.exit(1);
  }
};

const getConnectedDevices = () => {
  const { stdout } = run(adb, ['devices']);
  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial);
};

const getAnyKnownDevices = () => {
  const { stdout } = run(adb, ['devices']);
  return stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
};

const startEmulatorIfNeeded = () => {
  if (getAnyKnownDevices().length > 0) {
    return;
  }

  console.log(`Starting Android emulator "${DEFAULT_AVD}"...`);
  const child = spawn(emulator, ['@' + DEFAULT_AVD, '-netdelay', 'none', '-netspeed', 'full'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
};

const shell = (serial, command) => run(adb, ['-s', serial, 'shell', command]);

const hasPackageService = (serial) => {
  const result = shell(serial, 'cmd package help');
  const output = `${result.stdout}\n${result.stderr}`;
  return result.code === 0 && !/can't find service:\s*package/i.test(output);
};

const isBootComplete = (serial) => {
  const bootCompleted = shell(serial, 'getprop sys.boot_completed').stdout.trim() === '1';
  const bootAnimStopped = shell(serial, 'getprop init.svc.bootanim').stdout.trim() === 'stopped';
  return bootCompleted && bootAnimStopped && hasPackageService(serial);
};

const waitForReadyDevice = async () => {
  const startedAt = Date.now();
  let lastStatus = '';

  while (Date.now() - startedAt < BOOT_TIMEOUT_MS) {
    const devices = getConnectedDevices();

    for (const serial of devices) {
      if (isBootComplete(serial)) {
        shell(serial, 'input keyevent 82');
        console.log(`Android device is ready: ${serial}`);
        return;
      }
    }

    const status = devices.length
      ? `Waiting for Android package manager on ${devices.join(', ')}...`
      : 'Waiting for Android emulator/device to connect...';

    if (status !== lastStatus) {
      console.log(status);
      lastStatus = status;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.error(
    `Android device did not become ready within ${Math.round(BOOT_TIMEOUT_MS / 1000)} seconds.`
  );
  console.error('Open Android Studio Device Manager, cold boot the emulator, then run npm run android again.');
  process.exit(1);
};

(async () => {
  ensureAndroidTools();
  run(adb, ['start-server']);
  startEmulatorIfNeeded();
  await waitForReadyDevice();
})();
