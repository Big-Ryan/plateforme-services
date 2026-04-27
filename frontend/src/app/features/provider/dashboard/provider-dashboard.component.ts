import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogueService } from '../../../core/services/catalogue.service';
import { SubscriptionService, NegotiationService } from '../../../core/services/domain.services';
import { UserInfo, ProviderSubscription } from '../../../core/models/api.models';
import { ApiService } from '../../../core/services/api.service';
import { ReferralService } from '../../../core/services/domain.services';
import { ReferralStats } from '../../../core/models/api.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-provider-dashboard',
  template: `
    <div class="dashboard-page">
      <div class="dashboard-header">
        <h1>Tableau de bord</h1>
        <p>Bonjour {{ user?.firstName }} !</p>
      </div>

      <!-- Logo / profil -->
      <mat-card class="profile-card">
        <mat-card-content>
          <div class="profile-row">
            <div class="logo-container" (click)="logoInput.click()"
                 matTooltip="Changer le logo">
              <img *ngIf="user?.logoUrl" [src]="user!.logoUrl" class="logo-img"
                   [alt]="user?.firstName">
              <div class="logo-placeholder" *ngIf="!user?.logoUrl">
                <mat-icon>add_a_photo</mat-icon>
                <span>Ajouter un logo</span>
              </div>
              <div class="logo-overlay">
                <mat-icon>photo_camera</mat-icon>
              </div>
              <mat-progress-spinner *ngIf="uploadingLogo" diameter="40"
                                    mode="indeterminate" class="logo-spinner">
              </mat-progress-spinner>
            </div>
            <input #logoInput type="file" accept="image/jpeg,image/png,image/webp"
                   hidden (change)="onLogoSelected($event)">
            <div class="profile-info">
              <h2>{{ user?.firstName }} {{ user?.lastName }}</h2>
              <p class="profile-email">{{ user?.email }}</p>
              <p class="logo-hint" *ngIf="!user?.logoUrl">
                Ajoutez un logo pour inspirer confiance aux clients
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="subscription-banner"
                [class.active]="sub?.status === 'ACTIVE'"
                [class.trial]="sub?.status === 'TRIAL'"
                [class.expired]="!sub || sub.status === 'EXPIRED' || sub.status === 'CANCELLED'">
        <mat-card-content>
          <div class="sub-info">
            <mat-icon>{{ subIcon }}</mat-icon>
            <div>
              <strong>{{ subTitle }}</strong>
              <p>{{ subDescription }}</p>
            </div>
          </div>
          <a mat-raised-button routerLink="/provider/subscription"
             *ngIf="!sub || sub.status === 'EXPIRED' || sub.status === 'CANCELLED'">
            Souscrire maintenant
          </a>
          <span class="sub-badge" *ngIf="sub && sub.status === 'ACTIVE'">
            Expire le {{ sub.endDate | date:'dd/MM/yyyy' }}
          </span>
          <span class="trial-badge" *ngIf="sub && sub.status === 'TRIAL'">
            Essai jusqu'au {{ sub.trialEndDate | date:'dd/MM/yyyy' }}
          </span>
        </mat-card-content>
      </mat-card>

      <div class="kpi-grid" *ngIf="!loading">
        <mat-card class="kpi-card">
          <mat-card-content>
            <mat-icon color="primary">business_center</mat-icon>
            <div class="kpi-value">{{ stats.publishedServices }}</div>
            <div class="kpi-label">Services publiés</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-card-content>
            <mat-icon color="accent">forum</mat-icon>
            <div class="kpi-value">{{ stats.totalNegotiations }}</div>
            <div class="kpi-label">Négociations</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="kpi-card">
          <mat-card-content>
            <mat-icon style="color:#f57c00">mark_unread_chat_alt</mat-icon>
            <div class="kpi-value">{{ stats.unreadMessages }}</div>
            <div class="kpi-label">Messages non lus</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="quick-actions">
        <mat-card-header>
          <mat-card-title>Actions rapides</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="actions-row">
            <a mat-raised-button color="primary" routerLink="/provider/services">
              <mat-icon>add</mat-icon> Ajouter un service
            </a>
            <a mat-stroked-button routerLink="/provider/negotiations">
              <mat-icon>forum</mat-icon> Voir les négociations
            </a>
            <a mat-stroked-button routerLink="/provider/subscription">
              <mat-icon>card_membership</mat-icon> Mon abonnement
            </a>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Parrainage -->
      <mat-card class="referral-card" *ngIf="user?.role === 'PROVIDER'">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>people</mat-icon> Programme de parrainage
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="referral-body">
            <div class="referral-code-section">
              <div class="code-label">Votre code de parrainage</div>
              <div class="code-display">
                <span class="code">{{ referralCode }}</span>
                <button mat-icon-button (click)="copyCode()" matTooltip="Copier">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              <div class="code-hint">Partagez ce code — pour chaque filleul qui souscrit, vous gagnez une récompense !</div>
            </div>

            <ng-container *ngIf="referralStats; else loadingStats">
              <div class="referral-stats">
                <div class="stat-item">
                  <span class="stat-num">{{ referralStats!.validated }}</span>
                  <span class="stat-lbl">Filleuls actifs</span>
                </div>
                <div class="stat-item">
                  <span class="stat-num">{{ referralStats!.pending }}</span>
                  <span class="stat-lbl">En attente</span>
                </div>
              </div>

              <div class="tier-section">
                <div class="tier-badge" [ngClass]="getTierClass()">
                  <mat-icon>{{ getTierIcon() }}</mat-icon>
                  {{ getTierLabel() }}
                </div>
                <div class="tier-progress" *ngIf="referralStats!.toNextTier > 0">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="getTierProgress()"></div>
                  </div>
                  <span class="progress-text">
                    Encore {{ referralStats!.toNextTier }} filleul(s) pour le prochain palier
                  </span>
                </div>
                <div class="max-tier" *ngIf="referralStats!.toNextTier === 0 || referralStats!.currentTier === 'DISCOUNT_20'">
                  🎉 Palier maximum atteint — 20% de réduction permanente !
                </div>
              </div>

              <!-- Paliers -->
              <div class="tiers-list">
                <div class="tier-item" [class.reached]="referralStats!.validated >= 1">
                  <mat-icon>{{ referralStats!.validated >= 1 ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  <span><strong>1 filleul</strong> — Badge Ambassadeur</span>
                </div>
                <div class="tier-item" [class.reached]="referralStats!.validated >= 3">
                  <mat-icon>{{ referralStats!.validated >= 3 ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  <span><strong>3 filleuls</strong> — 1 mois offert</span>
                </div>
                <div class="tier-item" [class.reached]="referralStats!.validated >= 5">
                  <mat-icon>{{ referralStats!.validated >= 5 ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  <span><strong>5 filleuls</strong> — 20% de réduction permanente</span>
                </div>
              </div>
            </ng-container>

            <ng-template #loadingStats>
              <div style="text-align:center; color:#bbb; padding: 16px;">
                <mat-progress-spinner mode="indeterminate" diameter="32" style="margin: 0 auto"></mat-progress-spinner>
              </div>
            </ng-template>
          </div>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    .dashboard-page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .profile-card { border-radius: 12px; margin-bottom: 24px; }
    .profile-row { display: flex; align-items: center; gap: 20px; }
    .logo-container {
      position: relative; width: 80px; height: 80px; border-radius: 50%;
      cursor: pointer; flex-shrink: 0; overflow: hidden;
      border: 3px solid #e0e0e0; transition: border-color .2s;
      &:hover { border-color: #1976d2; }
      &:hover .logo-overlay { opacity: 1; }
    }
    .logo-img { width: 100%; height: 100%; object-fit: cover; }
    .logo-placeholder {
      width: 100%; height: 100%; background: #e3f2fd;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 2px;
      mat-icon { font-size: 24px; width: 24px; height: 24px; color: #1976d2; }
      span { font-size: 9px; color: #1976d2; text-align: center; line-height: 1.2; }
    }
    .logo-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .2s;
      mat-icon { color: white; font-size: 28px; width: 28px; height: 28px; }
    }
    .logo-spinner { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); }
    .profile-info h2 { font-size: 1.2rem; font-weight: 700; margin: 0 0 4px; }
    .profile-email { color: #666; font-size: 13px; margin: 0 0 4px; }
    .logo-hint { font-size: 12px; color: #999; margin: 0; font-style: italic; }
    .dashboard-header { margin-bottom: 24px; }
    .dashboard-header h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 4px; }
    .dashboard-header p { color: #666; margin: 0; }
    .subscription-banner { margin-bottom: 24px; border-radius: 12px; border-left: 4px solid #ccc; }
    .subscription-banner.active  { border-color: #43a047; background: #f1f8e9; }
    .subscription-banner.trial   { border-color: #fb8c00; background: #fff8e1; }
    .subscription-banner.expired { border-color: #e53935; background: #ffebee; }
    .subscription-banner mat-card-content { display: flex; justify-content: space-between; align-items: center; }
    .sub-info { display: flex; align-items: center; gap: 12px; flex: 1; }
    .sub-info mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .sub-info strong { font-size: 1rem; }
    .sub-info p { margin: 0; font-size: 13px; color: #555; }
    .sub-badge, .trial-badge { font-size: 13px; color: #555; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { border-radius: 12px; }
    .kpi-card mat-card-content { padding: 24px 16px; text-align: center; }
    .kpi-card mat-icon { font-size: 36px; width: 36px; height: 36px; margin-bottom: 8px; }
    .kpi-value { font-size: 2rem; font-weight: 700; }
    .kpi-label { font-size: 13px; color: #666; margin-top: 4px; }
    .quick-actions { border-radius: 12px; margin-bottom: 24px; }
    .actions-row { display: flex; gap: 12px; flex-wrap: wrap; padding: 8px 0; }
  `]
})
export class ProviderDashboardComponent implements OnInit {

