// Quita tildes, pasa a minúsculas y colapsa espacios
export const normalizeText = (s: string) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Keywords básicas a partir del nombre (tokens + prefijos)
export const buildKeywords = (name?: string) => {
  const t = normalizeText(name || '');
  if (!t) return [] as string[];
  const toks = Array.from(new Set(t.split(' ').filter(Boolean)));
  const pref = new Set<string>();
  for (const tok of toks) {
    for (let i = 1; i <= Math.min(tok.length, 8); i++) pref.add(tok.slice(0, i));
  }
  return [...toks, ...Array.from(pref)];
};

// Si algún día pasas handles.* en el form, infiere un handleLower
export const inferHandleLower = (handles?: {
  instagram?: string; tiktok?: string; youtube?: string;
}) => {
  const h = handles?.instagram || handles?.tiktok || handles?.youtube;
  return h ? String(h).toLowerCase() : undefined;
};

// Construye solo los campos derivados que EXISTEN (no undefined)
export const normalizeForWrite = (raw: any) => {
  const out: any = {};

  if (raw?.email != null) out.emailLower = String(raw.email).toLowerCase();

  if (raw?.name != null) {
    out.nameLower = String(raw.name).toLowerCase();
    out.search_name = normalizeText(String(raw.name));
    const kw = buildKeywords(String(raw.name));
    if (kw.length) out.keywords = kw;
  }

  const hLower = inferHandleLower(raw?.handles);
  if (hLower) out.handleLower = hLower;

  return out;
};

// Elimina undefined de forma recursiva (Firestore no acepta undefined)
export const cleanUndefined = (v: any): any => {
  if (Array.isArray(v)) return v.map(cleanUndefined).filter(x => x !== undefined);
  if (v && typeof v === 'object') {
    const o: any = {};
    for (const [k, val] of Object.entries(v)) {
      const c = cleanUndefined(val);
      if (c !== undefined) o[k] = c;
    }
    return o;
  }
  return v === undefined ? undefined : v;
};
