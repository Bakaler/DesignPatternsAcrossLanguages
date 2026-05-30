import { Component, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsService, ChordType } from '../../services/settings.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {

  settingsOpen = false;
  langsOpen    = false;

  constructor(public settings: SettingsService, private router: Router) {}

  get isLangActive(): boolean {
    const url = this.router.url;
    return ['/java', '/csharp', '/typescript', '/python', '/ruby']
      .some(p => url.startsWith(p));
  }

  toggleLangs(e: Event): void {
    e.stopPropagation();
    this.langsOpen = !this.langsOpen;
    if (this.langsOpen) this.settingsOpen = false;
  }

  toggleSettings(e: Event): void {
    e.stopPropagation();
    this.settingsOpen = !this.settingsOpen;
    if (this.settingsOpen) this.langsOpen = false;
  }

  selectChord(chord: ChordType, e: Event): void {
    e.stopPropagation();
    this.settings.chord.set(chord);
    this.settings.playUiClick();
  }

  setVolume(e: Event): void {
    this.settings.volume.set(+(e.target as HTMLInputElement).value);
  }

  get volumePercent(): number {
    return Math.round(this.settings.volume() * 100);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.settingsOpen = false;
    this.langsOpen    = false;
  }
}
