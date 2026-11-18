(function () {
  const S = window.SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  $("#yr").textContent = new Date().getFullYear();

  const waLink = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  const priceText = (p) => (p.price == null ? "Price on WhatsApp" : `${S.currency} ${Number(p.price).toLocaleString()}`);
  const stockText = (p) => (p.stock == null ? "Check availability on WhatsApp" : p.stock > 0 ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Sold out");

  // Contact buttons
  $("#contact-links").innerHTML = S.whatsapp.map((n, i) =>
    `<a class="contact-card" href="${waLink(n, "Hello SOULWEAR, I'd like to place an order.")}" target="_blank" rel="noopener">
       <span class="label">WhatsApp ${i + 1}</span>
       <strong>${esc(S.displayPhones[i])}</strong>
       <span class="btn small">Chat to order</span>
     </a>`).join("");

  // Social links (hidden when blank)
  const socials = [["Instagram", S.social.instagram], ["TikTok", S.social.tiktok], ["Facebook", S.social.facebook], ["X", S.social.x]]
    .filter(([, url]) => url);
  $("#social-links").innerHTML = socials.length
    ? socials.map(([name, url]) => `<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">${name}</a>`).join("")
    : `<p class="muted small">Social media links will appear here.</p>`;

  function productCard(p) {
    const variants = p.variants || [];
    const first = variants[0];
    const img = first && first.image ? `<img src="${esc(first.image)}" alt="${esc(p.name)} in ${esc(first.colour)}" loading="lazy">` : "";
    const sizes = (p.sizes && p.sizes.length ? p.sizes : S.sizes);
    const orderText = `Hello SOULWEAR, I'd like to order the ${p.name}. Colour: `;
    return `
      <article class="card" data-id="${esc(p.id)}">
        <div class="thumb">${img}</div>
        <div class="body">
          <h3>${esc(p.name)}</h3>
          <p class="muted small">${esc(p.description || "")}</p>
          <div class="meta"><span class="price">${esc(priceText(p))}</span><span class="stock">${esc(stockText(p))}</span></div>
          ${variants.length ? `<div class="swatches">${variants.map((v, i) =>
            `<button class="swatch" type="button" data-img="${esc(v.image)}" data-alt="${esc(p.name)} in ${esc(v.colour)}" data-colour="${esc(v.colour)}" aria-label="${esc(v.colour)}" title="${esc(v.colour)}" aria-pressed="${i === 0}"></button>`).join("")}</div>
          <p class="muted small">Colour: <span class="colour-name">${esc(variants[0].colour)}</span></p>` : ""}
          <div class="sizes">${sizes.map((s) => `<span>${esc(s)}</span>`).join("")}</div>
          <a class="btn small order-btn" data-base="${esc(orderText)}" href="${waLink(S.whatsapp[0], orderText + (variants[0] ? variants[0].colour : ""))}" target="_blank" rel="noopener">Order on WhatsApp</a>
        </div>
      </article>`;
  }

  // Map a database row (or products.json entry) to one shape
  function normalise(r) {
    return {
      id: r.id, category: r.category, name: r.name, description: r.description,
      price: r.price == null ? null : Number(r.price),
      stock: r.stock == null ? null : Number(r.stock),
      sizes: r.sizes || [],
      variants: (r.variants || []).filter((v) => v && v.image),
    };
  }

  async function loadList() {
    const res = await fetch("products.json", { cache: "no-cache" });
    const json = await res.json();
    return (json.products || []).filter((p) => p.active !== false).map(normalise);
  }

  function render(list) {
    const html = (items) => items.map(productCard).join("") || `<p class="muted">Coming soon.</p>`;
    $("#products").innerHTML = html(list);
    document.querySelectorAll("[data-cat]").forEach((el) => {
      const items = list.filter((p) => p.category === el.dataset.cat);
      if (items.length) el.innerHTML = html(items);
    });
    bindSwatches();
  }

  loadList()
    .then(render)
    .catch(() => {
      $("#products").innerHTML = `<p class="muted">Products are loading. If this stays empty, please order on WhatsApp.</p>`;
    });

  // Colour swatches swap the photo and the WhatsApp order message
  function bindSwatches() {
    document.querySelectorAll(".card").forEach((card) => {
      card.querySelectorAll(".swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          const img = card.querySelector(".thumb img");
          if (img) { img.src = btn.dataset.img; img.alt = btn.dataset.alt; }
          card.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
          const name = card.querySelector(".colour-name");
          if (name) name.textContent = btn.dataset.colour;
          const order = card.querySelector(".order-btn");
          if (order) order.href = waLink(S.whatsapp[0], order.dataset.base + btn.dataset.colour);
        });
      });
    });
  }
})();
