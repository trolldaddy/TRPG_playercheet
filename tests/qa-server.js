const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.QA_PORT || 18766);
http.createServer((request, response) => {
  const pathname = decodeURIComponent(request.url.split("?")[0]);
  const file = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  if (!file.startsWith(root)) { response.writeHead(403).end("Forbidden"); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end("Not found"); return; }
    const type = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".pdf": "application/pdf", ".ttf": "font/ttf", ".woff2": "font/woff2" }[path.extname(file).toLowerCase()];
    if (type) response.setHeader("Content-Type", type);
    response.end(data);
  });
}).listen(port, "127.0.0.1", () => console.log(`QA server http://127.0.0.1:${port}`));
