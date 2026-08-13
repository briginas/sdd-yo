import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import type { Randomness } from "../platform/randomness.ts";
import { nodeRandomness } from "../platform/node-randomness.ts";
import { renderWorkflowObserver } from "./renderer.ts";
import type { WorkflowSnapshot } from "./workflow.ts";

export type WorkflowObserverSession = {
  readonly url: string;
  readonly capability: string;
  publish(snapshot: WorkflowSnapshot): void;
  close(): Promise<void>;
};

function capability(randomness: Randomness): string {
  return Buffer.from(randomness.randomBytes(32)).toString("base64url");
}

export async function startWorkflowObserver(options: {
  readonly projectRoot: string;
  readonly snapshot: WorkflowSnapshot;
  readonly randomness?: Randomness;
}): Promise<WorkflowObserverSession> {
  let current = options.snapshot;
  const token = capability(options.randomness ?? nodeRandomness);
  const clients = new Set<import("node:http").ServerResponse>();
  const root = await realpath(options.projectRoot);
  let allowedOrigin = "";
  const server = createServer(async (request, response) => {
    const originBase = allowedOrigin;
    let url: URL;
    try {
      url = new URL(request.url ?? "/", originBase);
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" }).end();
      return;
    }
    if (url.searchParams.get("cap") !== token) {
      response.writeHead(403).end();
      return;
    }
    const origin = request.headers.origin;
    if (request.headers.host !== new URL(allowedOrigin).host || (origin !== undefined && origin !== allowedOrigin)) {
      response.writeHead(403).end();
      return;
    }
    if (url.pathname === "/") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      response.end(renderWorkflowObserver(current, token));
      return;
    }
    if (url.pathname === "/snapshot") {
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(JSON.stringify(current));
      return;
    }
    if (url.pathname === "/events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write(`event: snapshot\ndata: ${JSON.stringify(current)}\n\n`);
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }
    if (url.pathname === "/artifact") {
      const selected = url.searchParams.get("path");
      const artifact = current.artifacts.find((item) => item.path === selected);
      if (artifact === undefined) {
        response.writeHead(404).end();
        return;
      }
      try {
        const unresolved = path.resolve(root, artifact.path);
        let cursor = root;
        for (const segment of path.relative(root, unresolved).split(path.sep)) {
          cursor = path.join(cursor, segment);
          if ((await lstat(cursor)).isSymbolicLink()) throw new Error("symbolic artifact path");
        }
        const resolved = await realpath(unresolved);
        if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("outside project");
        const bytes = await readFile(resolved);
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": "inline",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        response.end(bytes);
      } catch {
        response.writeHead(404).end();
      }
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Observer did not bind a TCP port.");
  allowedOrigin = `http://127.0.0.1:${address.port}`;
  return {
    url: `${allowedOrigin}/?cap=${encodeURIComponent(token)}`,
    capability: token,
    publish: (snapshot) => {
      if (snapshot.project_id !== current.project_id || snapshot.run_id !== current.run_id)
        throw new Error("Observer snapshot subject changed.");
      current = snapshot;
      for (const client of clients) client.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    },
    close: async () => {
      for (const client of clients) client.end();
      clients.clear();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    },
  };
}
