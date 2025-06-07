// server/index.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ─── Middlewares ──────────────────────────────────────────
// parse JSON & URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// allow CORS on all /api routes
app.use("/api", cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));

// serve any files in public/ (e.g. favicon, robots.txt)
app.use(express.static("public"));

// logging middleware (unchanged)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// ─── Routes ────────────────────────────────────────────────
(async () => {
  const server = await registerRoutes(app);

  // error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // ─── Dev vs Prod static serving ───────────────────────────
  if (app.get("env") === "development") {
    // Vite will handle HMR, module serving, etc.
    await setupVite(app, server);
  } else {
    // serve React build from client/dist
    const clientDist = path.resolve(__dirname, "../client/dist");
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  // ─── Start server ────────────────────────────────────────
  const port = Number(process.env.PORT || 5000);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
