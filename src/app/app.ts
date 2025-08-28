// src/app/app.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword } from '@angular/fire/auth';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
   private auth = inject(Auth);

  async ngOnInit() {
    try {
      // guarda sesión en LocalStorage (persiste entre recargas)
      await setPersistence(this.auth, browserLocalPersistence);

      // si ya hay sesión, no vuelvas a loguear
      if (!this.auth.currentUser) {
        await signInWithEmailAndPassword(
          this.auth,
          environment.testAuth.email,
          environment.testAuth.password
        );
        console.log('Signed in as test user');
      }
    } catch (e) {
      console.error('Auto-login error', e);
    }
  }
}
