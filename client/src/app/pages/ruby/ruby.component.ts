import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CodeTabsComponent } from '../../shared/code-tabs/code-tabs.component';

@Component({
  selector: 'app-ruby',
  standalone: true,
  imports: [FooterComponent, CodeTabsComponent],
  templateUrl: './ruby.component.html',
  styleUrl: './ruby.component.css'
})
export class RubyComponent {}
