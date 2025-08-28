import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, CollectionReference, DocumentData,
  addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, limit, startAfter, serverTimestamp,
  startAt, endAt
} from '@angular/fire/firestore';
import { Influencer } from '../models/influencer.model';

@Injectable({ providedIn: 'root' })
export class InfluencersService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'influencers') as CollectionReference<DocumentData>;

  // -------------------------------------------
  // LISTADO (paginado): usamos 'email' (existe en docs viejos y nuevos)
  // -------------------------------------------
  async listChunk(pageSize = 200, lastEmail: string | null = null) {
    const base = query(this.col, orderBy('email'), limit(pageSize));
    const q = lastEmail
      ? query(this.col, orderBy('email'), startAfter(lastEmail), limit(pageSize))
      : base;

    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));
    const last = snap.docs.at(-1)?.get('email') ?? null;
    const ended = snap.empty || snap.docs.length < pageSize;
    return { items, lastEmail: last, ended };
  }

  // -------------------------------------------
  // BÚSQUEDA POR NOMBRE (funciona con docs nuevos y viejos)
  // 1) nameLower (nuevos)
  // 2) name tal cual tecleado (viejos)
  // 3) name capitalizado (p.ej. "Alan")
  // -------------------------------------------
  async searchByName(term: string, pageSize = 200) {
    const raw   = term.trim();
    const lower = raw.toLowerCase();

    // 1) nameLower
    try {
      const q1 = query(
        this.col,
        orderBy('nameLower'),
        startAt(lower),
        endAt(lower + '\uf8ff'),
        limit(pageSize)
      );
      const s1 = await getDocs(q1);
      if (!s1.empty) return s1.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));
    } catch { /* si falta índice, pasamos al fallback */ }

    // 2) name tal cual
    let q2 = query(
      this.col,
      orderBy('name'),
      startAt(raw),
      endAt(raw + '\uf8ff'),
      limit(pageSize)
    );
    let s2 = await getDocs(q2);
    if (!s2.empty) return s2.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));

    // 3) name capitalizado (Primera en mayúscula)
    const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    const q3 = query(
      this.col,
      orderBy('name'),
      startAt(cap),
      endAt(cap + '\uf8ff'),
      limit(pageSize)
    );
    const s3 = await getDocs(q3);
    return s3.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));
  }

  // -------------------------------------------
  // BÚSQUEDA POR EMAIL (funciona con docs nuevos y viejos)
  // 1) emailLower (nuevos)
  // 2) email tal cual
  // 3) email en minúsculas
  // -------------------------------------------
  async searchByEmail(term: string, pageSize = 200) {
    const raw   = term.trim();
    const lower = raw.toLowerCase();

    // 1) emailLower
    try {
      const q1 = query(
        this.col,
        orderBy('emailLower'),
        startAt(lower),
        endAt(lower + '\uf8ff'),
        limit(pageSize)
      );
      const s1 = await getDocs(q1);
      if (!s1.empty) return s1.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));
    } catch { /* si falta índice, pasamos al fallback */ }

    // 2) email tal cual
    let q2 = query(
      this.col,
      orderBy('email'),
      startAt(raw),
      endAt(raw + '\uf8ff'),
      limit(pageSize)
    );
    let s2 = await getDocs(q2);
    if (!s2.empty) return s2.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));

    // 3) email minúsculas
    const q3 = query(
      this.col,
      orderBy('email'),
      startAt(lower),
      endAt(lower + '\uf8ff'),
      limit(pageSize)
    );
    const s3 = await getDocs(q3);
    return s3.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));
  }

  // Atajo por modo
  async searchSmart(term: string, mode: 'name' | 'email' = 'name', pageSize = 200) {
    return mode === 'email'
      ? this.searchByEmail(term, pageSize)
      : this.searchByName(term, pageSize);
  }

  // -------------------------------------------
  // CRUD
  // -------------------------------------------
  async get(id: string): Promise<Influencer | undefined> {
    const ref = doc(this.fs, 'influencers', id);
    const d = await getDoc(ref);
    return d.exists() ? ({ id: d.id, ...(d.data() as any) }) : undefined;
  }

  async create(data: Influencer) {
    const { id, ...rest } = data as any; // no subas "id"
    const payload: Influencer = {
      ...rest,
      email: (rest.email ?? '').toLowerCase(),
      emailLower: (rest.email ?? '').toLowerCase(),
      nameLower: (rest.name ?? '').toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(this.col, payload as any);
    return ref.id;
  }

  async update(id: string, data: Partial<Influencer>) {
    const { id: _omit, ...rest } = data as any; // no subas "id"
    const ref = doc(this.fs, 'influencers', id);

    const patch: any = {
      ...rest,
      updatedAt: serverTimestamp(),
    };
    if ('email' in patch) {
      patch.email = (patch.email ?? '').toLowerCase();
      patch.emailLower = patch.email;
    }
    if ('name' in patch) {
      patch.nameLower = (patch.name ?? '').toLowerCase();
    }

    await updateDoc(ref, patch);
  }

  async remove(id: string) {
    await deleteDoc(doc(this.fs, 'influencers', id));
  }
}
