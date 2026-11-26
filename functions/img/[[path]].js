// Public photos from R2. Originals are private (admin download only).
export const onRequestGet = async ({ env, params, request }) => {
  const key = (params.path || []).join('/');
  if (!/^p\/[\w-]+\/[\w-]+-(large|thumb)\.(webp|jpg)$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.PHOTOS.get(key, { onlyIf: request.headers, range: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
};
