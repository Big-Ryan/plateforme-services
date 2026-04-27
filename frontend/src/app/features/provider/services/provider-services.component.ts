import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CatalogueService } from '../../../core/services/catalogue.service';
import { ServiceSummary, Category, PageResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-provider-services',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Mes services</h1>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> Nouveau service
        </button>
      </div>

      <!-- Formulaire -->
      <mat-card class="form-card" *ngIf="showForm">
        <mat-card-header>
          <mat-card-title>{{ editingId ? 'Modifier' : 'Créer' }} un service</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="serviceForm" (ngSubmit)="saveService()">

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Titre *</mat-label>
                <input matInput formControlName="title">
                <mat-error>Titre obligatoire</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Catégorie</mat-label>
                <mat-select formControlName="categoryId">
                  <mat-option value="">Sans catégorie</mat-option>
                  <mat-option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="4"></textarea>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Prix de (XAF)</mat-label>
                <input matInput type="number" formControlName="priceFrom">
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Prix max (XAF)</mat-label>
                <input matInput type="number" formControlName="priceTo">
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Délai</mat-label>
                <input matInput formControlName="deliveryTime" placeholder="ex: 3-5 jours">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Localisation</mat-label>
              <input matInput formControlName="location" placeholder="ex: Douala, Yaoundé">
              <mat-icon matSuffix>location_on</mat-icon>
            </mat-form-field>

            <!-- Upload images -->
            <div class="upload-section">
              <div class="upload-label">Photos du service (max 5)</div>

              <!-- Images actuelles -->
              <div class="images-preview" *ngIf="currentImages.length > 0">
                <div class="image-thumb" *ngFor="let img of currentImages; let i = index">
                  <img [src]="img" [alt]="'Photo ' + (i+1)">
                  <button mat-icon-button class="remove-img" type="button"
                          (click)="removeImage(i)" matTooltip="Supprimer">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Zone de dépôt -->
              <div class="upload-zone"
                   *ngIf="currentImages.length < 5"
                   (click)="imageInput.click()"
                   (dragover)="$event.preventDefault()"
                   (drop)="onDrop($event)"
                   [class.uploading]="uploadingImages">
                <input #imageInput type="file" accept="image/jpeg,image/png,image/webp"
                       multiple hidden (change)="onFilesSelected($event)">
                <mat-progress-spinner *ngIf="uploadingImages" diameter="32" mode="indeterminate">
                </mat-progress-spinner>
                <ng-container *ngIf="!uploadingImages">
                  <mat-icon>add_photo_alternate</mat-icon>
                  <p>Cliquez ou glissez-déposez vos photos</p>
                  <small>JPEG, PNG, WebP — max 10 Mo par image</small>
                </ng-container>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width" *ngIf="editingId">
              <mat-label>Statut</mat-label>
              <mat-select formControlName="status">
                <mat-option value="DRAFT">Brouillon</mat-option>
                <mat-option value="PUBLISHED">Publié</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="form-actions">
              <button mat-button type="button" (click)="cancelForm()">Annuler</button>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="serviceForm.invalid || saving || uploadingImages">
                <mat-progress-spinner *ngIf="saving" diameter="18" mode="indeterminate"
                                      style="display:inline-block"></mat-progress-spinner>
                <span *ngIf="!saving">{{ editingId ? 'Enregistrer' : 'Créer' }}</span>
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Liste -->
      <div *ngIf="loading" class="loading-center">
        <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
      </div>

      <mat-card *ngIf="!loading">
        <div class="empty" *ngIf="!page?.content?.length">
          <mat-icon>business_center</mat-icon>
          <p>Aucun service. Créez votre premier service !</p>
        </div>

        <div class="services-grid" *ngIf="page?.content?.length">
          <div class="service-row" *ngFor="let s of page!.content">

            <!-- Miniature -->
            <div class="row-thumb">
              <img *ngIf="s.images?.[0]" [src]="s.images![0]" [alt]="s.title">
              <div class="thumb-placeholder" *ngIf="!s.images?.[0]">
                <mat-icon>business_center</mat-icon>
              </div>
            </div>

            <!-- Infos -->
            <div class="row-info">
              <div class="row-title">{{ s.title }}</div>
              <div class="row-meta">
                <span class="status-badge" [ngClass]="s.status.toLowerCase()">
                  {{ getStatusLabel(s.status) }}
                </span>
                <span class="views">
                  <mat-icon>visibility</mat-icon> {{ s.viewCount }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="row-actions">
              <button mat-icon-button color="primary"
                      *ngIf="s.status === 'DRAFT' || s.status === 'HIDDEN'"
                      (click)="publishService(s.id)" matTooltip="Publier">
                <mat-icon>publish</mat-icon>
              </button>
              <button mat-icon-button
                      *ngIf="s.status === 'PUBLISHED'"
                      (click)="unpublishService(s.id)" matTooltip="Masquer">
                <mat-icon>visibility_off</mat-icon>
              </button>
              <button mat-icon-button (click)="editService(s)" matTooltip="Modifier">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteService(s.id)"
                      matTooltip="Supprimer">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <mat-paginator [length]="page?.totalElements || 0" [pageSize]="10"
                       (page)="loadPage($event.pageIndex)"></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
      h1 { font-size: 1.8rem; font-weight: 700; margin: 0; }
    }

    .form-card { margin-bottom: 24px; border-radius: 12px; }
    .form-row { display: flex; gap: 12px; margin-bottom: 4px; }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }

    /* Upload */
    .upload-section { margin-bottom: 16px; }
    .upload-label { font-size: 13px; color: #666; margin-bottom: 10px; font-weight: 500; }

    .images-preview {
      display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;
    }
    .image-thumb {
      position: relative; width: 100px; height: 80px; border-radius: 8px; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .remove-img {
      position: absolute; top: 2px; right: 2px;
      width: 24px !important; height: 24px !important;
      min-width: 24px !important; background: rgba(0,0,0,0.5);
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: white; line-height: 14px; }
    }

    .upload-zone {
      border: 2px dashed #ddd; border-radius: 10px; padding: 24px;
      text-align: center; cursor: pointer; transition: all .2s;
      display: flex; flex-direction: column; align-items: center; gap: 8px; color: #999;
      &:hover { border-color: #1976d2; background: #e3f2fd22; color: #1976d2; }
      &.uploading { pointer-events: none; opacity: 0.7; }
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
      p { margin: 0; font-size: 14px; }
      small { font-size: 12px; }
    }

    /* Services grid */
    .services-grid { padding: 8px 0; }
    .service-row {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
      &:last-child { border-bottom: none; }
      &:hover { background: #fafafa; }
    }
    .row-thumb {
      width: 72px; height: 54px; border-radius: 8px; overflow: hidden;
      flex-shrink: 0; background: #e3f2fd;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .thumb-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #90caf9; font-size: 28px; width: 28px; height: 28px; }
    }
    .row-info { flex: 1; min-width: 0; }
    .row-title { font-weight: 500; font-size: 14px; margin-bottom: 4px; }
    .row-meta { display: flex; align-items: center; gap: 12px; }
    .views {
      display: flex; align-items: center; gap: 3px; font-size: 12px; color: #999;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .row-actions { display: flex; gap: 4px; flex-shrink: 0; }

    .status-badge {
      padding: 2px 10px; border-radius: 12px; font-size: 12px;
      &.published { background: #e8f5e9; color: #2e7d32; }
      &.draft     { background: #fff8e1; color: #f57f17; }
      &.hidden    { background: #fce4ec; color: #c62828; }
    }

    .loading-center { display: flex; justify-content: center; padding: 64px; }
    .empty {
      text-align: center; padding: 48px; color: #999;
      mat-icon { font-size: 48px; width: 48px; height: 48px; display: block;
                 margin: 0 auto 12px; }
    }
  `]
})
export class ProviderServicesComponent implements OnInit {

  page: PageResponse<ServiceSummary> | null = null;
  categories: Category[] = [];
  loading = false;
  saving = false;
  uploadingImages = false;
  showForm = false;
  editingId: string | null = null;
  currentImages: string[] = [];
  serviceForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private catalogueService: CatalogueService,
    private toastr: ToastrService
  ) {
    this.serviceForm = this.fb.group({
      title:        ['', Validators.required],
      description:  [''],
      categoryId:   [''],
      priceFrom:    [null],
      priceTo:      [null],
      deliveryTime: [''],
      location:     [''],
      status:       ['DRAFT'],
    });
  }

  ngOnInit(): void {
    this.catalogueService.getCategories().subscribe(c => this.categories = c);
    this.loadPage(0);
  }

  loadPage(p: number): void {
    this.loading = true;
    this.catalogueService.getMyServices(p, 10).subscribe({
      next: page => { this.page = page; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  openForm(): void {
    this.showForm = true;
    this.editingId = null;
    this.currentImages = [];
    this.serviceForm.reset({ status: 'DRAFT' });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.currentImages = [];
  }

  editService(s: ServiceSummary): void {
    this.editingId = s.id;
    this.showForm = true;
    this.currentImages = s.images ? [...s.images] : [];
    this.serviceForm.patchValue(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== Upload images =====

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFiles(Array.from(input.files));
      input.value = ''; // reset pour permettre re-sélection
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.uploadFiles(Array.from(files));
    }
  }

  private uploadFiles(files: File[]): void {
    const remaining = 5 - this.currentImages.length;
    if (remaining <= 0) {
      this.toastr.warning('Maximum 5 images par service');
      return;
    }

    const toUpload = files.slice(0, remaining);
    this.uploadingImages = true;

    this.catalogueService.uploadServiceImages(toUpload).subscribe({
      next: result => {
        this.currentImages = [...this.currentImages, ...result.urls];
        this.uploadingImages = false;
        this.toastr.success(
          toUpload.length === 1 ? 'Image ajoutée !' : `${toUpload.length} images ajoutées !`
        );
      },
      error: err => {
        this.uploadingImages = false;
        this.toastr.error(err?.message || 'Erreur upload');
      }
    });
  }

  removeImage(index: number): void {
    this.currentImages.splice(index, 1);
  }

  // ===== CRUD =====

  saveService(): void {
    if (this.serviceForm.invalid) return;
    this.saving = true;

    const payload = {
      ...this.serviceForm.value,
      images: this.currentImages,
    };

    const req$ = this.editingId
      ? this.catalogueService.updateService(this.editingId, payload)
      : this.catalogueService.createService(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.cancelForm();
        this.loadPage(0);
        this.toastr.success('Service enregistré');
      },
      error: err => {
        this.saving = false;
        this.toastr.error(err?.message || 'Erreur');
      }
    });
  }

  publishService(id: string): void {
    this.catalogueService.updateService(id, { status: 'PUBLISHED' }).subscribe({
      next: () => { this.loadPage(0); this.toastr.success('Service publié !'); },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }

  unpublishService(id: string): void {
    this.catalogueService.updateService(id, { status: 'HIDDEN' }).subscribe({
      next: () => { this.loadPage(0); this.toastr.success('Service masqué'); },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }

  deleteService(id: string): void {
    if (!confirm('Supprimer ce service ?')) return;
    this.catalogueService.deleteService(id).subscribe({
      next: () => { this.loadPage(0); this.toastr.success('Service supprimé'); },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }

  getStatusLabel(status: string): string {
    return { DRAFT: 'Brouillon', PUBLISHED: 'Publié', HIDDEN: 'Masqué' }[status] ?? status;
  }
}