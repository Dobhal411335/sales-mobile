const fs = require('fs');
const path = require('path');

function loadEnvFile(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }
  const content = fs.readFileSync(envFilePath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnvFile(path.resolve(__dirname, '.env'));

function inlineEnvPlugin({types: t}) {
  return {
    name: 'transform-inline-environment-variables',
    visitor: {
      MemberExpression(memberPath) {
        if (memberPath.matchesPattern('process.env', true)) {
          const property = memberPath.node.property;
          const key = property.name || property.value;
          if (key && key in env) {
            memberPath.replaceWith(t.valueToNode(env[key]));
          }
        }
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [inlineEnvPlugin],
};
