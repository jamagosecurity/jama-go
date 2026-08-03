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
    .danger-button { --mdc-filled-button-container-color: #be123c; }
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
    .skeleton{display:grid;gap:12px}.skeleton span{display:block;height:56px;border-radius:14px;background:linear-gradient(90deg,#e8eef4 25%,#f7fafc 50%,#e8eef4 75%);background-size:200% 100%;animation:shine 1.4s infinite}@keyframes shine{to{background-position:-200% 0}}
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
      <span aria-hidden="true">◇</span>
      <strong>{{ title() }}</strong>
      <p>{{ message() }}</p>
      @if (actionLabel()) {
        <button mat-stroked-button type="button" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: `
    .state{display:grid;place-items:center;text-align:center;gap:8px;padding:48px 20px;color:#5d7288}.state>span{font-size:2.2rem;color:#2594d2}.state strong{font:700 1.05rem Sora,Inter,sans-serif;color:#0b1f33}.state p{max-width:440px}
  `,
})
export class DiaEmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input('');
  readonly action = output<void>();
}
