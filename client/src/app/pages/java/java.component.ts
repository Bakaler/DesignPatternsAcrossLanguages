import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-java',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent],
  templateUrl: './java.component.html',
  styleUrl: './java.component.css'
})
export class JavaComponent {}
