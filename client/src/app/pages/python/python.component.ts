import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-python',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent, CommonModule],
  templateUrl: './python.component.html',
  styleUrl: './python.component.css'
})
export class PythonComponent {
  currentTab: 'sheet' | 'imports' | 'testing' = 'sheet';

  switchTab(tab: 'sheet' | 'imports' | 'testing') {
    this.currentTab = tab;
  }
}
