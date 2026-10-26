import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csrfMatches, getSession } from "./src/lib/auth.js";
import { parseId, readBody, redirect, sendHtml } from "./src/lib/http.js";
import * as adminRoutes from "./src/routes/admin.js";
import * as attendanceRoutes from "./src/routes/attendance.js";
import * as authRoutes from "./src/routes/auth.js";
import { renderForbidden, renderNotFound, renderServerError } from "./src/views/error.js";
import { layout } from "./src/views/layout.js";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(projectRoot, "public");
const port = Number(process.env.PORT) || 3000;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const PUBLIC_ROUTES = [
  { method: "GET", pattern: /^\/login$/, handler: authRoutes.showLogin },
  { method: "POST", pattern: /^\/login$/, handler: authRoutes.login },
];

const ROUTES = [
  { method: "GET", pattern: /^\/$/, handler: attendanceRoutes.dashboard },
  { method: "GET", pattern: /^\/groups\/(\d+)\/attendance$/, handler: attendanceRoutes.showSheet },
  { method: "POST", pattern: /^\/groups\/(\d+)\/attendance$/, handler: attendanceRoutes.saveSheet },
  { method: "POST", pattern: /^\/logout$/, handler: authRoutes.logout },
  { method: "GET", pattern: /^\/account$/, handler: authRoutes.showAccount },
  { method: "POST", pattern: /^\/account\/password$/, handler: authRoutes.changePassword },
  { method: "GET", pattern: /^\/admin\/groups$/, handler: adminRoutes.listGroups, admin: true },
  { method: "POST", pattern: /^\/admin\/groups$/, handler: adminRoutes.createGroup, admin: true },
  { method: "GET", pattern: /^\/admin\/groups\/(\d+)$/, handler: adminRoutes.showGroup, admin: true },
  { method: "POST", pattern: /^\/admin\/groups\/(\d+)$/, handler: adminRoutes.updateGroup, admin: true },
  { method: "POST", pattern: /^\/admin\/groups\/(\d+)\/delete$/, handler: adminRoutes.deleteGroup, admin: true },
  { method: "POST", pattern: /^\/admin\/groups\/(\d+)\/students$/, handler: adminRoutes.addStudents, admin: true },
  { method: "POST", pattern: /^\/admin\/students\/(\d+)$/, handler: adminRoutes.renameStudent, admin: true },
  { method: "POST", pattern: /^\/admin\/students\/(\d+)\/delete$/, handler: adminRoutes.deleteStudent, admin: true },
  { method: "GET", pattern: /^\/admin\/users$/, handler: adminRoutes.listUsers, admin: true },
  { method: "POST", pattern: /^\/admin\/users$/, handler: adminRoutes.createUser, admin: true },
  { method: "POST", pattern: /^\/admin\/users\/(\d+)\/password$/, handler: adminRoutes.resetPassword, admin: true },
  { method: "POST", pattern: /^\/admin\/users\/(\d+)\/delete$/, handler: adminRoutes.deleteUser, admin: true },
];

async function serveStatic(res, relativePath) {
  const filePath = path.resolve(publicDir, relativePath);
  if (!filePath.startsWith(publicDir + path.sep)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function match(routes, method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const found = pathname.match(route.pattern);
    if (found) return { route, params: found.slice(1) };
  }
  return null;
}

function pathExists(pathname) {
  return [...PUBLIC_ROUTES, ...ROUTES].some((route) => route.pattern.test(pathname));
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendHtml(res, 404, layout(renderNotFound()));
    return;
  }

  if (pathname.startsWith("/public/")) {
    await serveStatic(res, pathname.slice("/public/".length));
    return;
  }

  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("ok");
    return;
  }

  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  const session = await getSession(req);
  const user = session?.user ?? null;
  const csrf = session?.csrf ?? "";

  const ctx = {
    req,
    res,
    url,
    session,
    user,
    csrf,
    params: [],
    body: new URLSearchParams(),
    render(view, status = 200) {
      sendHtml(res, status, layout({ ...view, user, csrf }));
    },
    redirect(location, headers) {
      redirect(res, location, headers);
    },
    notFound() {
      ctx.render(renderNotFound(), 404);
    },
  };

  const publicMatch = match(PUBLIC_ROUTES, req.method, pathname);
  if (publicMatch) {
    if (req.method === "POST") ctx.body = new URLSearchParams(await readBody(req));
    await publicMatch.route.handler(ctx);
    return;
  }

  const found = match(ROUTES, req.method, pathname);
  if (!found) {
    if (!user && pathExists(pathname)) return ctx.redirect("/login");
    return ctx.notFound();
  }

  if (!user) return ctx.redirect("/login");
  if (found.route.admin && user.role !== "admin") return ctx.render(renderForbidden(), 403);

  const params = found.params.map(parseId);
  if (params.includes(null)) return ctx.notFound();
  ctx.params = params;

  if (req.method === "POST") {
    ctx.body = new URLSearchParams(await readBody(req));
    if (!csrfMatches(session, ctx.body.get("_csrf"))) {
      return ctx.render(renderForbidden(), 403);
    }
  }

  await found.route.handler(ctx);
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      sendHtml(res, 500, layout(renderServerError()));
    } else {
      res.end();
    }
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} band. Boshqa PORT qiymati bilan qayta urinib ko'ring.`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, () => {
  console.log(`Davomat tizimi ishga tushdi: http://localhost:${port}`);
});
