import { Injectable, signal } from '@angular/core';
import { createAuthClient } from 'better-auth/client';

export interface AuthUser {
  id:    string;
  name:  string;
  image: string | null;
}

const client = createAuthClient({ baseURL: 'http://localhost:3000/api/auth' });

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user    = signal<AuthUser | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  async refresh() {
    try {
      const s = await client.getSession();
      this.user.set((s?.data?.user as AuthUser) ?? null);
    } catch {
      this.user.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  signInGitHub() {
    client.signIn.social({ provider: 'github', callbackURL: window.location.href });
  }

  signInLinkedIn() {
    client.signIn.social({ provider: 'linkedin', callbackURL: window.location.href });
  }

  async signOut() {
    await client.signOut();
    this.user.set(null);
  }
}
