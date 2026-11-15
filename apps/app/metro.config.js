// Monorepo-aware Metro config: watch shared workspace packages so their source
// TypeScript is bundled, and resolve hoisted modules from both app and root nm.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const appRoot = __dirname;
const monorepoRoot = path.resolve(appRoot, "..", "..");

const config = getDefaultConfig(appRoot);

config.watchFolders = [
  path.join(monorepoRoot, "packages", "core"),
  path.join(monorepoRoot, "packages", "data"),
];

config.resolver.nodeModulesPaths = [
  path.join(appRoot, "node_modules"),
  path.join(monorepoRoot, "node_modules"),
];

module.exports = config;
