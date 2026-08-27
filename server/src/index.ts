import express from "express";
import { createServer } from "node:http";
import { createSocketGateway } from "./realtime/socket-gateway.js";

const PORT = Number(process.env["PORT"] ?? 3000);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);
createSocketGateway(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Unknown King game server listening on :${PORT}`);
});
