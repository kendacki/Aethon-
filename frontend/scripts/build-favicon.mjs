import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const pngPath = path.join(publicDir, "logo-white.png");

if (!fs.existsSync(pngPath)) {
  console.error("Missing logo-white.png — run scripts/build-logo.ps1 first.");
  process.exit(1);
}

const png = fs.readFileSync(pngPath).toString("base64");
const logoW = 1024;
const logoH = 693;
const size = 1024;
const offsetY = Math.round((size - logoH) / 2);

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="#000000"/>
  <image href="data:image/png;base64,${png}" x="0" y="${offsetY}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, "favicon.svg"), faviconSvg);
console.log("Wrote public/favicon.svg");
