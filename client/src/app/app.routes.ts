import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '',           component: HomeComponent },
  { path: 'gof',        loadComponent: () => import('./pages/gof/gof.component').then(m => m.GofComponent) },
  { path: 'java',       loadComponent: () => import('./pages/java/java.component').then(m => m.JavaComponent) },
  { path: 'csharp',     loadComponent: () => import('./pages/csharp/csharp.component').then(m => m.CsharpComponent) },
  { path: 'typescript', loadComponent: () => import('./pages/typescript/typescript.component').then(m => m.TypescriptComponent) },
  { path: 'python',     loadComponent: () => import('./pages/python/python.component').then(m => m.PythonComponent) },
  { path: 'ruby',       loadComponent: () => import('./pages/ruby/ruby.component').then(m => m.RubyComponent) },
  { path: '**',         redirectTo: '' }
];
