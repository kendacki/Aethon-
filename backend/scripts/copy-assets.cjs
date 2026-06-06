const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function copyFile(src, dest, label) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`[build] Copied ${label}`);
}

copyFile(
  path.join(root, "src", "db", "schema.sql"),
  path.join(root, "dist", "db", "schema.sql"),
  "schema.sql to dist/db/",
);

copyFile(
  path.join(root, "scripts", "railway-start.cjs"),
  path.join(root, "dist", "railway-start.cjs"),
  "railway-start.cjs to dist/",
);

copyFile(
  path.join(root, "scripts", "resolve-runtime.cjs"),
  path.join(root, "dist", "resolve-runtime.cjs"),
  "resolve-runtime.cjs to dist/",
);

const envDir = path.join(root, "env");
const distEnvDir = path.join(root, "dist", "env");
if (fs.existsSync(envDir)) {
  fs.mkdirSync(distEnvDir, { recursive: true });
  for (const name of fs.readdirSync(envDir)) {
    if (!name.endsWith(".json")) continue;
    copyFile(path.join(envDir, name), path.join(distEnvDir, name), `env/${name} to dist/env/`);
  }
}
