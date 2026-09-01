import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      lane: "execos-local-bridge",
      port: 3099
    });
  });

  // Server-side Gemini API route
  let aiClient: GoogleGenAI | null = null;
  function getAiClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    if (!aiClient) {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
    return aiClient;
  }

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { prompt, model = "gemini-3.7-flash", systemInstruction } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(200).json({
          text: null,
          fallback: true,
          message: "GEMINI_API_KEY is not configured on server. Falling back to autonomous execution engine."
        });
      }

      const defaultSystem = `You are Agent Sam, a senior autonomous full-stack execution agent and creative brand architect.
You build client marketing presentations, high-converting websites with responsive blocks, executive telemetry dashboards, and brand identity kits.
Respond concisely, with high confidence, professional tone, and actionable steps.
When discussing code, files, or presentations, be precise and mention exact metrics or files.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || defaultSystem,
          temperature: 0.7,
        },
      });

      return res.json({
        text: response.text,
        model,
        status: "success"
      });
    } catch (error: any) {
      console.error("Gemini server error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
