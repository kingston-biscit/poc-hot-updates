import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { HotUpdateService } from '../../services/hot-update.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private ota = inject(HotUpdateService);

  currentVersion = computed(() => this.ota.currentVersion());
  availableVersion = computed(() => this.ota.availableVersion());
  checking = computed(() => this.ota.checking());
  installing = computed(() => this.ota.installing());
  errorShown = computed(() => this.ota.error());

  check() {
    console.log('[HOME] Check for updates clicked');
    this.ota.checkForUpdates();
  }

  install() {
    console.log('[HOME] Install update clicked');
    this.ota.downloadAndActivate();
  }
}
