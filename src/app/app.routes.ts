import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './components/contact/contact.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Jama Go Security — Protecting What Matters Most' },
  { path: 'contact', component: ContactComponent, title: 'Contact Us — Jama Go Security' },
  { path: '**', redirectTo: '' },
];
