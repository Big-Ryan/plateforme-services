import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Créer un compte</mat-card-title>
          <mat-card-subtitle>Rejoignez la plateforme</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">

            <!-- Rôle -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Je suis</mat-label>
              <mat-select formControlName="role">
                <mat-option value="CLIENT">Un client — je cherche des prestataires</mat-option>
                <mat-option value="PROVIDER">Un prestataire — je propose des services</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Nom / prénom -->
            <div class="row-2">
              <mat-form-field appearance="outline">
                <mat-label>Prénom</mat-label>
                <input matInput formControlName="firstName">
                <mat-error>Prénom obligatoire</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="lastName">
                <mat-error>Nom obligatoire</mat-error>
              </mat-form-field>
            </div>

            <!-- Entreprise (prestataire) -->
            <mat-form-field appearance="outline" class="full-width"
                            *ngIf="form.get('role')?.value === 'PROVIDER'">
              <mat-label>Nom de l'entreprise</mat-label>
              <input matInput formControlName="companyName">
              <mat-error>Nom entreprise obligatoire pour un prestataire</mat-error>
            </mat-form-field>

            <!-- Email -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email">
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email obligatoire</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Email invalide</mat-error>
            </mat-form-field>

            <!-- Code de parrainage (optionnel) -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Code de parrainage (optionnel)</mat-label>
              <input matInput formControlName="referralCode"
                     placeholder="ex: AB12CD34"
                     style="text-transform: uppercase">
              <mat-icon matSuffix>card_giftcard</mat-icon>
              <mat-hint>Si un prestataire vous a invité, entrez son code</mat-hint>
            </mat-form-field>

            <!-- Téléphone -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Téléphone (optionnel)</mat-label>
              <input matInput type="tel" formControlName="phone">
              <mat-icon matSuffix>phone</mat-icon>
            </mat-form-field>

            <!-- Mot de passe -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput [type]="showPwd ? 'text' : 'password'"
                     formControlName="password" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>8 caractères minimum, majuscule, chiffre et caractère spécial</mat-hint>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Obligatoire</mat-error>
              <mat-error *ngIf="form.get('password')?.hasError('minlength')">
                8 caractères minimum
              </mat-error>
              <mat-error *ngIf="form.get('password')?.hasError('pattern')">
                Doit contenir majuscule, chiffre et caractère spécial
              </mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
                    class="full-width submit-btn" [disabled]="form.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              <span *ngIf="!loading">Créer mon compte</span>
            </button>

          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="login-link">
            Déjà un compte ? <a routerLink="/auth/login">Se connecter</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 64px); padding: 24px; background: #f5f5f5;
    }
    .auth-card { width: 100%; max-width: 480px; padding: 8px; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
    .row-2 mat-form-field { width: 100%; }
    .submit-btn { height: 48px; margin-top: 8px; }
    .login-link { text-align: center; margin: 8px 0 0; font-size: 14px; }
    mat-spinner { display: inline-block; }
  `]
})
export class RegisterComponent {

  form: FormGroup;
  loading = false;
  showPwd = false;

  private readonly PWD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]+$/;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      role:        ['CLIENT', Validators.required],
      firstName:   ['', [Validators.required, Validators.maxLength(100)]],
      lastName:    ['', [Validators.required, Validators.maxLength(100)]],
      companyName: [''],
      email:       ['', [Validators.required, Validators.email]],
      phone:       [''],
      referralCode:[''],
      password:    ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(this.PWD_PATTERN)
      ]],
    });

    // Validation conditionnelle companyName pour PROVIDER
    this.form.get('role')?.valueChanges.subscribe(role => {
      const ctrl = this.form.get('companyName');
      if (role === 'PROVIDER') {
        ctrl?.setValidators([Validators.required]);
      } else {
        ctrl?.clearValidators();
      }
      ctrl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { role, ...rest } = this.form.value;

    this.auth.register({ role, ...rest }).subscribe({
      next: response => {
        this.loading = false;
        this.toastr.success('Compte créé avec succès !');
        if (response.user.role === 'PROVIDER') {
          this.router.navigate(['/provider/subscription']);
        } else {
          this.router.navigate(['/catalogue']);
        }
      },
      error: err => {
        this.loading = false;
        this.toastr.error(err?.message || 'Erreur lors de la création du compte');
      }
    });
  }
}