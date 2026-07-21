import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TechnicianInspection } from '../../../models/technician.model';

@Component({
  selector: 'app-technician-inspection-sections',
  standalone: true,
  template: `
    @if (inspection(); as item) {
      <section class="tech-section">
        <h2>Camera details ({{ item.cameras.length }})</h2>
        @if (item.cameras.length) {
          @for (camera of item.cameras; track $index) {
            <p class="tech-notes">
              <strong>{{ camera.brand }} {{ camera.model }}</strong> × {{ camera.quantity }}
              @if (camera.location) {
                · {{ camera.location }}
              }
              @if (camera.remarks) {
                <br />{{ camera.remarks }}
              }
            </p>
          }
        } @else {
          <p class="tech-notes tech-muted">No camera details recorded.</p>
        }
      </section>

      <section class="tech-section">
        <h2>Network</h2>
        <dl class="tech-detail-list">
          <div><dt>Switch</dt><dd>{{ join(item.network?.switchBrand, item.network?.switchModel) || '—' }}</dd></div>
          <div><dt>Router</dt><dd>{{ join(item.network?.routerBrand, item.network?.routerModel) || '—' }}</dd></div>
          <div><dt>Firewall</dt><dd>{{ item.network?.firewall || '—' }}</dd></div>
          <div><dt>Rack details</dt><dd>{{ item.network?.rackDetails || '—' }}</dd></div>
          <div class="span-2"><dt>Remarks</dt><dd>{{ item.network?.networkRemarks || '—' }}</dd></div>
        </dl>
      </section>

      <section class="tech-section">
        <h2>VMS</h2>
        <dl class="tech-detail-list">
          <div><dt>VMS name</dt><dd>{{ item.vms?.vmsName || '—' }}</dd></div>
          <div><dt>Version</dt><dd>{{ item.vms?.version || '—' }}</dd></div>
          <div class="span-2"><dt>License</dt><dd>{{ item.vms?.licenseDetails || '—' }}</dd></div>
          <div class="span-2"><dt>Server</dt><dd>{{ item.vms?.serverDetails || '—' }}</dd></div>
          <div><dt>Health</dt><dd>{{ item.vms?.healthStatus || '—' }}</dd></div>
          <div><dt>Remarks</dt><dd>{{ item.vms?.remarks || '—' }}</dd></div>
        </dl>
      </section>

      <section class="tech-section">
        <h2>UPS / General</h2>
        <dl class="tech-detail-list">
          <div><dt>UPS brand</dt><dd>{{ item.upsGeneral?.upsBrand || '—' }}</dd></div>
          <div><dt>Capacity</dt><dd>{{ item.upsGeneral?.upsCapacity || '—' }}</dd></div>
          <div><dt>Battery</dt><dd>{{ item.upsGeneral?.batteryStatus || '—' }}</dd></div>
          <div><dt>Generator</dt><dd>{{ item.upsGeneral?.generatorAvailable ? 'Yes' : 'No' }}</dd></div>
          <div class="span-2"><dt>Generator details</dt><dd>{{ item.upsGeneral?.generatorDetails || '—' }}</dd></div>
          <div class="span-2"><dt>Remarks</dt><dd>{{ item.upsGeneral?.generalRemarks || '—' }}</dd></div>
        </dl>
      </section>

      <section class="tech-section">
        <h2>ANPR system</h2>
        <dl class="tech-detail-list">
          <div><dt>Installed</dt><dd>{{ item.anpr?.anprInstalled ? 'Yes' : 'No' }}</dd></div>
          <div><dt>Software</dt><dd>{{ item.anpr?.softwareVersion || '—' }}</dd></div>
          <div class="span-2"><dt>Camera details</dt><dd>{{ item.anpr?.cameraDetails || '—' }}</dd></div>
          <div class="span-2"><dt>Configuration</dt><dd>{{ item.anpr?.configuration || '—' }}</dd></div>
          <div class="span-2"><dt>Remarks</dt><dd>{{ item.anpr?.remarks || '—' }}</dd></div>
        </dl>
      </section>

      <section class="tech-section">
        <h2>K'Poi</h2>
        <p class="tech-notes">{{ item.kpoi?.details || 'No K\'Poi details recorded.' }}</p>
      </section>
    }
  `,
  styleUrl: '../technician.styles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicianInspectionSectionsComponent {
  readonly inspection = input.required<TechnicianInspection>();

  protected join(...values: (string | null | undefined)[]): string {
    return values
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' ');
  }
}
