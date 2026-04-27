import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { NegotiationService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { NegotiationSummary, NegotiationDetail } from '../../../core/models/api.models';

@Component({
  selector: 'app-client-negotiations',
  template: `
    <div class="nego-page">

      <div class="page-header">
        <h1>Mes demandes</h1>
        <span class="count" *ngIf="negotiations.length">{{ negotiations.length }} conversation(s)</span>
      </div>

      <div class="nego-layout" *ngIf="!loading; else loadingTpl">

        <!-- Liste -->
        <aside class="conversations-panel">
          <div class="empty-convs" *ngIf="!negotiations.length">
            <mat-icon>forum</mat-icon>
            <p>Aucune demande envoyée.</p>
            <a mat-stroked-button color="primary" routerLink="/catalogue">
              Trouver un prestataire
            </a>
          </div>

          <div class="conv-item"
               *ngFor="let n of negotiations"
               [class.active]="selectedId === n.id"
               [class.unread]="n.unreadCount > 0"
               (click)="select(n.id)">

            <div class="conv-avatar provider">
              {{ (n.serviceTitle || 'S')[0].toUpperCase() }}
            </div>

            <div class="conv-body">
              <div class="conv-top">
                <span class="conv-name">{{ n.serviceTitle || 'Contact direct' }}</span>
                <span class="conv-date">{{ n.updatedAt | date:'dd/MM' }}</span>
              </div>
              <div class="conv-bottom">
                <span class="status-dot" [ngClass]="n.status.toLowerCase()"></span>
                <span class="status-text">{{ getStatusLabel(n.status) }}</span>
                <span class="unread-badge" *ngIf="n.unreadCount > 0">{{ n.unreadCount }}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Chat -->
        <main class="chat-panel" *ngIf="detail; else selectTpl">

          <div class="chat-header">
            <div class="chat-header-info">
              <div class="conv-avatar provider">
                {{ (detail.serviceTitle || 'S')[0].toUpperCase() }}
              </div>
              <div>
                <div class="chat-name">{{ detail.serviceTitle || 'Contact direct' }}</div>
                <div class="chat-provider">
                  <mat-icon>person</mat-icon> {{ detail.providerName }}
                </div>
              </div>
            </div>
            <div class="chat-actions">
              <span class="status-badge" [ngClass]="detail.status.toLowerCase()">
                {{ getStatusLabel(detail.status) }}
              </span>
            </div>
          </div>

          <!-- Accord conclu -->
          <div class="agreement-banner" *ngIf="detail.status === 'AGREED'">
            <mat-icon>handshake</mat-icon>
            <span>
              Accord conclu
              <strong *ngIf="detail.agreedPrice">
                — {{ detail.agreedPrice | number:'1.0-0' }} XAF
              </strong>
              <em *ngIf="detail.notes"> · {{ detail.notes }}</em>
            </span>
          </div>

          <!-- Messages -->
          <div class="messages-area" #messagesArea>
            <div class="messages-list">

              <div *ngFor="let msg of detail.messages; let i = index">
                <div class="date-separator"
                     *ngIf="i === 0 || isDifferentDay(detail.messages[i-1].sentAt, msg.sentAt)">
                  {{ msg.sentAt | date:'d MMM' }}
                </div>

                <div class="message-row"
                     [class.sent]="msg.senderId === currentUserId"
                     [class.received]="msg.senderId !== currentUserId">

                  <div class="msg-avatar" *ngIf="msg.senderId !== currentUserId">
                    {{ msg.senderName[0].toUpperCase() }}
                  </div>

                  <div class="msg-content">
                    <div class="msg-bubble">{{ msg.content }}</div>
                    <div class="msg-meta">
                      <span class="msg-time">{{ msg.sentAt | date:'HH:mm' }}</span>
                      <mat-icon class="msg-read" *ngIf="msg.senderId === currentUserId">
                        {{ msg.isRead ? 'done_all' : 'done' }}
                      </mat-icon>
                    </div>
                  </div>
                </div>
              </div>

              <div class="messages-empty" *ngIf="!detail.messages.length">
                <mat-icon>chat_bubble_outline</mat-icon>
                <p>En attente d'une réponse</p>
              </div>
            </div>
          </div>

          <!-- Saisie -->
          <div class="input-area"
               *ngIf="detail.status !== 'CLOSED' && detail.status !== 'REJECTED' && detail.status !== 'AGREED'">
            <form [formGroup]="replyForm" (ngSubmit)="sendMessage()" class="input-form">
              <mat-form-field appearance="outline" class="message-input">
                <textarea matInput formControlName="content" rows="1"
                          placeholder="Écrivez votre message…"
                          cdkTextareaAutosize
                          cdkAutosizeMinRows="1"
                          cdkAutosizeMaxRows="5"
                          (keydown)="onKeyDown($event)">
                </textarea>
              </mat-form-field>
              <button mat-fab color="primary" type="submit"
                      [disabled]="replyForm.invalid || sending"
                      class="send-btn">
                <mat-icon>{{ sending ? 'hourglass_empty' : 'send' }}</mat-icon>
              </button>
            </form>
            <div class="input-hint">Entrée pour envoyer · Maj+Entrée pour saut de ligne</div>
          </div>

          <div class="closed-notice"
               *ngIf="detail.status === 'CLOSED' || detail.status === 'REJECTED'">
            <mat-icon>lock</mat-icon>
            Cette négociation est {{ detail.status === 'CLOSED' ? 'clôturée' : 'refusée' }}.
          </div>

          <div class="agreed-notice" *ngIf="detail.status === 'AGREED'">
            <mat-icon>handshake</mat-icon>
            Accord conclu — contactez le prestataire pour la suite.
            <button mat-stroked-button color="accent" class="review-btn"
                    *ngIf="!reviewedNegotiations.has(detail.id) && !showReviewForm"
                    (click)="openReview(detail.id)">
              <mat-icon>star_rate</mat-icon> Laisser un avis
            </button>
            <span class="already-reviewed" *ngIf="reviewedNegotiations.has(detail.id)">
              <mat-icon>check_circle</mat-icon> Avis publié
            </span>
          </div>

          <app-review-form
            *ngIf="showReviewForm && currentReviewNegotiationId === detail.id"
            [negotiationId]="detail.id"
            (submitted)="onReviewSubmitted(detail.id)"
            (cancelled)="showReviewForm = false">
          </app-review-form>

        </main>

        <ng-template #selectTpl>
          <main class="chat-panel empty-chat">
            <mat-icon>chat_bubble_outline</mat-icon>
            <p>Sélectionnez une conversation</p>
          </main>
        </ng-template>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-center">
          <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .nego-page { height: calc(100vh - 64px); display: flex; flex-direction: column; background: #f5f7fa; }
    .page-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 24px; background: white; border-bottom: 1px solid #e0e0e0;
      h1 { font-size: 1.3rem; font-weight: 700; margin: 0; }
      .count { font-size: 13px; color: #999; background: #f0f0f0; padding: 2px 10px; border-radius: 10px; }
    }
    .nego-layout { flex: 1; display: grid; grid-template-columns: 300px 1fr; overflow: hidden; }
    @media (max-width: 768px) { .nego-layout { grid-template-columns: 1fr; } }

    .conversations-panel {
      background: white; border-right: 1px solid #e0e0e0; overflow-y: auto;
    }
    .empty-convs {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; color: #bbb; padding: 32px; text-align: center; gap: 12px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; }
      p { margin: 0; }
    }
    .conv-item {
      display: flex; gap: 12px; padding: 14px 16px;
      cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background .15s;
      &:hover { background: #f9f9f9; }
      &.active { background: #e8f5e9; border-left: 3px solid #43a047; }
    }
    .conv-avatar {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1.1rem; color: white;
      background: #1976d2;
      &.provider { background: #43a047; }
    }
    .conv-body { flex: 1; min-width: 0; }
    .conv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .conv-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-date { font-size: 11px; color: #999; flex-shrink: 0; }
    .conv-bottom { display: flex; align-items: center; gap: 6px; }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      &.initiated, &.in_progress { background: #fb8c00; }
      &.agreed { background: #43a047; }
      &.closed, &.rejected { background: #9e9e9e; }
    }
    .status-text { font-size: 11px; color: #999; flex: 1; }
    .unread-badge { background: #43a047; color: white; border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: 700; }

    .chat-panel { display: flex; flex-direction: column; overflow: hidden; }
    .empty-chat {
      align-items: center; justify-content: center; color: #bbb; gap: 12px;
      mat-icon { font-size: 56px; width: 56px; height: 56px; }
    }

    .chat-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 20px; background: white; border-bottom: 1px solid #e0e0e0;
    }
    .chat-header-info { display: flex; align-items: center; gap: 12px; }
    .chat-name { font-weight: 600; font-size: 15px; }
    .chat-provider {
      display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .chat-actions { display: flex; align-items: center; gap: 8px; }
    .status-badge {
      padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;
      &.initiated, &.in_progress { background: #fff8e1; color: #f57f17; }
      &.agreed { background: #e8f5e9; color: #2e7d32; }
      &.closed { background: #f5f5f5; color: #757575; }
      &.rejected { background: #fce4ec; color: #c62828; }
    }
    .agreement-banner {
      display: flex; align-items: center; gap: 8px;
      background: #e8f5e9; padding: 10px 20px; font-size: 14px; color: #2e7d32;
      border-bottom: 1px solid #c8e6c9;
      mat-icon { color: #43a047; }
    }

    .messages-area { flex: 1; overflow-y: auto; padding: 20px; background: #f5f7fa; }
    .messages-list { display: flex; flex-direction: column; gap: 4px; }
    .date-separator {
      text-align: center; font-size: 12px; color: #999; margin: 16px 0 8px;
    }
    .message-row {
      display: flex; align-items: flex-end; gap: 8px; margin: 2px 0;
      &.sent { flex-direction: row-reverse; }
    }
    .msg-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: #e0e0e0;
      color: #555; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0;
    }
    .msg-content { max-width: 65%; display: flex; flex-direction: column; }
    .message-row.sent .msg-content { align-items: flex-end; }
    .msg-bubble {
      padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.5;
      white-space: pre-wrap; word-break: break-word;
    }
    .message-row.received .msg-bubble {
      background: white; color: #333; border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .message-row.sent .msg-bubble {
      background: #43a047; color: white; border-bottom-right-radius: 4px;
    }
    .msg-meta { display: flex; align-items: center; gap: 3px; margin-top: 3px; padding: 0 4px; }
    .msg-time { font-size: 11px; color: #999; }
    .msg-read { font-size: 14px; width: 14px; height: 14px; color: #a5d6a7; }
    .messages-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 200px; color: #bbb;
      mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
      p { margin: 0; font-size: 14px; }
    }

    .input-area { background: white; border-top: 1px solid #e0e0e0; padding: 12px 16px 8px; }
    .input-form { display: flex; align-items: flex-end; gap: 10px; }
    .message-input { flex: 1; }
    .send-btn {
      width: 44px !important; height: 44px !important;
      min-width: 44px !important; flex-shrink: 0; margin-bottom: 14px;
    }
    .input-hint { font-size: 11px; color: #bbb; text-align: right; margin-top: -4px; }

    .closed-notice, .agreed-notice {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 14px; font-size: 14px; border-top: 1px solid #e0e0e0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .closed-notice { background: #fafafa; color: #999; }
    .review-btn { margin-top: 8px; }
    .already-reviewed {
      display: inline-flex; align-items: center; gap: 4px;
      color: #43a047; font-size: 13px; margin-top: 8px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .agreed-notice { background: #e8f5e9; color: #2e7d32; }

    .loading-center { display: flex; justify-content: center; align-items: center; flex: 1; }
  `]
})
export class ClientNegotiationsComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesArea') messagesArea!: ElementRef;

  negotiations: NegotiationSummary[] = [];
  detail: NegotiationDetail | null = null;
  selectedId: string | null = null;
  currentUserId: string | null = null;
  loading = false;
  sending = false;
  replyForm: FormGroup;
  private shouldScrollBottom = false;

  showReviewForm = false;
  currentReviewNegotiationId: string | null = null;
  reviewedNegotiations = new Set<string>();

  openReview(negotiationId: string): void {
    this.currentReviewNegotiationId = negotiationId;
    this.showReviewForm = true;
  }

  onReviewSubmitted(negotiationId: string): void {
    this.reviewedNegotiations.add(negotiationId);
    this.showReviewForm = false;
    this.currentReviewNegotiationId = null;
  }

  constructor(
    private negotiationService: NegotiationService,
    private authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.replyForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(2000)]]
    });
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? null;
    this.loadNegotiations();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom && this.messagesArea) {
      const el = this.messagesArea.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollBottom = false;
    }
  }

  loadNegotiations(): void {
    this.loading = true;
    this.negotiationService.getClientNegotiations(0, 50).subscribe({
      next: page => {
        this.negotiations = page.content;
        this.loading = false;
        if (this.negotiations.length && !this.selectedId) {
          this.select(this.negotiations[0].id);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  select(id: string): void {
    this.selectedId = id;
    this.negotiationService.getDetail(id).subscribe({
      next: d => {
        this.detail = d;
        this.shouldScrollBottom = true;
      },
      error: () => this.toastr.error('Impossible de charger la négociation')
    });
  }

  sendMessage(): void {
    if (this.replyForm.invalid || !this.selectedId || this.sending) return;
    const content = this.replyForm.value.content.trim();
    if (!content) return;

    this.sending = true;
    this.negotiationService.sendMessage(this.selectedId, content).subscribe({
      next: msg => {
        if (this.detail) this.detail.messages.push(msg);
        this.replyForm.reset();
        this.sending = false;
        this.shouldScrollBottom = true;
        this.loadNegotiations();
      },
      error: err => {
        this.toastr.error(err?.message || 'Erreur envoi');
        this.sending = false;
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isDifferentDay(date1: string, date2: string): boolean {
    return new Date(date1).toDateString() !== new Date(date2).toDateString();
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      INITIATED: 'Initié', IN_PROGRESS: 'En cours',
      AGREED: 'Accord', CLOSED: 'Clôturé', REJECTED: 'Refusé'
    };
    return labels[status] ?? status;
  }
}