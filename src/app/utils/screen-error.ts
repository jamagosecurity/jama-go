import { ErrorHandler } from '@angular/core';

/**
 * DEVELOPMENT ONLY (see app.config.ts). Shows any error in a red box at the bottom of the page as well as the console,
 * so a page that comes up blank says why without opening developer tools.
 */
export function showErrorOnScreen(error: unknown): void {
  try {
    const text = error instanceof Error ? `${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(1, 4).join('\n')}` : String(error);
    let box = document.getElementById('dev-error-box');
    if (!box) {
      box = document.createElement('pre');
      box.id = 'dev-error-box';
      box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;max-height:45vh;overflow:auto;margin:0;padding:14px 16px;border-radius:12px;background:#7f1d1d;color:#fff;font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;box-shadow:0 20px 40px rgba(0,0,0,.4)';
      document.body.appendChild(box);
    }
    box.textContent = `${box.textContent ? box.textContent + '\n\n' : 'Error (development only — send a screenshot of this box):\n'}${text}`;
  } catch { /* never let the reporter break anything */ }
}

export class ScreenErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    super.handleError(error);
    showErrorOnScreen(error);
  }
}
