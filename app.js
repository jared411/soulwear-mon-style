(function () {
  const S = window.SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `${S.currency} ${Number(n).toLocaleString()}`;
  const waLink = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  const CART_KEY = "soulwear_cart_v1";

  // Always start at the top of the home page when the page loads or refreshes
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("load", () => {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
  });

  $("#yr").textContent = new Date().getFullYear();

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

  // ---------- Cart (saved on this device) ----------
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { cart = []; }
  if (!Array.isArray(cart)) cart = [];
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
  const cartCount = () => cart.reduce((n, i) => n + i.qty, 0);

  let products = [];

  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function addToCart(p, colour, size) {
    const key = `${p.id}|${colour}|${size}`;
    const found = cart.find((i) => i.key === key);
    const max = p.stock == null ? 20 : p.stock;
    if (found) {
      if (found.qty >= max) return toast("No more stock for that choice");
      found.qty += 1;
    } else {
      const img = (p.variants.find((v) => v.colour === colour) || p.variants[0] || {}).image || "";
      cart.push({ key, id: p.id, name: p.name, colour, size, price: p.price, image: img, qty: 1 });
    }
    saveCart();
    renderCart();
    toast(`${p.name} (${colour}, ${size}) added`);
  }

  function renderCart() {
    $("#cart-count").textContent = cartCount();
    const items = $("#cart-items");
    if (!cart.length) {
      items.innerHTML = `<p class="muted">Your cart is empty. Browse the shop and add something you like.</p>`;
      $("#cart-total").textContent = money(0);
      $("#cart-note").textContent = "";
      $("#cart-checkout").classList.add("hidden");
      return;
    }
    $("#cart-checkout").classList.remove("hidden");
    items.innerHTML = cart.map((i) => `
      <div class="cart-line">
        ${i.image ? `<img src="${esc(i.image)}" alt="">` : ""}
        <div class="cart-info">
          <strong>${esc(i.name)}</strong>
          <small class="muted">${esc(i.colour)} · ${esc(i.size)}${i.price == null ? " · price on WhatsApp" : ` · ${money(i.price)}`}</small>
          <div class="qty">
            <button type="button" data-dec="${esc(i.key)}" aria-label="Less">−</button>
            <span>${i.qty}</span>
            <button type="button" data-inc="${esc(i.key)}" aria-label="More">+</button>
            <button type="button" class="remove" data-remove="${esc(i.key)}">Remove</button>
          </div>
        </div>
      </div>`).join("");

    const priced = cart.filter((i) => i.price != null);
    const unpriced = cart.filter((i) => i.price == null);
    const total = priced.reduce((n, i) => n + i.price * i.qty, 0);
    $("#cart-total").textContent = money(total);
    $("#cart-note").textContent = unpriced.length
      ? "Some items have no price yet. We'll confirm those on WhatsApp."
      : "";

    const text = orderText();
    $("#checkout-links").innerHTML = S.whatsapp.map((n, i) =>
      `<a class="btn wa-btn" href="${waLink(n, text)}" target="_blank" rel="noopener">Send order to ${esc(S.displayPhones[i])}</a>`).join("");
  }

  function orderText() {
    const lines = cart.map((i) => {
      const price = i.price == null ? "price to confirm" : money(i.price * i.qty);
      return `- ${i.qty} x ${i.name} (${i.colour}, ${i.size}) ${price}`;
    });
    const priced = cart.filter((i) => i.price != null);
    const total = priced.reduce((n, i) => n + i.price * i.qty, 0);
    return [
      "Hello SOULWEAR, I'd like to place this order:",
      ...lines,
      `Total: ${money(total)}${cart.some((i) => i.price == null) ? " plus items to confirm" : ""}`,
    ].join("\n");
  }

  function openCart() { $("#cart-drawer").classList.remove("hidden"); $("#cart-overlay").classList.remove("hidden"); renderCart(); }
  function closeCart() { $("#cart-drawer").classList.add("hidden"); $("#cart-overlay").classList.add("hidden"); }
  $("#cart-open").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  $("#cart-overlay").addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

  $("#cart-items").addEventListener("click", (e) => {
    const t = e.target;
    const change = (key, delta) => {
      const item = cart.find((i) => i.key === key);
      if (!item) return;
      const p = products.find((x) => x.id === item.id);
      const max = p && p.stock != null ? p.stock : 20;
      item.qty = Math.max(0, Math.min(max, item.qty + delta));
      cart = cart.filter((i) => i.qty > 0);
      saveCart();
      renderCart();
    };
    if (t.dataset.inc) change(t.dataset.inc, 1);
    else if (t.dataset.dec) change(t.dataset.dec, -1);
    else if (t.dataset.remove) { cart = cart.filter((i) => i.key !== t.dataset.remove); saveCart(); renderCart(); }
  });

  $("#cart-clear").addEventListener("click", () => {
    if (confirm("Clear everything in your cart?")) { cart = []; saveCart(); renderCart(); }
  });

  // ---------- Products and categories ----------
  function normalise(r) {
    return {
      id: r.id, category: r.category, name: r.name, description: r.description,
      price: r.price == null ? null : Number(r.price),
      stock: r.stock == null ? null : Number(r.stock),
      sizes: (r.sizes && r.sizes.length ? r.sizes : S.sizes),
      variants: (r.variants || []).filter((v) => v && v.image),
      active: r.active !== false,
    };
  }

  function productCard(p) {
    const variants = p.variants;
    const first = variants[0] || { colour: "", image: "" };
    const soldOut = p.stock === 0;
    const stockLabel = p.stock == null ? "Check availability" : soldOut ? "Sold out" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock";
    return `
      <article class="card" data-id="${esc(p.id)}" data-colour="${esc(first.colour)}" data-size="">
        <div class="thumb">${first.image ? `<img src="${esc(first.image)}" alt="${esc(p.name)} in ${esc(first.colour)}" loading="lazy">` : ""}</div>
        <div class="body">
          <h3>${esc(p.name)}</h3>
          <p class="muted small">${esc(p.description || "")}</p>
          <div class="meta">
            <span class="price">${p.price == null ? "Price on WhatsApp" : money(p.price)}</span>
            <span class="stock">${esc(stockLabel)}</span>
          </div>
          ${variants.length > 1 ? `
          <p class="label-small">Colour: <span class="colour-name">${esc(first.colour)}</span></p>
          <div class="swatches">${variants.map((v, i) =>
            `<button class="swatch" type="button" data-img="${esc(v.image)}" data-alt="${esc(p.name)} in ${esc(v.colour)}" data-colour="${esc(v.colour)}" title="${esc(v.colour)}" aria-label="${esc(v.colour)}" aria-pressed="${i === 0}"></button>`).join("")}</div>` : ""}
          <p class="label-small">Size</p>
          <div class="sizes">${p.sizes.map((s) => `<button class="size" type="button" data-size="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join("")}</div>
          <button class="btn small add-btn" type="button" ${soldOut ? "disabled" : ""}>${soldOut ? "Sold out" : "Add to cart"}</button>
          <a class="whatsapp-link small" href="${waLink(S.whatsapp[0], `Hello SOULWEAR, I'd like to order the ${p.name}. Colour: ${first.colour}`)}" target="_blank" rel="noopener" data-base="Hello SOULWEAR, I'd like to order the ${esc(p.name)}. Colour: ">Or order this on WhatsApp</a>
        </div>
      </article>`;
  }

  function renderProducts(filter) {
    const list = products.filter((p) => filter === "all" || p.category === filter);
    $("#products").innerHTML = list.map(productCard).join("") || `<p class="muted">Coming soon in this category.</p>`;
    $$(".card").forEach(bindCard);
  }

  function bindCard(card) {
    const p = products.find((x) => x.id === card.dataset.id);
    if (!p) return;
    card.querySelectorAll(".swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const img = card.querySelector(".thumb img");
        if (img) { img.src = btn.dataset.img; img.alt = btn.dataset.alt; }
        card.dataset.colour = btn.dataset.colour;
        card.querySelectorAll(".swatch").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        const name = card.querySelector(".colour-name");
        if (name) name.textContent = btn.dataset.colour;
        const wa = card.querySelector(".whatsapp-link");
        if (wa) wa.href = waLink(S.whatsapp[0], wa.dataset.base + btn.dataset.colour);
      });
    });
    card.querySelectorAll(".size").forEach((btn) => {
      btn.addEventListener("click", () => {
        card.dataset.size = btn.dataset.size;
        card.querySelectorAll(".size").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      });
    });
    const add = card.querySelector(".add-btn");
    if (add) add.addEventListener("click", () => {
      if (!card.dataset.size) return toast("Choose a size first");
      addToCart(p, card.dataset.colour || (p.variants[0] || {}).colour || "", card.dataset.size);
    });
  }

  // Category buttons (shop filter and collection tiles)
  function setFilter(f) {
    $$(".filter-btn").forEach((b) => b.classList.toggle("is-on", b.dataset.filter === f));
    renderProducts(f);
  }
  $$(".filter-btn").forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));
  $$(".cat").forEach((b) => b.addEventListener("click", () => {
    setFilter(b.dataset.filter);
    document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
  }));

  fetch("products.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((json) => {
      products = (json.products || []).map(normalise).filter((p) => p.active);
      renderProducts("all");
    })
    .catch(() => {
      $("#products").innerHTML = `<p class="muted">Products are loading. If this stays empty, please order on WhatsApp.</p>`;
    });

  renderCart();
})();
