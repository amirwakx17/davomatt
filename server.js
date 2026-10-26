import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isValidISODate, todayISO } from "./src/lib/date.js";
import { Attendance } from "./src/models/attendance.js";
import { Group } from "./src/models/group.js";
import { Student } from "./src/models/student.js";
import { renderAttendancePage } from "./src/views/attendance.js";
import { renderDashboard } from "./src/views/dashboard.js";
import { renderNotFound, renderServerError } from "./src/views/error.js";

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

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

function readBody(req, limit = 100_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

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

function showDashboard(res) {
  const today = todayISO();
  const groups = Group.withAttendance(today);
  const totals = Attendance.totalsForDate(today);
  const recent = Attendance.recentSessions(6);

  sendHtml(
    res,
    200,
    renderDashboard({
      today,
      groups,
      totals,
      studentTotal: Student.count(),
      recent,
    })
  );
}

function showAttendanceSheet(res, url, groupId) {
  const group = Group.find(groupId);
  if (!group) {
    sendHtml(res, 404, renderNotFound());
    return;
  }

  const requestedDate = url.searchParams.get("date");
  const date = isValidISODate(requestedDate) ? requestedDate : todayISO();
  const students = Student.allByGroup(groupId);
  const statuses = new Map(
    Attendance.byGroupAndDate(groupId, date).map((row) => [row.student_id, row.status])
  );

  sendHtml(
    res,
    200,
    renderAttendancePage({
      group,
      students,
      date,
      statuses,
      saved: url.searchParams.get("saved") === "1",
      error: url.searchParams.get("error"),
    })
  );
}

async function saveAttendance(req, res, groupId) {
  const group = Group.find(groupId);
  if (!group) {
    sendHtml(res, 404, renderNotFound());
    return;
  }

  const body = new URLSearchParams(await readBody(req));
  const date = body.get("date");

  if (!isValidISODate(date)) {
    redirect(res, `/groups/${groupId}/attendance?error=date`);
    return;
  }

  const students = Student.allByGroup(groupId);
  if (students.length === 0) {
    redirect(res, `/groups/${groupId}/attendance?date=${date}&error=empty`);
    return;
  }

  const entries = [];
  for (const student of students) {
    const status = body.get(`status-${student.id}`);
    if (status !== "present" && status !== "absent") {
      redirect(res, `/groups/${groupId}/attendance?date=${date}&error=mark`);
      return;
    }
    entries.push({ studentId: student.id, status });
  }

  Attendance.saveGroupDate(groupId, date, entries);
  redirect(res, `/groups/${groupId}/attendance?date=${date}&saved=1`);
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendHtml(res, 404, renderNotFound());
    return;
  }

  if (pathname.startsWith("/public/")) {
    await serveStatic(res, pathname.slice("/public/".length));
    return;
  }

  if (pathname === "/" && req.method === "GET") {
    showDashboard(res);
    return;
  }

  const attendanceMatch = pathname.match(/^\/groups\/(\d+)\/attendance\/?$/);
  if (attendanceMatch) {
    const groupId = Number(attendanceMatch[1]);
    if (req.method === "GET") {
      showAttendanceSheet(res, url, groupId);
      return;
    }
    if (req.method === "POST") {
      await saveAttendance(req, res, groupId);
      return;
    }
  }

  sendHtml(res, 404, renderNotFound());
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      sendHtml(res, 500, renderServerError());
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
