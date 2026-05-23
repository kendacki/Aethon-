const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schemaSrc = path.join(root, "src", "db", "schema.sql");
const schemaDest = path.join(root, "dist", "db", "schema.sql");

fs.mkdirSync(path.dirname(schemaDest), { recursive: true });
fs.copyFileSync(schemaSrc, schemaDest);
console.log("[build] Copied schema.sql to dist/db/");
