import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

const server = createServer((request, response) => {
  if (request.url === "/health" && request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "ai-whiteboard-backend" }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, host, () => {
  console.log(`AI Whiteboard API running at http://${host}:${port}`);
});
