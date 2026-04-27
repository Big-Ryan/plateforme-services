import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NegotiationService } from '../../../core/services/domain.services';
import { UserInfo, NegotiationSummary } from '../../../core/models/api.models';

@Component({
  selector: 'app-client-dashboard',
  template: `
    <div class="dashboard-page">
      <div class="dashboard-header">
        <h1>Mon espace</h1>
        <p *ngIf="user">Bonjour {{ user.firstName }} !</p>
      </div>

      <!-- Actions rapides -->
      <div class="quick-actions">
        <mat-card class="action-card" routerLink="/catalogue">
          <mat-card-content>
            <mat-icon color="primary">search</mat-icon>
            <h3>Parcourir le catalogue</h3>
            <p>Trouvez le prestataire idéal pour votre projet</p>
          </mat-card-content>
        </mat-card>
        <mat-card class="action-card" routerLink="/client/negotiations">
          <mat-card-content>
            <mat-icon color="accent">forum</mat-icon>
            <h3>Mes négociations</h3>
            <p>{{ totalNegotiations }} contact(s) en cours</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Dernières négociations -->
      <mat-card class="recent-card">
        <mat-card-header>
          <mat-card-title>Dernières activités</mat-card-title>
          <a mat-button color="primary" routerLink="/client/negotiations">
            Voir tout
          </a>
        </mat-card-header>
        <mat-card-content>
          <div class="loading-center" *ngIf="loading">
            <mat-spinner diameter="32"></mat-spinner>
          </div>
          <div class="empty" *ngIf="!loading && !recentNegotiations.length">
            <mat-icon>inbox</mat-icon>
            <p>Aucune négociation pour l'instant.</p>
            <a mat-raised-button color="primary" routerLink="/catalogue">
              Parcourir le catalogue
            </a>
          </div>
          <table mat-table [dataSource]="recentNegotiations"
                 *ngIf="!loading && recentNegotiations.length"
                 class="full-width">
            <ng-container matColumnDef="service">
              <th mat-header-cell *matHeaderCellDef>Service</th>
              <td mat-cell *matCellDef="let n">{{ n.serviceTitle || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let n">
                <span class="badge" [ngClass]="n.status.toLowerCase()">
                  {{ getStatusLabel(n.status) }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="unread">
              <th mat-header-cell *matHeaderCellDef>Messages</th>
              <td mat-cell *matCellDef="let n">
                <span class="unread" *ngIf="n.unreadCount > 0">
                  {{ n.unreadCount }} nouveau(x)
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Dernière activité</th>
              <td mat-cell *matCellDef="let n">
                {{ n.updatedAt | date:'dd/MM/yyyy HH:mm' }}
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"
                class="clickable" (click)="openNegotiation(row.id)"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }
    .dashboard-header {
      margin-bottom: 28px;
      h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 4px; }
      p  { color: #666; margin: 0; }
    }
    .quick-actions {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 16px; margin-bottom: 24px;
    }
    @media (max-width: 600px) { .quick-actions { grid-template-columns: 1fr; } }
    .action-card {
      cursor: pointer; border-radius: 12px;
      transition: transform .2s, box-shadow .2s;
      &:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
      mat-card-content {
        display: flex; flex-direction: column;
        align-items: center; text-align: center; padding: 24px;
        mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 12px; }
        h3 { font-size: 1rem; font-weight: 600; margin: 0 0 6px; }
        p  { color: #666; font-size: 13px; margin: 0; }
      }
    }
    .recent-card {
      border-radius: 12px;
      mat-card-header {
        display: flex; justify-content: space-between;
        align-items: center; padding-bottom: 8px;
      }
    }
    .loading-center { display: flex; justify-content: center; padding: 32px; }
    .empty {
      text-align: center; padding: 32px; color: #999;
      mat-icon { font-size: 40px; width: 40px; height: 40px;
                 display: block; margin: 0 auto 12px; }
      p { margin-bottom: 16px; }
    }
    .full-width { width: 100%; }
    .clickable { cursor: pointer; &:hover { background: #f5f5f5; } }
    .badge {
      padding: 2px 10px; border-radius: 12px; font-size: 12px;
      &.initiated   { background: #e3f2fd; color: #1565c0; }
      &.in_progress { background: #fff8e1; color: #f57f17; }
      &.agreed      { background: #e8f5e9; color: #2e7d32; }
      &.closed      { background: #ede7f6; color: #4527a0; }
      &.rejected    { background: #fce4ec; color: #c62828; }
    }
    .unread {
      background: #ffcdd2; color: #c62828;
      padding: 2px 8px; border-radius: 10px; font-size: 12px;
    }
  `]
})
export class ClientDashboardComponent implements OnInit {
  user: UserInfo | null = null;
  recentNegotiations: NegotiationSummary[] = [];
  totalNegotiations = 0;
  loading = false;
  columns = ['service', 'status', 'unread', 'date'];

  constructor(
    private authService: AuthService,
    private negotiationService: NegotiationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loading = true;
    this.negotiationService.getClientNegotiations(0, 5).subscribe({
      next: page => {
        this.recentNegotiations = page.content;
        this.totalNegotiations  = page.totalElements;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openNegotiation(id: string): void {
    this.router.navigate(['/client/negotiations', id]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      INITIATED: 'Initié', IN_PROGRESS: 'En cours',
      AGREED: 'Accord', CLOSED: 'Fermé', REJECTED: 'Refusé'
    };
    return labels[status] ?? status;
  }
}