// The repo root is the published folder, so hide the server-side files from the public site.
const HIDDEN = /^\/(lib|functions|migrations|node_modules)(\/|$)|^\/(wrangler\.toml|package(-lock)?\.json|README\.md|SETUP\.md)$/;

export const onRequest = async ({ request, next }) => {
  if (HIDDEN.test(new URL(request.url).pathname)) return new Response('Not found', { status: 404 });
  return next();
};
