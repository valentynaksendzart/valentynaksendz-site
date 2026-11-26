// Lets the owner download an original photo back.
export const onRequestGet = async ({ env, params }) => {
  const key = (params.path || []).join('/');
  if (!/^p\/\d+\/[\w-]+-orig\.\w+$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('content-disposition', `attachment; filename="${key.split('/').pop()}"`);
  return new Response(obj.body, { headers });
};
