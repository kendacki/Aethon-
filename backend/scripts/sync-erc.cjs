const fs = require("fs");
const path = require("path");

const contractsDir = path.join(__dirname, "..", "contracts");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.name.endsWith(".erc")) {
      const content = fs.readFileSync(full, "utf8").replace(/\.erc"/g, '.sol"');
      const solPath = full.replace(/\.erc$/, ".sol");
      fs.writeFileSync(solPath, content);
      console.log(`Synced ${path.relative(contractsDir, full)} -> ${path.basename(solPath)}`);
    }
  }
}

walk(contractsDir);
