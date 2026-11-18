const { isAdmin, readProducts, writeProducts, send } = require("./_lib");

const CATEGORIES = ["hoodies", "tshirts", "jerseys"];
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const num = (v, min, max) => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

// Checks and tidies one product. Returns undefined if it's invalid.
function cleanProduct(p) {
  const category = CATEGORIES.includes(p.category) ? p.category : null;
  const name = clean(p.name, 80);
  const price = num(p.price, 0, 10000000);
  const stock = p.stock === null || p.stock === "" || p.stock === undefined ? null : num(p.stock, 0, 100000);
  const variants = (Array.isArray(p.variants) ? p.variants : [])
    .map((v) => ({ colour: clean(v?.colour, 30), image: clean(v?.image, 300) }))
    .filter((v) => v.colour && /^assets\/products\/[\w-]+\/[\w.-]+\.jpg$|^assets\/[\w.-]+\.(jpg|png|webp)$/.test(v.image));
  const sizes = (Array.isArray(p.sizes) ? p.sizes : []).map((s) => clean(s, 10)).filter(Boolean).slice(0, 20);
  if (!category || name.length < 2 || price === undefined || stock === undefined || !variants.length) return undefined;
  return {
    id: clean(p.id, 60),
    category,
    name,
    description: clean(p.description, 500),
    price,
    stock,
    sizes,
    variants,
    active: !!p.active,
    sort: Number.isFinite(Number(p.sort)) ? Math.round(Number(p.sort)) : 0,
  };
}

module.exports = async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: "Not signed in" });

  try {
    if (req.method === "GET") {
      const { data } = await readProducts();
      return send(res, 200, data);
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      if (!Array.isArray(body.products)) return send(res, 400, { error: "Invalid request" });
      const products = [];
      for (const p of body.products) {
        const c = cleanProduct(p);
        if (!c) return send(res, 400, { error: `Check the details for "${clean(p?.name, 40) || "a product"}"` });
        if (!c.id) return send(res, 400, { error: "Missing product id" });
        products.push(c);
      }
      const current = await readProducts();
      const data = { ...current.data, products };
      await writeProducts(data, current.sha, `Update products (${products.length})`);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message || "Something went wrong" });
  }
};
