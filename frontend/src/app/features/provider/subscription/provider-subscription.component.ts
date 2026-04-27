import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { SubscriptionService } from '../../../core/services/domain.services';
import { SubscriptionPlan, ProviderSubscription } from '../../../core/models/api.models';

@Component({
  selector: 'app-provider-subscription',
  template: `
    <div class="sub-page">
      <div class="page-header">
        <h1>Abonnement</h1>
        <p>Choisissez votre plan pour publier vos services</p>
      </div>

      <!-- Abonnement actif -->
      <mat-card class="current-sub-card" *ngIf="currentSub">
        <mat-card-header>
          <mat-icon mat-card-avatar color="primary">card_membership</mat-icon>
          <mat-card-title>Abonnement actuel : {{ currentSub.plan.name }}</mat-card-title>
          <mat-card-subtitle>Statut : {{ currentSub.status }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="sub-details">
            <div><span>Début</span><strong>{{ currentSub.startDate | date:'dd/MM/yyyy' }}</strong></div>
            <div><span>Fin</span><strong>{{ currentSub.endDate | date:'dd/MM/yyyy' }}</strong></div>
            <div><span>Services max</span><strong>{{ currentSub.plan.maxServices }}</strong></div>
            <div *ngIf="currentSub.inTrial">
              <span>Fin essai</span>
              <strong>{{ currentSub.trialEndDate | date:'dd/MM/yyyy' }}</strong>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Grille des plans -->
      <h2>Nos plans</h2>
      <div class="plans-grid" *ngIf="plans.length; else loadingTpl">
        <mat-card class="plan-card"
                  *ngFor="let plan of plans"
                  [class.featured]="plan.billingPeriod === 'QUARTERLY'"
                  [class.current]="currentSub?.plan?.id === plan.id">

          <div class="plan-badge" *ngIf="plan.billingPeriod === 'QUARTERLY'">
            Populaire
          </div>
          <div class="plan-badge current-badge" *ngIf="currentSub?.plan?.id === plan.id">
            Actuel
          </div>

          <mat-card-header>
            <mat-card-title>{{ plan.name }}</mat-card-title>
            <mat-card-subtitle>{{ getPeriodLabel(plan.billingPeriod) }}</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="plan-price">
              <span class="amount">{{ plan.price | number }}</span>
              <span class="currency">{{ plan.currency }}</span>
            </div>

            <div class="trial-info" *ngIf="plan.trialDays > 0">
              <mat-icon>hourglass_top</mat-icon>
              {{ plan.trialDays }} jours d'essai gratuit
            </div>

            <mat-divider></mat-divider>

            <ul class="features-list">
              <li>
                <mat-icon color="primary">check</mat-icon>
                {{ plan.maxServices }} services publiés
              </li>
              <li *ngFor="let feat of getPlanFeatures(plan)">
                <mat-icon color="primary">check</mat-icon>
                {{ feat }}
              </li>
            </ul>
          </mat-card-content>

          <mat-card-actions>
            <button mat-raised-button
                    [color]="plan.billingPeriod === 'QUARTERLY' ? 'accent' : 'primary'"
                    class="full-width"
                    [disabled]="loadingPlanId === plan.id || !!currentSub"
                    (click)="subscribeToPlan(plan)">
              <mat-spinner *ngIf="loadingPlanId === plan.id" diameter="20"></mat-spinner>
              <span *ngIf="loadingPlanId !== plan.id">
                {{ currentSub?.plan?.id === plan.id ? 'Plan actuel' :
                   plan.trialDays > 0 ? 'Démarrer l\'essai gratuit' : 'Souscrire' }}
              </span>
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-center"><mat-spinner></mat-spinner></div>
      </ng-template>

      <!-- Note PayPal -->
      <mat-card class="paypal-note">
        <mat-card-content>
          <mat-icon>info</mat-icon>
          <p>Le paiement s'effectue via PayPal de manière sécurisée. Frais de transaction : ~3.49% + frais fixes.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .sub-page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }
    .page-header { margin-bottom: 32px; h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 4px; } p { color: #666; } }

    .current-sub-card { border-radius: 12px; margin-bottom: 32px; border-left: 4px solid #43a047; }
    .sub-details { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 8px 0;
      div { span { display: block; font-size: 12px; color: #666; } strong { font-size: 1.1rem; } }
    }

    h2 { font-size: 1.3rem; font-weight: 600; margin-bottom: 20px; }

    .plans-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px;
    }
    @media (max-width: 768px) { .plans-grid { grid-template-columns: 1fr; } }

    .plan-card {
      border-radius: 16px; position: relative; transition: transform .2s, box-shadow .2s;
      &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
      &.featured { border: 2px solid #ff6f00; }
      &.current  { border: 2px solid #43a047; }
    }
    .plan-badge {
      position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
      background: #ff6f00; color: white; padding: 2px 16px;
      border-radius: 12px; font-size: 12px; font-weight: 600;
    }
    .current-badge { background: #43a047; }

    .plan-price { text-align: center; padding: 16px 0 8px; }
    .amount { font-size: 2.2rem; font-weight: 700; }
    .currency { font-size: 1rem; color: #666; margin-left: 4px; }

    .trial-info {
      display: flex; align-items: center; gap: 6px; justify-content: center;
      font-size: 13px; color: #f57c00; padding: 8px 0;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .features-list { list-style: none; padding: 16px 0 8px; margin: 0;
      li { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 14px; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .full-width { width: 100%; }

    .paypal-note {
      border-radius: 8px; background: #f5f5f5;
      mat-card-content { display: flex; align-items: center; gap: 12px; }
      mat-icon { color: #1565c0; }
      p { margin: 0; font-size: 13px; color: #555; }
    }
    .loading-center { display: flex; justify-content: center; padding: 64px; }
  `]
})
export class ProviderSubscriptionComponent implements OnInit {

  plans: SubscriptionPlan[] = [];
  currentSub: ProviderSubscription | undefined;
  loadingPlanId: string | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.subscriptionService.getPlans().subscribe(p => this.plans = p);
    this.subscriptionService.getCurrentSubscription().subscribe(s => this.currentSub = s);
  }

  subscribeToPlan(plan: SubscriptionPlan): void {
    this.loadingPlanId = plan.id;
    this.subscriptionService.subscribe(plan.id).subscribe({
      next: res => {
        this.loadingPlanId = null;
        if (res.requiresPayment && res.approvalUrl) {
          window.location.href = res.approvalUrl;
        } else {
          this.toastr.success(res.message || 'Abonnement activé !');
          this.subscriptionService.getCurrentSubscription().subscribe(s => this.currentSub = s);
        }
      },
      error: err => {
        this.loadingPlanId = null;
        this.toastr.error(err?.message || 'Erreur lors de la souscription');
      }
    });
  }

  getPeriodLabel(period: string): string {
    return { MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', ANNUAL: 'Annuel' }[period] ?? period;
  }

  getPlanFeatures(plan: SubscriptionPlan): string[] {
    const f = plan.features as Record<string, string[]> | null;
    return f?.['highlights'] ?? [];
  }
}
