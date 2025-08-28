import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword, signOut,
  authState, setPersistence, browserLocalPersistence, User
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  /** Observable con el usuario actual (null si no hay sesión) */
  user$: Observable<User | null> = authState(this.auth);

  /** Persistencia en LocalStorage (llámalo una vez al entrar al login) */
  async initPersistence() {
    await setPersistence(this.auth, browserLocalPersistence);
  }

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signOut() {
    return signOut(this.auth);
  }
}
