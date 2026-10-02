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

/**
 * Release / production bundles must NOT pick up `.env.local` (emulator LAN URL).
 * That was baking http://10.0.2.2:3000 into tablet APKs → "unable to connect".
 */
const isReleaseBuild =
  process.env.NODE_ENV === 'production' ||
  process.env.BABEL_ENV === 'production' ||
  process.env.MOBILE_ENV === 'production' ||
  process.argv.some((arg) =>
    /(?:bundle|assemble|install|package)Release/i.test(String(arg)),
  );

const env = {
  ...loadEnvFile(path.resolve(__dirname, '.env')),
  ...(isReleaseBuild
    ? loadEnvFile(path.resolve(__dirname, '.env.production'))
    : loadEnvFile(path.resolve(__dirname, '.env.local'))),
};

// Guarantee a production backend URL for release if env files are missing.
if (isReleaseBuild && !env.API_BASE_URL) {
  env.API_BASE_URL = 'https://pos.tastybitesrestaurant.com';
}

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
