import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminService, UserAdminRow } from '../admin.service';
import { PageResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-admin-users',
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Utilisateurs</h1>
        <mat-form-field appearance="outline" style="width:180px">
          <mat-label>Rôle</mat-label>
          <mat-select [(ngModel)]="selectedRole" (ngModelChange)="load(0)">
            <mat-option value="">Tous</mat-option>
            <mat-option value="CLIENT">Clients</mat-option>
            <mat-option value="PROVIDER">Prestataires</mat-option>
            <mat-option value="ADMIN">Admins</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <div class="loading-center" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

        <table mat-table [dataSource]="page?.content || []" class="full-width"
               *ngIf="!loading">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let u">
              {{ u.firstName }} {{ u.lastName }}
              <span class="company" *ngIf="u.companyName">— {{ u.companyName }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let u">{{ u.email }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rôle</th>
            <td mat-cell *matCellDef="let u">
              <span class="role-badge" [ngClass]="u.role.toLowerCase()">{{ u.role }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let u">
              <span class="status-dot" [class.active]="u.isActive"
                    [class.inactive]="!u.isActive">
                {{ u.isActive ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="subscription">
            <th mat-header-cell *matHeaderCellDef>Abonnement</th>
            <td mat-cell *matCellDef="let u">
              <span *ngIf="u.subscriptionStatus" class="sub-badge"
                    [ngClass]="u.subscriptionStatus.toLowerCase()">
                {{ u.subscriptionStatus }}
              </span>
              <span *ngIf="!u.subscriptionStatus && u.role === 'PROVIDER'" class="sub-badge none">
                Aucun
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let u">
              <button mat-icon-button
                      [color]="u.isActive ? 'warn' : 'primary'"
                      [matTooltip]="u.isActive ? 'Désactiver' : 'Activer'"
                      (click)="toggleUser(u)">
                <mat-icon>{{ u.isActive ? 'block' : 'check_circle' }}</mat-icon>
              </button>
              <button mat-icon-button color="accent"
                      *ngIf="u.role === 'PROVIDER'"
                      [matTooltip]="u.verified ? 'Retirer vérification' : 'Vérifier'"
                      (click)="toggleVerify(u)">
                <mat-icon>{{ u.verified ? 'verified' : 'verified_user' }}</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>

        <mat-paginator
          [length]="page?.totalElements || 0"
          [pageSize]="20"
          (page)="load($event.pageIndex)">
        </mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
    .page-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 24px;
      h1 { font-size: 1.8rem; font-weight: 700; margin: 0; }
    }
    .table-card { border-radius: 12px; overflow: hidden; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .company { color: #999; font-size: 12px; }

    .role-badge {
      padding: 2px 10px; border-radius: 12px; font-size: 12px;
      &.provider { background: #e8eaf6; color: #283593; }
      &.client   { background: #e3f2fd; color: #1565c0; }
      &.admin    { background: #fce4ec; color: #880e4f; }
    }
    .status-dot {
      font-size: 12px; padding: 2px 10px; border-radius: 12px;
      &.active   { background: #e8f5e9; color: #2e7d32; }
      &.inactive { background: #fafafa; color: #9e9e9e; border: 1px solid #e0e0e0; }
    }
    .sub-badge {
      font-size: 12px; padding: 2px 8px; border-radius: 10px;
      &.active  { background: #e8f5e9; color: #2e7d32; }
      &.trial   { background: #fff8e1; color: #f57f17; }
      &.expired, &.cancelled { background: #fce4ec; color: #c62828; }
      &.none    { background: #f5f5f5; color: #9e9e9e; }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  page: PageResponse<UserAdminRow> | null = null;
  loading = false;
  selectedRole = '';
  columns = ['name', 'email', 'role', 'status', 'subscription', 'actions'];

  constructor(private adminService: AdminService, private toastr: ToastrService) {}

  ngOnInit(): void { this.load(0); }

  load(page: number): void {
    this.loading = true;
    this.adminService.getUsers(page, 20, this.selectedRole || undefined).subscribe({
      next: p  => { this.page = p; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  toggleUser(u: UserAdminRow): void {
    this.adminService.toggleUser(u.id, !u.isActive).subscribe({
      next: () => {
        u.isActive = !u.isActive;
        this.toastr.success(`Compte ${u.isActive ? 'activé' : 'désactivé'}`);
      },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }

  toggleVerify(u: UserAdminRow): void {
    const newVal = !u.verified;
    this.adminService.verifyProvider(u.id, newVal).subscribe({
      next: () => {
        u.verified = newVal;
        this.toastr.success(`Prestataire ${newVal ? 'vérifié' : 'non vérifié'}`);
      },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }
}