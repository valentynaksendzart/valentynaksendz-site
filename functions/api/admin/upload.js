import { json, err } from '../../../lib/util.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif' };
const MAX = 60 * 1024 * 1024;

// PUT /api/admin/upload?painting=<id>&photo=<uuid>&variant=orig|large|thumb  (raw image body)
export const onRequestPut = async ({ env, request }) => {
  const q = new URL(request.url).searchParams;
  const painting = q.get('painting');
  const photo = q.get('photo');
  const variant = q.get('variant');
  if (!/^\d+$/.test(painting || '') || !/^[\w-]{8,64}$/.test(photo || '') || !['orig', 'large', 'thumb'].includes(variant)) {
    return err(400, 'Неверные параметры');
  }
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  let ext = TYPES[type];
  if (!ext) return err(415, 'Этот формат фото не подходит');
  if (variant !== 'orig' && !['webp', 'jpg'].includes(ext)) return err(415, 'Неверный формат копии');
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX) return err(413, 'Файл слишком большой (больше 60 МБ)');

  const exists = await env.DB.prepare('SELECT id FROM paintings WHERE id = ?').bind(painting).first();
  if (!exists) return err(404, 'Картина не найдена');

  const key = `p/${painting}/${photo}-${variant}.${ext}`;
  const obj = await env.PHOTOS.put(key, request.body, { httpMetadata: { contentType: type } });
  return json({ key, bytes: obj.size });
};
