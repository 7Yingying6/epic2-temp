export function onRequest() {
  return new Response("ok", { headers: { "content-type": "text/plain" }});
}
