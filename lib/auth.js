// Verifies the Cloudflare Access JWT that Access adds to every request it lets through.
// Access itself blocks strangers at the edge; this is the second lock in case a route is ever
// left out of the Access application by mistake.
import { err } from './util.js';

let certCache = { at: 0, keys: [] };

async function getKeys(teamDomain) {
  if (Date.now() - certCache.at < 10 * 60 * 1000 && certCache.keys.length) return certCache.keys;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('certs ' + res.status);
  const { keys } = await res.json();
  certCache = { at: Date.now(), keys };
  return keys;
}

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function verifyAccessJwt(token, env) {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('malformed');
  const header = b64urlToJson(h);
  const payload = b64urlToJson(p);
  if (header.alg !== 'RS256') throw new Error('alg');
  const jwk = (await getKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error('signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('expired');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('nbf');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new Error('aud');
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw new Error('iss');
  return payload;
}

const isLocal = (request) => {
  const h = new URL(request.url).hostname;
  return h === 'localhost' || h === '127.0.0.1';
};

export async function requireAdmin(context) {
  const { request, env } = context;
  // Local development only: wrangler pages dev on localhost with DEV_NO_AUTH=1.
  if (env.DEV_NO_AUTH === '1' && isLocal(request)) {
    context.data.email = 'dev@localhost';
    return null;
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return err(503, 'Вход ещё не настроен');
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return err(401, 'Нужно войти');
  let payload;
  try {
    payload = await verifyAccessJwt(token, env);
  } catch {
    return err(401, 'Нужно войти заново');
  }
  const email = String(payload.email || '').toLowerCase();
  const allowed = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length || !allowed.includes(email)) return err(403, 'Нет доступа');
  context.data.email = email;
  return null;
}
