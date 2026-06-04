import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-ruby',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent, CommonModule],
  templateUrl: './ruby.component.html',
  styleUrl: './ruby.component.css'
})
export class RubyComponent {
  currentTab: 'sheet' | 'imports' | 'testing' = 'sheet';

  switchTab(tab: 'sheet' | 'imports' | 'testing') {
    this.currentTab = tab;
  }
}
