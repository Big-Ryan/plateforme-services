import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { ReviewService } from '../../../core/services/domain.services';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
            MatInputModule, MatIconModule, StarRatingComponent],
  template: `
    <div class="review-form">
      <h3><mat-icon>rate_review</mat-icon> Laisser un avis</h3>
      <p class="subtitle">Comment s'est passée cette prestation ?</p>

      <div class="rating-row">
        <span class="rating-label">Votre note :</span>
        <app-star-rating
          [value]="rating"
          [interactive]="true"
          style="--star-size: 32px"
          (rated)="rating = $event">
        </app-star-rating>
        <span class="rating-text">{{ getRatingLabel() }}</span>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Commentaire (optionnel)</mat-label>
        <textarea matInput [(ngModel)]="comment" rows="3"
                  placeholder="Décrivez votre expérience avec ce prestataire...">
        </textarea>
      </mat-form-field>

      <div class="actions">
        <button mat-button type="button" (click)="cancelled.emit()">Annuler</button>
        <button mat-raised-button color="primary"
                [disabled]="rating === 0 || saving"
                (click)="submit()">
          <mat-icon>send</mat-icon>
          {{ saving ? 'Envoi...' : 'Publier l\'avis' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .review-form {
      background: white; border-radius: 12px; padding: 24px;
      border: 1px solid #e0e0e0;
    }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px;
         font-size: 1.1rem; font-weight: 600; color: #1a1a2e;
         mat-icon { color: #f59e0b; } }
    .subtitle { color: #888; font-size: 13px; margin: 0 0 20px; }
    .rating-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .rating-label { font-size: 14px; color: #555; font-weight: 500; }
    .rating-text { font-size: 13px; color: #f59e0b; font-weight: 500; }
    .full-width { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `]
})
export class ReviewFormComponent {
  @Input() negotiationId!: string;
  @Output() submitted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  rating = 0;
  comment = '';
  saving = false;

  private reviewService = inject(ReviewService);
  private toastr = inject(ToastrService);

  getRatingLabel(): string {
    return ['', 'Mauvais', 'Passable', 'Correct', 'Bien', 'Excellent !'][this.rating] ?? '';
  }

  submit(): void {
    if (this.rating === 0) return;
    this.saving = true;
    this.reviewService.create({
      negotiationId: this.negotiationId,
      rating: this.rating,
      comment: this.comment || undefined
    }).subscribe({
      next: () => {
        this.toastr.success('Avis publié avec succès !');
        this.submitted.emit();
      },
      error: err => {
        this.toastr.error(err?.message || 'Erreur lors de la publication');
        this.saving = false;
      }
    });
  }
}