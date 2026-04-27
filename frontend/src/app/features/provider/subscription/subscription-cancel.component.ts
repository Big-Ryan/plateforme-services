import { Component } from '@angular/core';

@Component({
  selector: 'app-subscription-cancel',
  template: `
    <div class="result-page">
      <div class="result-card cancel">
        <div class="icon-circle">
          <mat-icon>cancel</mat-icon>
        </div>
        <h1>Paiement annulé</h1>
        <p>Vous avez annulé le processus de paiement. Votre abonnement n'a pas été activé.</p>
        <p class="sub-text">Vous pouvez réessayer à tout moment.</p>
        <div class="actions">
          <a mat-raised-button color="primary" routerLink="/provider/subscription">
            <mat-icon>refresh</mat-icon> Réessayer
          </a>
          <a mat-stroked-button routerLink="/provider/dashboard">
            Retour au dashboard
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .result-page {
      display: flex; justify-content: center; align-items: center;
      min-height: calc(100vh - 64px); background: #f5f7fa; padding: 24px;
    }
    .result-card {
      background: white; border-radius: 20px; padding: 48px 40px;
      max-width: 480px; width: 100%; text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    }
    .icon-circle {
      width: 80px; height: 80px; border-radius: 50%;
      background: #fce4ec; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 24px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #e53935; }
    }
    h1 { font-size: 1.6rem; font-weight: 700; margin: 0 0 16px; color: #1a1a2e; }
    p { color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 8px; }
    .sub-text { font-size: 14px; color: #999; margin-bottom: 32px; }
    .actions { display: flex; flex-direction: column; gap: 12px; }
  `]
})
export class SubscriptionCancelComponent {}