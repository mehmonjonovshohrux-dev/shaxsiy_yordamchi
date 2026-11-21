// Parol kuchini tekshirish (faqat brauzerda; server tomonda ham Supabase sozlamasi bor).
const COMMON = [
  'password', 'parol', 'qwerty', '123456', '12345678', '1234567890', '111111', '000000', 'admin',
  'welcome', 'iloveyou', 'letmein', 'abc123', 'uzbekistan', 'toshkent', 'samarqand', 'qazwsx', '1q2w3e',
];
const SEQUENCES = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|wert|asdf|zxcv)/i;
const LABELS = ['Juda zaif', 'Zaif', "O'rtacha", 'Yaxshi', 'Kuchli'];

export function checkPassword(pw = '', email = '') {
  const local = (email.split('@')[0] || '').toLowerCase();
  const lower = pw.toLowerCase();
  const checks = [
    { id: 'len', ok: pw.length >= 10, label: 'Kamida 10 ta belgi' },
    { id: 'lower', ok: /[a-z]/.test(pw), label: 'Kichik harf (a-z)' },
    { id: 'upper', ok: /[A-Z]/.test(pw), label: 'Katta harf (A-Z)' },
    { id: 'digit', ok: /\d/.test(pw), label: 'Raqam (0-9)' },
    { id: 'sym', ok: /[^A-Za-z0-9]/.test(pw), label: 'Belgi (! @ # $ …)' },
  ];
  const classes = checks.slice(1).filter((c) => c.ok).length;
  const common = pw.length > 0 && COMMON.some((c) => lower.includes(c));
  const hasEmail = local.length >= 3 && lower.includes(local);
  const repeats = /(.)\1{3,}/.test(pw);
  const sequence = SEQUENCES.test(pw);

  const warnings = [];
  if (common) warnings.push("Juda oddiy so'z bor");
  if (hasEmail) warnings.push('Parolda emailingiz bor');
  if (repeats) warnings.push('Bir xil belgi ketma-ket takrorlangan');
  if (sequence) warnings.push('Oson ketma-ketlik bor (1234, qwer…)');

  const valid = checks[0].ok && classes >= 3 && !common && !hasEmail && !repeats;

  let score = 0;
  if (pw.length >= 8) score = 1;
  if (pw.length >= 10 && classes >= 3) score = 2;
  if (pw.length >= 12 && classes >= 3) score = 3;
  if (pw.length >= 14 && classes === 4) score = 4;
  if (common || hasEmail || repeats || sequence) score = Math.min(score, 1);
  if (!pw) score = 0;

  return { valid, score, label: LABELS[score], checks, warnings };
}
