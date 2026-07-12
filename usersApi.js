import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { sendJson } from "./stockWaveHistoryCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_DIR = process.env.USERS_DATA_DIR || path.join(__dirname, ".admin-users");
const USERS_FILE = path.join(USERS_DIR, "users.json");
let usersCache = null;

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function publicUser(user) {
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

async function readUsers() {
  if (usersCache) return usersCache;
  try {
    const raw = await readFile(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    usersCache = Array.isArray(parsed?.users) ? parsed.users : [];
  } catch {
    usersCache = [];
  }
  return usersCache;
}

async function writeUsers(users) {
  await mkdir(USERS_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
  usersCache = users;
}

async function listUsers(req, res) {
  const users = await readUsers();
  sendJson(res, 200, users.map(publicUser));
}

async function createUser(req, res) {
  const body = await readBody(req);
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!username || !email || !password) {
    sendJson(res, 400, { success: false, message: "Missing user fields" });
    return;
  }

  const users = await readUsers();
  if (users.some((user) => user.username === username || user.email === email)) {
    sendJson(res, 409, { success: false, message: "User already exists" });
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    username,
    email,
    password,
    createdAt: new Date().toISOString(),
  };
  await writeUsers([...users, user]);
  sendJson(res, 201, publicUser(user));
}

async function deleteUser(req, res, id) {
  const users = await readUsers();
  const nextUsers = users.filter((user) => user.id !== id);
  if (nextUsers.length === users.length) {
    sendJson(res, 404, { success: false, message: "User not found" });
    return;
  }
  await writeUsers(nextUsers);
  sendJson(res, 200, { success: true });
}

export async function handleUsersRequest(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname === "/api/users") {
      if (req.method === "GET") await listUsers(req, res);
      else if (req.method === "POST") await createUser(req, res);
      else sendJson(res, 405, { success: false, message: "Method not allowed" });
      return true;
    }

    const match = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (match) {
      if (req.method === "DELETE") await deleteUser(req, res, decodeURIComponent(match[1]));
      else sendJson(res, 405, { success: false, message: "Method not allowed" });
      return true;
    }

    return false;
  } catch (error) {
    sendJson(res, 500, { success: false, message: error.message || "Users API error" });
    return true;
  }
}