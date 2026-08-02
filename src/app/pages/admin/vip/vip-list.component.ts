import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { VipClientListItem } from '../../../models/vip-client.model';
import { VipClientService } from '../../../services/vip-client.service';
import { getApiErrorMessage } from '../../../utils/api-error.util';

@Component({
  selector: 'app-vip-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vip-list.component.html',
  styleUrl: './vip-list.component.css',
})
export class VipListComponent implements OnInit {
  private readonly service = inject(VipClientService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly clients = signal<VipClientListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.clients.set(items),
        error: (err: unknown) =>
          this.error.set(getApiErrorMessage(err, 'Unable to load VIP clients.')),
      });
  }
}
