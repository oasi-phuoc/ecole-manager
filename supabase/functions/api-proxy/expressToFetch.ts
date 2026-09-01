import type { Application } from "express";
import { EventEmitter } from "node:events";
import { createRequest, createResponse } from "node-mocks-http";

/** Adapte une app Express (req/res Node) à un handler Fetch pour Deno.serve. */
export function expressToFetch(app: Application) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body: unknown = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try {
          body = await request.json();
        } catch {
          body = undefined;
        }
      } else {
        body = await request.text();
      }
    }

    const req = createRequest({
      method: request.method,
      url: url.pathname + url.search,
      headers,
      body,
    });

    const res = createResponse({ eventEmitter: EventEmitter });
    const done = new Promise<Response>((resolve, reject) => {
      res.on("end", () => {
        const payload = res._getData();
        const outHeaders = new Headers();
        const rawHeaders = res.getHeaders();
        for (const [key, value] of Object.entries(rawHeaders)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            for (const v of value) outHeaders.append(key, String(v));
          } else {
            outHeaders.set(key, String(value));
          }
        }
        const bodyText = typeof payload === "string" ? payload : payload == null ? "" : String(payload);
        resolve(new Response(bodyText || null, { status: res.statusCode, headers: outHeaders }));
      });
      res.on("error", reject);
    });

    app(req, res);
    return await done;
  };
}
