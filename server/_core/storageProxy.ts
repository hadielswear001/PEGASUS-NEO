import type { Express } from "express";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", (_req, res) => {
    res.status(404).send("External storage is not available in the desktop build.");
  });
}
