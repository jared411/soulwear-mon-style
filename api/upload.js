const crypto = require("crypto");
const { isAdmin, writeFile, send } = require("./_lib");

module.exports = async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: "Not signed in" });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const body = req.body || {};
  const productId = String(body.productId || "").replace(/[^\w-]/g, "").slice(0, 60);
  const data = String(body.data || "");
  if (!productId) return send(res, 400, { error: "Missing product" });
  if (!data || !/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 6_000_000) {
    return send(res, 400, { error: "Photo is too large or invalid. Try a smaller photo." });
  }

  const name = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}.jpg`;
  const path = `assets/products/${productId}/${name}`;
  try {
    await writeFile(path, data, `Add product photo ${name}`);
    return send(res, 201, { path });
  } catch (err) {
    return send(res, 500, { error: err.message || "Upload failed" });
  }
};
