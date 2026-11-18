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
    const first = p.variants && p.variants[0];
    const img = first ? `<img src="${esc(first.image)}" alt="${esc(p.name)} in ${esc(first.colour)}" loading="lazy">` : "";
    const colours = (p.variants || []).map((v) => v.colour);
    const orderText = `Hello SOULWEAR, I'd like to order the ${p.name}. Colour: `;
    return `
      <article class="card" data-id="${esc(p.id)}">
        <div class="thumb">${img}</div>
        <div class="body">
          <h3>${esc(p.name)}</h3>
          <p class="muted small">${esc(p.description || "")}</p>
          <div class="meta"><span class="price">${esc(priceText(p))}</span><span class="stock">${esc(stockText(p))}</span></div>
          ${colours.length ? `<div class="swatches">${(p.variants || []).map((v, i) =>
            `<button class="swatch" type="button" data-img="${esc(v.image)}" data-alt="${esc(p.name)} in ${esc(v.colour)}" data-colour="${esc(v.colour)}" aria-label="${esc(v.colour)}" title="${esc(v.colour)}" ${i === 0 ? "aria-pressed=\"true\"" : ""}></button>`).join("")}</div>
          <p class="muted small">Colour: <span class="colour-name">${esc(colours[0] || "")}</span></p>` : ""}
          <div class="sizes">${(window.PRODUCTS.sizes || []).map((s) => `<span>${esc(s)}</span>`).join("")}</div>
          <a class="btn small order-btn" data-base="${esc(orderText)}" href="${waLink(S.whatsapp[0], orderText + (colours[0] || ""))}" target="_blank" rel="noopener">Order on WhatsApp</a>
        </div>
      </article>`;
  }

  fetch("products.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((data) => {
      window.PRODUCTS = data;
      const list = data.products || [];
      const hoodies = list.filter((p) => p.category === "hoodies");
      const all = list;
      const html = (items) => items.map(productCard).join("") || `<p class="muted">Coming soon.</p>`;
      $("#products").innerHTML = html(all);
      document.querySelectorAll("[data-cat]").forEach((el) => {
        const cat = el.dataset.cat;
        const items = list.filter((p) => p.category === cat);
        if (items.length) el.innerHTML = html(items);
      });
      bindSwatches();
    })
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
