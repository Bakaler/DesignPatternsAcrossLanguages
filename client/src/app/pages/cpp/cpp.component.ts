import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-cpp',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent],
  templateUrl: './cpp.component.html',
  styleUrl: './cpp.component.css'
})
export class CppComponent {}
