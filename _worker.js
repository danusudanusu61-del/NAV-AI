export default {
  async fetch(request, env) {
    // If the request matches a static asset, env.ASSETS will fetch it
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        return response;
      }
      // SPA fallback to index.html
      const url = new URL(request.url);
      return env.ASSETS.fetch(new Request(new URL("/", url.origin), request));
    }
    return new Response("Not found", { status: 404 });
  },
};
