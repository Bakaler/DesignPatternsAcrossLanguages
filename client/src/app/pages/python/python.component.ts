import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-python',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent],
  templateUrl: './python.component.html',
  styleUrl: './python.component.css'
})
export class PythonComponent {}
