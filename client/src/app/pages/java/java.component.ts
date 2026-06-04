import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-java',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent, CommonModule],
  templateUrl: './java.component.html',
  styleUrl: './java.component.css'
})
export class JavaComponent {
  currentTab: 'sheet' | 'imports' | 'testing' = 'sheet';

  switchTab(tab: 'sheet' | 'imports' | 'testing') {
    this.currentTab = tab;
  }
}
