// src/app/utils/normalize.ts
export const normalizeText = (s?: string) => (s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')   // quita tildes
  .replace(/\s+/g, ' ')               // colapsa espacios
  .trim()
  .toLowerCase();

const inferHandleLower = (handles?: any) => {
  const h = handles?.instagram || handles?.tiktok || handles?.youtube || '';
  return h ? String(h).toLowerCase().replace(/^@/, '') : undefined;
};

const buildKeywords = (name?: string, aliases?: string[], handles?: any) => {
  const bag = new Set<string>();
  const push = (v?: string) => {
    if (!v) return;
    const n = normalizeText(v);
    n.split(/\s+/).filter(Boolean).forEach(t => bag.add(t)); // tokens
    bag.add(n);                                              // frase completa
  };
  push(name);
  (aliases || []).forEach(push);
  push(handles?.instagram);
  push(handles?.tiktok);
  push(handles?.youtube);
  return Array.from(bag).filter(t => t.length >= 2).slice(0, 100);
};

export const normalizeForWrite = (raw: any) => {
  const name: string | undefined = raw?.name ?? raw?.nombre ?? raw?.['Nombre Completo'];
  const aliases: string[] = Array.isArray(raw?.aliases) ? raw.aliases : [];

  return {
    ...raw,
    name,
    search_name: name ? normalizeText(name) : undefined,
    nameLower:   name ? name.toLowerCase() : undefined,
    handleLower: inferHandleLower(raw?.handles),
    aliases:     aliases.map(a => normalizeText(a)),
    keywords:    Array.isArray(raw?.keywords) && raw.keywords.length
                  ? raw.keywords
                  : buildKeywords(name, aliases, raw?.handles),
    updatedAt:   new Date().toISOString(),
  };
};
