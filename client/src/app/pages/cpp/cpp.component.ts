import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-cpp',
  standalone: true,
  imports: [FooterComponent],
  templateUrl: './cpp.component.html',
  styleUrl: './cpp.component.css'
})
export class CppComponent {}
