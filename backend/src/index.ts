import { createAppServer } from "./server.js";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535.");
}

const server = createAppServer();

server.listen(port, host, () => {
  console.log(`AI Whiteboard API running at http://${host}:${port}`);
});
