import type { Express } from "express";
import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";

const BRIDGE_HOST = process.env.BRIDGE_HOST || "127.0.0.1";
const BRIDGE_PORT = Number(process.env.BRIDGE_PORT || 3099);

function bridgeHttpUrl(path: string) {
  return `http://${BRIDGE_HOST}:${BRIDGE_PORT}${path}`;
}

function bridgeWsUrl(path: string) {
  return `ws://${BRIDGE_HOST}:${BRIDGE_PORT}${path}`;
}

export function mountBridgeProxy(app: Express) {
  app.get("/api/bridge/health", async (_req, res) => {
    try {
      const upstream = await fetch(bridgeHttpUrl("/health"));
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "bridge unreachable";
      res.status(502).json({ ok: false, error: message });
    }
  });

  app.get("/api/bridge/fs/list", async (req, res) => {
    try {
      const q = new URLSearchParams(req.query as Record<string, string>).toString();
      const upstream = await fetch(`${bridgeHttpUrl("/fs/list")}?${q}`);
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "proxy error" });
    }
  });

  app.get("/api/bridge/fs/read", async (req, res) => {
    try {
      const q = new URLSearchParams(req.query as Record<string, string>).toString();
      const upstream = await fetch(`${bridgeHttpUrl("/fs/read")}?${q}`);
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "proxy error" });
    }
  });

  app.post("/api/bridge/fs/write", async (req, res) => {
    try {
      const upstream = await fetch(bridgeHttpUrl("/fs/write"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
      });
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "proxy error" });
    }
  });

  app.get("/api/bridge/git/status", async (_req, res) => {
    try {
      const upstream = await fetch(bridgeHttpUrl("/git/status"));
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "proxy error" });
    }
  });

  app.get("/api/bridge/git/diff", async (req, res) => {
    try {
      const q = new URLSearchParams(req.query as Record<string, string>).toString();
      const upstream = await fetch(`${bridgeHttpUrl("/git/diff")}${q ? `?${q}` : ""}`);
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "proxy error" });
    }
  });

  app.get("/api/bridge/git/log", async (req, res) => {
    try {
      const q = new URLSearchParams(req.query as Record<string, string>).toString();
      const upstream = await fetch(`${bridgeHttpUrl("/git/log")}${q ? `?${q}` : ""}`);
      const body = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(body);
    } catch (err: unknown) {
      res.status(502).json({ ok: false, error: err instanceof Error ? err.message : "proxy error" });
    }
  });
}

export function attachBridgeWebSocketProxy(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "";
    if (!url.startsWith("/api/bridge/terminal")) {
      return;
    }
    wss.handleUpgrade(req, socket, head, (client) => {
      const upstream = new WebSocket(bridgeWsUrl("/terminal"));
      upstream.on("open", () => {
        client.on("message", (data) => {
          if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
        });
        upstream.on("message", (data) => {
          if (client.readyState === WebSocket.OPEN) client.send(data);
        });
      });
      upstream.on("error", () => client.close());
      client.on("close", () => upstream.close());
      upstream.on("close", () => client.close());
    });
  });
}

export function startHttpServer(app: Express, port: number, host = "0.0.0.0") {
  const server = http.createServer(app);
  attachBridgeWebSocketProxy(server);
  server.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Bridge proxy → http://${BRIDGE_HOST}:${BRIDGE_PORT}`);
  });
  return server;
}
