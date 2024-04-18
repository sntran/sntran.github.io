import { env } from "node:process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

import "./lib/shims.js";
import worker from "./_worker.js";

/**
 * Converts Node's `IncomingMessage` to web `Request`.
 * @param {IncomingMessage} incoming
 * @returns {Request}
 */
function toWeb(incoming) {
  let { url, headers, method, body } = incoming;
  const abortController = new AbortController();
  headers = new Headers(headers);
  url = new URL(url, `http://${headers.get("Host")}`);

  incoming.once("aborted", () => abortController.abort());

  return new Request(url, {
    method,
    headers,
    body,
    signal: abortController.signal,
  });
}

async function assets(request) {
  request = new Request(request);
  const { pathname } = new URL(request.url);
  try {
    const body = await readFile(new URL(`./static${pathname}`, import.meta.url));
    const headers = new Headers();
    return new Response(body, {
      headers,
    });
  } catch (_error) {
    return new Response("Not found", {
      status: 404,
      statusText: "Not Found",
    });
  }
}

const server = createServer(async (incoming, outgoing) => {
  const request = toWeb(incoming);

  const response = await worker.fetch(request, {
    ...env,
    // Shims for Worker environment
    ASSETS: {
      fetch: assets,
    },
  });

  const { status, statusText, headers, body } = response;
  headers.forEach((value, key) => outgoing.setHeader(key, value));
  outgoing.writeHead(status, statusText);

  if (body) {
    for await (const chunk of body) {
      outgoing.write(chunk);
    }
  }

  outgoing.end();
});

const port = Number(env.PORT) || 8787;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
