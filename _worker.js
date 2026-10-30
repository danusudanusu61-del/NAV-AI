export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        return response;
      }
      return env.ASSETS.fetch(new URL('/index.html', request.url));
    }
    return new Response('NAV AI Static Worker', { status: 200 });
  }
};
