const { passwordOk, sessionCookie, send } = require("./_lib");

// Basic brute-force protection: after 5 wrong passwords, block that address for 15 minutes.
const MAX_FAILS = 5;
const BLOCK_MS = 15 * 60 * 1000;
const fails = new Map();

function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || "unknown";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return send(res, 500, { error: "Admin is not set up yet. Add ADMIN_PASSWORD and SESSION_SECRET in Vercel." });
  }
  const ip = clientIp(req);
  const rec = fails.get(ip);
  if (rec && rec.blockedUntil > Date.now()) {
    return send(res, 429, { error: "Too many wrong attempts. Try again in 15 minutes." });
  }
  const body = req.body || {};
  if (!passwordOk(body.password)) {
    const count = (rec && rec.blockedUntil > 0 ? 0 : (rec ? rec.count : 0)) + 1;
    fails.set(ip, { count, blockedUntil: count >= MAX_FAILS ? Date.now() + BLOCK_MS : 0 });
    return send(res, 401, { error: "Incorrect password" });
  }
  fails.delete(ip);
  return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie() });
};
