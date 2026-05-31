import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-typescript',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent],
  templateUrl: './typescript.component.html',
  styleUrl: './typescript.component.css'
})
export class TypescriptComponent {}
