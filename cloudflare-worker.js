const ORIGIN = "https://violin86318.github.io";
const SITE_PREFIX = "/zhang-guoqiang-wedding-site";

function buildOriginUrl(requestUrl) {
  const url = new URL(requestUrl);
  const upstream = new URL(ORIGIN);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

  upstream.pathname = `${SITE_PREFIX}${pathname}`;
  upstream.search = url.search;
  return upstream;
}

export default {
  async fetch(request) {
    const upstreamUrl = buildOriginUrl(request.url);
    const response = await fetch(new Request(upstreamUrl, request));
    const headers = new Headers(response.headers);

    headers.set("x-proxied-by", "wedding-beyondmotion-worker");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
