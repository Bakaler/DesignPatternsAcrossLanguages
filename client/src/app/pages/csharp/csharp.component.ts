import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-csharp',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent, CommonModule],
  templateUrl: './csharp.component.html',
  styleUrl: './csharp.component.css'
})
export class CsharpComponent {
  currentTab: 'sheet' | 'imports' | 'testing' = 'sheet';

  switchTab(tab: 'sheet' | 'imports' | 'testing') {
    this.currentTab = tab;
  }
}
