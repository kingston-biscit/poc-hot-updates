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

// Copy Angular build output
for (const entry of fs.readdirSync(src)) {
  fs.cpSync(path.join(src, entry), path.join(dest, entry), { recursive: true });
}

console.log(`OTA bundle ${version} copied to ${dest}`);

// ---- ADD THIS PART BELOW ----

// Include Cordova runtime so OTA bundles can run Cordova APIs too
const platformWww = path.join(
  __dirname,
  "..",
  "cordova",
  "platforms",
  "android",
  "platform_www"
);

function copyIfExists(name) {
  const from = path.join(platformWww, name);
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(dest, name), { recursive: true });
    console.log(`Included ${name} in OTA bundle`);
  } else {
    console.warn(`Skipped ${name} (not found in ${platformWww})`);
  }
}

copyIfExists("cordova.js");
copyIfExists("cordova_plugins.js");
copyIfExists("plugins");

console.log(
  `[OTA] Cordova runtime added (if available). Bundle ready at ${dest}`
);
