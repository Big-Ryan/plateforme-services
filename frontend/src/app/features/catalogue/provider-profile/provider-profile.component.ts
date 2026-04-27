import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CatalogueService } from '../../../core/services/catalogue.service';
import { ReviewService } from '../../../core/services/domain.services';
import { ReviewResponse, RatingSummary } from '../../../core/models/api.models';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { ServiceSummary } from '../../../core/models/api.models';
import { map } from 'rxjs/operators';

interface ProviderProfile {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
  website?: string;
  verified: boolean;
  memberSince: string;
}

@Component({
  selector: 'app-provider-profile',
  // StarRatingComponent est standalone — importé directement
  template: `
    <div class="page-loading" *ngIf="loading">
      <mat-progress-spinner mode="indeterminate" diameter="56"></mat-progress-spinner>
    </div>

    <div class="profile-page" *ngIf="!loading && provider">
      <nav class="breadcrumb">
        <a routerLink="/catalogue"><mat-icon>arrow_back</mat-icon> Catalogue</a>
        <span class="sep">/</span>
        <span>{{ provider!.companyName || provider!.firstName + ' ' + provider!.lastName }}</span>
      </nav>

      <div class="profile-header">
        <div class="header-avatar">
          <img *ngIf="provider.logoUrl" [src]="provider!.logoUrl" [alt]="provider!.firstName">
          <div class="avatar-placeholder" *ngIf="!provider.logoUrl">
            {{ provider!.firstName[0] }}{{ provider!.lastName[0] }}
          </div>
        </div>
        <div class="header-info">
          <div class="header-name">
            {{ provider!.firstName }} {{ provider!.lastName }}
            <span class="verified-badge" *ngIf="provider!.verified">
              <mat-icon>verified</mat-icon> Vérifié
            </span>
          </div>
          <div class="header-company" *ngIf="provider!.companyName">
            <mat-icon>business</mat-icon> {{ provider!.companyName }}
          </div>
          <div class="header-meta">
            <span *ngIf="provider!.city">
              <mat-icon>location_on</mat-icon> {{ provider!.city }}
            </span>
            <span>
              <mat-icon>calendar_today</mat-icon>
              Membre depuis {{ provider!.memberSince | date:'MMMM yyyy' }}
            </span>
            <a *ngIf="provider!.website" [href]="provider!.website" target="_blank" class="website-link">
              <mat-icon>language</mat-icon> Site web
            </a>
          </div>
          <p class="header-desc" *ngIf="provider!.description">{{ provider!.description }}</p>
        </div>
      </div>

      <!-- Résumé des notes -->
      <div class="rating-summary" *ngIf="ratingSummary">
        <div class="rating-big">
          <span class="avg">{{ ratingSummary.averageRating | number:'1.1-1' }}</span>
          <div class="stars-col">
            <div class="star-row" *ngFor="let row of ratingRows">
              <span class="star-label">{{ row.label }}</span>
              <div class="bar-bg">
                <div class="bar-fill" [style.width.%]="getPercent(row.count)"></div>
              </div>
              <span class="bar-count">{{ row.count }}</span>
            </div>
          </div>
          <div class="total-reviews">
            <mat-icon>star</mat-icon>
            {{ ratingSummary.totalReviews }} avis
          </div>
        </div>
      </div>

      <!-- Avis clients -->
      <div class="reviews-section">
        <h2>Avis clients ({{ ratingSummary?.totalReviews || 0 }})</h2>
        <div class="no-reviews" *ngIf="reviews.length === 0">
          <mat-icon>star_border</mat-icon>
          <p>Aucun avis pour l'instant</p>
        </div>
        <div class="review-card" *ngFor="let r of reviews">
          <div class="review-header">
            <div class="reviewer-avatar">{{ r.clientName[0] }}</div>
            <div class="reviewer-info">
              <div class="reviewer-name">{{ r.clientName }}</div>
              <div class="reviewer-meta">
                <span *ngFor="let s of [1,2,3,4,5]" class="star-sm"
                      [class.filled]="s <= r.rating">★</span>
                <span class="review-date">{{ r.createdAt | date:'d MMM yyyy' }}</span>
              </div>
            </div>
          </div>
          <p class="review-comment" *ngIf="r.comment">{{ r.comment }}</p>
          <p class="review-service">
            <mat-icon>business_center</mat-icon> {{ r.serviceTitle }}
          </p>
        </div>
      </div>

      <div class="services-section">
        <h2>Services proposés ({{ services.length }})</h2>
        <div class="loading-center" *ngIf="loadingServices">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        </div>
        <div class="empty-services" *ngIf="!loadingServices && !services.length">
          <mat-icon>business_center</mat-icon>
          <p>Aucun service publié pour l'instant.</p>
        </div>
        <div class="services-grid" *ngIf="!loadingServices && services.length">
          <div class="service-card" *ngFor="let s of services" (click)="goToService(s.id)">
            <div class="card-img">
              <img *ngIf="s.images?.[0]" [src]="s.images![0]" [alt]="s.title">
              <div class="card-img-placeholder" *ngIf="!s.images?.[0]">
                <mat-icon>business</mat-icon>
              </div>
            </div>
            <div class="card-body">
              <div class="card-category" *ngIf="s.categoryName">{{ s.categoryName }}</div>
              <h3 class="card-title">{{ s.title }}</h3>
              <p class="card-desc">{{ s.description }}</p>
            </div>
            <div class="card-footer">
              <span class="price" *ngIf="s.priceFrom">
                À partir de {{ s.priceFrom | number:'1.0-0' }} {{ s.currency }}
              </span>
              <span class="price-request" *ngIf="!s.priceFrom">Prix sur demande</span>
              <div class="card-meta">
                <mat-icon>location_on</mat-icon>
                <span>{{ s.location || 'Cameroun' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="not-found" *ngIf="!loading && !provider">
      <mat-icon>person_off</mat-icon>
      <h2>Prestataire introuvable</h2>
      <a mat-raised-button color="primary" routerLink="/catalogue">Retour au catalogue</a>
    </div>
  `,
  styles: [`
    .page-loading { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 64px); }
    .profile-page { max-width: 1200px; margin: 0 auto; padding: 24px; background: #f5f7fa; min-height: calc(100vh - 64px); }
    .breadcrumb {
      display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 14px; color: #666;
      a { color: #1976d2; text-decoration: none; display: flex; align-items: center; gap: 4px;
          &:hover { text-decoration: underline; }
          mat-icon { font-size: 18px; width: 18px; height: 18px; } }
      .sep { color: #bbb; }
    }
    .profile-header {
      display: flex; gap: 28px; align-items: flex-start; background: white;
      border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 28px;
    }
    .header-avatar img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #e0e0e0; }
    .avatar-placeholder {
      width: 100px; height: 100px; border-radius: 50%; background: #1976d2; color: white;
      display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700;
    }
    .header-name { font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
    .verified-badge {
      display: inline-flex; align-items: center; gap: 3px; background: #e8f5e9; color: #2e7d32;
      font-size: 12px; padding: 3px 10px; border-radius: 12px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .header-company { display: flex; align-items: center; gap: 6px; font-size: 15px; color: #555; margin-bottom: 10px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #1976d2; } }
    .header-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 14px;
      span, a { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #666;
                mat-icon { font-size: 15px; width: 15px; height: 15px; color: #1976d2; } } }
    .website-link { color: #1976d2 !important; text-decoration: none; }
    .header-desc { font-size: 14px; color: #555; line-height: 1.7; margin: 0; border-top: 1px solid #f0f0f0; padding-top: 14px; }
    .services-section h2 { font-size: 1.2rem; font-weight: 700; margin: 0 0 20px; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .empty-services { text-align: center; padding: 48px; color: #bbb; background: white; border-radius: 14px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto 12px; } }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .service-card { background: white; border-radius: 14px; overflow: hidden; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform .2s, box-shadow .2s; display: flex; flex-direction: column;
      &:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(0,0,0,0.12); } }
    .card-img { height: 180px; overflow: hidden; background: #e3f2fd; flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; } }
    .card-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 52px; width: 52px; height: 52px; color: #90caf9; } }
    .card-body { padding: 16px 16px 8px; flex: 1; }
    .card-category { display: inline-block; background: #e3f2fd; color: #1565c0; font-size: 11px; padding: 2px 10px; border-radius: 10px; margin-bottom: 8px; }
    .card-title { font-size: 1rem; font-weight: 600; margin: 0 0 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-desc { font-size: 13px; color: #666; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-footer { padding: 10px 16px 14px; border-top: 1px solid #f0f0f0; }
    .price { font-weight: 600; color: #1565c0; font-size: 14px; display: block; margin-bottom: 4px; }
    .price-request { font-size: 13px; color: #999; font-style: italic; display: block; margin-bottom: 4px; }
    .card-meta { display: flex; align-items: center; gap: 3px; font-size: 12px; color: #999;
      mat-icon { font-size: 14px; width: 14px; height: 14px; } }
    .rating-summary {
      background: white; border-radius: 16px; padding: 24px 28px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px;
    }
    .rating-big { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
    .avg { font-size: 3rem; font-weight: 800; color: #1a1a2e; line-height: 1; }
    .stars-col { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 4px; }
    .star-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #666; }
    .star-label { width: 20px; text-align: right; }
    .bar-bg { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #f59e0b; border-radius: 4px; transition: width .3s; }
    .bar-count { width: 24px; text-align: right; }
    .total-reviews {
      display: flex; align-items: center; gap: 4px; font-size: 14px;
      color: #555; font-weight: 500;
      mat-icon { color: #f59e0b; font-size: 18px; width: 18px; height: 18px; }
    }

    .reviews-section { margin-bottom: 28px; }
    .reviews-section h2 { font-size: 1.1rem; font-weight: 700; margin: 0 0 16px; }
    .review-card {
      background: white; border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 12px;
    }
    .review-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
    .reviewer-avatar {
      width: 40px; height: 40px; border-radius: 50%; background: #1976d2;
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }
    .reviewer-name { font-weight: 600; font-size: 14px; }
    .reviewer-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
    .star-sm { color: #ddd; font-size: 14px; &.filled { color: #f59e0b; } }
    .review-date { font-size: 12px; color: #999; }
    .review-comment { font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 8px; }
    .review-service {
      display: flex; align-items: center; gap: 4px; font-size: 12px; color: #aaa;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .no-reviews {
      text-align: center; padding: 32px; color: #bbb;
      mat-icon { font-size: 40px; width: 40px; height: 40px; display: block; margin: 0 auto 8px; }
      p { margin: 0; font-size: 14px; }
    }
    .not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 120px); gap: 16px; color: #bbb;
      mat-icon { font-size: 64px; width: 64px; height: 64px; } }
  `]
})
export class ProviderProfileComponent implements OnInit {

