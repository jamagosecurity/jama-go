import { isDevMode } from '@angular/core';
import { showErrorOnScreen } from './app/utils/screen-error';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

// Development only: errors outside Angular (a module that fails to load, a rejected promise) show on screen too.
if (isDevMode()) {
  window.addEventListener('error', (event) => showErrorOnScreen(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => showErrorOnScreen(event.reason));
}
