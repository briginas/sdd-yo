import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import type { Randomness } from "../platform/randomness.ts";
import { nodeRandomness } from "../platform/node-randomness.ts";
import { followWorkflowJournal, type WorkflowJournalFollower } from "./journal-follower.ts";
import { renderWorkflowObserver } from "./renderer.ts";
import type { WorkflowSnapshot } from "./workflow.ts";

export type WorkflowObserverSession = {
  readonly url: string;
  readonly capability: string;
  publish(snapshot: WorkflowSnapshot): void;
  close(): Promise<void>;
};

type ObserverClient = {
  readonly response: import("node:http").ServerResponse;
  cursor: number;
};

function capability(randomness: Randomness): string {
  return Buffer.from(randomness.randomBytes(32)).toString("base64url");
}

export async function startWorkflowObserver(options: {
  readonly projectRoot: string;
  readonly snapshot: WorkflowSnapshot;
  readonly randomness?: Randomness;
  readonly follow?: {
    readonly journalPath: string;
    readonly readSnapshot: () => Promise<WorkflowSnapshot>;
  };
}): Promise<WorkflowObserverSession> {
  let current = options.snapshot;
  let currentBytes = JSON.stringify(current);
  let observerCondition: string | null = null;
  const token = capability(options.randomness ?? nodeRandomness);
  const clients = new Set<ObserverClient>();
  const root = await realpath(options.projectRoot);
  let allowedOrigin = "";
  let follower: WorkflowJournalFollower | undefined;

  const subjectMatches = (snapshot: WorkflowSnapshot): boolean =>
    snapshot.project_id === current.project_id &&
    snapshot.change_id === current.change_id &&
    snapshot.run_id === current.run_id &&
    snapshot.producer_id === current.producer_id;

  const sendSnapshot = (client: ObserverClient, snapshot: WorkflowSnapshot): void => {
    client.response.write(`id: ${snapshot.last_sequence}\nevent: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    client.cursor = snapshot.last_sequence;
  };

  const reportCondition = (condition: string | null): void => {
    if (condition === observerCondition) return;
    observerCondition = condition;
    const data = JSON.stringify({ diagnostic_code: condition });
    for (const client of clients) client.response.write(`event: observer_condition\ndata: ${data}\n\n`);
  };

  const publish = (snapshot: WorkflowSnapshot): void => {
    if (!subjectMatches(snapshot)) throw new Error("Observer snapshot subject changed.");
    const bytes = JSON.stringify(snapshot);
    if (snapshot.last_sequence < current.last_sequence) throw new Error("Observer snapshot sequence moved backwards.");
    if (snapshot.last_sequence === current.last_sequence) {
      if (bytes !== currentBytes) throw new Error("Observer snapshot conflicts at the current sequence.");
      return;
    }
    current = snapshot;
    currentBytes = bytes;
    for (const client of clients) if (client.cursor < snapshot.last_sequence) sendSnapshot(client, snapshot);
  };

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
      const suppliedCursor = request.headers["last-event-id"] ?? url.searchParams.get("after") ?? "-1";
      const cursorText = Array.isArray(suppliedCursor) ? suppliedCursor[0] : suppliedCursor;
      if (cursorText === undefined || !/^-?\d+$/u.test(cursorText)) {
        response.writeHead(400).end();
        return;
      }
      const cursor = Number(cursorText);
      if (!Number.isSafeInteger(cursor) || cursor < -1 || cursor > current.last_sequence) {
        response.writeHead(400).end();
        return;
      }
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.flushHeaders();
      const client: ObserverClient = { response, cursor };
      clients.add(client);
      if (cursor < current.last_sequence) sendSnapshot(client, current);
      if (observerCondition !== null) {
        response.write(
          `event: observer_condition\ndata: ${JSON.stringify({ diagnostic_code: observerCondition })}\n\n`,
        );
      }
      request.on("close", () => clients.delete(client));
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
  if (options.follow !== undefined) {
    follower = followWorkflowJournal({
      journalPath: options.follow.journalPath,
      readSnapshot: options.follow.readSnapshot,
      publish,
      reportCondition,
    });
  }
  let closed = false;
  return {
    url: `${allowedOrigin}/?cap=${encodeURIComponent(token)}`,
    capability: token,
    publish,
    close: async () => {
      if (closed) return;
      closed = true;
      follower?.close();
      for (const { response } of clients) response.end();
      clients.clear();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    },
  };
}
