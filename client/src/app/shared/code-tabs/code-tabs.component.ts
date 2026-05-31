import { Component, Input, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-code-tabs',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="ct-tabs">
      <button class="ct-tab" [class.ct-active]="active === 0" (click)="selectTab(0)">All</button>
      @for (tab of tabs; track $index) {
        <button class="ct-tab" [class.ct-active]="active === $index + 1" (click)="selectTab($index + 1)">{{ tab }}</button>
      }
    </div>
    <div class="ct-grid" [ngClass]="'ct-cols-' + (active > 0 ? 1 : cols)">
      <div class="ct-col"
           [class.ct-hide]="active > 0 && active !== 1"
           (mousedown)="onMD($event)"
           (mouseup)="onMU($event, 1)">
        <ng-content select="[ct1]"></ng-content>
      </div>
      @if (cols >= 2) {
        <div class="ct-col"
             [class.ct-hide]="active > 0 && active !== 2"
             (mousedown)="onMD($event)"
             (mouseup)="onMU($event, 2)">
          <ng-content select="[ct2]"></ng-content>
        </div>
      }
      @if (cols >= 3) {
        <div class="ct-col"
             [class.ct-hide]="active > 0 && active !== 3"
             (mousedown)="onMD($event)"
             (mouseup)="onMU($event, 3)">
          <ng-content select="[ct3]"></ng-content>
        </div>
      }
    </div>
  `,
  styleUrl: './code-tabs.component.css'
})
export class CodeTabsComponent {
  @Input() tabs: string[] = [];
  @Input() cols = 3;

  active = 0;
  private _mdX = 0;
  private _mdY = 0;

  private settings = inject(SettingsService);

  selectTab(index: number): void {
    this.active = index;
    this.settings.playUiClick();
  }

  onMD(e: MouseEvent): void {
    this._mdX = e.clientX;
    this._mdY = e.clientY;
  }

  onMU(e: MouseEvent, col: number): void {
    const dx = e.clientX - this._mdX;
    const dy = e.clientY - this._mdY;
    if (Math.sqrt(dx * dx + dy * dy) < 6) {
      this.active = col;
      this.settings.playUiClick();
    }
  }
}
