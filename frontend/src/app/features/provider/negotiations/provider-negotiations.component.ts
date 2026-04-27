import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NegotiationService } from '../../../core/services/domain.services';
import { AuthService } from '../../../core/services/auth.service';
import { NegotiationSummary, NegotiationDetail } from '../../../core/models/api.models';

@Component({
  selector: 'app-provider-negotiations',
  template: `
    <div class="nego-page">

      <!-- Header -->
      <div class="page-header">
        <h1>Négociations</h1>
        <span class="count" *ngIf="negotiations.length">{{ negotiations.length }} conversation(s)</span>
      </div>

      <div class="nego-layout" *ngIf="!loading; else loadingTpl">

        <!-- ===== Liste gauche ===== -->
        <aside class="conversations-panel">
          <div class="empty-convs" *ngIf="!negotiations.length">
            <mat-icon>forum</mat-icon>
            <p>Aucune négociation reçue.</p>
          </div>

          <div class="conv-item"
               *ngFor="let n of negotiations"
               [class.active]="selectedId === n.id"
               [class.unread]="n.unreadCount > 0"
               (click)="select(n.id)">

            <div class="conv-avatar">
              {{ (n.clientName || 'C')[0].toUpperCase() }}
            </div>

            <div class="conv-body">
              <div class="conv-top">
                <span class="conv-name">{{ n.clientName || 'Client anonyme' }}</span>
                <span class="conv-date">{{ n.updatedAt | date:'dd/MM' }}</span>
              </div>
              <div class="conv-service">{{ n.serviceTitle || 'Contact direct' }}</div>
              <div class="conv-bottom">
                <span class="status-dot" [ngClass]="n.status.toLowerCase()"></span>
                <span class="status-text">{{ getStatusLabel(n.status) }}</span>
                <span class="unread-badge" *ngIf="n.unreadCount > 0">{{ n.unreadCount }}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- ===== Zone conversation droite ===== -->
        <main class="chat-panel" *ngIf="detail; else selectTpl">

          <!-- Header conversation -->
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-avatar">{{ (detail.clientName || 'C')[0].toUpperCase() }}</div>
              <div>
                <div class="chat-name">{{ detail.clientName || 'Client anonyme' }}</div>
                <div class="chat-service" *ngIf="detail.serviceTitle">
                  <mat-icon>business_center</mat-icon> {{ detail.serviceTitle }}
                </div>
              </div>
            </div>
            <div class="chat-actions">
              <!-- Accord avec prix -->
              <button mat-stroked-button color="primary"
                      *ngIf="canAgree()"
                      (click)="openAgreement()"
                      matTooltip="Conclure un accord">
                <mat-icon>handshake</mat-icon>
                Conclure
              </button>
              <!-- Clôturer -->
              <button mat-stroked-button color="warn"
                      *ngIf="canClose()"
                      (click)="updateStatus('CLOSED')"
                      matTooltip="Clôturer la négociation">
                <mat-icon>close</mat-icon>
                Clôturer
              </button>
              <!-- Badge statut -->
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

                <!-- Séparateur date -->
                <div class="date-separator"
                     *ngIf="i === 0 || isDifferentDay(detail.messages[i-1].sentAt, msg.sentAt)">
                  {{ msg.sentAt | date:'d MMM' }}
                </div>

                <!-- Bulle message -->
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
                <p>Commencez la conversation</p>
              </div>
            </div>
          </div>

          <!-- Zone de saisie -->
          <div class="input-area"
               *ngIf="detail.status !== 'CLOSED' && detail.status !== 'REJECTED'">
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
            <div class="input-hint">Entrée pour envoyer · Maj+Entrée pour un saut de ligne</div>
          </div>

          <!-- Statut fermé -->
          <div class="closed-notice"
               *ngIf="detail.status === 'CLOSED' || detail.status === 'REJECTED'">
            <mat-icon>lock</mat-icon>
            Cette négociation est {{ detail.status === 'CLOSED' ? 'clôturée' : 'refusée' }}.
          </div>

        </main>

        <!-- Modal accord -->
        <div class="agreement-modal" *ngIf="showAgreementModal" (click)="closeAgreement()">
          <div class="agreement-form" (click)="$event.stopPropagation()">
            <h3><mat-icon>handshake</mat-icon> Conclure un accord</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Prix convenu (optionnel)</mat-label>
              <input matInput type="number" [(ngModel)]="agreedPrice" placeholder="ex: 25000">
              <span matSuffix>XAF</span>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes / conditions (optionnel)</mat-label>
              <textarea matInput [(ngModel)]="agreedNotes" rows="3"
                        placeholder="Délai de livraison, conditions particulières…"></textarea>
            </mat-form-field>

            <div class="modal-actions">
              <button mat-button (click)="closeAgreement()">Annuler</button>
              <button mat-raised-button color="primary" (click)="confirmAgreement()">
                <mat-icon>check</mat-icon> Confirmer l'accord
              </button>
            </div>
          </div>
        </div>

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

    .nego-layout {
      flex: 1; display: grid; grid-template-columns: 300px 1fr;
      overflow: hidden; position: relative;
    }
    @media (max-width: 768px) { .nego-layout { grid-template-columns: 1fr; } }

    /* ===== Liste conversations ===== */
    .conversations-panel {
      background: white; border-right: 1px solid #e0e0e0;
      overflow-y: auto; display: flex; flex-direction: column;
    }
    .empty-convs {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; color: #bbb; padding: 32px; text-align: center;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
      p { margin: 0; }
    }
    .conv-item {
      display: flex; gap: 12px; padding: 14px 16px;
      cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background .15s;
      &:hover { background: #f9f9f9; }
      &.active { background: #e3f2fd; border-left: 3px solid #1976d2; }
      &.unread .conv-name { font-weight: 700; }
    }
    .conv-avatar {
      width: 44px; height: 44px; border-radius: 50%; background: #1976d2;
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1.1rem; flex-shrink: 0;
    }
    .conv-body { flex: 1; min-width: 0; }
    .conv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .conv-name { font-size: 14px; font-weight: 500; }
    .conv-date { font-size: 11px; color: #999; }
    .conv-service { font-size: 12px; color: #666; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-bottom { display: flex; align-items: center; gap: 6px; }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      &.initiated, &.in_progress { background: #fb8c00; }
      &.agreed { background: #43a047; }
      &.closed, &.rejected { background: #9e9e9e; }
    }
    .status-text { font-size: 11px; color: #999; flex: 1; }
    .unread-badge {
      background: #1976d2; color: white; border-radius: 10px;
      padding: 1px 7px; font-size: 11px; font-weight: 700;
    }

    /* ===== Zone chat ===== */
    .chat-panel {
      display: flex; flex-direction: column; overflow: hidden; position: relative;
    }
    .empty-chat {
      align-items: center; justify-content: center; color: #bbb; gap: 12px;
      mat-icon { font-size: 56px; width: 56px; height: 56px; }
      p { font-size: 15px; }
    }

    /* Header chat */
    .chat-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 20px; background: white; border-bottom: 1px solid #e0e0e0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .chat-header-info { display: flex; align-items: center; gap: 12px; }
    .chat-avatar {
      width: 40px; height: 40px; border-radius: 50%; background: #1976d2;
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem;
    }
    .chat-name { font-weight: 600; font-size: 15px; }
    .chat-service {
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

    /* Bandeau accord */
    .agreement-banner {
      display: flex; align-items: center; gap: 8px;
      background: #e8f5e9; padding: 10px 20px; font-size: 14px; color: #2e7d32;
      border-bottom: 1px solid #c8e6c9;
      mat-icon { color: #43a047; }
    }

    /* Messages */
    .messages-area {
      flex: 1; overflow-y: auto; padding: 20px;
      background: #f5f7fa;
    }
    .messages-list { display: flex; flex-direction: column; gap: 4px; }

    .date-separator {
      text-align: center; font-size: 12px; color: #999;
      margin: 16px 0 8px; position: relative;
      &::before, &::after {
        content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background: #e0e0e0;
      }
      &::before { left: 0; }
      &::after { right: 0; }
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
      background: #1976d2; color: white; border-bottom-right-radius: 4px;
    }
    .msg-meta {
      display: flex; align-items: center; gap: 3px;
      margin-top: 3px; padding: 0 4px;
    }
    .msg-time { font-size: 11px; color: #999; }
    .msg-read { font-size: 14px; width: 14px; height: 14px; color: #90caf9; }

    .messages-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 200px; color: #bbb;
      mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
      p { margin: 0; font-size: 14px; }
    }

    /* Zone saisie */
    .input-area {
      background: white; border-top: 1px solid #e0e0e0;
      padding: 12px 16px 8px;
    }
    .input-form { display: flex; align-items: flex-end; gap: 10px; }
    .message-input { flex: 1; }
    .send-btn {
      width: 44px !important; height: 44px !important;
      min-width: 44px !important; min-height: 44px !important;
      flex-shrink: 0; margin-bottom: 14px;
    }
    .input-hint { font-size: 11px; color: #bbb; text-align: right; margin-top: -4px; }

    .closed-notice {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: #fafafa; border-top: 1px solid #e0e0e0;
      padding: 14px; font-size: 14px; color: #999;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* Modal accord */
    .agreement-modal {
      position: absolute; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center; z-index: 10;
    }
    .agreement-form {
      background: white; border-radius: 16px; padding: 28px;
      width: 420px; max-width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 20px;
           font-size: 1.1rem; mat-icon { color: #1976d2; } }
    }
    .full-width { width: 100%; margin-bottom: 12px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

    .loading-center { display: flex; justify-content: center; align-items: center; flex: 1; }
  `]
})
export class ProviderNegotiationsComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesArea') messagesArea!: ElementRef;

  negotiations: NegotiationSummary[] = [];
  detail: NegotiationDetail | null = null;
  selectedId: string | null = null;
  currentUserId: string | null = null;
  loading = false;
  sending = false;
  showAgreementModal = false;
  agreedPrice: number | null = null;
  agreedNotes = '';
  replyForm: FormGroup;
  private shouldScrollBottom = false;

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
    this.negotiationService.getProviderNegotiations(0, 50).subscribe({
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
        // Rafraîchir la liste
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

  openAgreement(): void  { this.showAgreementModal = true; }
  closeAgreement(): void { this.showAgreementModal = false; }

  confirmAgreement(): void {
    if (!this.selectedId) return;
    this.negotiationService.updateStatus(
      this.selectedId, 'AGREED',
      this.agreedPrice ?? undefined,
      this.agreedNotes || undefined
    ).subscribe({
      next: d => {
        this.detail = d;
        this.closeAgreement();
        this.toastr.success('Accord confirmé !');
        this.loadNegotiations();
      },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }

  updateStatus(status: string): void {
    if (!this.selectedId) return;
    if (!confirm(`Voulez-vous vraiment ${status === 'CLOSED' ? 'clôturer' : 'refuser'} cette négociation ?`)) return;
    this.negotiationService.updateStatus(this.selectedId, status).subscribe({
      next: d => {
        this.detail = d;
        this.toastr.success('Statut mis à jour');
        this.loadNegotiations();
      },
      error: err => this.toastr.error(err?.message || 'Erreur')
    });
  }

  canAgree(): boolean {
    return !!this.detail &&
      ['INITIATED', 'IN_PROGRESS'].includes(this.detail.status);
  }

  canClose(): boolean {
    return !!this.detail &&
      !['CLOSED', 'REJECTED', 'AGREED'].includes(this.detail.status);
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