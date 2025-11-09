import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/envirornment';
import { downloadBundle, OtaManifest } from '../ota-storage';
import packageJson from '../../../package.json';

const BUNDLE_VERSION = ((packageJson as any).version as string) || '0.0.0';

@Injectable({ providedIn: 'root' })
export class HotUpdateService {
  BUNDLE_VERSION = ((packageJson as any).version as string) || '0.0.0';

  private _currentVersion = signal(BUNDLE_VERSION);
  private _availableVersion = signal<string | null>(null);
  private _checking = signal(false);
  private _installing = signal(false);
  private _error = signal<string | null>(null);

  currentVersion = this._currentVersion.asReadonly();
  availableVersion = this._availableVersion.asReadonly();
  checking = this._checking.asReadonly();
  installing = this._installing.asReadonly();
  error = this._error.asReadonly();

  private pendingManifest: OtaManifest | null = null;

  async checkForUpdates(): Promise<void> {
    this._checking.set(true);
    this._error.set(null);

    try {
      console.log('[OTA] Fetching manifest from', environment.otaManifestUrl);
      const res = await fetch(environment.otaManifestUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const manifest = (await res.json()) as OtaManifest;

      if (manifest.minNativeMajor > environment.nativeMajorVersion) {
        this._availableVersion.set(null);
        this.pendingManifest = null;
        return;
      }

      if (this.isNewer(manifest.latestVersion, this._currentVersion())) {
        this._availableVersion.set(manifest.latestVersion);
        this.pendingManifest = manifest;
        localStorage.setItem('ota:pending', JSON.stringify(manifest));
      } else {
        this._availableVersion.set(null);
        this.pendingManifest = null;
        localStorage.removeItem('ota:pending');
      }
    } catch (e: any) {
      this._error.set(e?.message || 'Update check failed');
    } finally {
      this._checking.set(false);
    }
  }

  async downloadAndActivate(): Promise<void> {
    if (!this.pendingManifest) {
      const raw = localStorage.getItem('ota:pending');
      if (!raw) {
        this._error.set('No pending update to install.');
        return;
      }
      this.pendingManifest = JSON.parse(raw) as OtaManifest;
    }

    this._installing.set(true);
    this._error.set(null);

    try {
      const indexPath = await downloadBundle(this.pendingManifest);

      // downloadBundle wrote ota-state.json already
      localStorage.removeItem('ota:pending');

      console.log('[OTA] Update staged at', indexPath);

      alert('Update installed. The app will restart to apply it.');

      const w = window as any;
      if (w.navigator && w.navigator.app && typeof w.navigator.app.exitApp === 'function') {
        w.navigator.app.exitApp();
      } else {
        console.log('[OTA] Please close and reopen the app to apply the update.');
      }
    } catch (e: any) {
      this._error.set('Install failed: ' + (e?.message || e));
      console.error('[OTA] install failed', e);
    } finally {
      this._installing.set(false);
    }
  }

  private isNewer(next: string, current: string): boolean {
    const n = next.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(n.length, c.length); i++) {
      const nv = n[i] || 0;
      const cv = c[i] || 0;
      if (nv > cv) return true;
      if (nv < cv) return false;
    }
    return false;
  }
}
