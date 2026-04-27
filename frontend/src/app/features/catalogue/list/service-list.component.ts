import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CatalogueService } from '../../../core/services/catalogue.service';
import { Category, ServiceSummary, PageResponse } from '../../../core/models/api.models';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-service-list',
  template: `
    <div class="catalogue-page">

      <!-- Hero -->
      <section class="hero">
        <div class="hero-content">
          <h1>Trouvez le prestataire idéal</h1>
          <p>Parcourez notre catalogue de services professionnels au Cameroun</p>
          <div class="search-wrapper">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              class="search-input"
              [formControl]="$any(filterForm.get('q'))"
              placeholder="Rechercher un service, une compétence…"
              autocomplete="off">
          </div>
        </div>
      </section>

      <!-- Body -->
      <div class="catalogue-body">

        <!-- Filtres -->
        <aside class="filters-panel">
          <h3>Filtres</h3>
          <form [formGroup]="filterForm">

            <label class="filter-label">Catégorie</label>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-select formControlName="categoryId">
                <mat-option value="">Toutes</mat-option>
                <mat-option *ngFor="let cat of categories" [value]="cat.id">
                  {{ cat.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <label class="filter-label">Ville</label>
            <mat-form-field appearance="outline" class="filter-field">
              <input matInput formControlName="city" placeholder="ex: Douala">
            </mat-form-field>

            <label class="filter-label">Trier par</label>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-select formControlName="sort">
                <mat-option value="recent">Plus récents</mat-option>
                <mat-option value="popular">Plus populaires</mat-option>
                <mat-option value="price_asc">Prix croissant</mat-option>
                <mat-option value="price_desc">Prix décroissant</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-stroked-button type="button" class="reset-btn"
                    (click)="resetFilters()">
              Réinitialiser
            </button>
          </form>
        </aside>

        <!-- Résultats -->
        <section class="results-section">

          <div class="results-header" *ngIf="!loading">
            <span class="results-count">
              {{ page?.totalElements || 0 }} service(s) trouvé(s)
            </span>
          </div>

          <!-- Spinner -->
          <div class="loading-center" *ngIf="loading">
            <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
          </div>

          <!-- Vide -->
          <div class="empty-state" *ngIf="!loading && !page?.content?.length">
            <mat-icon>search_off</mat-icon>
            <h3>Aucun service trouvé</h3>
            <p>Essayez avec d'autres critères de recherche.</p>
            <button mat-raised-button color="primary" (click)="resetFilters()">
              Effacer les filtres
            </button>
          </div>

          <!-- Grille -->
          <div class="services-grid" *ngIf="!loading && page?.content?.length">
            <div class="service-card" *ngFor="let s of page!.content"
                 (click)="goToDetail(s.id)">

              <div class="card-img">
                <img *ngIf="s.images?.[0]" [src]="s.images![0]" [alt]="s.title" loading="lazy">
                <div class="card-img-placeholder" *ngIf="!s.images?.[0]">
                  <mat-icon>business</mat-icon>
                </div>
                <span class="verified-chip" *ngIf="s.providerVerified">
                  <mat-icon>verified</mat-icon>
                </span>
              </div>

              <div class="card-body">
                <div class="card-category" *ngIf="s.categoryName">{{ s.categoryName }}</div>
                <h3 class="card-title">{{ s.title }}</h3>
                <p class="card-desc">{{ s.description }}</p>

                <div class="card-tags" *ngIf="s.tags?.length">
                  <span class="tag" *ngFor="let tag of s.tags?.slice(0, 3)">{{ tag }}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="card-price">
                  <span *ngIf="s.priceFrom" class="price">
                    À partir de {{ s.priceFrom | number }} {{ s.currency }}
                  </span>
                  <span *ngIf="!s.priceFrom" class="price-request">Prix sur demande</span>
                </div>
                <div class="card-meta">
                  <mat-icon>location_on</mat-icon>
                  <span>{{ s.location || 'Cameroun' }}</span>
                  <mat-icon style="margin-left:8px">visibility</mat-icon>
                  <span>{{ s.viewCount }}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- Pagination -->
          <mat-paginator
            *ngIf="page && page.totalElements > pageSize"
            [length]="page.totalElements"
            [pageSize]="pageSize"
            [pageSizeOptions]="[12, 24, 48]"
            [pageIndex]="currentPage"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>

        </section>
      </div>
    </div>

    <!-- Warning anti-arnaque -->
    <div class="security-warning">
      <mat-icon>security</mat-icon>
      <div class="warning-content">
        <strong>⚠️ Protégez-vous contre les arnaques</strong>
        <p>
          N'effectuez <strong>jamais de virement ou paiement</strong> à un prestataire avant
          de vous être rencontrés en personne ou avant que le service n'ait été rendu.
          La plateforme ne sera pas tenue responsable de tout paiement effectué en dehors
          du cadre sécurisé de la plateforme.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <footer class="catalogue-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-logo">🇨🇲 Plateforme Services</span>
          <p>La première plateforme de mise en relation entre prestataires et clients au Cameroun.</p>
        </div>
        <div class="footer-links">
          <div class="footer-col">
            <h4>Prestataires</h4>
            <a routerLink="/auth/register">Créer un compte</a>
            <a routerLink="/auth/login">Se connecter</a>
            <a routerLink="/catalogue">Voir le catalogue</a>
          </div>
          <div class="footer-col">
            <h4>Clients</h4>
            <a routerLink="/catalogue">Trouver un service</a>
            <a routerLink="/auth/register">Créer un compte</a>
          </div>
          <div class="footer-col">
            <h4>Sécurité</h4>
            <p class="footer-tip">✅ Vérifiez l'identité du prestataire</p>
            <p class="footer-tip">✅ Rencontrez-vous en personne</p>
            <p class="footer-tip">✅ Payez après service rendu</p>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ currentYear }} Plateforme Services Cameroun — Tous droits réservés</span>
      </div>
    </footer>

  `,
  styles: [`
    .security-warning {
      display: flex; align-items: flex-start; gap: 16px;
      background: #fff3cd; border: 1px solid #ffc107; border-radius: 12px;
      padding: 16px 24px; margin: 24px 24px 0; color: #856404;
      mat-icon { color: #f59e0b; font-size: 28px; width: 28px; height: 28px; flex-shrink: 0; margin-top: 2px; }
      .warning-content { strong { display: block; font-size: 15px; margin-bottom: 4px; }
        p { margin: 0; font-size: 13px; line-height: 1.6; } }
    }
    .catalogue-footer {
      background: #1a1a2e; color: #ccc; margin-top: 48px; padding: 48px 24px 0;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto; display: grid;
      grid-template-columns: 1fr 2fr; gap: 48px; padding-bottom: 32px;
      border-bottom: 1px solid #2d2d4e;
    }
    .footer-brand {
      .footer-logo { font-size: 1.2rem; font-weight: 700; color: white; display: block; margin-bottom: 12px; }
      p { font-size: 13px; line-height: 1.7; color: #aaa; }
    }
    .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .footer-col {
      h4 { color: white; font-size: 14px; font-weight: 600; margin: 0 0 12px; }
      a { display: block; color: #aaa; text-decoration: none; font-size: 13px; margin-bottom: 8px;
          &:hover { color: white; } }
      .footer-tip { font-size: 12px; color: #aaa; margin: 0 0 6px; }
    }
    .footer-bottom {
      max-width: 1200px; margin: 0 auto;
      padding: 16px 0; font-size: 12px; color: #666; text-align: center;
    }
    @media (max-width: 768px) {
      .footer-inner { grid-template-columns: 1fr; }
      .footer-links { grid-template-columns: 1fr 1fr; }
      .security-warning { margin: 16px; }
    }

    /* Page wrapper */
    .catalogue-page {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* ===== Hero ===== */
    .hero {
      background: linear-gradient(135deg, #1a237e 0%, #1976d2 100%);
      padding: 56px 24px 56px;
      text-align: center;
    }
    .hero-content {
      max-width: 640px;
      margin: 0 auto;
    }
    .hero h1 {
      color: white;
      font-size: 2.2rem;
      font-weight: 700;
      margin: 0 0 10px;
    }
    .hero p {
      color: rgba(255,255,255,0.85);
      font-size: 1.05rem;
      margin: 0 0 28px;
    }
    .search-wrapper {
      position: relative;
      max-width: 560px;
      margin: 0 auto;
    }
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #999;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }
    .search-input {
      width: 100%;
      height: 52px;
      padding: 0 20px 0 50px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      box-sizing: border-box;
      background: white;
      color: #333;
    }

    /* ===== Layout ===== */
    .catalogue-body {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 28px;
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 24px 56px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .catalogue-body { grid-template-columns: 1fr; }
    }

    /* ===== Filtres ===== */
    .filters-panel {
      background: white;
      border-radius: 14px;
      padding: 22px 20px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
      position: sticky;
      top: 80px;
      align-self: start;
    }
    .filters-panel h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 18px;
    }
    .filter-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      margin-top: 12px;
    }
    .filter-field {
      width: 100%;
    }
    .reset-btn {
      width: 100%;
      margin-top: 16px;
      border-color: #ddd;
      color: #666;
    }

    /* ===== Résultats ===== */
    .results-section { min-height: 400px; }
    .results-header { padding: 16px 0 12px; }
    .results-count { font-size: 14px; color: #666; font-weight: 500; }

    .loading-center {
      display: flex;
      justify-content: center;
      padding: 80px 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 24px;
      text-align: center;
      background: white;
      border-radius: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .empty-state mat-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      margin-bottom: 16px;
      color: #ccc;
    }
    .empty-state h3 { font-size: 1.1rem; color: #888; margin: 0 0 8px; }
    .empty-state p  { color: #aaa; margin: 0 0 20px; }

    /* ===== Grille ===== */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      padding: 8px 0 24px;
    }

    .service-card {
      background: white;
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
    }
    .service-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 28px rgba(0,0,0,0.12);
    }

    .card-img {
      position: relative;
      height: 180px;
      overflow: hidden;
      background: #e8eaf6;
      flex-shrink: 0;
    }
    .card-img img { width: 100%; height: 100%; object-fit: cover; }
    .card-img-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #e3f2fd;
    }
    .card-img-placeholder mat-icon { font-size: 52px; width: 52px; height: 52px; color: #90caf9; }

    .verified-chip {
      position: absolute; top: 10px; right: 10px;
      background: white; border-radius: 50%;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .verified-chip mat-icon { font-size: 18px; width: 18px; height: 18px; color: #1976d2; }

    .card-body { padding: 16px 16px 8px; flex: 1; }
    .card-category {
      display: inline-block; background: #e3f2fd; color: #1565c0;
      font-size: 11px; font-weight: 500; padding: 2px 10px;
      border-radius: 10px; margin-bottom: 8px;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .card-title {
      font-size: 1rem; font-weight: 600; color: #222;
      margin: 0 0 6px; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .card-desc {
      font-size: 13px; color: #666; line-height: 1.55;
      margin: 0 0 10px;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { background: #f5f5f5; color: #555; font-size: 11px; padding: 2px 10px; border-radius: 10px; }

    .card-footer { padding: 10px 16px 14px; border-top: 1px solid #f0f0f0; }
    .card-price { margin-bottom: 6px; }
    .price { font-weight: 600; color: #1565c0; font-size: 14px; }
    .price-request { font-size: 13px; color: #999; font-style: italic; }
    .card-meta {
      display: flex; align-items: center; gap: 3px;
      font-size: 12px; color: #999;
    }
    .card-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }
  `]
})
export class ServiceListComponent implements OnInit, OnDestroy {

  categories: Category[] = [];
  page: PageResponse<ServiceSummary> | null = null;
  loading = false;
  currentYear = new Date().getFullYear();
  currentPage = 0;
  pageSize = 12;
  filterForm: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private catalogueService: CatalogueService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.filterForm = this.fb.group({
      q:          [''],
      categoryId: [''],
      city:       [''],
      sort:       ['recent'],
    });
  }

  ngOnInit(): void {
    this.loadCategories();

    this.filterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadServices();
    });

    this.loadServices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.catalogueService.getCategories().subscribe({
      next: cats => this.categories = cats,
      error: () => {}
    });
  }

  loadServices(): void {
    this.loading = true;
    const { q, categoryId, city, sort } = this.filterForm.value;
    this.catalogueService.getServices({
      q:          q          || undefined,
      categoryId: categoryId || undefined,
      city:       city       || undefined,
      sort,
      page: this.currentPage,
      size: this.pageSize,
    }).subscribe({
      next: page => { this.page = page; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize    = event.pageSize;
    this.loadServices();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToDetail(id: string): void {
    this.router.navigate(['/catalogue', id]);
  }

  resetFilters(): void {
    this.filterForm.reset({ q: '', categoryId: '', city: '', sort: 'recent' });
  }
}