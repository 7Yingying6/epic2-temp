// Cloudflare Pages Functions: proxy /api/* -> BACKEND/*
export async function onRequest(context) {
  // 把这行换成最终后端地址即可
  const BACKEND = "http://13.238.222.1:8000";

  const { request, params } = context;
  const url = new URL(request.url);
  const pathOnly = params.path || ""; // 例如 "epic2/"、"parking/nearby"

  // 预检请求直接放行（有些浏览器会先发 OPTIONS）
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      },
    });
  }

  // 构造转发地址：/api/xxx -> BACKEND/xxx
  const upstream = new URL(BACKEND);
  // 处理斜杠，避免出现 // 或缺少 /
  const needsSlash = !upstream.pathname.endsWith("/");
  upstream.pathname = (upstream.pathname || "/") + (needsSlash ? "" : "") + pathOnly;
  upstream.search = url.search; // 透传查询参数

  // 透传方法、headers、body（GET/HEAD 无 body）
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
  };
  if (!(request.method === "GET" || request.method === "HEAD")) {
    init.body = await request.arrayBuffer();
  }

  // 调整/删除不该透传的头；设置转发必要信息
  init.headers.delete("host");
  init.headers.delete("content-length");
  init.headers.delete("accept-encoding");
  init.headers.set("Host", upstream.host);
  init.headers.set("X-Forwarded-Proto", "https");
  init.headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");

  try {
    const resp = await fetch(upstream, init);

    // 允许前端调用（虽然是同域，这里仍统一设置）
    const resHeaders = new Headers(resp.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

    return new Response(resp.body, { status: resp.status, headers: resHeaders });
  } catch (e) {
    // 出错时带上 upstream 方便你/后端定位
    const payload = {
      ok: false,
      error: String(e && e.message ? e.message : e),
      upstream: upstream.toString(),
      method: request.method,
    };
    return new Response(JSON.stringify(payload, null, 2), {
      status: 502,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
