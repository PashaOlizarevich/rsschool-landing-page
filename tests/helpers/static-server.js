const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
};

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(projectRoot, relativePath);
    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    try {
      const contents = await fs.readFile(filePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
      });
      response.end(contents);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function useStaticServer(test) {
  let staticServer;
  test.beforeAll(async () => {
    staticServer = await startStaticServer();
  });
  test.afterAll(async () => {
    await staticServer.close();
  });
  return () => staticServer.baseUrl;
}

module.exports = { startStaticServer, useStaticServer };
