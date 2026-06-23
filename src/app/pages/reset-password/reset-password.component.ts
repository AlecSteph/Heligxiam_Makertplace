import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PASSWORD_PATTERN, PASSWORD_HINT } from '../../utils/password.util';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  showPassword = false;
  showConfirm = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token') || '';
      if (!this.token) {
        this.errorMessage = 'Lien invalide. Demandez un nouvel e-mail de réinitialisation.';
      }
    });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  getError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return '';
    if (control.errors['required']) return 'Ce champ est obligatoire';
    if (control.errors['minlength'] || control.errors['pattern']) {
      return PASSWORD_HINT;
    }
    return '';
  }

  onSubmit(): void {
    if (!this.token) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword({
      token: this.token,
      password: this.form.value.password
    }).pipe(
      finalize(() => { this.isLoading = false; })
    ).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        setTimeout(() => this.router.navigate(['/account']), 2500);
      },
      error: (err: Error) => {
        this.errorMessage = err.message || 'Impossible de réinitialiser le mot de passe.';
      }
    });
  }
}
