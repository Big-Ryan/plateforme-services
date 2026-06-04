import { Component, OnInit } from '@angular/core';
import { AdminService, DashboardStats } from '../admin.service';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="admin-page">
      <h1>Administration</h1>

      <div class="kpi-grid" *ngIf="stats; else loadingTpl">
        <mat-card class="kpi-card">
          <mat-card-content>
            <mat-icon style="color:#1976d2">people</mat-icon>
            <div class="kpi-value">{{ stats.totalUsers }}</div>
            <div class="kpi-label">Utilisateurs</div>
            <div class="kpi-sub">
              {{ stats.totalProviders }} prestataires · {{ stats.totalClients }} clients
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <mat-icon style="color:#43a047">card_membership</mat-icon>
            <div class="kpi-value">{{ stats.activeSubscriptions }}</div>
            <div class="kpi-label">Abonnements actifs</div>
            <div class="kpi-sub">{{ stats.trialSubscriptions }} en période d'essai</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card">
          <mat-card-content>
            <mat-icon style="color:#f57c00">business_center</mat-icon>
            <div class="kpi-value">{{ stats.publishedServices }}</div>
            <div class="kpi-label">Services publiés</div>
            <div class="kpi-sub">{{ stats.totalServices }} au total</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card revenue">
          <mat-card-content>
            <mat-icon style="color:#7b1fa2">payments</mat-icon>
            <div class="kpi-value">
              {{ stats.estimatedMonthlyRevenue | number:'1.0-0' }} USD
            </div>
            <div class="kpi-label">Revenus estimés / mois</div>
            <div class="kpi-sub">{{ stats.totalNegotiations }} négociations</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Navigation rapide -->
      <div class="nav-cards" *ngIf="stats">
        <mat-card class="nav-card" routerLink="/admin/users">
          <mat-card-content>
            <mat-icon>manage_accounts</mat-icon>
            <span>Gérer les utilisateurs</span>
            <mat-icon class="arrow">arrow_forward</mat-icon>
          </mat-card-content>
        </mat-card>

        <mat-card class="nav-card" routerLink="/admin/subscriptions">
          <mat-card-content>
            <mat-icon>subscriptions</mat-icon>
            <span>Gérer les abonnements</span>
            <mat-icon class="arrow">arrow_forward</mat-icon>
          </mat-card-content>
        </mat-card>

        <mat-card class="nav-card" routerLink="/admin/categories">
          <mat-card-content>
            <mat-icon>category</mat-icon>
            <span>Gérer les catégories</span>
            <mat-icon class="arrow">arrow_forward</mat-icon>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-center"><mat-spinner></mat-spinner></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 28px; }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 24px;
    }
    @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
      border-radius: 12px;
      mat-card-content {
        display: flex; flex-direction: column;
        align-items: center; text-align: center; padding: 20px 12px;
        mat-icon { font-size: 36px; width: 36px; height: 36px; margin-bottom: 10px; }
      }
    }
    .kpi-value { font-size: 1.9rem; font-weight: 700; line-height: 1; }
    .kpi-label { font-size: 13px; color: #555; margin: 4px 0 2px; font-weight: 500; }
    .kpi-sub   { font-size: 11px; color: #999; }

    .nav-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media (max-width: 700px) { .nav-cards { grid-template-columns: 1fr; } }
    .nav-card {
      border-radius: 12px; cursor: pointer;
      transition: transform .2s, box-shadow .2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
      mat-card-content {
        display: flex; align-items: center; gap: 12px; padding: 20px;
        mat-icon { color: #1976d2; }
        span { flex: 1; font-weight: 500; }
        .arrow { color: #bbb; }
      }
    }
    .loading-center { display: flex; justify-content: center; padding: 64px; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getDashboard().subscribe({
      next: s  => this.stats = s,
      error: () => {}
    });
  }
}