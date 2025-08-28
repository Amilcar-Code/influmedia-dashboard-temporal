// src/app/services/influencers.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, CollectionReference, DocumentData,
  addDoc, setDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, where, orderBy, limit as qlimit, startAfter, startAt, endAt,
  serverTimestamp
} from '@angular/fire/firestore';
import { Influencer } from '../models/influencer.model';
// src/app/services/influencers.service.ts
import { normalizeForWrite, cleanUndefined } from './../utils/normalize';


@Injectable({ providedIn: 'root' })
export class InfluencersService {
  private fs = inject(Firestore);
  private col = collection(this.fs, 'influencers') as CollectionReference<DocumentData>;

  // ---------------------------
  // LISTADO (paginado por email)
  // ---------------------------
  async listChunk(pageSize = 200, lastEmail: string | null = null) {
    const base = query(this.col, orderBy('email'), qlimit(pageSize));
    const q = lastEmail
      ? query(this.col, orderBy('email'), startAfter(lastEmail), qlimit(pageSize))
      : base;

    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) as Influencer }));
    const last = snap.docs.at(-1)?.get('email') ?? null;
    const ended = snap.empty || snap.docs.length < pageSize;
    return { items, lastEmail: last, ended };
  }

  // -------------------------------------------
  // BÚSQUEDA POR NOMBRE (tolerante)
  // 0) exacto por search_name (normalizado)
  // 1) prefijo por nameLower
  // 2) prefijo por handleLower
  // 3) fallback legacy: prefijo por name
  // -------------------------------------------
  async searchByName(term: string, pageSize = 200) {
  const raw   = term.trim();
  const lower = raw.toLowerCase();

  // 1) search_name (minúsculas + sin tildes)  ✅
  try {
    const q0 = query(
      this.col,
      orderBy('search_name'),
      startAt(lower),
      endAt(lower + '\uf8ff'),
      qlimit(pageSize)
    );
    const s0 = await getDocs(q0);
    if (!s0.empty) return s0.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch { /* si aún no hay índice/campo, cae al siguiente */ }

  // 2) nameLower (minúsculas)  ✅
  try {
    const q1 = query(
      this.col,
      orderBy('nameLower'),
      startAt(lower),
      endAt(lower + '\uf8ff'),
      qlimit(pageSize)
    );
    const s1 = await getDocs(q1);
    if (!s1.empty) return s1.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch {}

  // 3) fallback legacy: name con capitalización aproximada
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const q2 = query(this.col, orderBy('name'), startAt(cap), endAt(cap + '\uf8ff'), qlimit(pageSize));
  const s2 = await getDocs(q2);
  return s2.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

async searchByEmail(term: string, pageSize = 200) {
  const lower = term.trim().toLowerCase();

  // 1) emailLower  ✅
  try {
    const q1 = query(
      this.col,
      orderBy('emailLower'),
      startAt(lower),
      endAt(lower + '\uf8ff'),
      qlimit(pageSize)
    );
    const s1 = await getDocs(q1);
    if (!s1.empty) return s1.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch {}

  // 2) fallback legacy: email tal cual (por si existía antes)
  const q2 = query(this.col, orderBy('email'), startAt(lower), endAt(lower + '\uf8ff'), qlimit(pageSize));
  const s2 = await getDocs(q2);
  return s2.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

  // Atajo por modo
  async searchSmart(term: string, mode: 'name' | 'email' = 'name', pageSize = 200) {
    return mode === 'email'
      ? this.searchByEmail(term, pageSize)
      : this.searchByName(term, pageSize);
  }

  // --------------
  // CRUD
  // --------------
  async get(id: string): Promise<Influencer | undefined> {
    const ref = doc(this.fs, 'influencers', id);
    const d = await getDoc(ref);
    return d.exists() ? ({ id: d.id, ...(d.data() as any) }) : undefined;
  }

  // Crear: normaliza TODO antes de subir
  async create(data: Influencer) {
  const { id, ...rest } = data as any; // no subas "id"
  const norm = normalizeForWrite(rest);
  const payload: any = {
    ...rest,
    ...norm,
    email: (rest.email ?? '').toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(this.col, cleanUndefined(payload));
  return ref.id;
}

async update(id: string, data: Partial<Influencer>) {
  const { id: _omit, ...rest } = data as any;
  const norm = normalizeForWrite(rest);

  // Si viene email, reflejar emailLower
  if ('email' in rest) {
    norm.email = (rest.email ?? '').toLowerCase();
    norm.emailLower = norm.email;
  }

  const patch: any = {
    ...rest,
    ...norm,
    updatedAt: serverTimestamp(),
  };

  // set + merge (mejor que update cuando quitamos undefined)
  const ref = doc(this.fs, 'influencers', id);
  await setDoc(ref, cleanUndefined(patch), { merge: true });
}


  async remove(id: string) {
    await deleteDoc(doc(this.fs, 'influencers', id));
  }
}
