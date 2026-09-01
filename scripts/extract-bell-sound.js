/* eslint-env node */
const fs = require('fs');
const path = require('path');

const source = path.join(
  __dirname,
  '../../Web/src/lib/notifications/bellSoundData.js',
);
const content = fs.readFileSync(source, 'utf8');
const match = content.match(/base64,([^"]+)/);
if (!match) {
  throw new Error('Could not extract bell sound data');
}

const outDir = path.join(__dirname, '../assets/sounds');
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(
  path.join(outDir, 'notification_bell.mp3'),
  Buffer.from(match[1], 'base64'),
);
console.log('Wrote notification_bell.mp3');
