import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Connexion</mat-card-title>
          <mat-card-subtitle>Accédez à votre espace</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email">
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email obligatoire</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Format email invalide</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput [type]="showPwd ? 'text' : 'password'"
                     formControlName="password" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Mot de passe obligatoire</mat-error>
            </mat-form-field>

            <div class="form-actions">
              <a routerLink="/auth/forgot-password" class="forgot-link">Mot de passe oublié ?</a>
            </div>

            <button mat-raised-button color="primary" type="submit"
                    class="full-width submit-btn" [disabled]="form.invalid || loading">
              <mat-progress-spinner *ngIf="loading" diameter="20" mode="indeterminate"
                                    style="display:inline-block"></mat-progress-spinner>
              <span *ngIf="!loading">Se connecter</span>
            </button>

          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="register-link">
            Pas encore de compte ? <a routerLink="/auth/register">S'inscrire gratuitement</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 64px); padding: 24px; background: #f5f7fa;
    }
    .auth-card { width: 100%; max-width: 420px; padding: 8px; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .form-actions { display: flex; justify-content: flex-end; margin: -4px 0 12px; }
    .forgot-link { font-size: 13px; color: #1976d2; text-decoration: none; }
    .submit-btn { height: 48px; margin-top: 8px; }
    .register-link { text-align: center; margin: 8px 0 0; font-size: 14px; }
  `]
})
export class LoginComponent {

  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  private fb     = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = false;
  showPwd = false;

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;

    this.auth.login(this.form.value).subscribe({
      next: response => {
        this.loading = false;
        this.toastr.success('Bienvenue ' + response.user.firstName + ' !');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const role = response.user.role;
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else if (role === 'PROVIDER') {
          this.router.navigate(['/provider/dashboard']);
        } else if (role === 'ADMIN') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      },
      error: err => {
        this.loading = false;
        this.toastr.error(err?.message || 'Identifiants incorrects');
      }
    });
  }
}