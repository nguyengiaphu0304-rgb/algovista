import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(".");
const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
]);

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const requested = url.pathname === "/" ? "/web/index.html" : url.pathname;
  if (!requested.startsWith("/web/") && !requested.startsWith("/lib/")) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  const path = normalize(join(root, requested));
  if (!path.startsWith(`${root}/`)) {
    response.writeHead(400).end("Invalid path");
    return;
  }
  try {
    if (!statSync(path).isFile()) {
      throw new Error("Not a file");
    }
    response.writeHead(200, {
      "Content-Type": mime.get(extname(path)) ?? "application/octet-stream",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(4173, "127.0.0.1");
