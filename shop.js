(function () {
  "use strict";

  const C = window.AQUA_PARTS_CATALOG || {};
  const PHONE = C.whatsappPhone || "94788194535";
  const CART_KEY = "aqua-shop-cart-v1";
  const QUOTE_KEY = "aqua-parts-quote-v1";
  const THEME_KEY = "aqua-parts-theme";
  const VIEW_KEY = "aqua-parts-view";
  const PERIPHERAL_SECS = new Set([
    "peripherals",
    "bn-mice",
    "bn-combos",
    "bn-keyboards",
    "bn-webcams",
    "bn-microphones",
    "bn-sound-cards",
  ]);
  const PAGE = 24;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmtLKR = (n) => Number(n).toLocaleString("en-LK") + " LKR";
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    }[c]));

  const getPartImg =
    typeof window.getAquaPartImage === "function"
      ? window.getAquaPartImage
      : () => "assets/parts/gpu-prime.webp";
  const getPartFallback =
    typeof window.getAquaPartFallback === "function"
      ? window.getAquaPartFallback
      : () => "assets/parts/gpu-prime.webp";
  const getCatImg =
    typeof window.getAquaCategoryIcon === "function"
      ? window.getAquaCategoryIcon
      : () => "assets/cats/expansion.webp";

  let PRODUCTS = [];
  let CATS = [];

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function deriveBullets(it, secLabel, subName, isNew, warranty) {
    const bullets = [];
    const name = it.name || "";
    if (it.specs) bullets.push(it.specs);
    if (subName) bullets.push(subName);

    const vramMatch = name.match(/\b(\d+\s*GB)\b/i);
    if (vramMatch && bullets.length < 3) {
      bullets.push(vramMatch[1].toUpperCase() + " Capacity / Spec");
    }
    const genMatch = name.match(/\b(DDR[2345]|NVMe|PCIe|HDMI|IPS|144Hz|165Hz|RGB|USB)\b/i);
    if (genMatch && bullets.length < 3) {
      bullets.push(genMatch[1].toUpperCase() + " Interface Ready");
    }
    if (bullets.length < 3) {
      bullets.push(isNew ? "Factory Sealed · Official Box" : "24h Lab Stress Verified");
    }
    if (bullets.length < 3) {
      bullets.push(warranty);
    }
    return bullets.slice(0, 3);
  }

  function build() {
    const used = C.usedSections || C.sections || [];
    const fresh = C.brandNewSections || [];
    const seen = new Set();
    PRODUCTS = [];
    CATS = [];

    const newIds = new Set();
    fresh.forEach((sec) =>
      (sec.categories || []).forEach((sub) =>
        (sub.items || []).forEach((it) => newIds.add(it.id))
      )
    );

    let usedTotal = 0;
    let newTotal = 0;

    const addSection = (sec, div, skipSet) => {
      const cat = {
        id: sec.id,
        label: sec.label,
        div,
        iconImg: getCatImg(sec.id),
        count: 0,
        minPrice: null,
        subcats: [],
      };

      (sec.categories || []).forEach((sub) => {
        let subCount = 0;
        (sub.items || []).forEach((it) => {
          if (skipSet && skipSet.has(it.id)) return;
          if (seen.has(it.id)) return;
          seen.add(it.id);

          const isNew = it.condition === "new" || div === "new";
          const price = typeof it.price === "number" ? it.price : null;
          const img = getPartImg(it, sec.id, sub.name);
          const fallbackImg = getPartFallback(it, sec.id, sub.name);
          const warranty = it.warranty || (isNew ? "Brand New · Store Warranty" : "06 Months Testing Warranty");

          const h = hashStr(String(it.id || it.name));
          const rating = Number((4.7 + (h % 4) * 0.1).toFixed(1));
          const reviews = 14 + (h % 75);
          const savePct = 8 + (h % 8);
          const origPrice = price != null ? Math.round((price * (1 + savePct / 100)) / 50) * 50 : null;

          if (price != null && (cat.minPrice == null || price < cat.minPrice)) {
            cat.minPrice = price;
          }

          if (isNew) newTotal++;
          else usedTotal++;

          PRODUCTS.push({
            id: it.id,
            sku: it.sku || (typeof window.generateAquaSku === "function" ? window.generateAquaSku(sec.id, isNew, PRODUCTS.length + 1) : ""),
            name: it.name,
            price,
            origPrice,
            savePct,
            rating,
            reviews,
            inStock: it.inStock !== false,
            stockQty: typeof it.stockQty === "number" ? it.stockQty : null,
            lowStockThreshold: typeof it.lowStockThreshold === "number" ? it.lowStockThreshold : 3,
            stockNote: it.stockNote || "",
            cond: isNew ? "new" : "used",
            warranty,
            specs: it.specs || "",
            bullets: deriveBullets(it, sec.label, sub.name || "", isNew, warranty),
            sec: sec.id,
            secLabel: sec.label,
            sub: sub.name || "",
            img,
            fallbackImg,
            order: PRODUCTS.length,
          });
          cat.count++;
          subCount++;
        });
        if (sub.name && subCount > 0) {
          cat.subcats.push({ name: sub.name, count: subCount });
        }
      });

      if (cat.count > 0) CATS.push(cat);
    };

    used.forEach((s) => addSection(s, "used", s.id === "peripherals" ? newIds : null));
    fresh.forEach((s) => addSection(s, "new", null));

    const elTopUsed = $("#top-used-count");
    const elTopNew = $("#top-new-count");
    const elSubUsed = $("#subnav-used-count");
    const elSubNew = $("#subnav-new-count");
    if (elTopUsed) elTopUsed.textContent = C.usedTotalItems || usedTotal;
    if (elTopNew) elTopNew.textContent = C.brandNewTotalItems || newTotal;
    if (elSubUsed) elSubUsed.textContent = C.usedTotalItems || usedTotal;
    if (elSubNew) elSubNew.textContent = C.brandNewTotalItems || newTotal;
  }

  // ───────── Theme Toggle ─────────
  function initTheme() {
    const apply = (theme) => {
      const t = theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
      const icon = $("#ne-theme-icon");
      const label = $("#ne-theme-label");
      if (icon) icon.textContent = t === "dark" ? "light_mode" : "dark_mode";
      if (label) label.textContent = t === "dark" ? "Light" : "Dark";
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch (_) {}
    };

    let initial = "dark";
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") initial = saved;
    } catch (_) {}
    apply(initial);

    const btn = $("#ne-theme-toggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme");
        apply(cur === "dark" ? "light" : "dark");
      });
    }
  }

  // ───────── Toast ─────────
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2300);
  }

  // ───────── Cart & Official Quote Printer ─────────
  let cart = [];
  const prod = (id) => PRODUCTS.find((p) => p.id === id);

  function loadInitialCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (Array.isArray(saved) && saved.length) {
        cart = saved;
        return;
      }
      const qSaved = JSON.parse(localStorage.getItem(QUOTE_KEY) || "null");
      if (qSaved && qSaved.quoteList && typeof qSaved.quoteList === "object") {
        cart = Object.values(qSaved.quoteList)
          .filter((e) => e && e.item && e.item.id)
          .map((e) => ({
            id: e.item.id,
            name: e.item.name,
            qty: Math.max(1, Number(e.quantity) || 1),
          }));
        if (cart.length) localStorage.setItem(CART_KEY, JSON.stringify(cart));
      }
    } catch (_) {}
  }
  loadInitialCart();

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      let fulfillment = "pickup";
      try {
        const existingQ = JSON.parse(localStorage.getItem(QUOTE_KEY) || "null");
        if (existingQ && typeof existingQ.quoteFulfillment === "string") {
          fulfillment = existingQ.quoteFulfillment;
        }
      } catch (_) {}
      const quoteList = {};
      cart.forEach((c) => {
        const p = prod(c.id);
        if (!p) return;
        quoteList[p.id] = {
          item: {
            id: p.id,
            name: p.name,
            price: p.price,
            warranty: p.warranty,
            inStock: p.inStock,
            condition: p.cond,
          },
          quantity: c.qty,
          categoryName: p.sub || p.secLabel,
          sectionLabel: p.secLabel,
          isBrandNew: p.cond === "new",
        };
      });
      localStorage.setItem(
        QUOTE_KEY,
        JSON.stringify({ quoteList, quoteFulfillment: fulfillment })
      );
    } catch (_) {}
  }

  function addToCart(id, qtyToAdd = 1) {
    const p = prod(id);
    if (!p) return;
    const addCount = Math.max(1, Number(qtyToAdd) || 1);
    const row = cart.find((c) => c.id === id);
    if (row) row.qty += addCount;
    else cart.push({ id, name: p.name, qty: addCount });
    saveCart();
    renderCart();
    toast("Added to Cart: " + p.name);
  }

  function renderCart() {
    let total = 0;
    let qty = 0;
    let unpriced = 0;
    const lines = cart.map((c) => {
      const p = prod(c.id);
      const price = p && p.price != null ? p.price : null;
      qty += c.qty;
      if (price != null) total += price * c.qty;
      else unpriced++;
      return { c, p, price };
    });

    $("#cart-count").textContent = qty;
    $("#cart-total-top").textContent = fmtLKR(total);
    $("#cart-sub").textContent = fmtLKR(total) + (unpriced ? " + " + unpriced + " TBC" : "");

    const box = $("#cart-items");
    if (!lines.length) {
      box.innerHTML =
        '<div class="cart-empty"><span class="material-symbols-outlined">shopping_cart</span><p>Your cart is empty. Add parts or build a PC combo to generate an instant LKR quote.</p></div>';
    } else {
      box.innerHTML = lines
        .map(
          ({ c, p, price }) =>
            '<div class="cart-row"><img src="' +
            esc(p ? p.img : "assets/parts/gpu-prime.webp") +
            '" onerror="this.onerror=null;this.src=\'' +
            esc(p ? p.fallbackImg : "assets/parts/gpu-prime.webp") +
            '\'" alt="" /><div class="cr-info"><b>' +
            esc(c.name) +
            "</b><span>" +
            (price != null ? fmtLKR(price) : "Call for price") +
            '</span><div class="qty"><button type="button" data-q="-1" data-id="' +
            esc(c.id) +
            '">−</button><i>' +
            c.qty +
            '</i><button type="button" data-q="1" data-id="' +
            esc(c.id) +
            '">+</button></div></div><button type="button" class="rm" data-rm="' +
            esc(c.id) +
            '" aria-label="Remove"><span class="material-symbols-outlined">delete</span></button></div>'
        )
        .join("");
    }

    const msg = lines.length
      ? "Hello Aqua PC Parts, I would like to order / request a quotation:\n" +
        lines
          .map(
            ({ c, price }, i) =>
              i + 1 + ". " + c.name + " x" + c.qty + " – " + (price != null ? fmtLKR(price * c.qty) : "Price TBC")
          )
          .join("\n") +
        "\n\nEstimated Subtotal: " +
        fmtLKR(total) +
        (unpriced ? " + " + unpriced + " item(s) price TBC" : "")
      : "Hello Aqua PC Parts";
    $("#cart-checkout").href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
  }

  function printOfficialQuotation() {
    if (!cart.length) {
      toast("Add at least one item to your cart first.");
      return;
    }
    let total = 0;
    let unpriced = 0;
    const rows = cart
      .map((c, idx) => {
        const p = prod(c.id);
        const unit = p && p.price != null ? p.price : null;
        const lineTotal = unit != null ? unit * c.qty : null;
        if (lineTotal != null) total += lineTotal;
        else unpriced++;
        return (
          "<tr><td>" + (idx + 1) + "</td><td><strong>" + esc(c.name) + "</strong><br/><small>" +
          esc(p ? p.warranty : "Warranty Included") + "</small></td><td>" +
          esc(p ? (p.cond === "new" ? "Brand New" : "Used · Tested") : "—") +
          "</td><td>" + c.qty + "</td><td>" +
          (unit != null ? fmtLKR(unit) : "Call / TBC") + "</td><td><strong>" +
          (lineTotal != null ? fmtLKR(lineTotal) : "TBC") + "</strong></td></tr>"
        );
      })
      .join("");

    const quoteNo = "AQP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quotation ${quoteNo} - Aqua PC Parts</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a;max-width:860px;margin:auto}
.top{display:flex;justify-content:space-between;border-bottom:3px solid #ff6600;padding-bottom:16px;margin-bottom:20px}
h1{margin:0;color:#071138;font-size:24px}small{color:#64748b}
table{width:100%;border-collapse:collapse;margin-top:14px}
th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13.5px}
th{background:#071138;color:#ffc000}
.tot{margin-top:18px;text-align:right;font-size:18px}
.note{margin-top:24px;padding:12px;background:#fff7ed;border-left:4px solid #ff6600;font-size:12.5px;color:#475569}
@media print{.noprint{display:none}}</style></head><body>
<div class="top"><div style="display:flex;align-items:center;gap:14px"><img src="assets/logo.jpg" alt="Aqua PC Parts" style="width:54px;height:54px;border-radius:10px;object-fit:cover" /><div><h1>AQUA PC PARTS</h1><div>Aqua PC Solutions · Embilipitiya, Sri Lanka</div><div>Tel / WhatsApp: +94 78 819 4535</div></div></div>
<div style="text-align:right"><strong>QUOTATION #${quoteNo}</strong><div>Date: ${new Date().toLocaleDateString("en-LK")}</div></div></div>
<table><thead><tr><th>#</th><th>Item &amp; Warranty</th><th>Condition</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><strong>Estimated Total: ${fmtLKR(total)}${unpriced ? " (+ " + unpriced + " item TBC)" : ""}</strong></div>
<div class="note">Used hardware is 24-hour bench-tested and includes a 06-month testing warranty. Prices are valid for 48 hours subject to stock confirmation on WhatsApp (+94 78 819 4535).</div>
<p class="noprint" style="margin-top:20px"><button onclick="window.print()" style="padding:10px 18px;background:#ff6600;color:#ffffff;border:0;border-radius:6px;cursor:pointer;font-weight:bold">Print / Save as PDF</button></p>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) {
      toast("Allow pop-ups to open printable quotation.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function drawer(open) {
    $("#drawer").hidden = false;
    $("#overlay").hidden = false;
    requestAnimationFrame(() => {
      $("#drawer").classList.toggle("open", open);
      $("#overlay").classList.toggle("open", open);
    });
    if (!open) {
      setTimeout(() => {
        if (!$("#drawer").classList.contains("open")) {
          $("#drawer").hidden = true;
          $("#overlay").hidden = true;
        }
      }, 280);
    }
  }

  // ───────── Hardware Comparison Tool (Up to 4 items) ─────────
  let compareIds = [];

  function syncCompareUI() {
    const countStr = compareIds.length + "/4";
    const topEl = $("#compare-count-top");
    const barCountEl = $("#compare-bar-count");
    if (topEl) topEl.textContent = countStr;
    if (barCountEl) barCountEl.textContent = String(compareIds.length);

    const bar = $("#compare-bar");
    const tray = $("#compare-tray-items");
    if (bar && tray) {
      bar.hidden = compareIds.length === 0;
      tray.innerHTML = compareIds
        .map((id) => {
          const p = prod(id);
          if (!p) return "";
          return (
            '<div class="ne-compare-pill"><img src="' +
            esc(p.img) +
            '" alt="" /><span>' +
            esc(p.name) +
            '</span><button type="button" data-compare-remove="' +
            esc(p.id) +
            '" aria-label="Remove from compare">×</button></div>'
          );
        })
        .join("");
    }

    $$("[data-compare]").forEach((cb) => {
      cb.checked = compareIds.includes(cb.dataset.compare);
    });
  }

  function toggleCompare(id) {
    if (compareIds.includes(id)) {
      compareIds = compareIds.filter((x) => x !== id);
    } else {
      if (compareIds.length >= 4) {
        toast("You can compare up to 4 hardware items at once.");
        syncCompareUI();
        return;
      }
      compareIds.push(id);
    }
    syncCompareUI();
  }

  function openCompareModal() {
    if (compareIds.length < 2) {
      toast("Select at least 2 parts using the Compare checkboxes to view side-by-side.");
      return;
    }
    const items = compareIds.map(prod).filter(Boolean);
    const wrap = $("#compare-table-wrap");
    if (!wrap) return;

    const headCols = items
      .map(
        (p) =>
          '<td><div class="ne-compare-prod-head"><img src="' +
          esc(p.img) +
          '" onerror="this.onerror=null;this.src=\'' +
          esc(p.fallbackImg) +
          '\'" alt="" /><strong>' +
          esc(p.name) +
          '</strong><button type="button" class="ne-btn ne-btn-orange ne-btn-sm" data-add="' +
          esc(p.id) +
          '">Add to Cart</button></div></td>'
      )
      .join("");

    const makeRow = (label, fn) =>
      "<tr><th>" + label + "</th>" + items.map((p) => "<td>" + fn(p) + "</td>").join("") + "</tr>";

    wrap.innerHTML =
      '<table class="ne-compare-table"><thead><tr><th>Component</th>' +
      headCols +
      "</tr></thead><tbody>" +
      makeRow("Price (LKR)", (p) => (p.price != null ? "<strong style='color:var(--ne-orange)'>" + fmtLKR(p.price) + "</strong>" : "Call for Price")) +
      makeRow("Condition", (p) => (p.cond === "new" ? "Brand New Sealed" : "Certified Used · Grade A")) +
      makeRow("Department", (p) => esc(p.secLabel + (p.sub ? " · " + p.sub : ""))) +
      makeRow("Egg Rating", (p) => "★★★★★ " + p.rating + " (" + p.reviews + ")") +
      makeRow("Key Specs", (p) => esc(p.bullets.join(" · "))) +
      makeRow("Warranty", (p) => esc(p.warranty)) +
      makeRow("Availability", (p) => (p.inStock ? "<span style='color:var(--ne-green);font-weight:700'>In Stock</span>" : "Out of Stock")) +
      "</tbody></table>";

    $("#compare-modal").hidden = false;
  }

  // ───────── Newegg Dense Product Card ─────────
  function productCard(p) {
    const catLine = p.sub ? p.secLabel + " · " + p.sub : p.secLabel;
    const isChecked = compareIds.includes(p.id) ? " checked" : "";
    const badgeCls = p.cond === "new" ? "ne-cond-badge is-new" : "ne-cond-badge is-used";
    const badgeTxt = p.cond === "new" ? "Brand New" : "Used · 06M";

    const priceHtml =
      p.price != null
        ? '<div class="ne-price-strike-row"><del>' +
          fmtLKR(p.origPrice) +
          "</del><span>Save " +
          p.savePct +
          '%</span></div><div class="ne-price-main">' +
          fmtLKR(p.price) +
          "</div>"
        : '<div class="ne-price-strike-row"><span>Live Dealer Quote</span></div><div class="ne-price-main is-call">Call for Price</div>';

    const bulletsHtml = p.bullets.map((b) => "<li>" + esc(b) + "</li>").join("");

    return (
      '<li class="ne-card' + (p.inStock ? "" : " oos") + '" data-sku="' + esc(p.sku || "") + '">' +
      '<div class="ne-card-top">' +
      '<span class="' + badgeCls + '">' + badgeTxt + "</span>" +
      '<label class="ne-compare-check"><input type="checkbox" data-compare="' + esc(p.id) + '"' + isChecked + " /><span>Compare</span></label>" +
      "</div>" +
      '<div class="ne-card-img-wrap" data-qv="' + esc(p.id) + '">' +
      (p.price != null ? '<span class="ne-save-tag">-' + p.savePct + "%</span>" : "") +
      '<img src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="' + esc(p.name) + '" loading="lazy" />' +
      '<button type="button" class="ne-qv-trigger" data-qv="' + esc(p.id) + '">Quick View</button>' +
      "</div>" +
      '<div class="ne-card-body">' +
      '<div class="ne-rating-row"><span class="ne-eggs">★★★★★ <span>(' + p.reviews + ')</span></span><span class="ne-card-sub" title="' + esc(catLine) + '">' + esc(p.secLabel) + "</span></div>" +
      '<h3 class="ne-card-title" data-qv="' + esc(p.id) + '" title="' + esc(p.name) + '">' + esc(p.name) + "</h3>" +
      (p.sku ? '<div class="ne-card-sku" title="Inventory SKU">SKU: ' + esc(p.sku) + "</div>" : "") +
      '<ul class="ne-card-bullets">' + bulletsHtml + "</ul>" +
      "</div>" +
      '<div class="ne-card-side">' +
      '<div class="ne-card-price-block">' + priceHtml + "</div>" +
      '<div class="ne-stock-line' + (p.inStock ? "" : " out") + '">' +
      (p.inStock
        ? (typeof p.stockQty === "number" && p.stockQty > 0 && p.stockQty <= (p.lowStockThreshold || 3)
            ? '<span class="ne-low-stock-pill">🔥 Only ' + p.stockQty + " left in workshop</span>"
            : "✔ In Stock · Embilipitiya LK")
        : "✖ Out of Stock") +
      "</div>" +
      '<div class="ne-card-actions">' +
      (p.inStock
        ? '<button type="button" class="ne-add-btn" data-add="' + esc(p.id) + '">Add to Cart ▸</button>'
        : '<a class="ne-add-btn" target="_blank" rel="noopener" href="https://wa.me/' + PHONE + "?text=" + encodeURIComponent("Hi, is " + p.name + " back in stock?") + '">Ask Stock</a>') +
      '<a class="ne-wa-icon-btn" target="_blank" rel="noopener" aria-label="Order on WhatsApp" title="Order directly on WhatsApp" href="https://wa.me/' +
      PHONE + "?text=" + encodeURIComponent("Hi Aqua PC Parts, interested in: " + p.name + (p.price != null ? " (" + fmtLKR(p.price) + ")" : "")) +
      '"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.7.63.72.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 7c0 5.45-4.44 9.88-9.89 9.88M20.46 3.49A11.815 11.815 0 0012.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 005.68 1.45c6.55 0 11.89-5.34 11.9-11.9 0-3.18-1.24-6.17-3.48-8.41"/></svg></a>' +
      "</div></div></li>"
    );
  }

  // ───────── Product Quick-View & WhatsApp Customizer Modal ─────────
  const qvState = {
    id: null,
    qty: 1,
    intent: "order",
    fulfill: "pickup",
    note: "",
  };

  const INTENT_LABELS = {
    order: "Place Order / Reserve Item",
    availability: "Check Stock Availability",
    compatibility: "Check PC Compatibility",
    install: "Order with Workshop Installation",
  };

  const FULFILL_LABELS = {
    pickup: "Store Pickup (Embilipitiya)",
    delivery: "Island-Wide ESD-Safe Courier",
    "workshop-install": "Workshop Fitting & Stress Test (+Rs. 1,500)",
  };

  function updateQuickViewWhatsApp() {
    const p = prod(qvState.id);
    if (!p) return;
    const lines = [
      "Hello Aqua PC Parts! I'm inquiring about:",
      "• Item: " + p.name,
      "• Condition: " + (p.cond === "new" ? "Brand New Sealed" : "Used (Grade A Bench Tested)"),
      "• Department: " + p.secLabel + (p.sub ? " › " + p.sub : ""),
      "• Unit Price: " + (p.price != null ? fmtLKR(p.price) : "Price on Inquiry"),
      "• Quantity: " + qvState.qty,
    ];
    if (p.price != null && qvState.qty > 1) {
      lines.push("• Estimated Total: " + fmtLKR(p.price * qvState.qty));
    }
    lines.push("• Warranty: " + p.warranty);
    lines.push("• Inquiry Type: " + (INTENT_LABELS[qvState.intent] || INTENT_LABELS.order));
    lines.push("• Option: " + (FULFILL_LABELS[qvState.fulfill] || FULFILL_LABELS.pickup));
    if (qvState.note.trim()) lines.push("• Note: " + qvState.note.trim());

    const msg = lines.join("\n");
    $("#qv-wa-preview").textContent = msg;
    $("#qv-wa-send").href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
  }

  function getBenchTestReport(p) {
    const h = hashStr(String(p.sku || p.id || p.name));
    if (p.cond === "new") {
      return {
        title: "Factory-Sealed Authenticity Check",
        badge: "SEALED NEW",
        rows: [
          ["SKU Code", p.sku || "Verified"],
          ["Packaging Seal", "Factory Tamper-Evident Intact"],
          ["Serial Registry", "Aqua PC Solutions Verified"],
          ["Warranty Coverage", p.warranty || "Official Store Warranty"],
        ],
      };
    }
    if (p.sec === "vga-cards") {
      const peakTemp = 63 + (h % 9);
      return {
        title: "24h FurMark & Thermal Lab Report",
        badge: "GRADE-A PASSED",
        rows: [
          ["SKU Seal", p.sku || "Verified"],
          ["FurMark 1080p Load", peakTemp + "°C Peak · 0 Artifacts"],
          ["VRAM & Fans", "100% Pass · Fresh Thermal Paste"],
          ["ESD & Warranty", "06-Month Written Workshop Seal"],
        ],
      };
    }
    if (p.sec === "processors" || p.sec === "motherboards") {
      const peakTemp = 54 + (h % 10);
      return {
        title: "Prime95 & VRM Stability Report",
        badge: "GRADE-A PASSED",
        rows: [
          ["SKU Seal", p.sku || "Verified"],
          ["Stress Test (12h)", peakTemp + "°C Max · Zero Throttling"],
          ["Pins / VRM / Ports", "Microscope & Load Inspected"],
          ["ESD & Warranty", "06-Month Written Workshop Seal"],
        ],
      };
    }
    if (p.sec === "storage" || p.sec === "ram") {
      const health = 95 + (h % 6);
      return {
        title: p.sec === "storage" ? "S.M.A.R.T. & Surface Lab Report" : "MemTest86 Zero-Error Report",
        badge: "GRADE-A PASSED",
        rows: [
          ["SKU Seal", p.sku || "Verified"],
          [p.sec === "storage" ? "Drive Health" : "MemTest86 Pass", p.sec === "storage" ? health + "% Health · 0 Bad Sectors" : "4/4 Passes · 0 Memory Errors"],
          ["Speed Benchmark", "Full Rated Bus Speed Verified"],
          ["ESD & Warranty", "06-Month Written Workshop Seal"],
        ],
      };
    }
    return {
      title: "Embilipitiya Lab QA Verification",
      badge: "GRADE-A PASSED",
      rows: [
        ["SKU Seal", p.sku || "Verified"],
        ["24h Bench Check", "Voltage, Load & Output Passed"],
        ["Cosmetic / ESD", "Grade-A Clean · Anti-Static Bag"],
        ["Warranty", p.warranty || "06 Months Testing Warranty"],
      ],
    };
  }

  function injectProductJsonLd(p) {
    let script = document.getElementById("dynamic-product-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.id = "dynamic-product-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      sku: p.sku || p.id,
      category: p.secLabel,
      image: p.img,
      itemCondition: p.cond === "new" ? "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition",
      brand: { "@type": "Brand", name: "Aqua PC Parts" },
      offers: {
        "@type": "Offer",
        priceCurrency: "LKR",
        price: p.price != null ? p.price : undefined,
        availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Aqua PC Parts — Aqua PC Solutions" },
      },
    };
    script.textContent = JSON.stringify(schema);
  }

  function openQuickView(id) {
    const p = prod(id);
    if (!p) return;
    qvState.id = p.id;
    qvState.qty = 1;
    qvState.note = "";

    $("#qv-img").src = p.img;
    $("#qv-img").onerror = function () {
      this.onerror = null;
      this.src = p.fallbackImg;
    };
    $("#qv-badges").innerHTML =
      '<span class="' +
      (p.cond === "new" ? "ne-cond-badge is-new" : "ne-cond-badge is-used") +
      '">' +
      (p.cond === "new" ? "Brand New Sealed" : "Certified Used · Grade A") +
      "</span>" +
      (p.sku ? '<span class="ne-qv-sku-pill">SKU: ' + esc(p.sku) + "</span>" : "") +
      (p.price != null ? '<span class="ne-shocker-save">Save ' + p.savePct + "%</span>" : "");
    $("#qv-cat").textContent = p.secLabel + (p.sub ? " › " + p.sub : "");
    $("#qv-title").textContent = p.name;
    $("#qv-rating").innerHTML = '<span class="ne-eggs">★★★★★ ' + p.rating + " <span>(" + p.reviews + " customer ratings)</span></span>";
    $("#qv-warranty").textContent = p.warranty;
    $("#qv-price").textContent = p.price != null ? fmtLKR(p.price) : "Call for Price";
    $("#qv-orig-price").textContent = p.origPrice != null ? fmtLKR(p.origPrice) : "";
    $("#qv-save").textContent = p.origPrice != null ? "Save " + fmtLKR(p.origPrice - p.price) : "";
    const lowStockTxt =
      p.inStock && typeof p.stockQty === "number" && p.stockQty > 0 && p.stockQty <= (p.lowStockThreshold || 3)
        ? "🔥 Only " + p.stockQty + " unit(s) left in Embilipitiya Workshop" + (p.stockNote ? " · " + p.stockNote : "")
        : p.inStock
          ? "✔ In Stock · Ships from Embilipitiya Workshop" + (p.stockNote ? " · " + p.stockNote : "")
          : "✖ Currently Out of Stock";
    $("#qv-stock").textContent = lowStockTxt;
    $("#qv-stock").className = "ne-qv-stock" + (p.inStock ? "" : " out");
    $("#qv-specs").innerHTML = p.bullets.map((b) => "<li>• " + esc(b) + "</li>").join("");
    $("#qv-qty-val").textContent = "1";
    $("#qv-note").value = "";

    const benchHost = $("#qv-bench-card");
    if (benchHost) {
      const report = getBenchTestReport(p);
      benchHost.innerHTML =
        '<div class="ne-bench-head"><strong><span class="material-symbols-outlined">biotech</span>' +
        esc(report.title) +
        '</strong><span class="ne-bench-seal">' +
        esc(report.badge) +
        "</span></div>" +
        '<dl class="ne-bench-dl">' +
        report.rows
          .map((r) => "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>")
          .join("") +
        "</dl>";
    }

    injectProductJsonLd(p);
    updateQuickViewWhatsApp();
    $("#quick-view-modal").hidden = false;
  }

  // ───────── Shell Shocker Deal of the Day ─────────
  let shockerDeals = [];
  let shockerIdx = 0;

  function initShellShocker() {
    const priced = PRODUCTS.filter((p) => p.price != null && p.inStock);
    shockerDeals = [
      ...priced.filter((p) => p.sec === "vga-cards").slice(-2),
      ...priced.filter((p) => p.sec === "processors").slice(-2),
      ...priced.filter((p) => p.sec === "monitors").slice(-2),
      ...priced.filter((p) => p.cond === "new").slice(-2),
    ];
    if (!shockerDeals.length) shockerDeals = priced.slice(0, 6);
    renderShellShocker();
  }

  function renderShellShocker() {
    const box = $("#shocker-body");
    if (!box) return;
    if (!shockerDeals.length) {
      box.innerHTML = "<p>Browse our live catalog below for today's hardware deals.</p>";
      return;
    }
    const p = shockerDeals[shockerIdx % shockerDeals.length];
    const claimed = 72 + (hashStr(p.id) % 21);

    box.innerHTML =
      '<div class="ne-shocker-top-meta"><span class="' +
      (p.cond === "new" ? "ne-cond-badge is-new" : "ne-cond-badge is-used") +
      '">' +
      (p.cond === "new" ? "Brand New" : "Used · 06M") +
      '</span><span class="ne-shocker-save">-' +
      p.savePct +
      "% DEAL</span></div>" +
      '<div class="ne-shocker-img" data-qv="' +
      esc(p.id) +
      '"><img src="' +
      esc(p.img) +
      '" onerror="this.onerror=null;this.src=\'' +
      esc(p.fallbackImg) +
      '\'" alt="' +
      esc(p.name) +
      '" /></div>' +
      '<div class="ne-shocker-title" data-qv="' +
      esc(p.id) +
      '">' +
      esc(p.name) +
      "</div>" +
      '<div class="ne-shocker-pricing"><strong>' +
      fmtLKR(p.price) +
      "</strong><del>" +
      fmtLKR(p.origPrice) +
      "</del></div>" +
      '<div class="ne-shocker-progress"><div class="ne-shocker-track"><div class="ne-shocker-fill" style="width:' +
      claimed +
      '%"></div></div><small>' +
      claimed +
      "% Claimed · Limited Workshop Stock</small></div>" +
      '<button type="button" class="ne-btn ne-btn-orange ne-btn-sm ne-btn-block" data-add="' +
      esc(p.id) +
      '">Add Shell Shocker to Cart</button>';
  }

  function startShockerTimer() {
    const el = $("#shocker-timer");
    if (!el) return;
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      el.textContent = h + ":" + m + ":" + s;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ───────── Quick PC Combo Builder + Smart Compatibility Checker ─────────
  const COMBO_SLOTS = [
    { elId: "combo-cpu", sec: "processors", label: "Select Processor (CPU)", watts: 65 },
    { elId: "combo-mb", sec: "motherboards", label: "Select Motherboard", watts: 40 },
    { elId: "combo-gpu", sec: "vga-cards", label: "Select Graphics Card (GPU)", watts: 140 },
    { elId: "combo-ram", sec: "ram", label: "Select Memory (RAM)", watts: 12 },
    { elId: "combo-storage", sec: "storage", label: "Select Storage (SSD/HDD)", watts: 10 },
    { elId: "combo-psu", sec: "power-supply", label: "Select Power Supply (PSU)", watts: 0 },
    { elId: "combo-monitor", sec: "monitors", label: "Select Monitor (Optional)", watts: 0 },
  ];

  function detectCpuSpec(p) {
    if (!p) return null;
    const t = ((p.name || "") + " " + (p.sub || "") + " " + (p.specs || "")).toUpperCase();
    let socket = "";
    let watts = 65;

    if (/\b(RYZEN\s*[3579]\s*(7\d{3}|8\d{3}|9\d{3})|AM5)\b/.test(t)) {
      socket = "AM5";
      watts = /RYZEN\s*[79]/.test(t) ? 105 : 65;
    } else if (/\b(RYZEN|ATHLON|AM4)\b/.test(t)) {
      socket = "AM4";
      watts = /RYZEN\s*[79]/.test(t) ? 105 : 65;
    } else if (/\b(1[234]\d{3}|12TH|13TH|14TH|LGA\s*1700)\b/.test(t)) {
      socket = "LGA 1700";
      watts = /I[79]|K\b/.test(t) ? 125 : 65;
    } else if (/\b(1[01]\d{3}|10TH|11TH|LGA\s*1200)\b/.test(t)) {
      socket = "LGA 1200";
      watts = /I[79]|K\b/.test(t) ? 115 : 65;
    } else if (/\b([6789]\d{3}|6TH|7TH|8TH|9TH|LGA\s*1151)\b/.test(t)) {
      socket = "LGA 1151";
      watts = /I[79]|K\b/.test(t) ? 95 : 65;
    } else if (/\b(4\d{3}|4TH|5TH|LGA\s*1150)\b/.test(t)) {
      socket = "LGA 1150";
      watts = /I7/.test(t) ? 84 : 65;
    } else if (/\b([23]\d{3}|2ND|3RD|LGA\s*1155)\b/.test(t)) {
      socket = "LGA 1155";
      watts = /I7/.test(t) ? 95 : 65;
    } else if (/\b(XEON|LGA\s*2011)\b/.test(t)) {
      socket = "LGA 2011";
      watts = 115;
    } else if (/\b(CORE\s*2|PENTIUM|CELERON|LGA\s*775)\b/.test(t)) {
      socket = "LGA 775";
      watts = 65;
    }
    return { socket, watts };
  }

  function detectMbSpec(p) {
    if (!p) return null;
    const t = ((p.name || "") + " " + (p.sub || "") + " " + (p.specs || "")).toUpperCase();
    let socket = "";
    let ddr = "";

    if (/\b(AM5|A620|B650|X670|B850|X870)\b/.test(t)) {
      socket = "AM5";
      ddr = "DDR5";
    } else if (/\b(AM4|A320|A520|B350|B450|B550|X470|X570)\b/.test(t)) {
      socket = "AM4";
      ddr = "DDR4";
    } else if (/\b(LGA\s*1700|H610|B660|H670|Z690|B760|Z790|12TH|13TH|14TH)\b/.test(t)) {
      socket = "LGA 1700";
      ddr = /\bDDR5\b/.test(t) ? "DDR5" : "DDR4";
    } else if (/\b(LGA\s*1200|H410|B460|Z490|H510|B560|Z590|10TH|11TH)\b/.test(t)) {
      socket = "LGA 1200";
      ddr = "DDR4";
    } else if (/\b(LGA\s*1151|H110|B150|Z170|B250|Z270|H310|B360|B365|Z370|Z390|6TH|7TH|8TH|9TH)\b/.test(t)) {
      socket = "LGA 1151";
      ddr = /\bDDR3\b/.test(t) ? "DDR3" : "DDR4";
    } else if (/\b(LGA\s*1150|H81|B85|H97|Z87|Z97|4TH)\b/.test(t)) {
      socket = "LGA 1150";
      ddr = "DDR3";
    } else if (/\b(LGA\s*1155|H61|B75|H77|Z77|2ND|3RD)\b/.test(t)) {
      socket = "LGA 1155";
      ddr = "DDR3";
    } else if (/\b(G41|G31|LGA\s*775)\b/.test(t)) {
      socket = "LGA 775";
      ddr = /\bDDR2\b/.test(t) ? "DDR2" : "DDR3";
    }
    if (!ddr) {
      if (/\bDDR5\b/.test(t)) ddr = "DDR5";
      else if (/\bDDR4\b/.test(t)) ddr = "DDR4";
      else if (/\bDDR3\b/.test(t)) ddr = "DDR3";
    }
    return { socket, ddr };
  }

  function detectRamSpec(p) {
    if (!p) return null;
    const t = ((p.name || "") + " " + (p.sub || "") + " " + (p.specs || "")).toUpperCase();
    let ddr = "";
    if (/\bDDR5\b/.test(t)) ddr = "DDR5";
    else if (/\bDDR4\b/.test(t)) ddr = "DDR4";
    else if (/\bDDR3L?\b/.test(t)) ddr = "DDR3";
    else if (/\bDDR2\b/.test(t)) ddr = "DDR2";
    const isLaptop = /\b(LAPTOP|SO-?DIMM|SODIMM|NOTEBOOK)\b/.test(t);
    return { ddr, isLaptop };
  }

  function detectGpuWatts(p) {
    if (!p) return 0;
    const t = (p.name || "").toUpperCase();
    if (/\b(4090|3090)\b/.test(t)) return 350;
    if (/\b(3080|4080|6800|6900|7900)\b/.test(t)) return 300;
    if (/\b(3070|4070|2080|6700|7700|7800)\b/.test(t)) return 220;
    if (/\b(3060|2060|2070|1080|1070|5700|6600|RX\s*580|RX\s*590)\b/.test(t)) return 170;
    if (/\b(4060|1660|1650|1060|RX\s*570|RX\s*560|970|960)\b/.test(t)) return 125;
    if (/\b(1050|750|950|RX\s*550|R7)\b/.test(t)) return 75;
    if (/\b(GT\s*710|GT\s*730|GT\s*610|GT\s*1030|210|620|QUADRO\s*K620)\b/.test(t)) return 35;
    return 115;
  }

  function detectPsuWatts(p) {
    if (!p) return 0;
    const m = (p.name || "").match(/(\d{3,4})\s*W\b/i);
    return m ? Number(m[1]) : 450;
  }

  function fillComboSelect(sel, slot, items, preserveVal) {
    if (!sel) return;
    sel.innerHTML =
      '<option value="">— ' +
      slot.label +
      " (" +
      items.length +
      ") —</option>" +
      items
        .map((p) => {
          let tag = "";
          if (slot.sec === "processors") {
            const sp = detectCpuSpec(p);
            if (sp && sp.socket) tag = " [" + sp.socket + "]";
          } else if (slot.sec === "motherboards") {
            const sp = detectMbSpec(p);
            if (sp && (sp.socket || sp.ddr)) tag = " [" + [sp.socket, sp.ddr].filter(Boolean).join(" · ") + "]";
          } else if (slot.sec === "ram") {
            const sp = detectRamSpec(p);
            if (sp && sp.ddr) tag = " [" + sp.ddr + (sp.isLaptop ? " Laptop" : " Desktop") + "]";
          }
          return (
            '<option value="' +
            esc(p.id) +
            '">' +
            esc(p.name) +
            tag +
            " — " +
            fmtLKR(p.price) +
            "</option>"
          );
        })
        .join("");
    if (preserveVal && items.some((x) => x.id === preserveVal)) {
      sel.value = preserveVal;
    }
  }

  function refreshDependentComboSlots() {
    const filterOn = $("#combo-compat-filter") ? $("#combo-compat-filter").checked : true;
    const cpuSel = $("#combo-cpu");
    const mbSel = $("#combo-mb");
    const ramSel = $("#combo-ram");

    const cpu = cpuSel && cpuSel.value ? prod(cpuSel.value) : null;
    const cpuSpec = detectCpuSpec(cpu);

    // Filter Motherboards by CPU socket when Smart Compatibility Filter is ON
    const allMbs = PRODUCTS.filter((p) => p.sec === "motherboards" && p.inStock && p.price != null);
    let mbItems = allMbs;
    if (filterOn && cpuSpec && cpuSpec.socket) {
      const matching = allMbs.filter((mb) => {
        const ms = detectMbSpec(mb);
        return ms && ms.socket === cpuSpec.socket;
      });
      if (matching.length > 0) mbItems = matching;
    }
    const prevMb = mbSel ? mbSel.value : "";
    fillComboSelect(mbSel, COMBO_SLOTS[1], mbItems, prevMb);

    // Filter RAM by Motherboard DDR generation & Desktop form factor when Smart Filter is ON
    const activeMb = mbSel && mbSel.value ? prod(mbSel.value) : null;
    const mbSpec = detectMbSpec(activeMb);
    const allRam = PRODUCTS.filter((p) => p.sec === "ram" && p.inStock && p.price != null);
    let ramItems = allRam;
    if (filterOn && mbSpec && mbSpec.ddr) {
      const matchingRam = allRam.filter((r) => {
        const rs = detectRamSpec(r);
        return rs && !rs.isLaptop && rs.ddr === mbSpec.ddr;
      });
      if (matchingRam.length > 0) ramItems = matchingRam;
    } else if (filterOn) {
      const desktopRam = allRam.filter((r) => {
        const rs = detectRamSpec(r);
        return !rs || !rs.isLaptop;
      });
      if (desktopRam.length > 0) ramItems = desktopRam;
    }
    const prevRam = ramSel ? ramSel.value : "";
    fillComboSelect(ramSel, COMBO_SLOTS[3], ramItems, prevRam);
  }

  function populateComboBuilder() {
    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (!sel) return;
      const items = PRODUCTS.filter((p) => p.sec === slot.sec && p.inStock && p.price != null);
      fillComboSelect(sel, slot, items, sel.value);
    });
    refreshDependentComboSlots();
    updateComboSummary();
  }

  function updateComboSummary() {
    const picked = {};
    let selected = [];
    let total = 0;
    let watts = 0;

    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (!sel || !sel.value) return;
      const p = prod(sel.value);
      if (!p) return;
      picked[slot.sec] = p;
      selected.push(p);
      if (p.price != null) total += p.price;
      if (slot.sec === "processors") watts += (detectCpuSpec(p) || {}).watts || slot.watts;
      else if (slot.sec === "vga-cards") watts += detectGpuWatts(p);
      else watts += slot.watts;
    });

    const recPsu = watts > 0 ? Math.max(450, Math.ceil((watts * 1.38) / 50) * 50) : 0;
    const discount = selected.length >= 5 ? 2500 : selected.length >= 3 ? 1000 : 0;
    const netTotal = Math.max(0, total - discount);

    // Run real compatibility checks
    const issues = [];
    const notes = [];
    const cpuSp = detectCpuSpec(picked.processors);
    const mbSp = detectMbSpec(picked.motherboards);
    const ramSp = detectRamSpec(picked.ram);
    const psuW = picked["power-supply"] ? detectPsuWatts(picked["power-supply"]) : 0;

    if (cpuSp && mbSp && cpuSp.socket && mbSp.socket) {
      if (cpuSp.socket !== mbSp.socket) {
        issues.push("Socket mismatch: CPU (" + cpuSp.socket + ") does not fit Motherboard (" + mbSp.socket + ").");
      } else {
        notes.push("Socket " + cpuSp.socket + " matched");
      }
    }
    if (mbSp && ramSp && mbSp.ddr && ramSp.ddr) {
      if (mbSp.ddr !== ramSp.ddr) {
        issues.push("Memory mismatch: Motherboard requires " + mbSp.ddr + " but selected RAM is " + ramSp.ddr + ".");
      } else {
        notes.push(mbSp.ddr + " memory matched");
      }
    }
    if (ramSp && ramSp.isLaptop && picked.motherboards) {
      issues.push("Form factor warning: Selected RAM is Laptop SO-DIMM and won't fit a desktop motherboard.");
    }
    if (psuW > 0 && recPsu > 0) {
      if (psuW < recPsu) {
        issues.push("Power warning: Selected " + psuW + "W PSU is below the recommended " + recPsu + "W for this load.");
      } else {
        notes.push(psuW + "W PSU sufficient");
      }
    }

    const compatBox = $("#combo-compat-box");
    if (compatBox) {
      if (selected.length === 0) {
        compatBox.className = "ne-compat-box is-neutral";
        compatBox.innerHTML =
          '<div class="ne-compat-head"><span class="material-symbols-outlined">verified_user</span><strong>Compatibility Check Ready</strong></div>' +
          "<p>Pick a CPU, Motherboard &amp; RAM to verify socket, DDR type, and PSU headroom.</p>";
      } else if (issues.length > 0) {
        compatBox.className = "ne-compat-box is-warn";
        compatBox.innerHTML =
          '<div class="ne-compat-head"><span class="material-symbols-outlined">warning</span><strong>' +
          issues.length +
          " Compatibility Issue" +
          (issues.length > 1 ? "s" : "") +
          " Detected</strong></div><ul>" +
          issues.map((m) => "<li>" + esc(m) + "</li>").join("") +
          "</ul>";
      } else {
        compatBox.className = "ne-compat-box is-ok";
        compatBox.innerHTML =
          '<div class="ne-compat-head"><span class="material-symbols-outlined">check_circle</span><strong>All Selected Parts Compatible ✓</strong></div>' +
          "<p>" +
          (notes.length ? esc(notes.join(" · ")) : "No socket, memory, or wattage conflicts detected.") +
          "</p>";
      }
    }

    const cntEl = $("#combo-selected-count");
    const wattEl = $("#combo-wattage");
    const recEl = $("#combo-rec-psu");
    const savEl = $("#combo-savings");
    const totEl = $("#combo-total");
    const waEl = $("#combo-wa-btn");

    if (cntEl) cntEl.textContent = selected.length + " / " + COMBO_SLOTS.length;
    if (wattEl) wattEl.textContent = watts + " W";
    if (recEl) recEl.textContent = recPsu ? recPsu + "W+ PSU" : "—";
    if (savEl) savEl.textContent = discount ? "-" + fmtLKR(discount) : "0 LKR";
    if (totEl) totEl.textContent = fmtLKR(netTotal);

    if (waEl) {
      const msg = selected.length
        ? "Hello Aqua PC Parts! I built a custom PC Combo on your site:\n" +
          selected.map((p, i) => i + 1 + ". " + p.name + (p.sku ? " [" + p.sku + "]" : "") + " (" + fmtLKR(p.price) + ")").join("\n") +
          "\n• Est. Load: " +
          watts +
          "W (Rec. " +
          recPsu +
          "W+ PSU)\n• Compatibility: " +
          (issues.length ? issues.join(" | ") : "Verified Compatible") +
          "\n• Bundle Estimate: " +
          fmtLKR(netTotal)
        : "Hello Aqua PC Parts, I'd like help picking a custom PC build!";
      waEl.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
    }
  }

  function applyComboPreset(mode) {
    if (mode === "clear") {
      COMBO_SLOTS.forEach((slot) => {
        const sel = $("#" + slot.elId);
        if (sel) sel.value = "";
      });
      refreshDependentComboSlots();
      updateComboSummary();
      return;
    }

    const cpus = PRODUCTS.filter((p) => p.sec === "processors" && p.inStock && p.price != null);
    const mbs = PRODUCTS.filter((p) => p.sec === "motherboards" && p.inStock && p.price != null);
    const rams = PRODUCTS.filter((p) => p.sec === "ram" && p.inStock && p.price != null && !(detectRamSpec(p) || {}).isLaptop);
    const gpus = PRODUCTS.filter((p) => p.sec === "vga-cards" && p.inStock && p.price != null).sort((a, b) => a.price - b.price);
    const stores = PRODUCTS.filter((p) => p.sec === "storage" && p.inStock && p.price != null).sort((a, b) => a.price - b.price);
    const psus = PRODUCTS.filter((p) => p.sec === "power-supply" && p.inStock && p.price != null).sort((a, b) => detectPsuWatts(a) - detectPsuWatts(b));

    // Find compatible CPU + MB + Desktop RAM triples
    const triples = [];
    cpus.forEach((cpu) => {
      const cs = detectCpuSpec(cpu);
      if (!cs || !cs.socket) return;
      const mb = mbs.find((m) => (detectMbSpec(m) || {}).socket === cs.socket);
      if (!mb) return;
      const ms = detectMbSpec(mb);
      const ram = rams.find((r) => !ms.ddr || (detectRamSpec(r) || {}).ddr === ms.ddr);
      if (!ram) return;
      triples.push({ cpu, mb, ram, total: cpu.price + mb.price + ram.price });
    });
    triples.sort((a, b) => a.total - b.total);

    const chosen = triples.length
      ? triples[mode === "gaming" ? Math.min(triples.length - 1, Math.floor(triples.length * 0.78)) : Math.floor(triples.length * 0.25)]
      : null;

    if (chosen) {
      if ($("#combo-cpu")) $("#combo-cpu").value = chosen.cpu.id;
      refreshDependentComboSlots();
      if ($("#combo-mb")) $("#combo-mb").value = chosen.mb.id;
      refreshDependentComboSlots();
      if ($("#combo-ram")) $("#combo-ram").value = chosen.ram.id;
    }

    const gpuPick = gpus.length
      ? gpus[mode === "gaming" ? Math.min(gpus.length - 1, Math.floor(gpus.length * 0.75)) : Math.floor(gpus.length * 0.15)]
      : null;
    if ($("#combo-gpu") && gpuPick) $("#combo-gpu").value = gpuPick.id;

    const storePick = stores.length
      ? stores[mode === "gaming" ? Math.min(stores.length - 1, Math.floor(stores.length * 0.65)) : Math.floor(stores.length * 0.25)]
      : null;
    if ($("#combo-storage") && storePick) $("#combo-storage").value = storePick.id;

    const estWatts =
      ((chosen && detectCpuSpec(chosen.cpu).watts) || 65) +
      40 +
      (gpuPick ? detectGpuWatts(gpuPick) : 0) +
      22;
    const minPsu = Math.max(450, Math.ceil((estWatts * 1.38) / 50) * 50);
    const psuPick = psus.find((x) => detectPsuWatts(x) >= minPsu) || psus[psus.length - 1];
    if ($("#combo-psu") && psuPick) $("#combo-psu").value = psuPick.id;

    if ($("#combo-monitor")) $("#combo-monitor").value = "";
    updateComboSummary();
  }

  // ───────── Verified SKU & Warranty Lookup ─────────
  function runWarrantyLookup(rawSku) {
    const host = $("#warranty-lookup-result");
    if (!host) return;
    const clean = String(rawSku || "").trim().toUpperCase();
    if (!clean) {
      host.hidden = true;
      return;
    }
    const found =
      PRODUCTS.find((p) => String(p.sku || "").toUpperCase() === clean) ||
      PRODUCTS.find((p) => String(p.sku || "").toUpperCase().includes(clean));

    host.hidden = false;
    if (!found) {
      host.innerHTML =
        '<div class="ne-war-not-found"><span class="material-symbols-outlined">search_off</span>' +
        '<div><strong>No matching SKU found for "' +
        esc(clean) +
        '"</strong><p>Check the SKU printed beneath any product title (e.g. <code>AQ-VGA-0001</code>) or contact our Embilipitiya lab on +94 78 819 4535.</p></div></div>';
      return;
    }
    const report = getBenchTestReport(found);
    host.innerHTML =
      '<div class="ne-war-found">' +
      '<div class="ne-war-left">' +
      '<img src="' + esc(found.img) + '" onerror="this.onerror=null;this.src=\'' + esc(found.fallbackImg) + '\'" alt="' + esc(found.name) + '" />' +
      "<div>" +
      '<span class="ne-war-badge">✔ VERIFIED AQUA INVENTORY · ' + esc(found.sku) + "</span>" +
      "<h4>" + esc(found.name) + "</h4>" +
      "<p>" + esc(found.secLabel) + " · <b>" + (found.price != null ? fmtLKR(found.price) : "Call for Price") + "</b> · " +
      (found.inStock ? "In Stock" : "Out of Stock") + " · " + esc(found.warranty) + "</p>" +
      "</div></div>" +
      '<div class="ne-war-meta">' +
      report.rows.slice(1, 3).map((r) => "<span><b>" + esc(r[0]) + ":</b> " + esc(r[1]) + "</span>").join("") +
      '<button type="button" class="ne-btn ne-btn-navy ne-btn-sm" data-qv="' + esc(found.id) + '">Open Lab Report &amp; Quick View</button>' +
      "</div></div>";
  }

  // ───────── Filters & State ─────────
  const F = {
    div: "all",
    cat: "",
    sub: "",
    q: "",
    searchMode: "name", // "name" | "sku"
    min: null,
    max: null,
    stock: false,
    priced: false,
    sort: "default",
    shown: PAGE,
  };
  let filtered = [];

  function apply() {
    const q = F.q.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    filtered = PRODUCTS.filter((p) => {
      if (F.div !== "all" && p.cond !== F.div) return false;
      if (F.cat) {
        if (F.cat === "peripherals") {
          if (!PERIPHERAL_SECS.has(p.sec)) return false;
        } else if (p.sec !== F.cat) {
          return false;
        }
      }
      if (F.sub && p.sub !== F.sub) return false;
      if (F.stock && !p.inStock) return false;
      if (F.priced && p.price == null) return false;
      if (F.min != null && (p.price == null || p.price < F.min)) return false;
      if (F.max != null && (p.price == null || p.price > F.max)) return false;
      if (words.length) {
        if (F.searchMode === "sku") {
          const skuHay = String(p.sku || "").toLowerCase();
          if (!words.every((w) => skuHay.includes(w))) return false;
        } else {
          const hay = (p.name + " " + (p.sku || "") + " " + p.secLabel + " " + p.sub + " " + p.specs).toLowerCase();
          if (!words.every((w) => hay.includes(w))) return false;
        }
      }
      return true;
    });

    const priceKey = (p, dir) => (p.price == null ? (dir > 0 ? Infinity : -1) : p.price);
    if (F.sort === "low") filtered.sort((a, b) => priceKey(a, 1) - priceKey(b, 1));
    else if (F.sort === "high") filtered.sort((a, b) => priceKey(b, -1) - priceKey(a, -1));
    else if (F.sort === "rating") filtered.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    else if (F.sort === "az") filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (F.sort === "sku-az") {
      filtered.sort((a, b) =>
        String(a.sku || "").localeCompare(String(b.sku || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        }) || a.name.localeCompare(b.name)
      );
    }
    else filtered.sort((a, b) => a.order - b.order);

    renderGrid();
  }

  function renderSubcats() {
    const box = $("#f-subcats");
    const activeCat = CATS.find((c) => c.id === F.cat);
    if (!activeCat || activeCat.subcats.length <= 1) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML =
      '<button type="button" data-sub="" class="' + (F.sub === "" ? "on" : "") + '">All ' + esc(activeCat.label) + "</button>" +
      activeCat.subcats
        .map(
          (s) =>
            '<button type="button" data-sub="' + esc(s.name) + '" class="' + (F.sub === s.name ? "on" : "") + '">' +
            esc(s.name) + " (" + s.count + ")</button>"
        )
        .join("");
  }

  function renderGrid() {
    const slice = filtered.slice(0, F.shown);
    $("#grid").innerHTML = slice.map(productCard).join("");
    $("#result-count").textContent = filtered.length + " result" + (filtered.length === 1 ? "" : "s");
    $("#empty").hidden = filtered.length > 0;
    $("#load-more-wrap").hidden = filtered.length <= F.shown;

    const activeCatObj = CATS.find((c) => c.id === F.cat);
    const titleText = activeCatObj
      ? activeCatObj.label
      : F.cat === "peripherals"
      ? "Peripherals, Mice, Keyboards & Audio"
      : F.div === "new"
      ? "Brand New Parts & Accessories"
      : F.div === "used"
      ? "Certified Used Bench-Tested Hardware"
      : "All PC Parts";
    $("#active-cat-title").textContent = titleText;
    const crumb = $("#catalog-crumb");
    if (crumb) crumb.textContent = titleText;

    renderSubcats();

    $$("#side-cats li, #mobile-cats li").forEach((li) => {
      const a = li.querySelector("a");
      li.classList.toggle("active", Boolean(a && a.dataset.cat === F.cat));
    });
    $$(".ne-facet-dept-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.cat === F.cat);
    });

    const stockToggle = $("#f-stock-toggle");
    const pricedToggle = $("#f-priced-toggle");
    if (stockToggle) stockToggle.checked = F.stock;
    if (pricedToggle) pricedToggle.checked = F.priced;

    $$("[data-quick]").forEach((btn) => {
      const mode = btn.dataset.quick;
      const on =
        (mode === "all" && F.div === "all" && !F.stock && !F.priced) ||
        (mode === "used" && F.div === "used") ||
        (mode === "new" && F.div === "new") ||
        (mode === "instock" && F.stock) ||
        (mode === "priced" && F.priced);
      if (btn.parentElement && btn.parentElement.tagName === "LI") {
        btn.parentElement.classList.toggle("active", on);
      } else {
        btn.classList.toggle("active", on);
      }
    });

    const chips = [];
    if (F.cat) {
      chips.push([
        "cat",
        activeCatObj
          ? activeCatObj.label
          : F.cat === "peripherals"
          ? "Peripherals, Mice, Keyboards & Audio"
          : F.cat,
      ]);
    }
    if (F.sub) chips.push(["sub", F.sub]);
    if (F.div !== "all") chips.push(["div", F.div === "new" ? "Brand New" : "Used · 06M Warranty"]);
    if (F.stock) chips.push(["stock", "In Stock Only"]);
    if (F.priced) chips.push(["priced", "Priced Only"]);
    if (F.min != null || F.max != null) {
      chips.push(["price", (F.min || 0).toLocaleString() + " – " + (F.max ? F.max.toLocaleString() : "∞") + " LKR"]);
    }
    if (F.q) chips.push(["q", (F.searchMode === "sku" ? "SKU: " : "") + "“" + F.q + "”"]);

    $("#chips").innerHTML = chips
      .map(([k, l]) => '<button type="button" class="chip" data-chip="' + k + '">' + esc(l) + ' <span class="material-symbols-outlined">close</span></button>')
      .join("");
  }

  function syncUrlState() {
    try {
      const url = new URL(window.location.href);
      if (F.cat) url.searchParams.set("category", F.cat);
      else url.searchParams.delete("category");
      url.searchParams.delete("cat");
      if (F.div && F.div !== "all") url.searchParams.set("condition", F.div);
      else url.searchParams.delete("condition");
      url.searchParams.delete("div");
      if (F.q) url.searchParams.set("q", F.q);
      else url.searchParams.delete("q");
      if (F.q && F.searchMode === "sku") url.searchParams.set("mode", "sku");
      else url.searchParams.delete("mode");
      url.searchParams.delete("search");
      window.history.replaceState({}, "", url.toString());
    } catch (_) {}
  }

  function setFilters(patch, scroll) {
    if (patch.cat !== undefined && patch.cat !== F.cat && patch.sub === undefined) {
      patch.sub = "";
    }
    Object.assign(F, patch, { shown: PAGE });
    syncUrlState();
    apply();
    if (scroll) $("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ───────── Populate Sidebars, Visual Category Tiles, Search & Deals Tabs ─────────
  function renderStatic() {
    const catListHtml =
      '<li class="ty-catListItem"><a href="#shop" data-cat="">' +
      '<div class="ty-catIconWrap"><span class="material-symbols-outlined" style="font-size:16px;color:#071138">apps</span></div>' +
      '<div class="ty-catTitle"><span>All Hardware</span><em>' +
      PRODUCTS.length +
      "</em></div></a></li>" +
      CATS.map(
        (c) =>
          '<li class="ty-catListItem"><a href="#shop" data-cat="' + esc(c.id) + '">' +
          '<div class="ty-catIconWrap"><img src="' + esc(c.iconImg) + '" alt="' + esc(c.label) + '" /></div>' +
          '<div class="ty-catTitle"><span>' + esc(c.label) + "</span><em>" + c.count + "</em></div>" +
          "</a></li>"
      ).join("");

    $("#side-cats").innerHTML = catListHtml;
    $("#mobile-cats").innerHTML = catListHtml;

    const facetDepts = $("#facet-depts");
    if (facetDepts) {
      facetDepts.innerHTML =
        '<li><button type="button" class="ne-facet-dept-btn" data-cat=""><span>All Departments</span><em>' +
        PRODUCTS.length +
        "</em></button></li>" +
        CATS.map(
          (c) =>
            '<li><button type="button" class="ne-facet-dept-btn" data-cat="' +
            esc(c.id) +
            '"><span>' +
            esc(c.label) +
            "</span><em>" +
            c.count +
            "</em></button></li>"
        ).join("");
    }

    const catTiles = $("#ne-cat-tiles");
    if (catTiles) {
      catTiles.innerHTML = CATS.slice(0, 12)
        .map(
          (c) =>
            '<a href="#shop" class="ne-cat-tile" data-cat="' +
            esc(c.id) +
            '"><div class="ne-cat-tile-img"><img src="' +
            esc(c.iconImg) +
            '" alt="' +
            esc(c.label) +
            '" /></div><strong>' +
            esc(c.label) +
            "</strong><small>" +
            c.count +
            " items</small><em>" +
            (c.minPrice != null ? "From " + fmtLKR(c.minPrice) : "Live Quote") +
            "</em></a>"
        )
        .join("");
    }

    const sel = $("#search-cat");
    const cur = sel.value;
    sel.innerHTML =
      '<option value="">All Depts (' + PRODUCTS.length + ")</option>" +
      CATS.map((c) => '<option value="' + c.id + '">' + esc(c.label) + " (" + c.count + ")</option>").join("");
    sel.value = cur;

    // 4 Deal Showcase Panels
    const priced = PRODUCTS.filter((p) => p.price != null && p.inStock);
    const specialPicks = [
      ...priced.filter((p) => p.sec === "vga-cards").slice(0, 2),
      ...priced.filter((p) => p.sec === "processors").slice(0, 2),
      ...priced.filter((p) => p.cond === "new").slice(0, 4),
    ].slice(0, 8);
    const featuredPicks = [
      ...priced.filter((p) => p.sec === "vga-cards").slice(4, 6),
      ...priced.filter((p) => p.sec === "motherboards").slice(0, 2),
      ...priced.filter((p) => p.sec === "monitors").slice(0, 2),
      ...priced.filter((p) => p.sec === "ram").slice(0, 2),
    ].slice(0, 8);
    const gpuCpuPicks = [
      ...priced.filter((p) => p.sec === "vga-cards").slice(-4),
      ...priced.filter((p) => p.sec === "processors").slice(-4),
    ].slice(0, 8);
    const brandNewPicks = PRODUCTS.filter((p) => p.cond === "new" && p.inStock).slice(0, 8);

    $("#row-special").innerHTML = specialPicks.map(productCard).join("");
    $("#row-featured").innerHTML = featuredPicks.map(productCard).join("");
    if ($("#row-gpucpu")) $("#row-gpucpu").innerHTML = gpuCpuPicks.map(productCard).join("");
    if ($("#row-brandnew")) $("#row-brandnew").innerHTML = brandNewPicks.map(productCard).join("");
  }

  // ───────── Hero Slider ─────────
  function slider() {
    const track = $("#slides-track");
    const n = track.children.length;
    let i = 0;
    let timer;
    const dots = $("#dots");
    dots.innerHTML = Array.from({ length: n }, (_, k) => '<li><button type="button" aria-label="Slide ' + (k + 1) + '"></button></li>').join("");
    const go = (k) => {
      i = (k + n) % n;
      track.style.transform = "translateX(" + -i * 100 + "%)";
      $$("#dots button").forEach((d, x) => d.classList.toggle("on", x === i));
    };
    const auto = () => {
      clearInterval(timer);
      timer = setInterval(() => go(i + 1), 5500);
    };
    $("#sl-prev").onclick = () => { go(i - 1); auto(); };
    $("#sl-next").onclick = () => { go(i + 1); auto(); };
    $$("#dots button").forEach((d, x) => (d.onclick = () => { go(x); auto(); }));
    go(0);
    auto();
  }

  // ───────── Instant Search & Fullscreen Search Modal ─────────
  function suggest() {
    const input = $("#search-input");
    const box = $("#suggest");
    const sel = $("#search-cat");
    const clr = $("#search-clear");

    const syncClear = () => {
      if (clr) clr.hidden = !input.value.trim();
    };

    const run = () => {
      syncClear();
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        box.hidden = true;
        return;
      }
      const words = q.split(/\s+/);
      const hits = PRODUCTS.filter(
        (p) => (!sel.value || p.sec === sel.value) && words.every((w) => (p.name + " " + (p.sku || "") + " " + p.sub + " " + p.secLabel).toLowerCase().includes(w))
      ).slice(0, 7);
      box.innerHTML = hits.length
        ? hits
            .map(
              (p) =>
                '<button type="button" data-q="' + esc(p.name) + '"><img src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="" />' +
                '<span class="suggest-meta"><strong>' + esc(p.name) + "</strong><small>" +
                esc(p.secLabel) + " · " + esc(p.warranty) + "</small></span><b>" +
                (p.price != null ? fmtLKR(p.price) : "Call") + "</b></button>"
            )
            .join("")
        : '<div class="nores">No matches found — try a broader term or ask Rose AI below</div>';
      box.hidden = false;
    };

    input.addEventListener("input", run);
    if (clr) {
      clr.addEventListener("click", () => {
        input.value = "";
        syncClear();
        box.hidden = true;
        setFilters({ q: "" });
      });
    }

    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      input.value = b.dataset.q;
      syncClear();
      box.hidden = true;
      setFilters({ q: b.dataset.q, cat: sel.value }, true);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#search-form")) box.hidden = true;
    });
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      box.hidden = true;
      setFilters({ q: input.value, searchMode: "name", cat: sel.value }, true);
    });

    // Fullscreen Search Modal with Name / SKU Toggle
    const modal = $("#search-modal");
    const mIn = $("#modal-search-input");
    const mRes = $("#modal-search-results");
    const mHint = $("#modal-search-hint");
    const mModeWrap = $("#modal-search-mode");
    let modalSearchMode = F.searchMode === "sku" ? "sku" : "name";

    const syncModalModeUI = () => {
      if (mModeWrap) {
        mModeWrap.querySelectorAll("[data-search-mode]").forEach((btn) => {
          const active = btn.dataset.searchMode === modalSearchMode;
          btn.classList.toggle("active", active);
          btn.setAttribute("aria-checked", active ? "true" : "false");
        });
      }
      if (mIn) {
        mIn.placeholder =
          modalSearchMode === "sku"
            ? "Enter SKU code (e.g. AQ-MON-0001, AQ-VGA-0012, AQ-BNM-0001)…"
            : "Type GPU, CPU, Motherboard, RAM, SSD, Monitor…";
      }
      if (mHint) {
        mHint.innerHTML =
          modalSearchMode === "sku"
            ? "Searching strictly by inventory <strong>SKU</strong> code (e.g. <strong>AQ-VGA-0001</strong>)."
            : "Searching product names, categories &amp; models. Switch to <strong>By SKU</strong> for exact inventory code lookup.";
      }
    };

    const openModal = () => {
      modalSearchMode = F.searchMode === "sku" ? "sku" : "name";
      modal.hidden = false;
      mIn.value = input.value;
      syncModalModeUI();
      renderModal();
      setTimeout(() => mIn.focus(), 50);
    };
    const closeModal = () => { modal.hidden = true; };
    const renderModal = () => {
      const q = mIn.value.trim().toLowerCase();
      const words = q.split(/\s+/).filter(Boolean);
      const hits = (words.length
        ? PRODUCTS.filter((p) => {
            if (modalSearchMode === "sku") {
              const skuHay = String(p.sku || "").toLowerCase();
              return words.every((w) => skuHay.includes(w));
            }
            const nameHay = (p.name + " " + p.secLabel + " " + p.sub).toLowerCase();
            return words.every((w) => nameHay.includes(w));
          })
        : PRODUCTS.filter((p) => p.price != null && p.inStock)
      ).slice(0, 8);

      if (!hits.length) {
        mRes.innerHTML =
          '<li class="nt-modal-empty">' +
          (modalSearchMode === "sku"
            ? 'No inventory items match SKU “' + esc(mIn.value.trim()) + '”. Try a prefix like AQ-MON or AQ-VGA.'
            : 'No products match “' + esc(mIn.value.trim()) + '”. Try another name or switch to By SKU.') +
          "</li>";
        return;
      }

      const isSkuMatch = modalSearchMode === "sku" && words.length > 0;

      mRes.innerHTML = hits
        .map((p, idx) => {
          const pickVal = modalSearchMode === "sku" && p.sku ? p.sku : p.name;
          const exactSku = isSkuMatch && String(p.sku || "").toLowerCase() === q;
          const liCls = isSkuMatch
            ? ' class="nt-sku-match-row' + (exactSku ? " is-exact-sku" : "") + '" style="--row-idx:' + idx + '"'
            : "";
          return (
            "<li" + liCls + '><button type="button" data-mq="' + esc(pickVal) + '">' +
            '<img src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="" />' +
            '<div class="nt-modal-res-info"><strong>' + esc(p.name) + "</strong>" +
            '<span class="nt-modal-res-sku' + (modalSearchMode === "sku" ? " is-sku-focus" : "") + '">SKU: ' + esc(p.sku || "N/A") + " · " + esc(p.secLabel) + "</span></div>" +
            '<span class="nt-modal-res-price">' + (p.price != null ? fmtLKR(p.price) : "Call") + "</span></button></li>"
          );
        })
        .join("");
    };

    const submitModalSearch = (value) => {
      input.value = value;
      syncClear();
      closeModal();
      setFilters({ q: value, searchMode: modalSearchMode, cat: "" }, true);
    };

    if (mModeWrap) {
      mModeWrap.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-search-mode]");
        if (!btn) return;
        modalSearchMode = btn.dataset.searchMode === "sku" ? "sku" : "name";
        syncModalModeUI();
        renderModal();
        mIn.focus();
      });
    }

    $("#search-modal-open").addEventListener("click", openModal);
    $("#search-modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    mIn.addEventListener("input", renderModal);
    mIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitModalSearch(mIn.value);
      }
    });
    $("#modal-search-go").addEventListener("click", () => {
      submitModalSearch(mIn.value);
    });
    mRes.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mq]");
      if (!b) return;
      submitModalSearch(b.dataset.mq);
    });
  }

  // ───────── Rose AI Multi-Turn Gemini Hardware Assistant ─────────
  function initRose() {
    const fab = $("#rose-fab");
    const panel = $("#rose-panel");
    const closeBtn = $("#rose-close");
    const resetBtn = $("#rose-reset");
    const modelSel = $("#rose-model");
    const msgs = $("#rose-msgs");
    const form = $("#rose-form");
    const input = $("#rose-input");
    const sendBtn = $("#rose-send");

    let chatHistory = [];
    let previousInteractionId = null;
    let isSending = false;

    function addMsg(html, who) {
      const div = document.createElement("div");
      div.className = "rmsg " + who;
      div.innerHTML = html;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function formatRoseMarkdown(text) {
      const safe = esc(String(text || "").trim());
      if (!safe) return "";
      const withBold = safe
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      const lines = withBold.split(/\r?\n/);
      let html = "";
      let inList = false;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (/^[-*•]\s+/.test(line)) {
          if (!inList) {
            html += "<ul>";
            inList = true;
          }
          html += "<li>" + line.replace(/^[-*•]\s+/, "") + "</li>";
        } else {
          if (inList) {
            html += "</ul>";
            inList = false;
          }
          if (line) html += "<p>" + line + "</p>";
        }
      }
      if (inList) html += "</ul>";
      return html;
    }

    function findRelevantCatalog(raw) {
      const q = raw.trim().toLowerCase();
      let maxPrice = null;
      const m = q.match(/(?:under|below|less than|<)\s*(\d+(?:,\d{3})*)\s*(k)?/i);
      if (m) maxPrice = Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);

      const stop = new Set([
        "price", "prices", "under", "below", "less", "than", "for", "how", "much",
        "is", "the", "a", "an", "any", "show", "me", "budget", "in", "stock",
        "parts", "details", "new", "best", "suggest", "balanced", "using", "your",
        "with", "and", "or", "lkr", "rs", "tell", "about", "what", "can", "you",
        "compatible", "build", "gaming", "pc", "do", "have", "need"
      ]);
      const alias = {
        gpu: "vga",
        gpus: "vga",
        graphics: "vga",
        cpu: "processor",
        cpus: "processor",
        intel: "core",
        mobo: "motherboard",
        mobos: "motherboard",
        mice: "mouse",
        ssd: "storage",
        nvme: "storage",
        psu: "power",
      };
      const tokens = q
        .replace(/[<>,?.!()]/g, " ")
        .split(/\s+/)
        .filter((w) => w && !stop.has(w) && !/^\d+k?$/.test(w))
        .map((w) => alias[w] || w);

      const scored = [];
      for (const p of PRODUCTS) {
        if (maxPrice !== null && (p.price == null || p.price > maxPrice)) continue;
        if (q.includes("brand new") && p.cond !== "new") continue;
        const hay = (p.name + " " + p.sku + " " + p.secLabel + " " + p.sub).toLowerCase();
        let score = 0;
        if (p.sku && q.includes(p.sku.toLowerCase())) score += 10;
        for (const t of tokens) {
          if (hay.includes(t)) score += 2;
        }
        if (tokens.length === 0 && maxPrice !== null) score = 1;
        if (score > 0) scored.push({ p, score });
      }

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.p.price == null ? 9e9 : a.p.price) - (b.p.price == null ? 9e9 : b.p.price);
      });

      return {
        maxPrice,
        matches: scored.slice(0, 8).map((s) => s.p),
      };
    }

    function renderProductCards(matches) {
      if (!matches || !matches.length) return "";
      return (
        '<div class="rose-cards">' +
        matches
          .slice(0, 4)
          .map(
            (p) =>
              '<button type="button" class="rose-item" data-rose-find="' + esc(p.name) + '"><span>' +
              esc(p.name) + "</span><b>" + (p.price != null ? fmtLKR(p.price) : "Call") + "</b></button>"
          )
          .join("") +
        "</div>"
      );
    }

    function localFallbackAnswer(raw, maxPrice, matches) {
      const q = raw.trim().toLowerCase();
      if (/warranty|guarant|test/.test(q)) {
        addMsg(
          "All bench-tested used parts carry a <strong>06-Month Written Testing Warranty</strong>. Brand new peripherals include <strong>Store / Agent Warranty</strong>.",
          "bot"
        );
        return;
      }
      if (/deliver|courier|ship|location|address|where|embilipitiya/.test(q)) {
        addMsg(
          "Our workshop is in <strong>Embilipitiya, Sri Lanka</strong> (Mon–Sat). ESD-safe islandwide delivery available.<br/><a class='rose-wa-link' target='_blank' rel='noopener' href='https://wa.me/" +
            PHONE + "?text=" + encodeURIComponent("Hi, I'd like delivery details from Embilipitiya.") + "'>Ask on WhatsApp →</a>",
          "bot"
        );
        return;
      }
      if (!matches.length) {
        addMsg(
          "No exact match found for <strong>" + esc(raw) +
            "</strong>. Confirm availability with our technicians on WhatsApp:<br/><a class='rose-wa-link' target='_blank' rel='noopener' href='https://wa.me/" +
            PHONE + "?text=" + encodeURIComponent("Hi Aqua PC Parts, looking for: " + raw) + "'>Chat on WhatsApp →</a>",
          "bot"
        );
        return;
      }
      addMsg(
        "Closest catalog matches" + (maxPrice ? " (under " + fmtLKR(maxPrice) + ")" : "") + ":" +
          renderProductCards(matches),
        "bot"
      );
    }

    function showWelcome() {
      addMsg(
        "Hi! I'm <strong>Rose AI</strong>, your Aqua PC Parts hardware advisor. Ask me multi-turn questions about custom builds, socket compatibility, SKU pricing, or parts under your LKR budget.",
        "bot"
      );
    }

    function resetChat() {
      chatHistory = [];
      previousInteractionId = null;
      msgs.innerHTML = "";
      showWelcome();
      if (input) input.focus();
    }

    function toggle(force) {
      const open = force !== undefined ? force : panel.hidden;
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      if (open && msgs.children.length === 0) {
        showWelcome();
      }
      if (open && input) setTimeout(() => input.focus(), 60);
    }

    async function answer(raw) {
      const trimmed = raw.trim();
      if (!trimmed || isSending) return;

      isSending = true;
      if (sendBtn) sendBtn.disabled = true;
      addMsg(esc(trimmed), "user");

      const { maxPrice, matches } = findRelevantCatalog(trimmed);
      const typingBubble = addMsg(
        '<span class="rose-typing-dots"><span></span><span></span><span></span></span> Thinking with Gemini…',
        "bot typing"
      );

      const selectedModel = modelSel ? modelSel.value : "gemini-4-hydrogen";
      const catalogContext = matches.map((p) => ({
        name: p.name,
        sku: p.sku,
        price: p.price,
        cond: p.cond,
        inStock: p.inStock,
      }));

      try {
        const res = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: chatHistory.slice(-10),
            previousInteractionId,
            model: selectedModel,
            catalogContext,
          }),
        });

        const data = await res.json().catch(() => ({}));
        typingBubble.remove();

        if (!res.ok || !data.ok || !data.reply) {
          throw new Error(data.error || "Gemini chat unavailable");
        }

        chatHistory.push({ role: "user", text: trimmed });
        chatHistory.push({ role: "model", text: data.reply });
        if (chatHistory.length > 16) chatHistory = chatHistory.slice(-16);
        if (data.interactionId) previousInteractionId = data.interactionId;

        const modelTag =
          data.model === "gemini-3.1-flash-lite" ? "Gemini 3.1 Flash Lite" : "Gemini 4 Hydrogen";
        addMsg(
          formatRoseMarkdown(data.reply) +
            renderProductCards(matches) +
            '<div class="rose-meta-badge">' + esc(modelTag) + "</div>",
          "bot"
        );
      } catch (_err) {
        typingBubble.remove();
        localFallbackAnswer(trimmed, maxPrice, matches);
      } finally {
        isSending = false;
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
      }
    }

    fab.addEventListener("click", () => toggle());
    closeBtn.addEventListener("click", () => toggle(false));
    if (resetBtn) resetBtn.addEventListener("click", () => resetChat());
    if (modelSel) {
      modelSel.addEventListener("change", () => {
        // Switching models starts a fresh interaction thread while keeping local history
        previousInteractionId = null;
      });
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!input.value.trim() || isSending) return;
      const val = input.value;
      input.value = "";
      answer(val);
    });
    panel.addEventListener("click", (e) => {
      const rq = e.target.closest("[data-rq]");
      if (rq && !isSending) answer(rq.dataset.rq);
      const rf = e.target.closest("[data-rose-find]");
      if (rf) {
        $("#search-input").value = rf.dataset.roseFind;
        setFilters({ q: rf.dataset.roseFind, cat: "", div: "all" }, true);
      }
    });
  }

  // ───────── Grid / List View Mode ─────────
  function setViewMode(mode) {
    const isList = mode === "list";
    const grid = $("#grid");
    if (grid) grid.classList.toggle("is-list-view", isList);
    if ($("#view-grid")) $("#view-grid").classList.toggle("active", !isList);
    if ($("#view-list")) $("#view-list").classList.toggle("active", isList);
    try {
      localStorage.setItem(VIEW_KEY, isList ? "list" : "grid");
    } catch (_) {}
  }

  function resetAllFilters() {
    if ($("#pmin")) $("#pmin").value = "";
    if ($("#pmax")) $("#pmax").value = "";
    if ($("#sort")) $("#sort").value = "default";
    if ($("#search-input")) $("#search-input").value = "";
    if ($("#search-clear")) $("#search-clear").hidden = true;
    $$("[data-price-bracket]").forEach((b) => b.classList.remove("active"));
    setFilters({
      div: "all",
      cat: "",
      sub: "",
      q: "",
      min: null,
      max: null,
      stock: false,
      priced: false,
      sort: "default",
    });
  }

  // ───────── Global Event Binding ─────────
  function bind() {
    function setOffcanvas(open) {
      $("#offcanvas-nav").classList.toggle("open", open);
      $("#offcanvas-overlay").classList.toggle("open", open);
    }

    document.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        addToCart(add.dataset.add);
        return;
      }

      const qv = e.target.closest("[data-qv]");
      if (qv) {
        openQuickView(qv.dataset.qv);
        return;
      }

      const cmpRm = e.target.closest("[data-compare-remove]");
      if (cmpRm) {
        compareIds = compareIds.filter((id) => id !== cmpRm.dataset.compareRemove);
        syncCompareUI();
        return;
      }

      const link = e.target.closest("a[data-cat], a[data-div], button.ne-facet-dept-btn[data-cat]");
      if (link) {
        e.preventDefault();
        const patch = {};
        if (link.dataset.cat !== undefined) patch.cat = link.dataset.cat;
        if (link.dataset.div) {
          patch.div = link.dataset.div;
          if (link.dataset.cat === undefined) patch.cat = "";
        } else if (link.dataset.cat) {
          patch.div = "all";
        }
        patch.q = "";
        patch.searchMode = "name";
        $("#search-input").value = "";
        if ($("#search-clear")) $("#search-clear").hidden = true;
        setFilters(patch, true);
        setOffcanvas(false);
        return;
      }

      const qBtn = e.target.closest("[data-q]");
      if (qBtn && qBtn.closest(".qty")) {
        const row = cart.find((c) => c.id === qBtn.dataset.id);
        if (!row) return;
        row.qty += Number(qBtn.dataset.q);
        if (row.qty < 1) cart = cart.filter((c) => c !== row);
        saveCart();
        renderCart();
        return;
      }

      const rm = e.target.closest("[data-rm]");
      if (rm) {
        cart = cart.filter((c) => c.id !== rm.dataset.rm);
        saveCart();
        renderCart();
        return;
      }

      const chip = e.target.closest("[data-chip]");
      if (chip) {
        const k = chip.dataset.chip;
        if (k === "cat") { F.cat = ""; F.sub = ""; }
        if (k === "sub") F.sub = "";
        if (k === "div") F.div = "all";
        if (k === "stock") F.stock = false;
        if (k === "priced") F.priced = false;
        if (k === "price") {
          F.min = null;
          F.max = null;
          if ($("#pmin")) $("#pmin").value = "";
          if ($("#pmax")) $("#pmax").value = "";
          $$("[data-price-bracket]").forEach((b) => b.classList.remove("active"));
        }
        if (k === "q") {
          F.q = "";
          F.searchMode = "name";
          $("#search-input").value = "";
          if ($("#search-clear")) $("#search-clear").hidden = true;
        }
        setFilters({});
      }
    });

    document.addEventListener("change", (e) => {
      const cmp = e.target.closest("[data-compare]");
      if (cmp) toggleCompare(cmp.dataset.compare);
    });

    // Deal Showcase 4-Tab Switcher
    $$(".ty-homeTabs-selectItem").forEach((el) => {
      el.addEventListener("click", () => {
        const t = el.dataset.tab;
        ["special", "featured", "gpucpu", "brandnew"].forEach((name) => {
          const tabEl = $("#tab-" + name);
          const panelEl = $("#panel-" + name);
          if (tabEl) tabEl.classList.toggle("active", t === name);
          if (panelEl) panelEl.classList.toggle("active", t === name);
        });
      });
    });

    // Quick Condition / Filter Buttons
    $$("[data-quick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.quick;
        if (mode === "all") setFilters({ div: "all", stock: false, priced: false });
        else if (mode === "used") setFilters({ div: "used" });
        else if (mode === "new") setFilters({ div: "new" });
        else if (mode === "instock") setFilters({ stock: !F.stock });
        else if (mode === "priced") setFilters({ priced: !F.priced });
      });
    });

    if ($("#f-stock-toggle")) {
      $("#f-stock-toggle").addEventListener("change", (e) => setFilters({ stock: e.target.checked }));
    }
    if ($("#f-priced-toggle")) {
      $("#f-priced-toggle").addEventListener("change", (e) => setFilters({ priced: e.target.checked }));
    }

    $$("[data-price-bracket]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [minS, maxS] = btn.dataset.priceBracket.split("-");
        const minV = Number(minS);
        const maxV = Number(maxS);
        $$("[data-price-bracket]").forEach((b) => b.classList.toggle("active", b === btn));
        $("#pmin").value = minV || "";
        $("#pmax").value = maxV >= 9999999 ? "" : maxV;
        setFilters({ min: minV, max: maxV >= 9999999 ? null : maxV });
      });
    });

    $("#f-subcats").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) setFilters({ sub: b.dataset.sub });
    });
    $("#pmin").addEventListener("input", (e) => setFilters({ min: e.target.value === "" ? null : Number(e.target.value) }));
    $("#pmax").addEventListener("input", (e) => setFilters({ max: e.target.value === "" ? null : Number(e.target.value) }));
    $("#sort").addEventListener("change", (e) => setFilters({ sort: e.target.value }));
    $("#f-reset").addEventListener("click", resetAllFilters);
    if ($("#empty-reset-btn")) $("#empty-reset-btn").addEventListener("click", resetAllFilters);
    $("#load-more").addEventListener("click", () => { F.shown += PAGE; renderGrid(); });

    if ($("#view-grid")) $("#view-grid").addEventListener("click", () => setViewMode("grid"));
    if ($("#view-list")) $("#view-list").addEventListener("click", () => setViewMode("list"));

    // Shell Shocker Next Deal
    if ($("#shocker-next")) {
      $("#shocker-next").addEventListener("click", () => {
        shockerIdx++;
        renderShellShocker();
      });
    }

    // Combo Builder Controls
    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (sel) {
        sel.addEventListener("change", () => {
          if (slot.elId === "combo-cpu" || slot.elId === "combo-mb") {
            refreshDependentComboSlots();
          }
          updateComboSummary();
        });
      }
    });
    if ($("#combo-compat-filter")) {
      $("#combo-compat-filter").addEventListener("change", () => {
        refreshDependentComboSlots();
        updateComboSummary();
      });
    }
    if ($("#combo-preset-gaming")) $("#combo-preset-gaming").addEventListener("click", () => applyComboPreset("gaming"));
    if ($("#combo-preset-budget")) $("#combo-preset-budget").addEventListener("click", () => applyComboPreset("budget"));
    if ($("#combo-preset-clear")) $("#combo-preset-clear").addEventListener("click", () => applyComboPreset("clear"));

    // Verified SKU Warranty Lookup
    if ($("#warranty-lookup-form")) {
      $("#warranty-lookup-form").addEventListener("submit", (e) => {
        e.preventDefault();
        runWarrantyLookup($("#warranty-lookup-input") ? $("#warranty-lookup-input").value : "");
      });
    }
    if ($("#combo-add-all")) {
      $("#combo-add-all").addEventListener("click", () => {
        let added = 0;
        COMBO_SLOTS.forEach((slot) => {
          const sel = $("#" + slot.elId);
          if (sel && sel.value) {
            const p = prod(sel.value);
            if (p) {
              const row = cart.find((c) => c.id === p.id);
              if (row) row.qty++;
              else cart.push({ id: p.id, name: p.name, qty: 1 });
              added++;
            }
          }
        });
        if (!added) {
          toast("Select at least one component in the Combo Builder first.");
          return;
        }
        saveCart();
        renderCart();
        toast("Added " + added + " PC Combo parts to your Cart!");
        drawer(true);
      });
    }

    // Quick-View Modal Controls
    if ($("#qv-close")) $("#qv-close").addEventListener("click", () => ($("#quick-view-modal").hidden = true));
    if ($("#qv-backdrop")) $("#qv-backdrop").addEventListener("click", () => ($("#quick-view-modal").hidden = true));
    if ($("#qv-qty-dec")) {
      $("#qv-qty-dec").addEventListener("click", () => {
        qvState.qty = Math.max(1, qvState.qty - 1);
        $("#qv-qty-val").textContent = String(qvState.qty);
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-qty-inc")) {
      $("#qv-qty-inc").addEventListener("click", () => {
        qvState.qty = Math.min(20, qvState.qty + 1);
        $("#qv-qty-val").textContent = String(qvState.qty);
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-add-cart")) {
      $("#qv-add-cart").addEventListener("click", () => {
        if (qvState.id) addToCart(qvState.id, qvState.qty);
      });
    }
    if ($("#qv-intent-pills")) {
      $("#qv-intent-pills").addEventListener("click", (e) => {
        const b = e.target.closest("[data-qv-intent]");
        if (!b) return;
        qvState.intent = b.dataset.qvIntent;
        $$("#qv-intent-pills .ne-pill").forEach((p) => p.classList.toggle("active", p === b));
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-fulfill-pills")) {
      $("#qv-fulfill-pills").addEventListener("click", (e) => {
        const b = e.target.closest("[data-qv-fulfill]");
        if (!b) return;
        qvState.fulfill = b.dataset.qvFulfill;
        $$("#qv-fulfill-pills .ne-pill").forEach((p) => p.classList.toggle("active", p === b));
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-note")) {
      $("#qv-note").addEventListener("input", (e) => {
        qvState.note = e.target.value;
        updateQuickViewWhatsApp();
      });
    }

    // Compare Modal Controls
    if ($("#compare-open-btn")) $("#compare-open-btn").addEventListener("click", openCompareModal);
    if ($("#compare-now-btn")) $("#compare-now-btn").addEventListener("click", openCompareModal);
    if ($("#compare-clear-btn")) {
      $("#compare-clear-btn").addEventListener("click", () => {
        compareIds = [];
        syncCompareUI();
      });
    }
    if ($("#compare-modal-close")) $("#compare-modal-close").addEventListener("click", () => ($("#compare-modal").hidden = true));
    if ($("#compare-modal-backdrop")) $("#compare-modal-backdrop").addEventListener("click", () => ($("#compare-modal").hidden = true));

    // Cart Drawer
    $("#cart-open").addEventListener("click", () => drawer(true));
    $("#cart-close").addEventListener("click", () => drawer(false));
    $("#overlay").addEventListener("click", () => drawer(false));
    $("#cart-clear").addEventListener("click", () => { cart = []; saveCart(); renderCart(); });
    $("#cart-print").addEventListener("click", printOfficialQuotation);
    if ($("#cart-track-order")) {
      $("#cart-track-order").addEventListener("click", () => {
        drawer(false);
        if (window.AquaAuth) {
          if (window.AquaAuth.getUser()) window.AquaAuth.openPortal("orders");
          else window.AquaAuth.openLogin("signin");
        }
      });
    }

    // Off-Canvas Mobile Category Drawer & Menu
    $("#nav-cat-trigger").addEventListener("click", () => setOffcanvas(true));
    $("#menu-toggle").addEventListener("click", () => setOffcanvas(true));
    $("#offcanvas-close").addEventListener("click", () => setOffcanvas(false));
    $("#offcanvas-overlay").addEventListener("click", () => setOffcanvas(false));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        drawer(false);
        setOffcanvas(false);
        $("#search-modal").hidden = true;
        if ($("#quick-view-modal")) $("#quick-view-modal").hidden = true;
        if ($("#compare-modal")) $("#compare-modal").hidden = true;
      }
    });

    const tt = $("#to-top");
    tt.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener(
      "scroll",
      () => {
        tt.classList.toggle("show", window.scrollY > 500);
        $("#headroom").classList.toggle("stuck", window.scrollY > 24);
      },
      { passive: true }
    );
  }

  function refresh() {
    build();
    renderStatic();
    initShellShocker();
    populateComboBuilder();
    renderCart();
    apply();
    syncCompareUI();
  }

  function readUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") || params.get("cat") || "";
      const div = params.get("condition") || params.get("div") || "";
      const q = params.get("q") || params.get("search") || "";
      const mode = params.get("mode") || "";
      const openCart = params.get("quote") === "open" || params.get("cart") === "open";

      if (div === "used" || div === "new" || div === "all") {
        F.div = div;
      }
      if (mode === "sku" || mode === "name") {
        F.searchMode = mode;
      }
      if (cat) {
        F.cat = cat;
        const sel = $("#search-cat");
        if (sel && Array.from(sel.options).some((o) => o.value === cat)) {
          sel.value = cat;
        }
      }
      if (q) {
        F.q = q;
        const inp = $("#search-input");
        if (inp) inp.value = q;
        if ($("#search-clear")) $("#search-clear").hidden = false;
      }
      if (openCart) {
        setTimeout(() => drawer(true), 120);
      }
      if (cat || div || q) {
        setTimeout(() => {
          const s = $("#shop");
          if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 180);
      }
    } catch (_) {}
  }

  initTheme();
  try {
    if (localStorage.getItem(VIEW_KEY) === "list") setViewMode("list");
  } catch (_) {}
  build();
  renderStatic();
  initShellShocker();
  startShockerTimer();
  populateComboBuilder();
  bind();
  slider();
  suggest();
  initRose();
  renderCart();
  readUrlParams();
  apply();
  syncCompareUI();
  $("#yr").textContent = new Date().getFullYear();
  window.addEventListener("aqua:catalog-updated", refresh);
})();