  provider: ProviderProfile | null = null;
  ratingSummary: RatingSummary | null = null;
  reviews: ReviewResponse[] = [];
  ratingRows: { label: string; count: number }[] = [];
  p: ProviderProfile = {} as ProviderProfile; // alias non-null
  services: ServiceSummary[] = [];
  loading = true;
  loadingServices = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private catalogueService: CatalogueService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<any>(`${environment.apiUrl}/providers/${id}`)
      .pipe(map(r => r.data))
      .subscribe({
        next: p => {
          this.provider = p;
          this.loading = false;
          this.loadServices(id);
          this.loadRating(id);
          this.loadReviews(id);
        },
        error: () => { this.loading = false; }
      });
  }

  loadRating(providerId: string): void {
    this.reviewService.getRating(providerId).subscribe({
      next: s => {
        this.ratingSummary = s;
        this.ratingRows = [
          { label: '5★', count: s.fiveStars },
          { label: '4★', count: s.fourStars },
          { label: '3★', count: s.threeStars },
          { label: '2★', count: s.twoStars },
          { label: '1★', count: s.oneStar },
        ];
      },
      error: err => console.error('Erreur rating:', err)
    });
  }

  loadReviews(providerId: string): void {
    this.reviewService.getByProvider(providerId).subscribe({
      next: (reviews: any[]) => { this.reviews = reviews; },
      error: err => console.error('Erreur reviews:', err)
    });
  }

  getPercent(count: number): number {
    if (!this.ratingSummary || this.ratingSummary.totalReviews === 0) return 0;
    return Math.round((count / this.ratingSummary.totalReviews) * 100);
  }

  loadServices(providerId: string): void {
    this.loadingServices = true;
    this.catalogueService.getServices({ page: 0, size: 50 }).subscribe({
      next: page => {
        this.services = page.content.filter(s => s.providerId === providerId);
        this.loadingServices = false;
      },
      error: () => { this.loadingServices = false; }
    });
  }

  goToService(id: string): void {
    this.router.navigate(['/catalogue', id]);
  }
}