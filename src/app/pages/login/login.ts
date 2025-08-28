import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
 private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = false;
  error = '';

  async ngOnInit() {
    // session persistente
    await this.auth.initPersistence();
  }

  async submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true; this.error = '';
    const { email, password } = this.form.getRawValue();
    try {
      await this.auth.signIn(email!, password!);
      this.router.navigateByUrl('/dashboard');
    } catch (e: any) {
      this.error = e?.code ?? 'Error al iniciar sesión';
    } finally {
      this.loading = false;
    }
  }
}
