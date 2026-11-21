// VAPID kalit juftligini yaratadi (qo'shimcha kutubxonasiz):  node backend/tools/generate-vapid.mjs
import { generateKeyPairSync } from 'node:crypto';
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const prv = privateKey.export({ format: 'jwk' });
const b = (x) => x.replace(/=+$/, '');
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]);
console.log('VAPID_PUBLIC_KEY  =', b(raw.toString('base64url')));
console.log('VAPID_PRIVATE_KEY =', b(prv.d));
console.log("\nOCHIQ kalitni frontend/js/config.js dagi VAPID_PUBLIC_KEY ga qo'ying.");
console.log("MAXFIY kalitni hech kimga bermang va GitHub'ga yuklamang: faqat Supabase secrets ga.");
