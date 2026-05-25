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
