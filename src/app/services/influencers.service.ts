// src/app/services/influencers.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, CollectionReference, DocumentData,
  addDoc, setDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, where, orderBy, limit as qlimit, startAfter, startAt, endAt,
  serverTimestamp
} from '@angular/fire/firestore';
import { Influencer } from '../models/influencer.model';
import { normalizeText, normalizeForWrite } from '../utils/normalize';

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
    const raw = term.trim();
    const sn  = normalizeText(raw);
    const out: any[] = [];
    const seen = new Set<string>();

    // 0) search_name == normalizado
    try {
      const s0 = await getDocs(query(this.col, where('search_name', '==', sn), qlimit(pageSize)));
      s0.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
      if (out.length >= pageSize) return out;
    } catch { /* si no existe el campo en docs viejos, seguimos */ }

    // 1) prefijo por nameLower
    try {
      const s1 = await getDocs(query(
        this.col, orderBy('nameLower'), startAt(sn), endAt(sn + '\uf8ff'), qlimit(pageSize)
      ));
      s1.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
      if (out.length >= pageSize) return out;
    } catch { /* puede pedir índice; si falla, continuamos */ }

    // 2) prefijo por handleLower
    try {
      const s2 = await getDocs(query(
        this.col, orderBy('handleLower'), startAt(sn), endAt(sn + '\uf8ff'), qlimit(pageSize)
      ));
      s2.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
      if (out.length >= pageSize) return out;
    } catch {}

    // 3) fallback legacy (docs viejos): prefijo por name
    const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    const s3 = await getDocs(query(
      this.col, orderBy('name'), startAt(cap), endAt(cap + '\uf8ff'), qlimit(pageSize)
    ));
    s3.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
    return out.slice(0, pageSize);
  }

  // -------------------------------------------
  // BÚSQUEDA POR EMAIL (tolerante)
  // 0) igualdad por emailLower
  // 1) prefijo por emailLower
  // 2) fallback legacy: prefijo por email
  // -------------------------------------------
  async searchByEmail(term: string, pageSize = 200) {
    const raw = term.trim();
    const lower = raw.toLowerCase();
    const out: any[] = [];
    const seen = new Set<string>();

    // 0) igualdad exacta por emailLower
    try {
      const s0 = await getDocs(query(this.col, where('emailLower', '==', lower), qlimit(pageSize)));
      s0.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
      if (out.length >= pageSize) return out;
    } catch {}

    // 1) prefijo por emailLower
    try {
      const s1 = await getDocs(query(
        this.col, orderBy('emailLower'), startAt(lower), endAt(lower + '\uf8ff'), qlimit(pageSize)
      ));
      s1.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
      if (out.length >= pageSize) return out;
    } catch {}

    // 2) fallback legacy: prefijo por email
    const s2 = await getDocs(query(
      this.col, orderBy('email'), startAt(lower), endAt(lower + '\uf8ff'), qlimit(pageSize)
    ));
    s2.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); out.push({ id: d.id, ...(d.data() as any) }); }});
    return out.slice(0, pageSize);
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
    const payload: any = normalizeForWrite(rest);
    payload.email = (payload.email ?? '').toLowerCase();
    payload.emailLower = payload.email;
    payload.createdAt = serverTimestamp();
    payload.updatedAt = serverTimestamp();

    // addDoc crea ID automático
    const ref = await addDoc(this.col, payload);
    return ref.id;
  }

  // Actualizar: normaliza SOLO lo que venga en el patch
  async update(id: string, data: Partial<Influencer>) {
    const { id: _omit, ...patchIn } = data as any;

    // Pasamos el patch por normalizeForWrite para generar campos derivados,
    // y luego sobrescribimos updatedAt con serverTimestamp().
    const norm = normalizeForWrite(patchIn) as any;

    if ('email' in patchIn) {
      norm.email = (patchIn.email ?? '').toLowerCase();
      norm.emailLower = norm.email;
    }
    if (!('updatedAt' in norm)) {
      norm.updatedAt = serverTimestamp();
    } else {
      norm.updatedAt = serverTimestamp();
    }

    const ref = doc(this.fs, 'influencers', id);
    // setDoc(merge:true) aplica solo los campos del patch
    await setDoc(ref, norm, { merge: true });
  }

  async remove(id: string) {
    await deleteDoc(doc(this.fs, 'influencers', id));
  }
}
