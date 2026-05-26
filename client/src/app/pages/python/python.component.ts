import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-python',
  standalone: true,
  imports: [FooterComponent],
  templateUrl: './python.component.html',
  styleUrl: './python.component.css'
})
export class PythonComponent {}
