const { clearCookie, send } = require("./_lib");

module.exports = async function handler(req, res) {
  return send(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
};
