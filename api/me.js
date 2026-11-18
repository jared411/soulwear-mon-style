const { isAdmin, send } = require("./_lib");

module.exports = async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: "Not signed in" });
  return send(res, 200, { ok: true });
};
