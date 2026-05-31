import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-csharp',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent],
  templateUrl: './csharp.component.html',
  styleUrl: './csharp.component.css'
})
export class CsharpComponent {}
