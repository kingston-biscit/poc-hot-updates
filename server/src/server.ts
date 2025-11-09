import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();

// Wide-open CORS for POC: allow any origin to GET our stuff
app.use(
  cors({
    origin: "*",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

const PORT = Number(process.env.PORT) || 4000;
const bundlesRoot = path.join(__dirname, "../bundles");
const MIN_NATIVE_MAJOR = 1;

function getAvailableVersions(): string[] {
  if (!fs.existsSync(bundlesRoot)) {
    return [];
  }

  return fs.readdirSync(bundlesRoot).filter((name) => {
    const full = path.join(bundlesRoot, name);
    return fs.statSync(full).isDirectory();
  });
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function getLatestVersion(): string | null {
  const versions = getAvailableVersions();
  if (versions.length === 0) return null;
  versions.sort(compareSemver);
  return versions[versions.length - 1];
}

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/bundles", express.static(bundlesRoot));

app.get("/manifest.json", (req, res) => {
  const latestVersion = getLatestVersion();

  if (!latestVersion) {
    console.warn("No bundles found in", bundlesRoot);
    return res.status(500).json({ error: "No bundles available" });
  }

  // Prefer explicit env override, otherwise use the actual host the client used
  const host =
    process.env.OTA_HOST || `http://${req.headers.host ?? `localhost:${PORT}`}`;

  const bundleDir = path.join(bundlesRoot, latestVersion);

  const files: string[] = [];
  (function walk(relDir: string) {
    const absDir = path.join(bundleDir, relDir);
    for (const entry of fs.readdirSync(absDir)) {
      const relPath = path.join(relDir, entry);
      const absPath = path.join(bundleDir, relPath);
      if (fs.statSync(absPath).isDirectory()) {
        walk(relPath);
      } else {
        files.push(relPath.replace(/\\/g, "/"));
      }
    }
  })(".");

  const normalizedFiles = files
    .map((f) => (f.startsWith("./") ? f.slice(2) : f))
    .filter((f) => f.length > 0);

  res.json({
    latestVersion,
    minNativeMajor: MIN_NATIVE_MAJOR,
    bundleUrl: `${host}/bundles/${latestVersion}/`,
    files: normalizedFiles,
  });
});

app.listen(PORT, () => {
  console.log(`OTA server listening on port: ${PORT}`);
});
