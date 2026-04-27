import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stars" [class.interactive]="interactive">
      <span *ngFor="let s of [1,2,3,4,5]"
            class="star"
            [class.filled]="s <= (hovered || value)"
            [class.half]="!interactive && s > value && s - 0.5 <= value"
            (mouseenter)="interactive && (hovered = s)"
            (mouseleave)="interactive && (hovered = 0)"
            (click)="interactive && select(s)">
        ★
      </span>
      <span class="label" *ngIf="showLabel && value > 0">
        {{ value | number:'1.1-1' }}
        <span class="count" *ngIf="count > 0">({{ count }})</span>
      </span>
    </div>
  `,
  styles: [`
    .stars { display: inline-flex; align-items: center; gap: 2px; }
    .star {
      font-size: var(--star-size, 20px); color: #ddd;
      transition: color .15s; line-height: 1;
      cursor: default; user-select: none;
      &.filled { color: #f59e0b; }
      &.half { color: #f59e0b; opacity: 0.5; }
    }
    .interactive .star { cursor: pointer; }
    .interactive .star:hover { transform: scale(1.2); }
    .label { margin-left: 6px; font-size: 14px; font-weight: 600; color: #555; }
    .count { font-weight: 400; color: #999; font-size: 13px; }
  `]
})
export class StarRatingComponent {
  @Input() value = 0;
  @Input() count = 0;
  @Input() interactive = false;
  @Input() showLabel = false;
  @Output() rated = new EventEmitter<number>();

  hovered = 0;

  select(s: number): void {
    this.value = s;
    this.rated.emit(s);
  }
}