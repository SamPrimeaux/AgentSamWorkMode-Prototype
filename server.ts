import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { logTelemetry, calculateCost } from "./src/lib/telemetry";
import { createTerminalPairingRouter } from "./src/server/terminalPairing";

dotenv.config();

const IAM_ORIGIN = (process.env.VITE_IAM_ORIGIN || process.env.IAM_ORIGIN || "").replace(/\/$/, "");

async function proxyToIam(req: express.Request, res: express.Response) {
  if (!IAM_ORIGIN) {
    return res.status(502).json({
      error: "IAM proxy not configured",
      hint: "Set VITE_IAM_ORIGIN=https://agentsamremix.inneranimalmedia.com in .env",
    });
  }
  const targetUrl = `${IAM_ORIGIN}${req.originalUrl}`;
  try {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v == null || k === "host" || k === "connection") continue;
      if (Array.isArray(v)) headers.set(k, v.join(", "));
      else headers.set(k, v);
    }
    const init: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.body != null ? JSON.stringify(req.body) : undefined;
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
    const upstream = await fetch(targetUrl, init);
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      res.setHeader(key, value);
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "proxy error";
    res.status(502).json({ error: message, target: targetUrl });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      iam_origin: IAM_ORIGIN || null,
      proxy_enabled: Boolean(IAM_ORIGIN),
    });
  });

  const workerPublicOrigin = IAM_ORIGIN || `http://localhost:${PORT}`;

  // Device pairing — local dev store; production uses same routes on AgentSamRemix Worker
  app.use("/api/terminal/pair", createTerminalPairingRouter(() => workerPublicOrigin));

  // Proxy platform APIs to AgentSamRemix Worker (auth cookies must be set on IAM origin)
  app.use("/api/agent", proxyToIam);
  app.use("/api/terminal", proxyToIam);
  app.use("/api/sdk", proxyToIam);
  app.use("/api/artifacts", proxyToIam);
  app.use("/api/cms", proxyToIam);
  app.use("/api/integrations", proxyToIam);
  app.use("/api/gdrive", proxyToIam);
  app.use("/api/auth", proxyToIam);
  app.use("/api/storage", proxyToIam);

  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    if (!aiClient) aiClient = new GoogleGenAI({ apiKey: key });
    return aiClient;
  }

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { prompt, model = "gemini-3.7-flash", systemInstruction } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });

      const ai = getAiClient();
      if (!ai) {
        return res.status(200).json({
          text: null,
          fallback: true,
          message: "GEMINI_API_KEY is not configured. Set VITE_IAM_ORIGIN for platform agent APIs.",
        });
      }

      const defaultSystem = `You are Agent Sam, a senior autonomous execution agent.
Respond concisely. Do not invent test results, git status, or deployment URLs.`;

      const startTime = performance.now();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction: systemInstruction || defaultSystem, temperature: 0.7 },
      });
      const endTime = performance.now();
      const usage = (response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }).usageMetadata;
      const inputTokens = usage?.promptTokenCount || 0;
      const outputTokens = usage?.candidatesTokenCount || 0;
      logTelemetry({
        latencyMs: endTime - startTime,
        inputTokens,
        outputTokens,
        model,
        cost: calculateCost(model, inputTokens, outputTokens),
      });

      return res.json({ text: response.text, model, status: "success" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate content";
      console.error("Gemini server error:", error);
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (IAM_ORIGIN) console.log(`IAM API proxy → ${IAM_ORIGIN}`);
  });
}

startServer();
