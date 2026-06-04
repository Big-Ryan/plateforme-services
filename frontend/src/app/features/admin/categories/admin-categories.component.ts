import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService, CategoryRow } from '../admin.service';

@Component({
  selector: 'app-admin-categories',
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Gestion des catégories</h1>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon>
          {{ showForm ? 'Annuler' : 'Nouvelle catégorie' }}
        </button>
      </div>

      <!-- Formulaire création -->
      <mat-card *ngIf="showForm" class="form-card">
        <mat-card-header>
          <mat-card-title>Nouvelle catégorie</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onCreate()" class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Nom</mat-label>
              <input matInput formControlName="name" placeholder="Ex: Informatique & Tech"
                     (input)="autoSlug()">
              <mat-error *ngIf="form.get('name')?.hasError('required')">Obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Slug (URL)</mat-label>
              <input matInput formControlName="slug" placeholder="ex: informatique-tech">
              <mat-error *ngIf="form.get('slug')?.hasError('required')">Obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="short">
              <mat-label>Ordre</mat-label>
              <input matInput type="number" formControlName="sortOrder" min="1">
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
                    [disabled]="form.invalid || saving">
              <mat-icon>save</mat-icon> Créer
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Info réordonnement -->
      <div class="info-bar" *ngIf="!showForm">
        <mat-icon>info</mat-icon>
        <span>Modifiez l'ordre en changeant le numéro, puis cliquez <b>Enregistrer l'ordre</b>.</span>
        <button mat-stroked-button color="primary" (click)="saveOrder()"
                [disabled]="saving" *ngIf="hasOrderChanges">
          <mat-icon>save</mat-icon> Enregistrer l'ordre
        </button>
      </div>

      <!-- Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="loading-center" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <table mat-table [dataSource]="categories" *ngIf="!loading" class="full-table">

            <!-- Ordre -->
            <ng-container matColumnDef="sortOrder">
              <th mat-header-cell *matHeaderCellDef>Ordre</th>
              <td mat-cell *matCellDef="let row">
                <input type="number" class="order-input" [(ngModel)]="row.sortOrder"
                       min="1" (change)="markOrderChanged()" />
              </td>
            </ng-container>

            <!-- Nom -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nom</th>
              <td mat-cell *matCellDef="let row">
                <ng-container *ngIf="editingId !== row.id">
                  <strong>{{ row.name }}</strong>
                </ng-container>
                <mat-form-field appearance="outline" class="inline-field" *ngIf="editingId === row.id">
                  <input matInput [(ngModel)]="editName" />
                </mat-form-field>
              </td>
            </ng-container>

            <!-- Slug -->
            <ng-container matColumnDef="slug">
              <th mat-header-cell *matHeaderCellDef>Slug</th>
              <td mat-cell *matCellDef="let row">
                <code class="slug-badge">{{ row.slug }}</code>
              </td>
            </ng-container>

            <!-- Services -->
            <ng-container matColumnDef="serviceCount">
              <th mat-header-cell *matHeaderCellDef>Services</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip-listbox>
                  <mat-chip [color]="row.serviceCount > 0 ? 'primary' : ''" selected>
                    {{ row.serviceCount }}
                  </mat-chip>
                </mat-chip-listbox>
              </td>
            </ng-container>

            <!-- Statut -->
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Statut</th>
              <td mat-cell *matCellDef="let row">
                <mat-slide-toggle
                  [checked]="row.active"
                  (change)="toggleActive(row, $event.checked)"
                  [matTooltip]="row.active ? 'Désactiver' : 'Activer'">
                </mat-slide-toggle>
              </td>
            </ng-container>

            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let row">
                <ng-container *ngIf="editingId !== row.id">
                  <button mat-icon-button color="primary" (click)="startEdit(row)"
                          matTooltip="Renommer">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="onDelete(row)"
                          matTooltip="Supprimer"
                          [disabled]="row.serviceCount > 0">
                    <mat-icon>delete</mat-icon>
                  </button>
                </ng-container>
                <ng-container *ngIf="editingId === row.id">
                  <button mat-icon-button color="primary" (click)="saveEdit(row)"
                          matTooltip="Sauvegarder">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelEdit()" matTooltip="Annuler">
                    <mat-icon>close</mat-icon>
                  </button>
                </ng-container>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"
                [class.inactive-row]="!row.active"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 1.8rem; font-weight: 700; margin: 0; }

    .form-card { margin-bottom: 20px; }
    .form-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; padding-top: 8px; }
    .form-row mat-form-field { flex: 1; min-width: 180px; }
    .form-row .short { flex: 0 0 90px; min-width: 90px; }

    .info-bar {
      display: flex; align-items: center; gap: 8px;
      background: #e8f4fd; border-radius: 8px; padding: 10px 16px;
      margin-bottom: 16px; font-size: 13.5px; color: #1565c0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .info-bar span { flex: 1; }

    .table-card { border-radius: 12px; }
    .full-table { width: 100%; }

    .order-input {
      width: 56px; border: 1px solid #ddd; border-radius: 6px;
      padding: 4px 8px; font-size: 14px; text-align: center;
    }

    .slug-badge {
      background: #f1f5f9; color: #475569; border-radius: 4px;
      padding: 2px 8px; font-size: 12px;
    }

    .inline-field { width: 180px; }
    .inactive-row { opacity: 0.5; }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
  `]
})
export class AdminCategoriesComponent implements OnInit {
  categories: CategoryRow[] = [];
  columns = ['sortOrder', 'name', 'slug', 'serviceCount', 'active', 'actions'];
  loading  = false;
  saving   = false;
  showForm = false;
  hasOrderChanges = false;
  editingId: string | null = null;
  editName  = '';

  form: FormGroup;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name:      ['', [Validators.required, Validators.maxLength(100)]],
      slug:      ['', [Validators.required, Validators.maxLength(100)]],
      sortOrder: [1, Validators.required],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.adminService.getCategories().subscribe({
      next: cats => { this.categories = cats; this.loading = false; this.hasOrderChanges = false; },
      error: ()  => { this.loading = false; }
    });
  }

  autoSlug(): void {
    const name = this.form.get('name')?.value || '';
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-');
    this.form.patchValue({ slug });
  }

  onCreate(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.adminService.createCategory(this.form.value).subscribe({
      next: () => { this.saving = false; this.showForm = false; this.form.reset({ sortOrder: 1 }); this.load(); },
      error: () => { this.saving = false; }
    });
  }

  markOrderChanged(): void { this.hasOrderChanges = true; }

  saveOrder(): void {
    this.saving = true;
    const items = this.categories.map(c => ({ id: c.id, sortOrder: c.sortOrder }));
    this.adminService.reorderCategories(items).subscribe({
      next: () => { this.saving = false; this.hasOrderChanges = false; this.load(); },
      error: () => { this.saving = false; }
    });
  }

  startEdit(row: CategoryRow): void { this.editingId = row.id; this.editName = row.name; }
  cancelEdit(): void { this.editingId = null; }

  saveEdit(row: CategoryRow): void {
    this.adminService.updateCategory(row.id, { name: this.editName }).subscribe({
      next: () => { this.editingId = null; this.load(); },
      error: () => {}
    });
  }

  toggleActive(row: CategoryRow, active: boolean): void {
    this.adminService.updateCategory(row.id, { active }).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

  onDelete(row: CategoryRow): void {
    if (!confirm(`Supprimer la catégorie "${row.name}" ?`)) return;
    this.adminService.deleteCategory(row.id).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}