  user: UserInfo | null = null;
  sub: ProviderSubscription | undefined;
  loading = true;
  stats = { publishedServices: 0, totalNegotiations: 0, unreadMessages: 0 };

  uploadingLogo = false;
  referralStats: ReferralStats | null = null;
  referralCode = '';
  subIcon = 'warning';
  subTitle = 'Aucun abonnement actif';
  subDescription = 'Souscrivez pour publier vos services et recevoir des clients.';

  constructor(
    private authService: AuthService,
    private catalogueService: CatalogueService,
    private subscriptionService: SubscriptionService,
    private negotiationService: NegotiationService,
    private apiService: ApiService,
    private referralService: ReferralService
  ) {}

  copyCode(): void {
    if (this.referralCode) {
      navigator.clipboard.writeText(this.referralCode);
    }
  }

  getTierClass(): string {
    return { NONE: 'none', AMBASSADOR: 'ambassador',
             ONE_MONTH_FREE: 'month-free', DISCOUNT_20: 'discount' }
      [this.referralStats?.currentTier ?? 'NONE'] ?? 'none';
  }

  getTierIcon(): string {
    return { NONE: 'circle', AMBASSADOR: 'star', ONE_MONTH_FREE: 'card_giftcard', DISCOUNT_20: 'local_offer' }
      [this.referralStats?.currentTier ?? 'NONE'] ?? 'circle';
  }

