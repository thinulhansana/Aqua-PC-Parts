const FIREBASE_AUTH_ORIGIN = "https://gen-lang-client-0299022095.firebaseapp.com";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = FIREBASE_AUTH_ORIGIN + url.pathname + url.search;

  const headers = new Headers(context.request.headers);
  headers.set("host", "gen-lang-client-0299022095.firebaseapp.com");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");

  const init = {
    method: context.request.method,
    headers,
    redirect: "manual",
  };

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    init.body = await context.request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);
  const respHeaders = new Headers(upstream.headers);
  const loc = respHeaders.get("location");
  if (loc && loc.startsWith(FIREBASE_AUTH_ORIGIN)) {
    respHeaders.set("location", url.origin + loc.slice(FIREBASE_AUTH_ORIGIN.length));
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}
