import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';
import { CommonModule } from '@angular/common';
import { ObserverWeatherDemoComponent } from '../../examples/observer-weather-demo/observer-weather-demo.component';

@Component({
  selector: 'app-typescript',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent, CommonModule, ObserverWeatherDemoComponent],
  templateUrl: './typescript.component.html',
  styleUrl: './typescript.component.css'
})
export class TypescriptComponent {
  currentTab: 'sheet' | 'imports' | 'testing' | 'live' = 'sheet';

  switchTab(tab: 'sheet' | 'imports' | 'testing' | 'live') {
    this.currentTab = tab;
  }
}