  getTierLabel(): string {
    return { NONE: 'Pas encore de palier', AMBASSADOR: 'Ambassadeur',
             ONE_MONTH_FREE: '1 mois offert', DISCOUNT_20: '20% de réduction' }
      [this.referralStats?.currentTier ?? 'NONE'] ?? '';
  }

  getTierProgress(): number {
    if (!this.referralStats) return 0;
    const prev = { NONE: 0, AMBASSADOR: 1, ONE_MONTH_FREE: 3, DISCOUNT_20: 5 }[this.referralStats.currentTier] ?? 0;
    const next = this.referralStats.nextThreshold;
    if (next <= 0) return 100;
    return Math.round(((this.referralStats.validated - prev) / (next - prev)) * 100);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploadingLogo = true;
    this.catalogueService.uploadLogo(file).subscribe({
      next: result => {
        if (this.user) this.user = { ...this.user, logoUrl: result.url };
        this.uploadingLogo = false;
      },
      error: () => { this.uploadingLogo = false; }
    });
    input.value = '';
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user?.role === 'PROVIDER') {
      this.referralService.getMyCode().subscribe({ next: r => this.referralCode = r as any, error: () => {} });
      this.referralService.getMyStats().subscribe({ next: s => this.referralStats = s, error: () => {} });
    }
    // Toujours recharger le profil complet depuis le backend pour avoir logoUrl à jour
    this.apiService.getMyProfile().subscribe({
      next: (profile: any) => {
        // get() unwrap déjà r.data, donc profile est directement le profil
        if (profile?.logoUrl) {
          const current = this.authService.getCurrentUser();
          this.user = { ...current!, logoUrl: profile.logoUrl };
        }
      },
      error: () => {}
    });

    forkJoin({
      sub:   this.subscriptionService.getCurrentSubscription(),
      svcs:  this.catalogueService.getMyServices(0, 1),
      negos: this.negotiationService.getProviderNegotiations(0, 1),
    }).subscribe({
      next: ({ sub, svcs, negos }) => {
        this.sub = sub;
        this.stats.publishedServices = svcs.totalElements;
        this.stats.totalNegotiations = negos.totalElements;
        this.stats.unreadMessages    = negos.content.reduce((s, n) => s + n.unreadCount, 0);
        this.loading = false;
        this.updateSubDisplay();
      },
      error: () => { this.loading = false; }
    });
  }

  private updateSubDisplay(): void {
    if (!this.sub) {
      this.subIcon        = 'warning';
      this.subTitle       = 'Aucun abonnement actif';
      this.subDescription = 'Souscrivez pour publier vos services et recevoir des clients.';
      return;
    }
    const status = this.sub.status;
    const iconMap: Record<string, string> = {
      ACTIVE: 'check_circle', TRIAL: 'hourglass_top',
      EXPIRED: 'cancel', CANCELLED: 'cancel',
      SUSPENDED: 'pause_circle', PENDING: 'schedule'
    };
    const titleMap: Record<string, string> = {
      ACTIVE:    'Abonnement ' + this.sub.plan.name + ' actif',
      TRIAL:     'Periode essai en cours',
      EXPIRED:   'Abonnement expire',
      CANCELLED: 'Abonnement annule',
      PENDING:   'Paiement en attente',
      SUSPENDED: 'Abonnement suspendu'
    };
    this.subIcon  = iconMap[status]  || 'info';
    this.subTitle = titleMap[status] || '';

    if (status === 'TRIAL') {
      this.subDescription = 'Vos services sont visibles. Abonnez-vous avant la fin de l essai.';
    } else if (status === 'ACTIVE') {
      this.subDescription = 'Plan : ' + this.sub.plan.name + ' - ' + this.sub.plan.maxServices + ' services max.';
    } else {
      this.subDescription = 'Vos services sont masques. Renouvelez votre abonnement.';
    }
  }
}