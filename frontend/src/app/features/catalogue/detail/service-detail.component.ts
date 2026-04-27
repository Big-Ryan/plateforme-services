import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CatalogueService } from '../../../core/services/catalogue.service';
import { NegotiationService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceDetail } from '../../../core/models/api.models';

@Component({
  selector: 'app-service-detail',
  template: `
    <div class="page-loading" *ngIf="loading">
      <mat-progress-spinner mode="indeterminate" diameter="56"></mat-progress-spinner>
    </div>

    <div class="detail-page" *ngIf="!loading && service">

      <nav class="breadcrumb">
        <a routerLink="/catalogue">
          <mat-icon>arrow_back</mat-icon> Catalogue
        </a>
        <span class="sep">/</span>
        <span>{{ service.categoryName || 'Service' }}</span>
      </nav>

      <div class="detail-layout">

        <!-- Colonne principale -->
        <div class="main-col">

          <!-- Images -->
          <div class="hero-images" *ngIf="service.images?.length">
            <img [src]="service.images![activeImage]" [alt]="service.title" class="hero-img">
            <div class="thumbs" *ngIf="service.images!.length > 1">
              <img *ngFor="let img of service.images; let i = index"
                   [src]="img" [class.active]="i === activeImage"
                   (click)="activeImage = i" class="thumb">
            </div>
          </div>
          <div class="hero-placeholder" *ngIf="!service.images?.length">
            <mat-icon>business_center</mat-icon>
          </div>

          <div class="service-info">
            <div class="category-tag" *ngIf="service.categoryName">{{ service.categoryName }}</div>
            <h1>{{ service.title }}</h1>

            <div class="meta-row">
              <span class="meta-item" *ngIf="service.location">
                <mat-icon>location_on</mat-icon> {{ service.location }}
              </span>
              <span class="meta-item" *ngIf="service.deliveryTime">
                <mat-icon>schedule</mat-icon> {{ service.deliveryTime }}
              </span>
              <span class="meta-item">
                <mat-icon>visibility</mat-icon> {{ service.viewCount }} vue(s)
              </span>
            </div>

            <mat-divider></mat-divider>

            <section class="section">
              <h2>Description</h2>
              <p class="description">{{ service.description || 'Aucune description fournie.' }}</p>
            </section>

            <section class="section" *ngIf="service.tags?.length">
              <h2>Compétences & tags</h2>
              <div class="tags-list">
                <span class="tag" *ngFor="let tag of service.tags">{{ tag }}</span>
              </div>
            </section>

            <section class="section">
              <h2>À propos du prestataire</h2>
              <div class="provider-card">
                <div class="provider-avatar">
                  <img *ngIf="service.providerLogoUrl" [src]="service.providerLogoUrl">
                  <div class="avatar-placeholder" *ngIf="!service.providerLogoUrl">
                    {{ (service.providerFirstName || '?')[0] }}{{ (service.providerLastName || '')[0] }}
                  </div>
                </div>
                <div class="provider-info">
                  <div class="provider-name">
                    <a [routerLink]="['/catalogue/provider', service.providerId]" class="provider-link">
                      {{ service.providerFirstName }} {{ service.providerLastName }}
                    </a>
                    <span class="verified-badge" *ngIf="service.providerVerified">
                      <mat-icon>verified</mat-icon> Vérifié
                    </span>
                  </div>
                  <div class="provider-company" *ngIf="service.providerCompanyName">
                    {{ service.providerCompanyName }}
                  </div>
                  <div class="provider-phone" *ngIf="service.providerPhone">
                    <mat-icon>phone</mat-icon> {{ service.providerPhone }}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <!-- Colonne latérale -->
        <aside class="side-col">

          <div class="price-card">
            <div class="price-label">Tarif</div>
            <div class="price-value" *ngIf="service.priceFrom">
              <span class="from">À partir de</span>
              <span class="amount">{{ service.priceFrom | number:'1.0-0' }}</span>
              <span class="currency">{{ service.currency || 'XAF' }}</span>
            </div>
            <div class="no-price" *ngIf="!service.priceFrom">Prix sur demande</div>
            <div class="price-range" *ngIf="service.priceFrom && service.priceTo">
              jusqu'à {{ service.priceTo | number:'1.0-0' }} {{ service.currency }}
            </div>
          </div>

          <div class="contact-card">
            <h3><mat-icon>chat</mat-icon> Contacter le prestataire</h3>

            <!-- Non connecté -->
            <div class="login-prompt" *ngIf="!isAuthenticated">
              <p>Connectez-vous pour envoyer un message et démarrer une négociation.</p>
              <a mat-raised-button color="primary" routerLink="/auth/login"
                 [queryParams]="{returnUrl: currentUrl}">
                Se connecter
              </a>
              <a mat-stroked-button routerLink="/auth/register"
                 [queryParams]="{returnUrl: currentUrl}">
                Créer un compte
              </a>
            </div>

            <!-- Prestataire sur son propre service -->
            <div class="own-service-msg" *ngIf="isAuthenticated && isOwnService">
              <mat-icon color="primary">info</mat-icon>
              <p>Il s'agit de votre propre service.</p>
            </div>

            <!-- Formulaire contact -->
            <form [formGroup]="contactForm" (ngSubmit)="sendContact()"
                  *ngIf="isAuthenticated && !isOwnService && !contactSent">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Décrivez votre besoin</mat-label>
                <textarea matInput formControlName="initialMessage" rows="5"
                          placeholder="Bonjour, je suis intéressé par votre service et je souhaite discuter de...">
                </textarea>
                <mat-hint align="end">
                  {{ contactForm.get('initialMessage')?.value?.length || 0 }}/2000
                </mat-hint>
                <mat-error>Minimum 10 caractères requis</mat-error>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                      class="full-width send-btn"
                      [disabled]="contactForm.invalid || contactLoading">
                <mat-progress-spinner *ngIf="contactLoading" diameter="20"
                                      mode="indeterminate"
                                      style="display:inline-block;margin-right:8px">
                </mat-progress-spinner>
                <mat-icon *ngIf="!contactLoading">send</mat-icon>
                {{ contactLoading ? 'Envoi...' : 'Envoyer ma demande' }}
              </button>
            </form>

            <!-- Confirmation -->
            <div class="contact-sent" *ngIf="contactSent">
              <mat-icon style="color:#43a047">check_circle</mat-icon>
              <p>Votre demande a bien été envoyée !</p>
              <a mat-stroked-button color="primary" routerLink="/client/negotiations">
                Voir mes négociations <mat-icon>arrow_forward</mat-icon>
              </a>
            </div>
          </div>

        </aside>
      </div>
    </div>

    <div class="not-found" *ngIf="!loading && !service">
      <mat-icon>search_off</mat-icon>
      <h2>Service introuvable</h2>
      <a mat-raised-button color="primary" routerLink="/catalogue">Retour au catalogue</a>
    </div>
  `,
  styles: [`
    .page-loading {
      display: flex; justify-content: center; align-items: center;
      min-height: calc(100vh - 64px);
    }
    .detail-page {
      max-width: 1200px; margin: 0 auto; padding: 24px;
      background: #f5f7fa; min-height: calc(100vh - 64px);
    }
    .breadcrumb {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 24px; font-size: 14px; color: #666;
      a { color: #1976d2; text-decoration: none; display: flex; align-items: center; gap: 4px;
          &:hover { text-decoration: underline; }
          mat-icon { font-size: 18px; width: 18px; height: 18px; } }
      .sep { color: #bbb; }
    }
    .detail-layout {
      display: grid; grid-template-columns: 1fr 360px; gap: 28px; align-items: start;
    }
    @media (max-width: 900px) { .detail-layout { grid-template-columns: 1fr; } }

    .main-col {
      background: white; border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden;
    }
    .hero-img { width: 100%; height: 360px; object-fit: cover; display: block; }
    .thumbs {
      display: flex; gap: 8px; padding: 12px 16px;
      background: #fafafa; border-bottom: 1px solid #f0f0f0;
    }
    .thumb {
      width: 72px; height: 54px; object-fit: cover; border-radius: 6px;
      cursor: pointer; opacity: 0.6; transition: opacity .2s; border: 2px solid transparent;
      &.active, &:hover { opacity: 1; border-color: #1976d2; }
    }
    .hero-placeholder {
      height: 260px; background: #e3f2fd;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 80px; width: 80px; height: 80px; color: #90caf9; }
    }
    .service-info { padding: 28px 32px; }
    .category-tag {
      display: inline-block; background: #e3f2fd; color: #1565c0;
      font-size: 12px; font-weight: 500; padding: 3px 12px; border-radius: 20px;
      margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    h1 { font-size: 1.8rem; font-weight: 700; color: #1a1a2e; margin: 0 0 16px; }
    .meta-row { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
    .meta-item {
      display: flex; align-items: center; gap: 4px; font-size: 13px; color: #666;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #1976d2; }
    }
    .section { margin: 24px 0; }
    .section h2 {
      font-size: 1.05rem; font-weight: 600; color: #333;
      margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e3f2fd;
    }
    .description { font-size: 15px; line-height: 1.75; color: #444; white-space: pre-wrap; margin: 0; }
    .tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      background: #f5f5f5; color: #555; font-size: 13px;
      padding: 4px 14px; border-radius: 20px; border: 1px solid #e0e0e0;
    }
    .provider-card {
      display: flex; align-items: center; gap: 16px;
      background: #fafafa; border-radius: 12px; padding: 16px; border: 1px solid #f0f0f0;
    }
    .provider-avatar img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
    .avatar-placeholder {
      width: 56px; height: 56px; border-radius: 50%; background: #1976d2; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 700; text-transform: uppercase; flex-shrink: 0;
    }
    .provider-name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .provider-link { color: #1976d2; text-decoration: none; &:hover { text-decoration: underline; } }
    .verified-badge {
      display: inline-flex; align-items: center; gap: 2px;
      background: #e8f5e9; color: #2e7d32; font-size: 11px;
      padding: 2px 8px; border-radius: 10px; font-weight: 500;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .provider-company { color: #666; font-size: 13px; margin-top: 2px; }
    .provider-phone {
      display: flex; align-items: center; gap: 4px; color: #666; font-size: 13px; margin-top: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    /* Sidebar */
    .side-col { display: flex; flex-direction: column; gap: 20px; }
    .price-card {
      background: white; border-radius: 16px; padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-top: 4px solid #1976d2;
    }
    .price-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 8px; }
    .price-value { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
    .from { font-size: 13px; color: #666; }
    .amount { font-size: 2rem; font-weight: 800; color: #1565c0; line-height: 1; }
    .currency { font-size: 14px; color: #666; font-weight: 500; }
    .no-price { font-size: 1.1rem; color: #666; font-style: italic; }
    .price-range { font-size: 13px; color: #999; margin-top: 4px; }

    .contact-card {
      background: white; border-radius: 16px; padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .contact-card h3 {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.05rem; font-weight: 600; margin: 0 0 20px;
      mat-icon { color: #1976d2; }
    }
    .full-width { width: 100%; }
    .send-btn {
      height: 48px; font-size: 15px; font-weight: 600; margin-top: 4px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .login-prompt {
      display: flex; flex-direction: column; gap: 10px; text-align: center;
      p { color: #666; font-size: 14px; margin: 0 0 8px; }
    }
    .own-service-msg {
      display: flex; align-items: center; gap: 8px;
      background: #e3f2fd; border-radius: 10px; padding: 12px 16px;
      p { margin: 0; font-size: 14px; color: #1565c0; }
    }
    .contact-sent {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; text-align: center; padding: 16px 0;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { color: #2e7d32; font-weight: 500; margin: 0; }
    }
    .not-found {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: calc(100vh - 120px);
      gap: 16px; color: #bbb;
      mat-icon { font-size: 64px; width: 64px; height: 64px; }
      h2 { color: #888; margin: 0; }
    }
  `]
})
export class ServiceDetailComponent implements OnInit {

  service: ServiceDetail | null = null;
  loading = true;
  contactLoading = false;
  contactSent = false;
  isAuthenticated = false;
  isOwnService = false;
  activeImage = 0;
  currentUrl = '';
  contactForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private catalogueService: CatalogueService,
    private negotiationService: NegotiationService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.contactForm = this.fb.group({
      initialMessage: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    });
  }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.currentUrl = '/catalogue/' + id;

    this.catalogueService.getServiceDetail(id).subscribe({
      next: s => {
        this.service = s;
        this.loading = false;
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && s.providerId === currentUser.id) {
          this.isOwnService = true;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  sendContact(): void {
    if (this.contactForm.invalid || !this.service) return;
    this.contactLoading = true;

    this.negotiationService.initiate({
      serviceId: this.service.id,
      initialMessage: this.contactForm.value.initialMessage,
    }).subscribe({
      next: () => {
        this.contactLoading = false;
        this.contactSent = true;
        this.toastr.success('Votre demande a été envoyée au prestataire !');
      },
      error: err => {
        this.contactLoading = false;
        this.toastr.error(err?.message || 'Erreur lors de l\'envoi');
      }
    });
  }
}