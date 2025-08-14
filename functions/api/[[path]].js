// Cloudflare Pages Functions: proxy /api/* to your backend
export async function onRequest(context) {
  // TODO: 后端就绪后改成正式地址
  const BACKEND = "http://13.238.222.1:8000";

  const { request, params } = context;
  const url = new URL(request.url);

  // 目标后端 URL
  const upstream = new URL(BACKEND);
  upstream.pathname = `/${params.path || ""}`;
  upstream.search = url.search;

  // 透传方法、headers、body（用 if 写法更稳）
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
  };
  const isBodyless = request.method === "GET" || request.method === "HEAD";
  if (!isBodyless) {
    init.body = await request.arrayBuffer();
  }
  // 移除不该透传的 hop-by-hop 头
  init.headers.delete("host");
  init.headers.delete("content-length");
  init.headers.delete("accept-encoding");

  try {
    const resp = await fetch(upstream, init);
    const resHeaders = new Headers(resp.headers);
    // 允许前端调用（CORS）
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    return new Response(resp.body, { status: resp.status, headers: resHeaders });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message, to: upstream.toString() }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
