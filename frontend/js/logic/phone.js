// Telefon raqami: har doim "+998 xx xxx xx xx" ko'rinishida qabul qilinadi va "+998XXXXXXXXX" ko'rinishida saqlanadi.
export function localDigits(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 9);
}

// "952255678" -> "+998 95 225 56 78" (yozayotganda ham qisman chiroyli chiqadi)
export function formatLocal(local) {
  const d = String(local || '');
  if (!d) return '';
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+998 ${parts.join(' ')}`;
}

export const formatInput = (v) => formatLocal(localDigits(v));
export const isValidPhone = (v) => localDigits(v).length === 9;
export const toE164 = (v) => (isValidPhone(v) ? `+998${localDigits(v)}` : '');
export const pretty = (v) => (isValidPhone(v) ? formatLocal(localDigits(v)) : '');
