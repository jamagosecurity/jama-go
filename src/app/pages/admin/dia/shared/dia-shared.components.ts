import { ChangeDetectionStrategy, Component, computed, input, inject, output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DiaStatus } from '../../../../models/dia.model';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
}

@Component({
  selector: 'app-dia-confirmation-dialog',
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content><p>{{ data.message }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button [class.danger-button]="data.danger" [mat-dialog-close]="true">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p { max-width: 420px; color: #5d7288; }
    .danger-button { --mdc-filled-button-container-color: #be1218; }
  `,
})
export class DiaConfirmationDialogComponent {
  readonly data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);
}

/**
 * Renders a DIA status using the shared .status-chip and status classes from
 * styles.css. It previously carried its own copy of the six-colour quarter
 * scale — cyan, purple and green that existed nowhere else in the product, and
 * which disagreed with how the technician screens coloured the same states.
 *
 * A quarter number is not a status worth five separate hues: the label already
 * says which quarter it is. What matters is whether the cycle is running,
 * finished, or has not started, so that is what the colour reports.
 */
@Component({
  selector: 'app-dia-status-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="status-chip" [class]="statusClass()">{{ label() }}</span>`,
})
export class DiaStatusChipComponent {
  readonly status = input.required<DiaStatus>();
  readonly label = input.required<string>();

  protected readonly statusClass = computed(() => {
    switch (this.status()) {
      case 'Completed':
        return 'is-done';
      case 'Inactive':
        return 'is-off';
      default:
        return 'is-active';
    }
  });
}

@Component({
  selector: 'app-dia-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton" role="status" aria-label="Loading content">
      @for (item of rows; track item) { <span></span> }
    </div>
  `,
  styles: `
    .skeleton{display:grid;gap:12px}.skeleton span{display:block;height:56px;border-radius:14px;background:linear-gradient(90deg,#e8ecf4 25%,#f7f9fc 50%,#e8ecf4 75%);background-size:200% 100%;animation:shine 1.4s infinite}@keyframes shine{to{background-position:-200% 0}}
  `,
})
export class DiaSkeletonComponent {
  protected readonly rows = [1, 2, 3, 4];
}

@Component({
  selector: 'app-dia-empty-state',
  standalone: true,
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" role="status">
      <span class="state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h3v16H5V5h3z" /><path d="M9 12l2 2 4-4M9 18h6" /></svg>
      </span>
      <strong>{{ title() }}</strong>
      <p>{{ message() }}</p>
      @if (actionLabel()) {
        <button type="button" class="state-action" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: `
    .state{display:grid;place-items:center;text-align:center;gap:10px;padding:56px 20px;color:#5d7288}
    .state-icon{display:grid;place-items:center;width:64px;height:64px;margin-bottom:6px;border-radius:50%;color:#8f8d77;background:radial-gradient(circle at 30% 25%,rgba(206, 206, 199,.35),rgba(165, 164, 148,.08) 70%);border:1px solid rgba(165, 164, 148,.55);box-shadow:0 0 0 7px rgba(165, 164, 148,.1),0 14px 28px -16px rgba(143, 141, 119,.8)}
    .state-icon svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
    .state strong{font:700 1.1rem Sora,Inter,sans-serif;color:#14294c}
    .state p{max-width:440px;margin:0;line-height:1.55}
    .state-action{margin-top:8px;padding:10px 22px;border:1px solid #a40f14;border-radius:999px;background:linear-gradient(145deg,#e8383f 0%,#d21319 55%,#a40f14 100%);color:#fff;font:inherit;font-size:.9rem;font-weight:750;cursor:pointer;box-shadow:0 10px 22px -12px rgba(143, 141, 119,.9);transition:transform .18s ease,box-shadow .2s ease}
    .state-action:hover{transform:translateY(-1px);box-shadow:0 14px 26px -12px rgba(143, 141, 119,1)}
  `,
})
export class DiaEmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input('');
  readonly action = output<void>();
}
