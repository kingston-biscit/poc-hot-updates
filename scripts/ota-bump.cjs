const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "angular", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const current = pkg.version;
if (typeof current !== "string") {
  throw new Error(
    `Invalid or missing version in angular/package.json: ${current}`
  );
}

const parts = current.split(".").map(Number);
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  throw new Error(`Invalid semver in angular/package.json: ${current}`);
}

const next = [parts[0], parts[1], parts[2] + 1].join(".");

pkg.version = next;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`Bumped angular version: ${current} -> ${next}`);
