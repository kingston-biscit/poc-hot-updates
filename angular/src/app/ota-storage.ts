// Lightweight wrapper around Cordova File + HTTP for OTA bundles.

export interface OtaManifest {
  latestVersion: string;
  minNativeMajor: number;
  bundleUrl: string; // e.g. https://.../bundles/1.0.1/
  files: string[]; // e.g. ["index.html", "main.js", "assets/..."]
}

declare const cordova: any;
declare const IonicNativeHttp: any; // from advanced-http plugin (global name)

function ensureCordova() {
  const w = window as Window;

  if (!w.cordova || !w.cordova.file) {
    throw new Error('Cordova File plugin not available');
  }
}

export async function downloadBundle(manifest: OtaManifest): Promise<string> {
  ensureCordova();

  const w = window as Window;
  const version = manifest.latestVersion;
  const baseUrl = manifest.bundleUrl.replace(/\/+$/, '') + '/';
  const dataDir: string = (w as any).cordova.file.dataDirectory;
  const bundleRoot = dataDir + 'bundles/' + version + '/';

  console.log('[OTA] Downloading bundle', version, 'to', bundleRoot);

  await ensureDir(bundleRoot);

  for (const relPath of manifest.files) {
    const url = baseUrl + relPath;
    const targetPath = bundleRoot + relPath;

    const dir = targetPath.substring(0, targetPath.lastIndexOf('/') + 1);
    await ensureDir(dir);

    const data = await httpGetArrayBuffer(url);
    await writeFile(targetPath, data);
  }

  const indexFileUrl = await getCdvUrl(bundleRoot + 'index.html');
  console.log('[OTA] Bundle downloaded. Entry:', indexFileUrl);

  await writeOtaState(indexFileUrl);

  return indexFileUrl;
}

function getCdvUrl(pathUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (!w.resolveLocalFileSystemURL) {
      return reject(new Error('resolveLocalFileSystemURL not available'));
    }

    w.resolveLocalFileSystemURL(
      pathUrl,
      (entry: any) => {
        // Prefer internal URL (cdvfile://) if available
        if (typeof entry.toInternalURL === 'function') {
          resolve(entry.toInternalURL());
        } else if (typeof entry.toURL === 'function') {
          resolve(entry.toURL()); // may still be file:// on some platforms, but cdvfile on others
        } else {
          reject(new Error('No URL method on file entry'));
        }
      },
      (err: any) => {
        reject(err);
      }
    );
  });
}

// --- internals ---

async function ensureDir(pathUrl: string): Promise<void> {
  ensureCordova();

  const root = cordova.file.dataDirectory; // simple split baseline
  const rel = pathUrl.replace(root, '');
  const parts = rel.split('/').filter(Boolean);

  let current = root;
  for (const part of parts) {
    current = await mkdirIfNotExists(current, part + '/');
  }
}

function mkdirIfNotExists(parent: string, name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as any;

    w.resolveLocalFileSystemURL(
      parent,
      (dirEntry: any) => {
        dirEntry.getDirectory(
          name,
          { create: true },
          (subDir: any) => {
            resolve(subDir.toURL());
          },
          reject
        );
      },
      reject
    );
  });
}

async function httpGetArrayBuffer(url: string): Promise<ArrayBuffer> {
  if (window.cordova && (cordova as any).plugin && (cordova as any).plugin.http) {
    const http = (cordova as any).plugin.http;
    return new Promise((resolve, reject) => {
      http.sendRequest(
        url,
        { method: 'get', responseType: 'arraybuffer' },
        (res: any) => resolve(res.data as ArrayBuffer),
        (err: any) => reject(err)
      );
    });
  }

  // Fallback for browser dev
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.arrayBuffer();
}

function writeFile(pathUrl: string, data: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const dirPath = pathUrl.substring(0, pathUrl.lastIndexOf('/'));
    const fileName = pathUrl.substring(pathUrl.lastIndexOf('/') + 1);

    const w = window as any;

    w.resolveLocalFileSystemURL(
      dirPath,
      (dirEntry: any) => {
        dirEntry.getFile(
          fileName,
          { create: true },
          (fileEntry: any) => {
            fileEntry.createWriter((writer: any) => {
              writer.onwriteend = () => resolve();
              writer.onerror = reject;

              const blob = new Blob([data]);
              writer.write(blob);
            }, reject);
          },
          reject
        );
      },
      reject
    );
  });
}

function writeOtaState(activeUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (!w.cordova || !w.cordova.file || !w.resolveLocalFileSystemURL) {
      console.warn('[OTA] writeOtaState: Cordova/File not available');
      return resolve(); // don't hard fail; the bundle is still downloaded
    }

    const dataDir = w.cordova.file.dataDirectory;

    w.resolveLocalFileSystemURL(
      dataDir,
      function (dirEntry: any) {
        dirEntry.getFile(
          'ota-state.json',
          { create: true },
          function (fileEntry: any) {
            fileEntry.createWriter(function (writer: any) {
              writer.onwriteend = function () {
                console.log('[OTA] ota-state.json written');
                resolve();
              };
              writer.onerror = function (err: any) {
                console.error('[OTA] ota-state.json write failed', err);
                reject(err);
              };

              const blob = new Blob([JSON.stringify({ activeUrl }, null, 2)], {
                type: 'application/json',
              });
              writer.write(blob);
            }, reject);
          },
          reject
        );
      },
      reject
    );
  });
}
