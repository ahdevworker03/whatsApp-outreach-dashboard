import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { v1Router } from "./routes/v1.routes";
import { whatsappWebhookRouter } from "./webhooks/whatsapp.routes";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/webhook", whatsappWebhookRouter);
app.use("/api/v1", v1Router);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port} (${env.nodeEnv})`);
});
