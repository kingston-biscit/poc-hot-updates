const fs = require("fs");
const path = require("path");

const angularPkgPath = path.join(__dirname, "..", "angular", "package.json");
const angularPkg = JSON.parse(fs.readFileSync(angularPkgPath, "utf8"));
const version = angularPkg.version;

if (!version) {
  throw new Error('No "version" field in angular/package.json');
}

const src = path.join(__dirname, "..", "angular", "dist", "angular", "browser");
const dest = path.join(__dirname, "..", "server", "bundles", version);

if (!fs.existsSync(src)) {
  throw new Error(`Build output not found at ${src}. Run ng build first.`);
}

console.log(`Creating OTA bundle for version ${version}`);

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const entry of fs.readdirSync(src)) {
  fs.cpSync(path.join(src, entry), path.join(dest, entry), { recursive: true });
}

console.log(`OTA bundle ${version} copied to ${dest}`);
