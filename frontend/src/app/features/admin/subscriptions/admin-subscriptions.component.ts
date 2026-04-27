import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminService, SubscriptionAdminRow } from '../admin.service';
import { PageResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-admin-subscriptions',
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Abonnements</h1>
        <mat-form-field appearance="outline" style="width:200px">
          <mat-label>Filtrer par statut</mat-label>
          <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="load(0)">
            <mat-option value="">Tous</mat-option>
            <mat-option value="ACTIVE">Actifs</mat-option>
            <mat-option value="TRIAL">Essai</mat-option>
            <mat-option value="EXPIRED">Expirés</mat-option>
            <mat-option value="CANCELLED">Annulés</mat-option>
            <mat-option value="SUSPENDED">Suspendus</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <div class="loading-center" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

        <table mat-table [dataSource]="page?.content || []" class="full-width" *ngIf="!loading">

          <ng-container matColumnDef="provider">
            <th mat-header-cell *matHeaderCellDef>Prestataire</th>
            <td mat-cell *matCellDef="let s">
              <strong>{{ s.providerCompany }}</strong><br>
              <small>{{ s.providerEmail }}</small>
            </td>
          </ng-container>

          <ng-container matColumnDef="plan">
            <th mat-header-cell *matHeaderCellDef>Plan</th>
            <td mat-cell *matCellDef="let s">{{ s.planName }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let s">
              <span class="sub-badge" [ngClass]="s.status.toLowerCase()">{{ s.status }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="dates">
            <th mat-header-cell *matHeaderCellDef>Période</th>
            <td mat-cell *matCellDef="let s">
              {{ s.startDate | date:'dd/MM/yyyy' }}
              <span *ngIf="s.endDate"> → {{ s.endDate | date:'dd/MM/yyyy' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let s">
              <button mat-button color="primary" (click)="setStatus(s, 'ACTIVE')"
                      *ngIf="s.status !== 'ACTIVE'"
                      matTooltip="Activer manuellement">
                Activer
              </button>
              <button mat-button color="warn" (click)="setStatus(s, 'SUSPENDED')"
                      *ngIf="s.status === 'ACTIVE'"
                      matTooltip="Suspendre">
                Suspendre
              </button>
              <button mat-button (click)="setStatus(s, 'CANCELLED')"
                      *ngIf="s.status !== 'CANCELLED'"
                      matTooltip="Annuler">
                Annuler
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>

        <mat-paginator [length]="page?.totalElements || 0" [pageSize]="20"
                       (page)="load($event.pageIndex)">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
      h1 { font-size: 1.8rem; font-weight: 700; margin: 0; }
    }
    .table-card { border-radius: 12px; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    small { color: #999; font-size: 11px; }
    .sub-badge {
      padding: 2px 10px; border-radius: 12px; font-size: 12px;
      &.active    { background: #e8f5e9; color: #2e7d32; }
      &.trial     { background: #fff8e1; color: #f57f17; }
      &.expired   { background: #fce4ec; color: #c62828; }
      &.cancelled { background: #fafafa; color: #9e9e9e; border: 1px solid #e0e0e0; }
      &.suspended { background: #fff3e0; color: #e65100; }
      &.pending   { background: #e3f2fd; color: #1565c0; }
    }
  `]
})
export class AdminSubscriptionsComponent implements OnInit {
  page: PageResponse<SubscriptionAdminRow> | null = null;
  loading = false;
  selectedStatus = '';
  columns = ['provider', 'plan', 'status', 'dates', 'actions'];

  constructor(private adminService: AdminService, private toastr: ToastrService) {}

  ngOnInit(): void { this.load(0); }

  load(page: number): void {
    this.loading = true;
    this.adminService.getSubscriptions(page, 20, this.selectedStatus || undefined).subscribe({
      next: p  => { this.page = p; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  setStatus(sub: SubscriptionAdminRow, status: string): void {
    if (!confirm(`Passer cet abonnement en "${status}" ?`)) return;
    this.adminService.updateSubscription(sub.id, status).subscribe({
      next: () => { sub.status = status; this.toastr.success('Statut mis à jour'); },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }
}