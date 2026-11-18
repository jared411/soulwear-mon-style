// Shared helpers for the SOULWEAR admin API (Vercel serverless functions).
const crypto = require("crypto");

const COOKIE = "sw_admin";
const SESSION_SECONDS = 60 * 60 * 12; // 12 hours

function sign(payload) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "").update(payload).digest("base64url");
}

function sessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(exp);
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function isAdmin(req) {
  if (!process.env.SESSION_SECRET) return false;
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig) return false;
  if (Number(payload) < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function passwordOk(input) {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || "");
  const given = Buffer.from(String(input || ""));
  if (!expected.length || expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}

// GitHub contents API
const REPO = () => process.env.GITHUB_REPO;       // e.g. jared411/soulwear-mon-style
const BRANCH = () => process.env.GITHUB_BRANCH || "main";

async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO()}/contents/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function readProducts() {
  const res = await gh(`products.json?ref=${BRANCH()}`);
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  const file = await res.json();
  const text = Buffer.from(file.content, "base64").toString("utf8");
  return { sha: file.sha, data: JSON.parse(text) };
}

async function writeProducts(data, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(data, null, 2) + "\n").toString("base64"),
    branch: BRANCH(),
  };
  if (sha) body.sha = sha;
  const res = await gh("products.json", { method: "PUT", body: JSON.stringify(body) });
  if (res.status === 409) throw Object.assign(new Error("Someone else saved at the same time. Please try again."), { status: 409 });
  if (!res.ok) throw new Error(`GitHub save failed (${res.status})`);
  return res.json();
}

async function writeFile(path, base64, message) {
  const res = await gh(path, {
    method: "PUT",
    body: JSON.stringify({ message, content: base64, branch: BRANCH() }),
  });
  if (!res.ok) throw new Error(`GitHub upload failed (${res.status})`);
  return res.json();
}

function send(res, status, obj, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(obj);
}

module.exports = { sessionCookie, clearCookie, isAdmin, passwordOk, readProducts, writeProducts, writeFile, send };
