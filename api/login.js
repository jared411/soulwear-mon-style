const { passwordOk, sessionCookie, send } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return send(res, 500, { error: "Admin is not set up yet. Add ADMIN_PASSWORD and SESSION_SECRET in Vercel." });
  }
  const body = req.body || {};
  if (!passwordOk(body.password)) return send(res, 401, { error: "Incorrect password" });
  return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie() });
};
