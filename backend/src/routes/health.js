import { Router } from "express";

export const healthRouter = Router();

// Reports that the process is up. It does not check the database.
healthRouter.get("/", (req, res) => {
  res.json({ data: { status: "ok" } });
});
