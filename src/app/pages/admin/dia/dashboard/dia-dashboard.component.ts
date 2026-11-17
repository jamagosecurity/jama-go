import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Dia } from '../../../../models/dia.model';
import { DiaService } from '../../../../services/dia.service';
import { DiaState } from '../dia-state.service';
import { DiaEmptyStateComponent, DiaSkeletonComponent } from '../shared/dia-shared.components';

/**
 * DIA at a glance: how many records and how many are live, where the year's four quarterly inspections stand,
 * and which sites are due next. Every number opens the list filtered to it.
 */
@Component({
  selector: 'app-dia-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, DiaSkeletonComponent, DiaEmptyStateComponent],
  templateUrl: './dia-dashboard.component.html',
  styleUrls: ['../dia.styles.css', './dia-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaDashboardComponent implements OnInit {
  protected readonly state = inject(DiaState);
  private readonly api = inject(DiaService);

  /** Active sites with an inspection date, soonest first. */
  protected readonly upcoming = signal<Dia[]>([]);
  protected readonly upcomingLoading = signal(true);

  protected readonly stages = computed(() => {
    const d = this.state.dashboard();
    if (!d) return [];
    const total = d.quarter1 + d.quarter2 + d.quarter3 + d.quarter4 + d.completed;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return [
      { key: 'Quarter1', label: 'Quarter 1', sub: '1 of 4 inspections', count: d.quarter1, share: pct(d.quarter1), tone: 'q1' },
      { key: 'Quarter2', label: 'Quarter 2', sub: '2 of 4 inspections', count: d.quarter2, share: pct(d.quarter2), tone: 'q2' },
      { key: 'Quarter3', label: 'Quarter 3', sub: '3 of 4 inspections', count: d.quarter3, share: pct(d.quarter3), tone: 'q3' },
      { key: 'Quarter4', label: 'Quarter 4', sub: '4 of 4 inspections', count: d.quarter4, share: pct(d.quarter4), tone: 'q4' },
      { key: 'Completed', label: 'Completed', sub: 'Year finished', count: d.completed, share: pct(d.completed), tone: 'done' },
    ];
  });
  protected readonly activeShare = computed(() => {
    const d = this.state.dashboard();
    return d && d.total ? Math.round((d.active / d.total) * 100) : 0;
  });

  ngOnInit(): void {
    this.state.loadDashboard();
    this.api.getList({ pageNumber: 1, pageSize: 50, sortBy: 'nextInspectionDate', sortDirection: 'asc' }).subscribe({
      next: (page) => {
        this.upcoming.set(page.items.filter((d) => d.isActive && d.nextInspectionDate).slice(0, 6));
        this.upcomingLoading.set(false);
      },
      error: () => this.upcomingLoading.set(false),
    });
  }

  protected dueTone(days: number): string {
    return days < 0 ? 'late' : days <= 7 ? 'soon' : days <= 30 ? 'month' : 'later';
  }

  protected dueLabel(days: number): string {
    if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} late`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  }
}
