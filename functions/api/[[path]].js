// Cloudflare Pages Functions: self-check test
export async function onRequest(context) {
  return new Response("Functions OK", {
    status: 200,
    headers: {
      "content-type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
