const fs = require('fs');
const path = require('path');

const versionsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'gradle',
  'libs.versions.toml',
);

if (!fs.existsSync(versionsPath)) {
  process.exit(0);
}

const source = fs.readFileSync(versionsPath, 'utf8');
const patched = source.replace(/^kotlin = "2\.2\.21"$/m, 'kotlin = "2.0.21"');

if (patched !== source) {
  fs.writeFileSync(versionsPath, patched);
  console.log('Pinned @react-native/gradle-plugin Kotlin to 2.0.21 for RN 0.79 Android builds.');
}
