import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-subscription-success',
  template: `
    <div class="result-page">

      <!-- Chargement -->
      <div class="result-card" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate" diameter="56"></mat-progress-spinner>
        <h2>Activation en cours…</h2>
        <p>Merci pour votre confiance. Nous activons votre abonnement.</p>
      </div>

      <!-- Succès -->
      <div class="result-card success" *ngIf="!loading && success">
        <div class="icon-circle">
          <mat-icon>check_circle</mat-icon>
        </div>
        <h1>Abonnement activé !</h1>
        <p>Votre abonnement est maintenant actif. Vous pouvez publier vos services.</p>
        <div class="actions">
          <a mat-raised-button color="primary" routerLink="/provider/services">
            <mat-icon>business_center</mat-icon> Gérer mes services
          </a>
          <a mat-stroked-button routerLink="/provider/dashboard">Dashboard</a>
        </div>
      </div>

      <!-- Erreur -->
      <div class="result-card error" *ngIf="!loading && !success">
        <div class="icon-circle error">
          <mat-icon>error</mat-icon>
        </div>
        <h1>Activation en attente</h1>
        <p>
          Votre paiement a été reçu par PayPal. L'activation sera confirmée
          automatiquement dans quelques instants via notre système de notifications.
        </p>
        <div class="actions">
          <a mat-raised-button color="primary" routerLink="/provider/subscription">
            Vérifier mon abonnement
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
      display: flex; flex-direction: column; align-items: center; gap: 16px;
    }
    .icon-circle {
      width: 80px; height: 80px; border-radius: 50%;
      background: #e8f5e9; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #43a047; }
      &.error { background: #fff3e0;
        mat-icon { color: #fb8c00; } }
    }
    h1 { font-size: 1.6rem; font-weight: 700; margin: 0; color: #1a1a2e; }
    h2 { font-size: 1.3rem; font-weight: 600; margin: 0; color: #555; }
    p { color: #666; font-size: 15px; line-height: 1.6; margin: 0; }
    .actions { display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: 8px; }
  `]
})
export class SubscriptionSuccessComponent implements OnInit {
  loading = true;
  success = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // PayPal v1 retourne ?token=EC-XXXXX dans l'URL après approbation
    const token = this.route.snapshot.queryParams['token'];

    if (token) {
      // Exécuter le billing agreement
      this.http.post(
        `${environment.apiUrl}/subscriptions/execute-agreement`,
        { token }
      ).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
        },
        error: () => {
          // L'activation peut se faire via webhook même si ça échoue ici
          this.loading = false;
          this.success = false;
        }
      });
    } else {
      // Pas de token — vérifier via webhook
      this.loading = false;
      this.success = false;
    }
  }
}