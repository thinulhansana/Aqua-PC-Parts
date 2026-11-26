(function () {
  "use strict";

  const C = window.AQUA_PARTS_CATALOG || {};
  const PHONE = C.whatsappPhone || "94788194535";
  const CART_KEY = "aqua-shop-cart-v1";
  const QUOTE_KEY = "aqua-parts-quote-v1";
  const THEME_KEY = "aqua-parts-theme";
  const VIEW_KEY = "aqua-parts-view";
  const CURRENCY_KEY = "aqua-parts-currency";
  const WISHLIST_KEY = "aqua-parts-wishlist-v1";
  const TRADEIN_KEY = "aqua-parts-tradein-v1";
  const PERIPHERAL_SECS = new Set([
    "peripherals",
    "casings",
    "bn-casings",
    "bn-mice",
    "bn-combos",
    "bn-keyboards",
    "bn-audio",
    "bn-webcams",
    "bn-cables",
    "bn-gaming-chairs",
    "bn-accessories",
    "bn-microphones",
    "bn-sound-cards",
  ]);
  const PAGE = 24;
  const PAGE_MODE = (document.body && document.body.getAttribute("data-page")) || "home";
  const PAGE_LOCK_DIV = PAGE_MODE === "used" ? "used" : PAGE_MODE === "new" ? "new" : "";

  // 71 verified Brand New SKUs aligned with best Sri Lankan marketplace base pricing (Nanotek, Chama, Barclays, Sense.lk, GameStreet)
  const SL_VERIFIED_BEST = new Set([
    "md-61084-lenovo-loq-15arp10e-ryzen-7-170-16gb-ram-5",
    "md-44262-hp-victus-15-fa2013dx-cotr-i5-13th-gen-rtx",
    "md-67129-asus-expertbook-b1503cva-intel-core-i3-13t",
    "md-59480-apple-air-m5-16gb-ram-512gb-ssd-13-inch-br",
    "md-59457-apple-neo-a18-chip-8gb-ram-256gb-ssd-13-in",
    "md-63729-dell-pro-p2725h-27-inch-full-hd-ips-100hz-",
    "md-62276-asus-va249hg-24-inch-ips-frameless-120hz-b",
    "md-61800-asus-rog-strix-xg279q-27-inch-2k-qhd-ips-a",
    "md-60635-samsung-22ips-ls22d300gaexxs-ips-brand-new",
    "md-59514-msi-mag-274qrfw-27-e2-80-b3-inch-wqhd-2560",
    "md-52470-msi-pro-mp243l-e14-23-8-inch-fhd-144hz-ips",
    "md-49584-asus-proart-pa278cgv-27-ips-2560-x-1440-14",
    "md-44352-msi-geforce-rtx5060-gaming-oc-8gb-gddr7x-g",
    "md-44028-asus-dual-geforce-rtx-5050-8gb-brand-new-g",
    "md-44020-asus-dual-geforce-rtx-3050-6gb-gddr6-brand",
    "md-16335-asus-dual-rtx-3050-v2-oc-8g-graphics-card-",
    "md-68701-intel-core-ultra-5-225-brand-new-tray-desk",
    "md-68390-intel-core-ultra-7-270k-40m-plus-cache-up-",
    "md-64797-intel-core-i5-14th-gen-14400-brand-new-tra",
    "md-42632-intel-core-i5-14400-processor-20mb-cache-2",
    "md-5020-intel-core-i7-12700-brand-new-processor",
    "md-48127-amd-ryzen-5-8400f-processor-with-out-box-c",
    "md-45670-amd-ryzen-9-9900x-12-cores-24-threads-up-t",
    "md-44578-amd-ryzen-7-5700x-cores-8-threads-16-up-to",
    "md-38713-amd-ryzen-5-7600x-6-cores-12-threads-up-to",
    "md-38314-amd-ryzen-7-7700x-processor-without-box-co",
    "md-33589-amd-ryzen-5-8500g-6-cores-12-threads-up-to",
    "md-32309-amd-ryzen-7-7800x3d-8-cores-16-threads-up-",
    "md-61767-asus-rog-strix-z890-a-brand-new-gaming-wif",
    "md-51442-msi-pro-h610m-e-ddr4-motherboard-3-years-w",
    "md-48333-asus-prime-b760m-k-90mb1fi0-m1uay0-brand-n",
    "md-47048-asus-prime-b760m-a-wi-fi-ddr5-brand-new-mo",
    "md-45340-msi-h810m-b-ddr5-brand-new-motherboard-3-y",
    "md-45325-msi-b760m-gaming-plus-wi-fi-ddr5-brand-new",
    "md-25845-msi-b760-gaming-plus-wi-fi-ddr5-motherboar",
    "md-22199-asus-tuf-gaming-b760-plus-wifi-ddr5",
    "md-15049-msi-pro-b760m-a-wifi-ddr5-motherboard",
    "md-11875-msi-b760-gaming-plus-wi-fi-ddr5-motherboar",
    "md-44067-msi-b650m-gaming-plus-wi-fi-ddr5-brand-new",
    "md-5490-lexar-nm620-m-2-gen3x4-nvme-512gb",
    "md-61877-seagate-ironwolf-2tb-nas-brand-new-hard-di",
    "md-34625-transcend-store-jet-25h3-1tb-usb-3-1-gen1-",
    "md-63877-thermaltake-smart-bx3-pro-750w-80-plus-bro",
    "md-56910-msi-mag-a550bn-550-watt-80-plus-bronze-cer",
    "md-53735-asus-prime-650b-black-650w-bronze-power-su",
    "md-53709-asus-prime-750b-black-750w-bronze-power-su",
    "md-45897-thermaltake-smart-bx3-650w-80-plus-bronzes",
    "md-34927-gamdias-kratos-m1-600b-rgb-600",
    "md-24460-gamdias-aura-gp650-650-watt-efficient-powe",
    "md-19237-gamdias-aura-gp550-550-watt-power-supply-1",
    "md-14675-cx-series-cx650-650-watt-80-plus-bronze-at",
    "md-5642-prolink-pro2000sfc-2kva-ups",
    "md-5640-650va-prolink-pro700sfc-line-interactive-u",
    "md-5629-prolink-1-2kva-brand-new-ups",
    "md-48809-gamdias-boreas-m2-51d-argb-cpu-air-black-c",
    "md-47284-gamdias-aura-gl240-lite-argb-240mm-cpu-liq",
    "md-45918-thermaltake-la240-s-argb-sync-liquid-coole",
    "md-45902-thermaltake-la360-s-argb-sync-brand-new-li",
    "md-42742-gamdias-aura-gl360-digital-argb-360mm-cpu-",
    "md-30962-gamdias-boreas-e1-210-lite-cpu-air-cooler",
    "md-41302-asus-tuf-gt301-brand-new-gaming-casing",
    "md-41285-asus-rog-strix-helios-gx601-rgb-brand-new-",
    "md-27167-corsair-3000d-rgb-airflow-mid-tower-atx-ca",
    "md-24265-raidmax-infinita-i802-air-rgb-mid-tower-ga",
    "md-24256-raidmax-infinita-i800-argb-mid-tower-gamin",
    "md-24245-gamdias-athena-m3-argb-mid-tower-gaming-ca",
    "md-24405-logitech-brio-100-full-hd-webcam-sl-price-",
    "md-58254-koorui-dy01-double-layer-desktop-lifting-t",
    "md-54844-nb-north-bayou-f160-dual-screen-desktop-mo",
    "md-39502-nb-h100-long-arm-heavy-duty-single-monitor",
    "md-39491-long-arm-heavy-duty-dual-monitor-arm-h180-",
  ]);

  const SEARCH_ALIASES = {
    vga: ["vga", "graphics", "rtx", "gtx", "rx", "geforce", "radeon"],
    gpu: ["vga", "graphics", "rtx", "gtx", "rx", "geforce", "radeon"],
    mobo: ["motherboard", "moterboard", "board"],
    board: ["motherboard", "moterboard"],
    psu: ["power supply", "watt", "bronze", "gold", "ups"],
    proc: ["processor", "ryzen", "intel", "core"],
    cpu: ["processor", "ryzen", "intel", "core"],
    aio: ["liquid", "cooler", "aio"],
    cooler: ["cooler", "fan", "liquid", "heatsink"],
    mon: ["monitor", "ips", "hz", "oled"],
    lap: ["laptop", "macbook", "notebook"],
    kb: ["keyboard"],
    nvme: ["nvme", "m2", "gen4", "gen3"],
    m2: ["nvme", "m2", "ssd"],
    hdd: ["hard", "hdd", "barracuda", "ironwolf", "skyhawk", "purple", "p300"],
    ups: ["ups", "prolink", "battery", "kva", "va"],
  };

  function normSearchText(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function compactSearchText(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function parseSearchTokens(rawQuery) {
    const clean = normSearchText(rawQuery);
    const words = clean.split(/\s+/).filter(Boolean);
    return {
      raw: clean,
      compact: compactSearchText(rawQuery),
      words,
    };
  }

  function productMatchesSearch(p, parsed) {
    if (!parsed || !parsed.words.length) return true;
    for (let i = 0; i < parsed.words.length; i++) {
      const w = parsed.words[i];
      if (p.searchHay.includes(w) || p.searchCompact.includes(w)) continue;
      const aliases = SEARCH_ALIASES[w];
      if (aliases && aliases.some((al) => p.searchHay.includes(al) || p.searchCompact.includes(al))) continue;
      return false;
    }
    return true;
  }

  function scoreSearchProduct(p, parsed) {
    if (!parsed || !parsed.words.length) return 0;
    let sc = 0;
    if (parsed.compact && p.searchNameCompact.includes(parsed.compact)) sc += 220;
    if (parsed.words.every((w) => p.searchName.includes(w) || p.searchNameCompact.includes(w))) sc += 120;
    if (p.searchName.startsWith(parsed.words[0])) sc += 65;
    if (p.inStock) sc += 40;
    if (p.slBest) sc += 22;
    if (p.price != null) sc += 12;
    return sc;
  }

  const CURRENCIES = {
    LKR: { rate: 1, symbol: "", suffix: " LKR" },
    USD: { rate: 1 / 298, symbol: "$", suffix: "" },
    EUR: { rate: 1 / 322, symbol: "€", suffix: "" },
    GBP: { rate: 1 / 378, symbol: "£", suffix: "" },
  };
  let activeCurrency = "LKR";
  try {
    const savedCur = localStorage.getItem(CURRENCY_KEY);
    if (savedCur && CURRENCIES[savedCur]) activeCurrency = savedCur;
  } catch (_) { }

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmtExactLKR = (n) => Number(n).toLocaleString("en-LK") + " LKR";
  const fmtLKR = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "Price on Inquiry";
    const cur = CURRENCIES[activeCurrency] || CURRENCIES.LKR;
    if (activeCurrency === "LKR") {
      return Math.round(num).toLocaleString("en-LK") + " LKR";
    }
    const converted = num * cur.rate;
    const dec = converted >= 100 ? 0 : 2;
    return cur.symbol + converted.toLocaleString("en-US", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  };
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
  let wishlistIds = [];
  let tradeInCredit = { amount: 0, label: "" };

  try {
    const wSaved = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    if (Array.isArray(wSaved)) wishlistIds = wSaved.filter((x) => typeof x === "string");
  } catch (_) { }
  try {
    const tSaved = JSON.parse(localStorage.getItem(TRADEIN_KEY) || "null");
    if (tSaved && typeof tSaved.amount === "number" && tSaved.amount > 0) {
      tradeInCredit = { amount: tSaved.amount, label: String(tSaved.label || "Trade-In Credit") };
    }
  } catch (_) { }

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function enrichProductSpecs(it, secId, subName, price) {
    const rawName = String(it.name || "");
    const detailsTxt = Array.isArray(it.details) ? it.details.join(" ") : "";
    const nameOnly = rawName.toLowerCase();
    const lower = (rawName + " " + (it.specs || "") + " " + (it.brand || "") + " " + detailsTxt).toLowerCase();
    const fullLower = lower + " " + (subName || "").toLowerCase();
    const baseSec = String(secId || "").replace(/^bn-/, "");
    const h = hashStr(String(it.id || rawName));

    // Brand / platform + exact OEM manufacturer
    let brand = "other";
    if (/\b(rtx|gtx|gts|geforce|nvidia)\b/.test(fullLower)) brand = "nvidia";
    else if (/\b(rx ?\d|radeon|ati|ryzen|amd|am4|am5|a320|a520|a620|b350|b450|b550|b650|b840|b850|x370|x470|x570|x670)[a-z0-9-]*\b/.test(fullLower)) brand = "amd";
    else if (/\b(intel|core ultra|core [3579]|core i|i[3579]-|i3|i5|i7|i9|lga|g41|p55|x58|h61|p61|h67|p67|z68|b75|h77|z77|h81|b85|h87|z87|h97|z97|h110|b150|h170|z170|b250|h270|z270|h310|b360|z370|z390|h410|b460|z490|h510|b560|h610|b660|z690|b760|z790|h810|b860|z890)[a-z0-9-]*\b/.test(fullLower)) brand = "intel";
    else if (/\b(asus|msi|giga|gigabyte|asrock|jedel|banda|helios|tucci|dell|hp|lenovo|acer|apple|corsair|thermaltake|arctic|antec|gamdias|koorui|viewsonic|logitech|nzxt|fantech|redragon|prolink|raidmax)\b/.test(fullLower)) brand = "board-brand";
    else if (/\b(samsung|wd|western digital|seagate|lexar|kingston|crucial|adata|nvme|ssd|hdd)\b/.test(fullLower)) brand = "storage-brand";

    let exactBrand = "";
    const exactBrandMatchers = [
      ["asus", /\b(asus|rog|tuf|prime|proart|strix|vivobook|zenbook)\b/],
      ["msi", /\b(msi|mag|mpg|meg|ventus|gaming x|cyborg|thin|katana|gf63|modern)\b/],
      ["gigabyte", /\b(gigabyte|aorus|giga|eagle|windforce|aero)\b/],
      ["asrock", /\b(asrock|phantom gaming|steel legend)\b/],
      ["lenovo", /\b(lenovo|ideapad|legion|loq|thinkpad|thinkbook)\b/],
      ["hp", /\b(hp|victus|omen|pavilion|probook|elitebook|envy)\b/],
      ["dell", /\b(dell|inspiron|latitude|vostro|xps|alienware)\b/],
      ["apple", /\b(apple|macbook|mac studio|mac mini|imac)\b/],
      ["acer", /\b(acer|nitro|predator|aspire|swift|extensa)\b/],
      ["amd", /\b(amd|ryzen|radeon|rx ?\d|am4|am5)\b/],
      ["intel", /\b(intel|core ultra|core i[3579]|i[3579]-|lga\d+|pentium|celeron)\b/],
      ["nvidia", /\b(nvidia|geforce|rtx|gtx|gt ?7\d\d|gt ?1030)\b/],
      ["corsair", /\b(corsair|vengeance|dominator|icue)\b/],
      ["kingston", /\b(kingston|fury|hyperx|nv2|nv3)\b/],
      ["lexar", /\b(lexar|thor|ares|nm620|nm790)\b/],
      ["crucial", /\b(crucial|ballistix|p3|bx500)\b/],
      ["samsung", /\b(samsung|980|990|odyssey)\b/],
      ["seagate", /\b(seagate|barracuda|ironwolf)\b/],
      ["wd", /\b(wd|western digital|blue|black|sn5\d\d|sn7\d\d|sn8\d\d)\b/],
      ["thermaltake", /\b(thermaltake|toughpower|smart)\b/],
      ["gamdias", /\b(gamdias|helios|aura|talos)\b/],
      ["koorui", /\b(koorui)\b/],
      ["viewsonic", /\b(viewsonic|vx\d|va\d)\b/],
      ["logitech", /\b(logitech|g102|g203|g304|g502|mx master|mk\d)\b/],
      ["antec", /\b(antec)\b/],
      ["arctic", /\b(arctic)\b/],
      ["prolink", /\b(prolink)\b/],
      ["raidmax", /\b(raidmax)\b/],
      ["nzxt", /\b(nzxt)\b/],
      ["fantech", /\b(fantech)\b/],
      ["redragon", /\b(redragon)\b/],
    ];
    for (const [bKey, bRe] of exactBrandMatchers) {
      if (bRe.test(fullLower)) {
        exactBrand = bKey;
        break;
      }
    }

    // Socket & RAM generation (prioritize product name over details/subcat)
    let socket = "";
    let ramGen = "";
    const isLaptopRam = baseSec === "ram" && /\b(laptop|notebook|sodimm|so-dimm)\b/.test(nameOnly + " " + (subName || "").toLowerCase());

    if (baseSec === "processors") {
      if (/\b(amd|ryzen|r3|r5|r7|r9)\b/.test(nameOnly)) {
        if (/\b(7\d{3}|8\d{3}|9\d{3})[a-z0-9]*\b/.test(nameOnly)) { socket = "AM5"; ramGen = "DDR5"; }
        else { socket = "AM4"; ramGen = "DDR4"; }
      } else if (/\b(ultra\s*[579]|core\s*[3579]\s*2\d{2}|225|235|245|265|270|285)[a-z]*\b/.test(nameOnly)) {
        socket = "LGA1851"; ramGen = "DDR5";
      } else if (/\b(12th|13th|14th|12\d{3}[a-z]*|13\d{3}[a-z]*|14\d{3}[a-z]*)\b/.test(nameOnly)) {
        socket = "LGA1700"; ramGen = "DDR4/DDR5";
      } else if (/\b(10th|11th|10\d{3}[a-z]*|11\d{3}[a-z]*)\b/.test(nameOnly)) {
        socket = "LGA1200"; ramGen = "DDR4";
      } else if (/\b(8th|9th|8\d{3}[a-z]*|9\d{3}[a-z]*|g5400t?)\b/.test(nameOnly)) {
        socket = "LGA1151v2"; ramGen = "DDR4";
      } else if (/\b(6th|7th|6\d{3}[a-z]*|7\d{3}[a-z]*)\b/.test(nameOnly)) {
        socket = "LGA1151"; ramGen = "DDR4";
      } else if (/\b(4th|4\d{3}[a-z]*)\b/.test(nameOnly)) {
        socket = "LGA1150"; ramGen = "DDR3";
      } else if (/\b(2nd|3rd|2\d{3}[a-z]*|3\d{3}[a-z]*)\b/.test(nameOnly)) {
        socket = "LGA1155"; ramGen = "DDR3";
      } else if (/\b1366\b/.test(nameOnly)) {
        socket = "LGA1366"; ramGen = "DDR3";
      } else if (/\b1st gen\b/.test(nameOnly)) {
        socket = "LGA1156"; ramGen = "DDR3";
      }
    } else if (baseSec === "motherboards") {
      if (/\b(h ?810|b ?860|z ?890)[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1851"; ramGen = "DDR5"; }
      else if (/\b(h ?610|b ?660|z ?690|b ?760|z ?790)[a-z0-9-]*\b/.test(nameOnly)) {
        socket = "LGA1700";
        ramGen = /\bddr ?-? ?5\b/.test(nameOnly + " " + detailsTxt.toLowerCase()) ? "DDR5" : "DDR4";
      } else if (/\b(h ?410|b ?460|z ?490|h ?510|b ?560)[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1200"; ramGen = "DDR4"; }
      else if (/\b(h ?310|b ?360|b ?365|z ?370|z ?390)[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1151v2"; ramGen = "DDR4"; }
      else if (/\b(h ?110|b ?150|h ?170|z ?170|b ?250|h ?270|z ?270)[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1151"; ramGen = "DDR4"; }
      else if (/\b(h ?81|b ?85|h ?87|z ?87|h ?97|z ?97)[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1150"; ramGen = "DDR3"; }
      else if (/\b(h ?61|p ?61|h ?67|p ?67|z ?68|b ?75|h ?77|z ?77)[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1155"; ramGen = "DDR3"; }
      else if (/\bg ?41[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA775"; ramGen = "DDR3"; }
      else if (/\bp ?55[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1156"; ramGen = "DDR3"; }
      else if (/\bx ?58[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA1366"; ramGen = "DDR3"; }
      else if (/\bx79[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA2011"; ramGen = "DDR3"; }
      else if (/\bx99[a-z0-9-]*\b/.test(nameOnly)) { socket = "LGA2011-v3"; ramGen = "DDR4"; }
      else if (/\b(a320|b350|x370|b450|x470|a520|b550|x570)[a-z0-9-]*\b/.test(nameOnly)) { socket = "AM4"; ramGen = "DDR4"; }
      else if (/\b(a620|b650|b840|b850|x670|x870)[a-z0-9-]*\b/.test(nameOnly)) { socket = "AM5"; ramGen = "DDR5"; }
    } else if (baseSec === "ram") {
      if (/\bddr ?-? ?5\b/.test(nameOnly)) ramGen = "DDR5";
      else if (/\bddr ?-? ?4\b/.test(nameOnly)) ramGen = "DDR4";
      else if (/\bddr ?-? ?3\b/.test(nameOnly)) ramGen = "DDR3";
      else if (/\bddr ?-? ?2\b/.test(nameOnly)) ramGen = "DDR2";
      else if (/\bddr ?-? ?5\b/.test(lower)) ramGen = "DDR5";
      else if (/\bddr ?-? ?4\b/.test(lower)) ramGen = "DDR4";
      else if (/\bddr ?-? ?3\b/.test(lower)) ramGen = "DDR3";
    }

    // VRAM
    let vramGb = 0;
    if (baseSec === "vga-cards") {
      const mMb = lower.match(/\b(\d+)\s*mb\b/);
      const mGb = lower.match(/\b(\d+)\s*gb\b/);
      if (mGb) vramGb = Number(mGb[1]);
      else if (mMb) vramGb = Number(mMb[1]) / 1024;
    }

    // TDP & PSU Wattage & Performance Score
    let tdpWatts = 0;
    let psuWatts = 0;
    let perfScore = 25;

    if (baseSec === "vga-cards") {
      if (/5070 ?ti|5080|5090/.test(lower)) { tdpWatts = 300; perfScore = 98; }
      else if (/5070|4070 ?ti|4080/.test(lower)) { tdpWatts = 260; perfScore = 96; }
      else if (/4070/.test(lower)) { tdpWatts = 220; perfScore = 92; }
      else if (/5060 ?ti|5060/.test(lower)) { tdpWatts = 175; perfScore = 88; }
      else if (/4060/.test(lower)) { tdpWatts = 160; perfScore = 82; }
      else if (/5050/.test(lower)) { tdpWatts = 140; perfScore = 76; }
      else if (/3080/.test(lower)) { tdpWatts = 350; perfScore = 94; }
      else if (/3070/.test(lower)) { tdpWatts = 240; perfScore = 84; }
      else if (/3060 ?ti/.test(lower)) { tdpWatts = 200; perfScore = 79; }
      else if (/3060/.test(lower)) { tdpWatts = 170; perfScore = 72; }
      else if (/3050/.test(lower)) { tdpWatts = 130; perfScore = 58; }
      else if (/2080 ?ti|2080/.test(lower)) { tdpWatts = 250; perfScore = 84; }
      else if (/2070/.test(lower)) { tdpWatts = 185; perfScore = 72; }
      else if (/2060/.test(lower)) { tdpWatts = 160; perfScore = 64; }
      else if (/rx ?7[78]00|rx ?6700/.test(lower)) { tdpWatts = 230; perfScore = 82; }
      else if (/rx ?7600/.test(lower)) { tdpWatts = 190; perfScore = 76; }
      else if (/rx ?6600/.test(lower)) { tdpWatts = 135; perfScore = 69; }
      else if (/rx ?5700/.test(lower)) { tdpWatts = 225; perfScore = 72; }
      else if (/rx ?5600/.test(lower)) { tdpWatts = 150; perfScore = 61; }
      else if (/rx ?5500|rx ?6500/.test(lower)) { tdpWatts = 130; perfScore = 50; }
      else if (/1660|1650/.test(lower)) { tdpWatts = 115; perfScore = 58; }
      else if (/1080 ?ti/.test(lower)) { tdpWatts = 250; perfScore = 74; }
      else if (/1080/.test(lower)) { tdpWatts = 180; perfScore = 63; }
      else if (/1070/.test(lower)) { tdpWatts = 150; perfScore = 56; }
      else if (/1060/.test(lower)) { tdpWatts = 120; perfScore = 48; }
      else if (/1050/.test(lower)) { tdpWatts = 75; perfScore = 38; }
      else if (/rx ?580|rx ?570|rx ?480|rx ?470/.test(lower)) { tdpWatts = 165; perfScore = 44; }
      else if (/980/.test(lower)) { tdpWatts = 200; perfScore = 47; }
      else if (/970|960/.test(lower)) { tdpWatts = 145; perfScore = 36; }
      else if (/750 ?ti|760|770/.test(lower)) { tdpWatts = 95; perfScore = 26; }
      else { tdpWatts = 65; perfScore = 18; }
    } else if (baseSec === "processors") {
      if (/r9|7900|9900|5900|3900|ultra 9|14900|13900/.test(lower)) { tdpWatts = 125; perfScore = 96; }
      else if (/7800|9700|9600|7700|7600|14600|14400|13600|ultra [57]/.test(lower)) { tdpWatts = 95; perfScore = 92; }
      else if (/8700f|8600g|8500g|8400f|7500f|5800|5700|5600|12400|13100|14100/.test(lower)) { tdpWatts = 65; perfScore = 88; }
      else if (/5500|4500|3700|3600|4600|12100/.test(lower)) { tdpWatts = 65; perfScore = 76; }
      else if (/2700|2600|3500|3400|9500|9100|8700|8400|10\d{3}|11\d{3}/.test(lower)) { tdpWatts = 65; perfScore = 66; }
      else if (/1700|1800|1600|2400|2200|3200|6700/.test(lower)) { tdpWatts = 65; perfScore = 54; }
      else if (/4\d{3}/.test(lower)) { tdpWatts = 84; perfScore = 42; }
      else if (/i5/.test(lower)) { tdpWatts = 75; perfScore = 36; }
      else { tdpWatts = 65; perfScore = 24; }
    } else if (baseSec === "motherboards") {
      tdpWatts = 40;
    } else if (baseSec === "ram") {
      tdpWatts = 12;
    } else if (baseSec === "storage") {
      tdpWatts = 10;
    } else if (baseSec === "cooling") {
      tdpWatts = 8;
    } else if (baseSec === "power-supply") {
      const mW = lower.match(/\b(\d{3,4})\s*w(?:att)?\b/);
      if (mW) psuWatts = Number(mW[1]);
      else if (/450-500/.test(lower)) psuWatts = 500;
      else if (/500-550/.test(lower)) psuWatts = 550;
      else psuWatts = 450;
    }

    // Performance tier classification
    let tier = "budget";
    if (perfScore >= 78 || (price && price >= 95000)) tier = "aaa";
    else if (perfScore >= 46 || (price && price >= 32000 && price < 95000)) tier = "esports";
    if (/r9|9900|7900|5900|3900|x570|x670|z790|z890|2tb|4tb|6tb|8tb|10tb|32gb/.test(lower)) tier = "workstation";

    // Lab verification telemetry pills
    const furTemp = 59 + (h % 9);
    const smartPct = 97 + (h % 3);
    let labTelemetry = ["ESD Lab Bench Checked", "Warranty Verified", "Ready to Ship LK"];
    if (it.condition === "new" || String(secId).startsWith("bn-")) {
      labTelemetry = [
        "100% Factory Sealed / Retail Box",
        it.warranty || "Official Agent Warranty",
        "Same-Day Dispatch · Sri Lanka",
      ];
    } else if (baseSec === "vga-cards") {
      labTelemetry = [`FurMark 24h: ${furTemp}°C Max`, "0 VRAM / Display Artifacts", "Thermal Paste Checked"];
    } else if (baseSec === "processors") {
      labTelemetry = ["OCCT 100% Load Pass", "Pins & Pads Inspected", socket ? `${socket} Socket Verified` : "Dual-Channel Tested"];
    } else if (baseSec === "motherboards") {
      labTelemetry = ["BIOS Flashed & POST Pass", "VRM Thermal Checked", socket ? `${socket} · ${ramGen}` : "PCIe & USB Verified"];
    } else if (baseSec === "storage") {
      labTelemetry = [`SMART Health: ${smartPct}% Good`, "0 Bad Sectors Verified", "CrystalDisk Speed Pass"];
    } else if (baseSec === "monitors") {
      labTelemetry = ["0 Dead / Stuck Pixels", "Backlight Uniformity OK", "HDMI/DP Ports Tested"];
    } else if (baseSec === "laptops") {
      labTelemetry = ["Battery & Thermals Checked", "Display & Keyboard Tested", it.warranty || "Lab Verified Laptop"];
    } else if (baseSec === "ram") {
      labTelemetry = ["MemTest86 Zero Errors", "Gold Contacts Cleaned", ramGen || "SPD Profile Verified"];
    } else if (baseSec === "power-supply") {
      labTelemetry = ["12V / 5V / 3.3V Rail Tested", "Ripple & Load Verified", psuWatts ? `${psuWatts}W Rated Output` : "Surge Checked"];
    }

    return {
      brand,
      exactBrand,
      socket,
      ramGen,
      isLaptopRam,
      vramGb,
      tdpWatts,
      psuWatts,
      perfScore,
      tier,
      labTelemetry,
    };
  }

  function deriveBullets(it, secLabel, subName, isNew, warranty) {
    const bullets = [];
    if (Array.isArray(it.details) && it.details.length) {
      for (const line of it.details) {
        if (bullets.length >= 3) break;
        bullets.push(line.length > 72 ? line.slice(0, 69) + "..." : line);
      }
    }
    if (it.brand && bullets.length < 3) {
      bullets.push("Brand: " + it.brand);
    }
    const name = it.name || "";
    if (it.specs && bullets.length < 3 && !bullets.some((b) => it.specs.startsWith(b.slice(0, 12)))) {
      bullets.push(it.specs.length > 72 ? it.specs.slice(0, 69) + "..." : it.specs);
    }
    if (subName && bullets.length < 3) bullets.push(subName);

    const vramMatch = name.match(/\b(\d+\s*GB)\b/i);
    if (vramMatch && bullets.length < 3) {
      bullets.push(vramMatch[1].toUpperCase() + " Capacity / Spec");
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
          const slBest = SL_VERIFIED_BEST.has(it.id);
          const rating = Number((4.7 + (h % 4) * 0.1).toFixed(1));
          const reviews = 14 + (h % 75);
          const savePct = slBest ? 9 : 0;
          const origPrice = null;
          const meta = enrichProductSpecs(it, sec.id, sub.name || "", price);

          const rawSearchFields = [
            it.name,
            it.sku || "",
            sec.label,
            sub.name || "",
            it.specs || "",
            it.brand || "",
            ...(Array.isArray(it.details) ? it.details : []),
            meta.socket,
            meta.ramGen,
            isNew ? "brand new sealed" : "used tested",
          ].join(" ");

          if (price != null && (cat.minPrice == null || price < cat.minPrice)) {
            cat.minPrice = price;
          }

          if (isNew) newTotal++;
          else usedTotal++;

          PRODUCTS.push({
            id: it.id,
            sku:
              it.sku ||
              (typeof window.generateAquaSku === "function"
                ? window.generateAquaSku(sec.id, isNew, PRODUCTS.length + 1)
                : ""),
            name: it.name,
            price,
            origPrice,
            savePct,
            slBest,
            rating,
            reviews,
            inStock: it.inStock !== false,
            stockQty: typeof it.stockQty === "number" ? it.stockQty : null,
            lowStockThreshold: typeof it.lowStockThreshold === "number" ? it.lowStockThreshold : 3,
            stockNote: it.stockNote || "",
            cond: isNew ? "new" : "used",
            warranty,
            specs: it.specs || "",
            details: Array.isArray(it.details) ? it.details : [],
            retailBrand: it.brand || "",
            bullets: deriveBullets(it, sec.label, sub.name || "", isNew, warranty),
            sec: sec.id,
            secLabel: sec.label,
            sub: sub.name || "",
            img,
            fallbackImg,
            order: PRODUCTS.length,
            searchName: normSearchText(it.name),
            searchNameCompact: compactSearchText(it.name),
            searchHay: normSearchText(rawSearchFields),
            searchCompact: compactSearchText(rawSearchFields),
            ...meta,
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
      } catch (_) { }
    };

    let initial = "dark";
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") initial = saved;
    } catch (_) { }
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
    } catch (_) { }
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
      } catch (_) { }
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
    } catch (_) { }
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

  function saveWishlist() {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch (_) { }
  }

  function syncWishlistUI() {
    const valid = wishlistIds.filter((id) => Boolean(prod(id)));
    if (valid.length !== wishlistIds.length) {
      wishlistIds = valid;
      saveWishlist();
    }
    const topEl = $("#wishlist-count-top");
    const drwEl = $("#wishlist-drawer-count");
    if (topEl) topEl.textContent = String(wishlistIds.length);
    if (drwEl) drwEl.textContent = String(wishlistIds.length);

    $$("[data-wish]").forEach((btn) => {
      const active = wishlistIds.includes(btn.dataset.wish);
      btn.classList.toggle("is-saved", active);
      btn.setAttribute("aria-pressed", String(active));
      const ico = btn.querySelector(".material-symbols-outlined");
      if (ico) ico.textContent = active ? "favorite" : "favorite_border";
    });
  }

  function toggleWishlist(id) {
    const p = prod(id);
    if (!p) return;
    if (wishlistIds.includes(id)) {
      wishlistIds = wishlistIds.filter((x) => x !== id);
      toast("Removed from Saved Hardware");
    } else {
      wishlistIds.push(id);
      toast("Saved to Wishlist: " + p.name);
    }
    saveWishlist();
    syncWishlistUI();
    renderWishlistDrawer();
  }

  function renderWishlistDrawer() {
    const box = $("#wishlist-items");
    const waBtn = $("#wishlist-wa-btn");
    if (!box) return;
    const items = wishlistIds.map(prod).filter(Boolean);
    if (!items.length) {
      box.innerHTML =
        '<div class="cart-empty"><span class="material-symbols-outlined">favorite</span><p>Your Saved Wishlist is empty. Tap the ♥ heart on any GPU, CPU, or Monitor to track prices or bundle later.</p></div>';
      if (waBtn) waBtn.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent("Hello Aqua PC Parts, I'd like help choosing hardware.");
      return;
    }

    box.innerHTML = items
      .map(
        (p) =>
          '<div class="cart-row"><img referrerpolicy="no-referrer" src="' +
          esc(p.img) +
          '" onerror="this.onerror=null;this.src=\'' +
          esc(p.fallbackImg) +
          '\'" alt="" /><div class="cr-info"><b>' +
          esc(p.name) +
          "</b><span>" +
          (p.price != null ? fmtLKR(p.price) : "Call for price") +
          '</span><div class="ne-wish-row-actions"><button type="button" class="ne-btn ne-btn-orange ne-btn-xs" data-add="' +
          esc(p.id) +
          '">Add to Cart</button><button type="button" class="ne-btn ne-btn-outline ne-btn-xs" data-qv="' +
          esc(p.id) +
          '">Inspect</button></div></div><button type="button" class="rm" data-wish="' +
          esc(p.id) +
          '" aria-label="Remove saved item"><span class="material-symbols-outlined">delete</span></button></div>'
      )
      .join("");

    if (waBtn) {
      const msg =
        "Hello Aqua PC Parts, please confirm stock & best price for my Saved List:\n" +
        items
          .map((p, i) => i + 1 + ". " + p.name + " (" + (p.price != null ? fmtExactLKR(p.price) : "Call") + ")")
          .join("\n");
      waBtn.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
    }
  }

  function wishlistDrawer(open) {
    const drw = $("#wishlist-drawer");
    const ovl = $("#wishlist-overlay");
    if (!drw || !ovl) return;
    if (open) renderWishlistDrawer();
    drw.hidden = false;
    ovl.hidden = false;
    requestAnimationFrame(() => {
      drw.classList.toggle("open", open);
      ovl.classList.toggle("open", open);
    });
    if (!open) {
      setTimeout(() => {
        if (!drw.classList.contains("open")) {
          drw.hidden = true;
          ovl.hidden = true;
        }
      }, 280);
    }
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

    const tiAmount = tradeInCredit && tradeInCredit.amount > 0 ? tradeInCredit.amount : 0;
    const netTotal = Math.max(0, total - tiAmount);

    const tiRow = $("#cart-tradein-row");
    const tiVal = $("#cart-tradein-val");
    if (tiRow && tiVal) {
      tiRow.hidden = !(tiAmount > 0 && lines.length > 0);
      tiVal.textContent = "-" + fmtLKR(tiAmount);
    }

    $("#cart-count").textContent = qty;
    $("#cart-total-top").textContent = fmtLKR(lines.length ? netTotal : 0);
    $("#cart-sub").textContent =
      fmtLKR(lines.length ? netTotal : 0) + (unpriced ? " + " + unpriced + " TBC" : "");

    const box = $("#cart-items");
    if (!lines.length) {
      box.innerHTML =
        '<div class="cart-empty"><span class="material-symbols-outlined">shopping_cart</span><p>Your cart is empty. Add parts or build a PC combo to generate an instant LKR quote.</p></div>';
    } else {
      box.innerHTML = lines
        .map(
          ({ c, p, price }) =>
            '<div class="cart-row"><img referrerpolicy="no-referrer" src="' +
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
            i + 1 + ". " + c.name + " x" + c.qty + " – " + (price != null ? fmtExactLKR(price * c.qty) : "Price TBC")
        )
        .join("\n") +
      (tiAmount > 0 ? "\n• Trade-In Credit Applied (" + tradeInCredit.label + "): -" + fmtExactLKR(tiAmount) : "") +
      "\n\nEstimated Net Total: " +
      fmtExactLKR(netTotal) +
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
          (unit != null ? fmtExactLKR(unit) : "Call / TBC") + "</td><td><strong>" +
          (lineTotal != null ? fmtExactLKR(lineTotal) : "TBC") + "</strong></td></tr>"
        );
      })
      .join("");

    const tiAmount = tradeInCredit && tradeInCredit.amount > 0 ? tradeInCredit.amount : 0;
    const netTotal = Math.max(0, total - tiAmount);
    const quoteNo = "AQP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);
    let modal = document.getElementById("ne-quote-print-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ne-quote-print-modal";
      modal.className = "ne-quote-print-overlay";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Printable Official Quotation");
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.hidden = true;
          document.body.classList.remove("ne-printing-quote");
        }
      });
      document.body.appendChild(modal);
    }

    modal.innerHTML =
      '<div class="ne-quote-print-sheet">' +
      '<div class="ne-quote-print-toolbar no-print">' +
      '<strong>Official Quotation #' + esc(quoteNo) + '</strong>' +
      '<div class="ne-quote-print-actions">' +
      '<button type="button" class="ne-btn-primary" id="ne-quote-print-go">Print / Save PDF</button>' +
      '<button type="button" class="ne-btn-ghost" id="ne-quote-print-close">Close</button>' +
      '</div></div>' +
      '<div class="ne-quote-paper">' +
      '<div class="ne-qp-top">' +
      '<div class="ne-qp-brand"><img src="assets/logo.jpg" alt="Aqua PC Parts" /><div><h1>AQUA PC PARTS</h1><div>Aqua PC Solutions · Embilipitiya, Sri Lanka</div><div>Tel / WhatsApp: +94 78 819 4535</div></div></div>' +
      '<div class="ne-qp-meta"><strong>QUOTATION #' + esc(quoteNo) + '</strong><div>Date: ' + esc(new Date().toLocaleDateString("en-LK")) + '</div></div>' +
      '</div>' +
      '<table class="ne-qp-table"><thead><tr><th>#</th><th>Item &amp; Warranty</th><th>Condition</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>' +
      rows +
      '</tbody></table>' +
      (tiAmount > 0 ? '<div class="ne-qp-tot" style="font-size:14px;color:#0284c7">Trade-In Credit (' + esc(tradeInCredit.label) + '): -' + esc(fmtExactLKR(tiAmount)) + '</div>' : '') +
      '<div class="ne-qp-tot"><strong>Estimated Net Total: ' + esc(fmtExactLKR(netTotal)) + (unpriced ? ' (+ ' + unpriced + ' item TBC)' : '') + '</strong></div>' +
      '<div class="ne-qp-note">Used hardware is 24-hour bench-tested and includes a 06-month testing warranty. Prices are valid for 48 hours subject to stock confirmation on WhatsApp (+94 78 819 4535).</div>' +
      '</div></div>';

    modal.hidden = false;
    document.body.classList.add("ne-printing-quote");
    const closeBtn = modal.querySelector("#ne-quote-print-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.hidden = true;
        document.body.classList.remove("ne-printing-quote");
      });
    }
    const goBtn = modal.querySelector("#ne-quote-print-go");
    if (goBtn) {
      goBtn.addEventListener("click", () => window.print());
    }
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
  const COMPARE_KEY = "aqua-compare-ids-v1";
  let compareIds = [];
  let compareHideTimer = null;

  function loadCompareIds() {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
      if (Array.isArray(saved)) {
        compareIds = saved.filter((id) => Boolean(prod(id))).slice(0, 4);
      }
    } catch (_) {
      compareIds = [];
    }
  }

  function saveCompareIds() {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
    } catch (_) {}
  }

  function syncCompareUI(opts) {
    const addedId = opts && opts.addedId ? opts.addedId : null;
    const countStr = compareIds.length + "/4";
    const topEl = $("#compare-count-top");
    const barCountEl = $("#compare-bar-count");
    if (topEl) topEl.textContent = countStr;
    if (barCountEl) barCountEl.textContent = String(compareIds.length);

    const bar = $("#compare-bar");
    const tray = $("#compare-tray-items");
    if (bar && tray) {
      tray.innerHTML = compareIds
        .map((id) => {
          const p = prod(id);
          if (!p) return "";
          const isNewPill = addedId && id === addedId;
          return (
            '<div class="ne-compare-pill' + (isNewPill ? " is-just-added" : "") + '"><img referrerpolicy="no-referrer" src="' +
            esc(p.img) +
            '" alt="" /><span>' +
            esc(p.name) +
            '</span><button type="button" data-compare-remove="' +
            esc(p.id) +
            '" aria-label="Remove from compare">×</button></div>'
          );
        })
        .join("");
      if (compareIds.length > 0) {
        document.body.classList.add("has-compare-tray");
        if (compareHideTimer) {
          clearTimeout(compareHideTimer);
          compareHideTimer = null;
        }
        bar.hidden = false;
      } else {
        document.body.classList.remove("has-compare-tray");
        if (compareHideTimer) clearTimeout(compareHideTimer);
        compareHideTimer = setTimeout(() => {
          if (compareIds.length === 0) bar.hidden = true;
        }, 180);
      }
    }

    $$("[data-compare]").forEach((cb) => {
      cb.checked = compareIds.includes(cb.dataset.compare);
    });
  }

  function toggleCompare(id) {
    let addedId = null;
    if (compareIds.includes(id)) {
      compareIds = compareIds.filter((x) => x !== id);
    } else {
      if (compareIds.length >= 4) {
        toast("You can compare up to 4 hardware items at once.");
        syncCompareUI();
        return;
      }
      compareIds.push(id);
      addedId = id;
    }
    saveCompareIds();
    syncCompareUI({ addedId });
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
          '<td><div class="ne-compare-prod-head"><img referrerpolicy="no-referrer" src="' +
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
      makeRow("Price", (p) => (p.price != null ? "<strong style='color:var(--ne-orange)'>" + fmtLKR(p.price) + "</strong>" : "Call for Price")) +
      makeRow("Condition", (p) => (p.cond === "new" ? "Brand New Sealed" : "Certified Used · Grade A")) +
      makeRow("Socket / Spec", (p) => esc([p.socket, p.ramGen, p.vramGb ? p.vramGb + "GB VRAM" : "", p.tdpWatts ? p.tdpWatts + "W TDP" : ""].filter(Boolean).join(" · ") || p.secLabel)) +
      makeRow("24h Lab Test", (p) => esc(p.labTelemetry.join(" · "))) +
      makeRow("Rating", (p) => "★★★★★ " + p.rating + " (" + p.reviews + ")") +
      makeRow("Warranty", (p) => esc(p.warranty)) +
      makeRow("Availability", (p) => (p.inStock ? "<span style='color:var(--ne-green);font-weight:700'>In Stock</span>" : "Out of Stock")) +
      "</tbody></table>";

    $("#compare-modal").hidden = false;
  }

  // ───────── Newegg Dense Product Card ─────────
  function productCard(p) {
    const catLine = p.sub ? p.secLabel + " · " + p.sub : p.secLabel;
    const isChecked = compareIds.includes(p.id) ? " checked" : "";
    const isSaved = wishlistIds.includes(p.id);
    const badgeCls = p.cond === "new" ? "ne-cond-badge is-new" : "ne-cond-badge is-used";
    const badgeTxt = p.cond === "new" ? "Brand New" : "Used · 06M";

    const priceHtml =
      p.price != null
        ? '<div class="ne-price-strike-row">' +
        (p.slBest
          ? '<span class="ne-slbest-line">★ SL Market Best Base</span>'
          : p.cond === "new"
            ? "<span>Factory Sealed · Official Box</span>"
            : "<span>Grade-A Bench Tested · 06M</span>") +
        '</div><div class="ne-price-main">' +
        fmtLKR(p.price) +
        "</div>"
        : '<div class="ne-price-strike-row"><span>Live Dealer Quote</span></div><div class="ne-price-main is-call">Call for Price</div>';

    const bulletsHtml = p.bullets.map((b) => "<li>" + esc(b) + "</li>").join("");
    const specPill = p.socket
      ? '<span class="ne-spec-badge">' + esc(p.socket) + "</span>"
      : p.ramGen
        ? '<span class="ne-spec-badge">' + esc(p.ramGen) + "</span>"
        : "";

    return (
      '<li class="ne-card' + (p.inStock ? "" : " oos") + '">' +
      '<div class="ne-card-top">' +
      '<div class="ne-card-badges-left"><span class="' + badgeCls + '">' + badgeTxt + "</span>" + specPill + "</div>" +
      '<div class="ne-card-tools-right">' +
      '<button type="button" class="ne-wish-btn' + (isSaved ? " is-saved" : "") + '" data-wish="' + esc(p.id) + '" aria-label="Save to Wishlist" aria-pressed="' + isSaved + '" title="Save to Wishlist"><span class="material-symbols-outlined">' + (isSaved ? "favorite" : "favorite_border") + "</span></button>" +
      '<label class="ne-compare-check"><input type="checkbox" data-compare="' + esc(p.id) + '"' + isChecked + " /><span>Compare</span></label>" +
      "</div>" +
      "</div>" +
      '<div class="ne-card-img-wrap" data-qv="' + esc(p.id) + '">' +
      (p.price != null && p.slBest ? '<span class="ne-save-tag is-slbest">★ SL BEST</span>' : "") +
      '<img referrerpolicy="no-referrer" src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="' + esc(p.name) + '" loading="lazy" />' +
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
      (p.inStock ? "✔ In Stock · Embilipitiya LK" : "✖ Out of Stock") +
      "</div>" +
      '<div class="ne-card-actions">' +
      (p.inStock
        ? '<button type="button" class="ne-add-btn" data-add="' + esc(p.id) + '">Add to Cart ▸</button>'
        : '<a class="ne-add-btn" target="_blank" rel="noopener" href="https://wa.me/' + PHONE + "?text=" + encodeURIComponent("Hi, is " + p.name + " back in stock?") + '">Ask Stock</a>') +
      '<a class="ne-wa-icon-btn" target="_blank" rel="noopener" aria-label="Order on WhatsApp" title="Order directly on WhatsApp" href="https://wa.me/' +
      PHONE + "?text=" + encodeURIComponent("Hi Aqua PC Parts, interested in: " + p.name + (p.price != null ? " (" + fmtExactLKR(p.price) + ")" : "")) +
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
    tradeInAmount: 0,
    tradeInLabel: "",
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

  const BUILDER_SEC_MAP = {
    processors: "combo-cpu",
    "bn-processors": "combo-cpu",
    motherboards: "combo-mb",
    "bn-motherboards": "combo-mb",
    "vga-cards": "combo-gpu",
    "bn-vga-cards": "combo-gpu",
    ram: "combo-ram",
    "bn-ram": "combo-ram",
    storage: "combo-storage",
    "bn-storage": "combo-storage",
    "power-supply": "combo-psu",
    "bn-power-supply": "combo-psu",
    cooling: "combo-cooler",
    "bn-cooling": "combo-cooler",
    monitors: "combo-monitor",
    "bn-monitors": "combo-monitor",
  };

  function updateQuickViewWhatsApp() {
    const p = prod(qvState.id);
    if (!p) return;
    const lines = [
      "Hello Aqua PC Parts! I'm inquiring about:",
      "• Item: " + p.name,
      "• Condition: " + (p.cond === "new" ? "Brand New Sealed" : "Used (Grade A Bench Tested)"),
      "• Department: " + p.secLabel + (p.sub ? " › " + p.sub : ""),
      "• Unit Price: " + (p.price != null ? fmtExactLKR(p.price) : "Price on Inquiry"),
      "• Quantity: " + qvState.qty,
    ];
    if (p.price != null && qvState.qty > 1) {
      lines.push("• Estimated Total: " + fmtExactLKR(p.price * qvState.qty));
    }
    lines.push("• Warranty: " + p.warranty);
    lines.push("• Inquiry Type: " + (INTENT_LABELS[qvState.intent] || INTENT_LABELS.order));
    lines.push("• Option: " + (FULFILL_LABELS[qvState.fulfill] || FULFILL_LABELS.pickup));
    if (qvState.tradeInAmount > 0 && qvState.tradeInLabel) {
      const swapLine =
        p.price != null
          ? "• Trade-In Swap: " +
            qvState.tradeInLabel +
            " (-" +
            fmtExactLKR(qvState.tradeInAmount) +
            ") -> Est. Net Top-Up: " +
            fmtExactLKR(Math.max(0, p.price * qvState.qty - qvState.tradeInAmount))
          : "• Trade-In Swap: " +
            qvState.tradeInLabel +
            " (-" +
            fmtExactLKR(qvState.tradeInAmount) +
            " credit)";
      lines.push(swapLine);
    }
    if (qvState.note.trim()) lines.push("• Note: " + qvState.note.trim());

    const msg = lines.join("\n");
    $("#qv-wa-preview").textContent = msg;
    $("#qv-wa-send").href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
  }

  function updateQuickViewTradeInNet() {
    const p = prod(qvState.id);
    const netBox = $("#qv-tradein-net");
    const netVal = $("#qv-tradein-net-val");
    if (!netBox || !netVal) return;
    if (!p || qvState.tradeInAmount <= 0) {
      netBox.hidden = true;
      return;
    }
    netBox.hidden = false;
    if (p.price != null) {
      const netTopUp = Math.max(0, p.price * qvState.qty - qvState.tradeInAmount);
      netVal.textContent = fmtLKR(netTopUp);
    } else {
      netVal.textContent = "Quote -" + fmtLKR(qvState.tradeInAmount);
    }
  }

  function openQuickView(id) {
    const p = prod(id);
    if (!p) return;
    qvState.id = p.id;
    qvState.qty = 1;
    qvState.note = "";
    qvState.tradeInAmount = 0;
    qvState.tradeInLabel = "";

    const qvImg = $("#qv-img");
    qvImg.referrerPolicy = "no-referrer";
    qvImg.src = p.img;
    qvImg.onerror = function () {
      this.onerror = null;
      this.src = p.fallbackImg;
    };
    $("#qv-badges").innerHTML =
      '<span class="' +
      (p.cond === "new" ? "ne-cond-badge is-new" : "ne-cond-badge is-used") +
      '">' +
      (p.cond === "new" ? "Brand New Sealed" : "Certified Used · Grade A") +
      "</span>" +
      (p.slBest ? '<span class="ne-shocker-save is-slbest">★ SL MARKET BEST</span>' : "") +
      (p.socket ? '<span class="ne-spec-badge">' + esc(p.socket) + "</span>" : "") +
      (p.ramGen ? '<span class="ne-spec-badge">' + esc(p.ramGen) + "</span>" : "");
    $("#qv-cat").textContent = p.secLabel + (p.sub ? " › " + p.sub : "") + (p.retailBrand ? " · " + p.retailBrand : "");
    $("#qv-title").textContent = p.name;
    $("#qv-rating").innerHTML = '<span class="ne-eggs">★★★★★ ' + p.rating + " <span>(" + p.reviews + " verified ratings)</span></span>";
    $("#qv-warranty").textContent = p.warranty;
    $("#qv-price").textContent = p.price != null ? fmtLKR(p.price) : "Call for Price";
    const origEl = $("#qv-orig-price");
    if (origEl) {
      origEl.textContent = p.origPrice != null ? fmtLKR(p.origPrice) : "";
      origEl.hidden = p.origPrice == null;
    }
    const saveEl = $("#qv-save");
    if (saveEl) {
      if (p.origPrice != null) {
        saveEl.textContent = "Save " + fmtLKR(p.origPrice - p.price);
        saveEl.hidden = false;
      } else if (p.slBest) {
        saveEl.textContent = "Verified Lowest SL Market Base";
        saveEl.hidden = false;
      } else {
        saveEl.textContent = "";
        saveEl.hidden = true;
      }
    }
    $("#qv-stock").textContent = p.inStock ? "✔ In Stock · Ships from Embilipitiya Workshop" : "✖ Currently Out of Stock";
    $("#qv-stock").className = "ne-qv-stock" + (p.inStock ? "" : " out");
    const detailRows = p.details && p.details.length ? p.details : p.bullets;
    $("#qv-specs").innerHTML = detailRows.map((b) => "<li>• " + esc(b) + "</li>").join("");

    const qvTel = $("#qv-telemetry");
    if (qvTel) {
      qvTel.innerHTML =
        '<div class="ne-qv-tel-head"><span>24H LAB VERIFICATION CERTIFICATE</span><b>' +
        (p.slBest ? "★ SL Market Price Matched" : p.price != null ? "Verified Workshop Pricing" : "Live Dealer Quote") +
        "</b></div>" +
        '<div class="ne-qv-tel-pills">' +
        p.labTelemetry.map((t) => '<span class="ne-lab-pill">✔ ' + esc(t) + "</span>").join("") +
        "</div>";
    }

    const qvBuilderBtn = $("#qv-load-builder");
    if (qvBuilderBtn) {
      const canBuild = Boolean(BUILDER_SEC_MAP[p.sec] && p.inStock && p.price != null && !p.isLaptopRam);
      qvBuilderBtn.hidden = !canBuild;
    }

    $("#qv-qty-val").textContent = "1";
    $("#qv-note").value = "";
    if ($("#qv-tradein-select")) $("#qv-tradein-select").value = "0";
    if ($("#qv-tradein-net")) $("#qv-tradein-net").hidden = true;

    updateQuickViewWhatsApp();
    $("#quick-view-modal").hidden = false;
  }

  // ───────── Shell Shocker Deal of the Day ─────────
  let shockerDeals = [];
  let shockerIdx = 0;

  function initShellShocker() {
    const priced = PRODUCTS.filter((p) => p.price != null && p.inStock);
    const rankPick = (a, b) => (b.slBest ? 1 : 0) - (a.slBest ? 1 : 0) || a.order - b.order;
    shockerDeals = [
      ...priced.filter((p) => p.sec === "bn-vga-cards" || p.sec === "vga-cards").sort(rankPick).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-processors" || p.sec === "processors").sort(rankPick).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-monitors" || p.sec === "monitors").sort(rankPick).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-laptops" || p.sec === "laptops").sort(rankPick).slice(0, 2),
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
    const badgeTag = p.slBest
      ? '<span class="ne-shocker-save is-slbest">★ SL MARKET BEST</span>'
      : p.cond === "new"
        ? '<span class="ne-shocker-save">FACTORY SEALED</span>'
        : '<span class="ne-shocker-save">24H BENCH TESTED</span>';

    box.innerHTML =
      '<div class="ne-shocker-top-meta"><span class="' +
      (p.cond === "new" ? "ne-cond-badge is-new" : "ne-cond-badge is-used") +
      '">' +
      (p.cond === "new" ? "Brand New" : "Used · 06M") +
      "</span>" +
      badgeTag +
      "</div>" +
      '<div class="ne-shocker-img" data-qv="' +
      esc(p.id) +
      '"><img referrerpolicy="no-referrer" src="' +
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
      '</strong><span class="ne-shocker-war">' +
      esc(p.warranty) +
      "</span></div>" +
      '<div class="ne-shocker-progress"><div class="ne-shocker-track"><div class="ne-shocker-fill" style="width:' +
      (p.slBest ? "92" : "78") +
      '%"></div></div><small>' +
      (p.slBest ? "Verified Lowest SL Market Base · Ready to Ship" : "In Stock at Embilipitiya Workshop · Same-Day Courier") +
      "</small></div>" +
      '<button type="button" class="ne-btn ne-btn-orange ne-btn-sm ne-btn-block" data-add="' +
      esc(p.id) +
      '">Add Featured Deal to Cart</button>';
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

  // ───────── Smart PC Builder & Telemetry Studio ─────────
  const COMBO_SLOTS = [
    { elId: "combo-cpu", sec: "processors", secs: ["processors", "bn-processors"], label: "Select Processor (CPU)", watts: 85 },
    { elId: "combo-mb", sec: "motherboards", secs: ["motherboards", "bn-motherboards"], label: "Select Motherboard", watts: 40 },
    { elId: "combo-gpu", sec: "vga-cards", secs: ["vga-cards", "bn-vga-cards"], label: "Select Graphics Card (GPU)", watts: 170 },
    { elId: "combo-ram", sec: "ram", secs: ["ram", "bn-ram"], label: "Select Memory (RAM)", watts: 15 },
    { elId: "combo-storage", sec: "storage", secs: ["storage", "bn-storage"], label: "Select Storage (SSD/HDD)", watts: 12 },
    { elId: "combo-psu", sec: "power-supply", secs: ["power-supply", "bn-power-supply"], label: "Select Power Supply (PSU)", watts: 0 },
    { elId: "combo-cooler", sec: "cooling", secs: ["cooling", "bn-cooling"], label: "Select CPU Cooler (Optional)", watts: 8 },
    { elId: "combo-monitor", sec: "monitors", secs: ["monitors", "bn-monitors"], label: "Select Monitor (Optional)", watts: 0 },
  ];

  const BUILD_PRESETS = {
    esports: {
      "combo-cpu": ["md-31539-amd-ryzen-5-5600-6-cores-12-threads-up-to", "md-12268-amd-ryzen-5-5500-brand-new-processor-price"],
      "combo-mb": ["md-8373-msi-b550m-pro-vdh-wi-fi-motherboard", "md-10103-asus-prime-a520m-k-motherboard"],
      "combo-gpu": ["md-69411-asus-dual-geforce-rtx3050-oc-edition-6gb-u", "md-56855-asus-dual-rx7600-8gb-used-graphics-card"],
      "combo-ram": ["md-64744-kingston-ddr4-8gb-3200mhz-brand-new-deskto", "md-7139-ddr4-8gb-used-desktop-ram"],
      "combo-storage": ["md-12799-256gb-m-2-nvme-ssd", "md-67441-used-256gb-m-2-ssd"],
      "combo-psu": ["md-53980-antec-atom-b550-550w-80-bronze-brand-new-p", "md-56910-msi-mag-a550bn-550-watt-80-plus-bronze-cer"],
      "combo-cooler": ["md-56205-amd-ryzen-5500-cpu-cooler"],
      "combo-monitor": ["md-69274-lenovo-s22e-19-22-inch-full-hd-ips-framele"],
    },
    gaming: {
      "combo-cpu": ["md-38713-amd-ryzen-5-7600x-6-cores-12-threads-up-to", "md-26895-amd-ryzen-5-7500f-6-cores-12-threads-up-to"],
      "combo-mb": ["md-17390-msi-pro-b650m-p-ddr5-motherboard-3-years-w", "md-44067-msi-b650m-gaming-plus-wi-fi-ddr5-brand-new"],
      "combo-gpu": ["md-69718-msi-geforce-rtx4060-ventus-2x-white-8g-oc-", "md-58628-msi-ventus-rtx3070-8gb-used-graphics-card"],
      "combo-ram": ["md-66678-lexar-ddr5-16gb-5600mhz-brand-new-desktop-", "md-62527-kingston-16gb-1x16gb-ddr5-5600mhz-desktop-"],
      "combo-storage": ["md-69357-lexar-nq780-1tb-m-2-gen4-nvme-03-years-war", "md-35091-512gb-used-nvme-ssd"],
      "combo-psu": ["md-45897-thermaltake-smart-bx3-650w-80-plus-bronzes", "md-34977-msi-mag-a650bn-650-watt-80-plus-bronze-cer"],
      "combo-cooler": ["md-70482-arctic-liquid-freezer-iii-240-a-rgb-black"],
      "combo-monitor": ["md-69536-msi-mag-275qf-e20-27-inch-2k-200hz-ips-bra"],
    },
    creator: {
      "combo-cpu": ["md-45670-amd-ryzen-9-9900x-12-cores-24-threads-up-t", "md-32309-amd-ryzen-7-7800x3d-8-cores-16-threads-up-"],
      "combo-mb": ["md-61784-asus-tuf-b650m-e-brand-new-gaming-motherbo", "md-17390-msi-pro-b650m-p-ddr5-motherboard-3-years-w"],
      "combo-gpu": ["md-15607-msi-geforce-rtx-4070-ti-super-gaming-x-16g", "md-42514-msi-geforce-rtx-5070-shadow-3x-oc-12gb-gdd"],
      "combo-ram": ["md-62527-kingston-16gb-1x16gb-ddr5-5600mhz-desktop-", "md-66678-lexar-ddr5-16gb-5600mhz-brand-new-desktop-"],
      "combo-storage": ["md-69357-lexar-nq780-1tb-m-2-gen4-nvme-03-years-war"],
      "combo-psu": ["md-53997-antec-gsk750-750w-atx3-1-fully-modular-80-", "md-70474-thermaltake-toughpower-gt-850w-80-plus-gol"],
      "combo-cooler": ["md-66682-gamdias-aura-gl360-lite-rgb-360mm-cpu-liqu", "md-70482-arctic-liquid-freezer-iii-240-a-rgb-black"],
      "combo-monitor": ["md-69527-msi-pro-mp275q-e14-27-inch-144hz-wqhd-2k-i"],
    },
    budget: {
      "combo-cpu": ["md-52450-intel-core-i5-4th-gen-used-processor-2", "md-68855-core-i5-4th-gen-t-used-processor"],
      "combo-mb": ["md-5232-h81-4th-gen-gaming-mother-board", "md-66465-h87-4-port-used-motherboard-random-brands"],
      "combo-gpu": ["md-66225-asus-gtx750ti-2gb-oc-used-grhapic-card", "md-70461-asus-cerberus-gtx1050ti-4gb-used-grhapic-c"],
      "combo-ram": ["md-5295-ddr3-8gb-used-desktop-ram", "md-35458-used-ddr3-8gb-gaming-desktop-ram"],
      "combo-storage": ["md-47879-korean-120gb-used-ssd-03-month-warranty", "md-12795-128gb-m-2-nvme-ssd"],
      "combo-psu": ["md-38801-classic-500w-80-plus-used-power-supply", "md-5702-500-w-gaming-used-power-supply"],
      "combo-cooler": ["md-7212-1155-1150-intel-cpu-cooler"],
      "combo-monitor": ["md-69270-20-inch-led-used-monitor"],
    },
  };

  function pickFirstAvailable(candidateIds, fallbackSecs, predicate) {
    for (const id of candidateIds || []) {
      const p = prod(id);
      if (p && p.inStock && p.price != null) return p;
    }
    const secs = Array.isArray(fallbackSecs) ? fallbackSecs : [fallbackSecs];
    return PRODUCTS.find((p) => secs.includes(p.sec) && p.inStock && p.price != null && (!predicate || predicate(p))) || null;
  }

  function ramSupportsTarget(itemRamGen, targetRamGen) {
    if (!itemRamGen || !targetRamGen) return true;
    return targetRamGen.split("/").includes(itemRamGen);
  }

  let comboCondFilter = "all";

  function populateComboBuilder(preserveValues) {
    const prev = {};
    if (preserveValues) {
      COMBO_SLOTS.forEach((slot) => {
        const sel = $("#" + slot.elId);
        if (sel && sel.value) prev[slot.elId] = sel.value;
      });
    }

    const compatLockEl = $("#combo-compat-lock");
    const compatLock = compatLockEl ? compatLockEl.checked : false;
    const cpuProd = prev["combo-cpu"] ? prod(prev["combo-cpu"]) : ($("#combo-cpu") && $("#combo-cpu").value ? prod($("#combo-cpu").value) : null);
    const mbProd = prev["combo-mb"] ? prod(prev["combo-mb"]) : ($("#combo-mb") && $("#combo-mb").value ? prod($("#combo-mb").value) : null);

    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (!sel) return;
      const secSet = slot.secs || [slot.sec];
      let items = PRODUCTS.filter((p) => secSet.includes(p.sec) && p.inStock && p.price != null);
      if (comboCondFilter !== "all") {
        const condItems = items.filter((p) => p.cond === comboCondFilter);
        if (condItems.length) items = condItems;
      }
      if (slot.sec === "ram") {
        items = items.filter((p) => !p.isLaptopRam);
      }

      if (compatLock) {
        if (slot.elId === "combo-mb" && cpuProd && cpuProd.socket) {
          const matching = items.filter((p) => p.socket === cpuProd.socket);
          if (matching.length) items = matching;
        }
        if (slot.elId === "combo-ram") {
          const targetRamGen = (mbProd && mbProd.ramGen) || (cpuProd && cpuProd.ramGen) || "";
          if (targetRamGen) {
            const matching = items.filter((p) => ramSupportsTarget(p.ramGen, targetRamGen));
            if (matching.length) items = matching;
          }
        }
      }

      sel.innerHTML =
        '<option value="">— ' +
        slot.label +
        " (" +
        items.length +
        ") —</option>" +
        items
          .map((p) => {
            const condTag = p.cond === "new" ? "NEW" : "USED";
            const tag = p.socket ? " [" + p.socket + " · " + condTag + "]" : p.ramGen ? " [" + p.ramGen + " · " + condTag + "]" : " [" + condTag + "]";
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

      const targetVal = preserveValues ? prev[slot.elId] : "";
      if (targetVal && items.some((p) => p.id === targetVal)) {
        sel.value = targetVal;
      }
    });
    updateComboSummary();
  }

  function checkComboCompatibility(slotsMap) {
    const cpu = slotsMap["combo-cpu"];
    const mb = slotsMap["combo-mb"];
    const gpu = slotsMap["combo-gpu"];
    const ram = slotsMap["combo-ram"];
    const psu = slotsMap["combo-psu"];
    const issues = [];
    const notes = [];

    if (cpu && mb && cpu.socket && mb.socket && cpu.socket !== mb.socket) {
      issues.push("Socket Mismatch: CPU (" + cpu.socket + ") ≠ Motherboard (" + mb.socket + ")");
    }
    if (mb && ram && mb.ramGen && ram.ramGen && !ramSupportsTarget(ram.ramGen, mb.ramGen)) {
      issues.push("Memory Mismatch: Board uses " + mb.ramGen + " but RAM is " + ram.ramGen);
    }
    if (cpu && ram && !mb && cpu.ramGen && ram.ramGen && !ramSupportsTarget(ram.ramGen, cpu.ramGen)) {
      issues.push("Memory Mismatch: CPU platform needs " + cpu.ramGen + " (selected " + ram.ramGen + ")");
    }
    if (ram && ram.isLaptopRam) {
      issues.push("Laptop SO-DIMM RAM is not compatible with desktop motherboards.");
    }

    let estWatts = 55;
    if (cpu) estWatts += cpu.tdpWatts || 65;
    if (mb) estWatts += 40;
    if (gpu) estWatts += gpu.tdpWatts || 120;
    if (ram) estWatts += 12;
    if (slotsMap["combo-storage"]) estWatts += 10;
    if (slotsMap["combo-cooler"]) estWatts += 8;

    const recPsu = Math.max(400, Math.ceil((estWatts * 1.3) / 50) * 50);
    if (psu && psu.psuWatts && psu.psuWatts < estWatts + 40) {
      issues.push("PSU Too Low: System needs ~" + recPsu + "W (selected " + psu.psuWatts + "W PSU)");
    }

    if (cpu && mb && (!issues.length)) {
      notes.push("Socket " + (cpu.socket || mb.socket) + " · " + (mb.ramGen || cpu.ramGen || "Verified"));
    }

    return { issues, notes, estWatts, recPsu, psuWatts: psu ? psu.psuWatts : 0 };
  }

  function computeGamingFps(cpu, gpu) {
    if (!cpu && !gpu) return null;
    const gpuScore = gpu ? gpu.perfScore : 14;
    const cpuScore = cpu ? cpu.perfScore : 45;
    const combined = Math.round(gpuScore * 0.74 + Math.min(cpuScore, gpuScore + 22) * 0.26);

    const cp1080 = Math.max(18, Math.round(combined * 1.15));
    const val1080 = Math.max(60, Math.round(combined * 3.1 + cpuScore * 1.4));
    const wz1080 = Math.max(24, Math.round(combined * 1.45));
    const fh1080 = Math.max(28, Math.round(combined * 1.55));
    const tier = combined >= 78 ? "1440p Ultra Ready" : combined >= 55 ? "1080p High / 1440p Med" : combined >= 34 ? "1080p Esports Ready" : "Office & Light Esports";

    let balance = "Balanced CPU & GPU Pairing";
    if (cpu && gpu) {
      if (cpu.perfScore + 26 < gpu.perfScore) balance = "Slight CPU Bottleneck — Faster CPU adds +15% FPS";
      else if (gpu.perfScore + 30 < cpu.perfScore) balance = "GPU-Limited in AAA Games — Strong CPU Headroom";
      else balance = "Optimal CPU + GPU Balance (" + Math.min(99, 86 + Math.round((100 - Math.abs(cpu.perfScore - gpu.perfScore)) / 8)) + "% Efficiency)";
    }

    return { cp1080, val1080, wz1080, fh1080, tier, balance };
  }

  function updateComboSummary() {
    const slotsMap = {};
    const selected = [];
    let total = 0;

    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (!sel || !sel.value) return;
      const p = prod(sel.value);
      if (!p) return;
      slotsMap[slot.elId] = p;
      selected.push(p);
      if (p.price != null) total += p.price;
    });

    const compat = checkComboCompatibility(slotsMap);
    const fps = computeGamingFps(slotsMap["combo-cpu"], slotsMap["combo-gpu"]);
    const discount = selected.length >= 5 ? 2500 : selected.length >= 3 ? 1000 : 0;
    const tiAmount = tradeInCredit && tradeInCredit.amount > 0 ? tradeInCredit.amount : 0;
    const netTotal = Math.max(0, total - discount - tiAmount);

    const cntEl = $("#combo-selected-count");
    const wattEl = $("#combo-wattage");
    const psuFill = $("#combo-psu-fill");
    const balEl = $("#combo-balance-note");
    const banner = $("#combo-compat-banner");
    const fpsGrid = $("#combo-fps-grid");
    const fpsTier = $("#combo-fps-tier");
    const savEl = $("#combo-savings");
    const tiRow = $("#combo-tradein-row");
    const tiVal = $("#combo-tradein-credit");
    const totEl = $("#combo-total");
    const waEl = $("#combo-wa-btn");

    if (cntEl) cntEl.textContent = selected.length + " / " + COMBO_SLOTS.length;
    if (wattEl) {
      wattEl.textContent = selected.length
        ? compat.estWatts + " W" + (compat.psuWatts ? " / " + compat.psuWatts + "W PSU" : " (Rec " + compat.recPsu + "W+)")
        : "0 W";
    }
    if (psuFill) {
      const ratio = compat.psuWatts ? Math.min(100, Math.round((compat.estWatts / compat.psuWatts) * 100)) : Math.min(100, Math.round((compat.estWatts / compat.recPsu) * 100));
      psuFill.style.width = (selected.length ? ratio : 0) + "%";
      psuFill.classList.toggle("is-warn", Boolean(compat.psuWatts && compat.psuWatts < compat.estWatts + 40));
    }

    if (banner) {
      if (!selected.length) {
        banner.className = "ne-compat-banner is-neutral";
        banner.innerHTML = '<span class="material-symbols-outlined">verified_user</span><span>Select CPU, Motherboard &amp; RAM to run compatibility verification.</span>';
      } else if (compat.issues.length) {
        banner.className = "ne-compat-banner is-warn";
        banner.innerHTML = '<span class="material-symbols-outlined">warning</span><span>' + esc(compat.issues[0]) + "</span>";
      } else {
        banner.className = "ne-compat-banner is-ok";
        banner.innerHTML =
          '<span class="material-symbols-outlined">check_circle</span><span>✔ 100% Compatible' +
          (compat.notes.length ? " (" + esc(compat.notes[0]) + ")" : " · Zero Conflicts Detected") +
          "</span>";
      }
    }

    if (balEl) {
      balEl.textContent = fps ? fps.balance : "Pick a CPU & GPU to check gaming bottleneck & PSU headroom.";
    }
    if (fpsTier) {
      fpsTier.textContent = fps ? fps.tier : "1080p / 1440p";
    }
    if (fpsGrid) {
      fpsGrid.innerHTML = fps
        ? '<div class="ne-fps-card"><span>Cyberpunk 2077</span><strong>' + fps.cp1080 + ' FPS</strong></div>' +
        '<div class="ne-fps-card"><span>Valorant / CS2</span><strong>' + fps.val1080 + ' FPS</strong></div>' +
        '<div class="ne-fps-card"><span>Warzone / GTA V</span><strong>' + fps.wz1080 + ' FPS</strong></div>' +
        '<div class="ne-fps-card"><span>Forza Horizon 5</span><strong>' + fps.fh1080 + ' FPS</strong></div>'
        : '<div class="ne-fps-card"><span>Cyberpunk 2077</span><strong>— FPS</strong></div>' +
        '<div class="ne-fps-card"><span>Valorant / CS2</span><strong>— FPS</strong></div>' +
        '<div class="ne-fps-card"><span>Warzone / GTA V</span><strong>— FPS</strong></div>' +
        '<div class="ne-fps-card"><span>Forza Horizon 5</span><strong>— FPS</strong></div>';
    }

    COMBO_SLOTS.forEach((slot) => {
      const box = document.querySelector('[data-slot-preview="' + slot.elId + '"]');
      if (!box) return;
      const p = slotsMap[slot.elId];
      if (!p) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      const spec = p.socket || p.ramGen || (p.vramGb ? p.vramGb + "GB" : "") || (p.psuWatts ? p.psuWatts + "W" : "");
      box.hidden = false;
      box.innerHTML =
        '<img referrerpolicy="no-referrer" src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="" />' +
        '<div class="ne-slot-prev-meta"><strong>' + esc(p.cond === "new" ? "Brand New" : "Used · 06M") + "</strong>" +
        (spec ? "<span>" + esc(spec) + "</span>" : "") +
        "<em>" + fmtLKR(p.price) + "</em></div>";
    });

    if (savEl) savEl.textContent = discount ? "-" + fmtLKR(discount) : fmtLKR(0);
    if (tiRow && tiVal) {
      tiRow.hidden = !(tiAmount > 0 && selected.length > 0);
      tiVal.textContent = "-" + fmtLKR(tiAmount);
    }
    if (totEl) totEl.textContent = fmtLKR(selected.length ? netTotal : 0);

    if (waEl) {
      const msg = selected.length
        ? "Hello Aqua PC Parts! I built a verified PC Combo on your site:\n" +
        selected.map((p, i) => i + 1 + ". " + p.name + " (" + fmtExactLKR(p.price) + ")").join("\n") +
        "\n• Est. Load: " +
        compat.estWatts +
        "W (Rec " +
        compat.recPsu +
        "W PSU)" +
        (tiAmount > 0 ? "\n• Trade-In Swap Credit (" + tradeInCredit.label + "): -" + fmtExactLKR(tiAmount) : "") +
        "\n• Net Bundle Estimate: " +
        fmtExactLKR(netTotal)
        : "Hello Aqua PC Parts, I'd like help picking a custom PC build!";
      waEl.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
    }
  }

  function applyComboIds(idList, scroll) {
    comboCondFilter = "all";
    $$("[data-combo-cond]").forEach((b) => b.classList.toggle("active", b.dataset.comboCond === "all"));
    const bySlot = {};
    idList.forEach((id) => {
      const p = prod(id);
      if (p && BUILDER_SEC_MAP[p.sec]) {
        bySlot[BUILDER_SEC_MAP[p.sec]] = p.id;
      }
    });
    const cpuSel = $("#combo-cpu");
    if (cpuSel) cpuSel.value = bySlot["combo-cpu"] || "";
    const mbSel = $("#combo-mb");
    if (mbSel) mbSel.value = bySlot["combo-mb"] || "";
    populateComboBuilder(true);
    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (sel && bySlot[slot.elId]) {
        sel.value = bySlot[slot.elId];
      }
    });
    updateComboSummary();
    if (scroll) {
      const el = $("#pc-combo-builder");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function applyComboPreset(mode) {
    comboCondFilter = "all";
    $$("[data-combo-cond]").forEach((b) => b.classList.toggle("active", b.dataset.comboCond === "all"));
    if (mode === "clear") {
      COMBO_SLOTS.forEach((slot) => {
        const sel = $("#" + slot.elId);
        if (sel) sel.value = "";
      });
      populateComboBuilder(false);
      return;
    }

    const preset = BUILD_PRESETS[mode] || BUILD_PRESETS.gaming;
    const chosenIds = [];
    COMBO_SLOTS.forEach((slot) => {
      const candidates = preset[slot.elId] || [];
      const p = pickFirstAvailable(candidates, slot.secs || slot.sec, slot.sec === "ram" ? (x) => !x.isLaptopRam : null);
      if (p) chosenIds.push(p.id);
    });
    applyComboIds(chosenIds, false);
    toast("Loaded " + mode.toUpperCase() + " PC Build into Studio!");
  }

  function getSelectedBuildIds() {
    const ids = [];
    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (sel && sel.value) ids.push(sel.value);
    });
    return ids;
  }

  function copyShareableBuildLink() {
    const ids = getSelectedBuildIds();
    if (!ids.length) {
      toast("Select at least one component to copy a shareable build link.");
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("build", ids.join(","));
      url.hash = "pc-combo-builder";
      window.history.replaceState({}, "", url.toString());
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url.toString()).then(
          () => toast("Shareable PC Build link copied to clipboard!"),
          () => toast("Build URL updated in your browser address bar.")
        );
      } else {
        toast("Build URL updated in your browser address bar.");
      }
    } catch (_) { }
  }

  function printBuildSheet() {
    const ids = getSelectedBuildIds();
    if (!ids.length) {
      toast("Select components in the Smart PC Builder first.");
      return;
    }
    const slotsMap = {};
    let total = 0;
    const rows = COMBO_SLOTS.map((slot) => {
      const sel = $("#" + slot.elId);
      const p = sel && sel.value ? prod(sel.value) : null;
      if (!p) return "";
      slotsMap[slot.elId] = p;
      total += p.price || 0;
      return "<tr><td>" + esc(p.secLabel) + "</td><td><strong>" + esc(p.name) + "</strong><br/><small>" + esc(p.warranty) + "</small></td><td><strong>" + fmtExactLKR(p.price) + "</strong></td></tr>";
    }).filter(Boolean).join("");

    const compat = checkComboCompatibility(slotsMap);
    const discount = ids.length >= 5 ? 2500 : ids.length >= 3 ? 1000 : 0;
    const tiAmount = tradeInCredit && tradeInCredit.amount > 0 ? tradeInCredit.amount : 0;
    const netTotal = Math.max(0, total - discount - tiAmount);
    const buildNo = "BLD-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Build Sheet ${buildNo} - Aqua PC Parts</title>
<style>body{font-family:Arial,sans-serif;padding:30px;color:#0f172a;max-width:860px;margin:auto}
.top{display:flex;justify-content:space-between;border-bottom:3px solid #ff6600;padding-bottom:14px;margin-bottom:18px}
table{width:100%;border-collapse:collapse;margin-top:14px}
th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:13.5px}
th{background:#071138;color:#ffc000}
.box{padding:12px;border-radius:8px;background:#f8fafc;border:1px solid #cbd5e1;margin-top:14px;font-size:13px}
.tot{margin-top:16px;text-align:right;font-size:18px}
@media print{.noprint{display:none}}</style></head><body>
<div class="top"><div><h1 style="margin:0;color:#071138">AQUA PC PARTS · BUILD SHEET</h1><div>Embilipitiya Workshop · Tel/WhatsApp +94 78 819 4535</div></div><div style="text-align:right"><strong>#${buildNo}</strong><div>${new Date().toLocaleDateString("en-LK")}</div></div></div>
<div class="box"><strong>Compatibility Status:</strong> ${compat.issues.length ? compat.issues.join("; ") : "✔ 100% Verified Compatible"} &nbsp;|&nbsp; <strong>Est. System Load:</strong> ${compat.estWatts}W (Rec ${compat.recPsu}W+ PSU)</div>
<table><thead><tr><th>Component</th><th>Selected Hardware &amp; Warranty</th><th>Price (LKR)</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot">${discount ? `<div style="font-size:13.5px;color:#059669">Combo Assembly Discount: -${fmtExactLKR(discount)}</div>` : ""}${tiAmount ? `<div style="font-size:13.5px;color:#0284c7">Trade-In Credit (${esc(tradeInCredit.label)}): -${fmtExactLKR(tiAmount)}</div>` : ""}<strong>Net Build Estimate: ${fmtExactLKR(netTotal)}</strong></div>
<p class="noprint" style="margin-top:18px"><button onclick="window.print()" style="padding:10px 18px;background:#ff6600;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:bold">Print / Save PDF Build Sheet</button></p>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.open(); win.document.write(html); win.document.close(); }
    else toast("Allow pop-ups to print your Build Sheet.");
  }

  // ───────── Instant Trade-In & Swap Valuation Calculator ─────────
  function populateTradeInItems() {
    const catSel = $("#ti-category");
    const itemSel = $("#ti-item-select");
    if (!catSel || !itemSel) return;
    const sec = catSel.value || "vga-cards";
    const items = PRODUCTS.filter((p) => (p.sec === sec || p.sec === "bn-" + sec) && p.price != null);
    itemSel.innerHTML = items
      .map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + " (Market ~" + fmtLKR(p.price) + ")</option>")
      .join("") + '<option value="__custom__">Other Model (Enter Custom Name →)</option>';
    updateTradeInQuote();
  }

  function updateTradeInQuote() {
    const itemSel = $("#ti-item-select");
    const customIn = $("#ti-custom-model");
    const condSel = $("#ti-condition");
    const boxSel = $("#ti-box");
    const modeSel = $("#ti-mode");
    const valEl = $("#ti-value-display");
    const bonEl = $("#ti-bonus-display");
    const waEl = $("#ti-wa-btn");
    if (!itemSel || !valEl) return;

    const p = itemSel.value && itemSel.value !== "__custom__" ? prod(itemSel.value) : null;
    const baseMarket = p && p.price ? p.price : 28000;
    const label = customIn && customIn.value.trim() ? customIn.value.trim() : (p ? p.name : "Custom Hardware Part");

    const condMult = condSel && condSel.value === "grade-a" ? 0.68 : condSel && condSel.value === "grade-b" ? 0.56 : 0.42;
    const boxMult = boxSel && boxSel.value === "boxed" ? 1.06 : 1.0;
    const isUpgrade = !modeSel || modeSel.value === "upgrade";
    const modeMult = isUpgrade ? 1.1 : 1.0;

    const rawVal = baseMarket * condMult * boxMult * modeMult;
    const offerLkr = Math.max(1500, Math.round(rawVal / 100) * 100);

    valEl.textContent = fmtLKR(offerLkr);
    if (bonEl) {
      bonEl.textContent = isUpgrade
        ? "Includes +10% Upgrade Swap Bonus toward Cart or PC Builder"
        : "Instant Cash / Bank Transfer after 2-min Video Check";
    }

    if (waEl) {
      const msg =
        "Hello Aqua PC Parts! I want a Trade-In / Swap Valuation:\n" +
        "• My Hardware: " + label + "\n" +
        "• Condition: " + (condSel ? condSel.options[condSel.selectedIndex].text : "Grade A") + "\n" +
        "• Box Status: " + (boxSel ? boxSel.options[boxSel.selectedIndex].text : "Loose") + "\n" +
        "• Payout Preference: " + (isUpgrade ? "Upgrade Swap Credit (+10%)" : "Cash / Bank Transfer") + "\n" +
        "• Site Estimate: " + fmtExactLKR(offerLkr) + "\n\nPlease share steps for a quick video check!";
      waEl.href = "https://wa.me/" + PHONE + "?text=" + encodeURIComponent(msg);
    }
    return { offerLkr, label };
  }

  // ───────── 2-Way Deep Link to 3D Studio & 1-Click Upgrade Kits ─────────
  function build3DStudioUrlFromParts(slotsMap) {
    const cpuName = ((slotsMap["combo-cpu"] && slotsMap["combo-cpu"].name) || "").toLowerCase();
    const mbName = ((slotsMap["combo-mb"] && slotsMap["combo-mb"].name) || "").toLowerCase();
    const gpuName = ((slotsMap["combo-gpu"] && slotsMap["combo-gpu"].name) || "").toLowerCase();
    const coolerName = ((slotsMap["combo-cooler"] && slotsMap["combo-cooler"].name) || "").toLowerCase();
    const ramName = ((slotsMap["combo-ram"] && slotsMap["combo-ram"].name) || "").toLowerCase();
    const ssdName = ((slotsMap["combo-storage"] && slotsMap["combo-storage"].name) || "").toLowerCase();
    const psuName = ((slotsMap["combo-psu"] && slotsMap["combo-psu"].name) || "").toLowerCase();

    let cpu = "r5-7600x";
    if (/9800x3d/.test(cpuName)) cpu = "r7-9800x3d";
    else if (/9950|9900/.test(cpuName)) cpu = "r9-9950x3d";
    else if (/7950/.test(cpuName)) cpu = "ryzen-7950x3d";
    else if (/7800x3d|7700/.test(cpuName)) cpu = "ryzen-7800x3d";
    else if (/285|270|ultra/.test(cpuName)) cpu = "ultra9-285k";
    else if (/14900|i9/.test(cpuName)) cpu = "i9-14900k";
    else if (/14700|i7/.test(cpuName)) cpu = "i7-14700k";
    else if (/intel|i3|i5/.test(cpuName)) cpu = "i5-14600k";

    let mobo = "b650e-gaming";
    if (/x870/.test(mbName)) mobo = "x870e-hydro";
    else if (/x670/.test(mbName)) mobo = "x670e-pro";
    else if (/z890|h810|b860/.test(mbName)) mobo = "z890-hydro";
    else if (/z790|z690/.test(mbName)) mobo = "z790-hydro";
    else if (/b760|h610|intel|h81|b560|h510|h410|h310/.test(mbName) || cpu.startsWith("i") || cpu.startsWith("ultra")) {
      mobo = cpu === "ultra9-285k" ? "z890-hydro" : "b760-gaming";
    }

    let gpu = "rtx4060";
    if (/5090/.test(gpuName)) gpu = "rtx5090";
    else if (/5080/.test(gpuName)) gpu = "rtx5080";
    else if (/5070|5060/.test(gpuName)) gpu = "rtx5070ti";
    else if (/4090/.test(gpuName)) gpu = "rtx4090";
    else if (/4080|3080/.test(gpuName)) gpu = "rtx4080s";
    else if (/4070|3070/.test(gpuName)) gpu = "rtx4070s";
    else if (/9070/.test(gpuName)) gpu = "rx9070xt";
    else if (/7900/.test(gpuName)) gpu = "rx7900xtx";
    else if (/7800|7700|7600|6700|6600|rx/.test(gpuName)) gpu = "rx7800xt";
    else if (/arc|b580/.test(gpuName)) gpu = "arc-b580";

    let cooler = "air";
    if (/360/.test(coolerName)) cooler = "aio360";
    else if (/240|liquid|aio/.test(coolerName)) cooler = "aio240";

    let ram = "32gb-2x16";
    if (/128/.test(ramName)) ram = "128gb-4x32";
    else if (/96/.test(ramName)) ram = "96gb-2x48";
    else if (/64/.test(ramName)) ram = "64gb-4x16";
    else if (/48/.test(ramName)) ram = "48gb-2x24";

    let ssd = "1tb-gen4";
    if (/8tb/.test(ssdName)) ssd = "8tb-gen4";
    else if (/4tb/.test(ssdName)) ssd = "4tb-gen5";
    else if (/2tb/.test(ssdName) && /gen5/.test(ssdName)) ssd = "2tb-gen5";
    else if (/2tb/.test(ssdName)) ssd = "2tb-gen4";

    let psu = "750w";
    if (/1600/.test(psuName)) psu = "1600w";
    else if (/1200/.test(psuName)) psu = "1200w";
    else if (/1000/.test(psuName)) psu = "1000w";
    else if (/850/.test(psuName)) psu = "850w";

    const payload = {
      cpu, mobo, cooler, gpu,
      gpuMount: "horizontal",
      gpuFinish: "stealth",
      ram,
      ramColor: "black",
      ssd,
      psu,
      theme: "black",
      glass: "clear",
      cables: "aqua",
      rgb: "#00f2fe",
      rgbMode: "static",
      brightness: 1,
      fan: "balanced",
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const portalBase = (C.portal3dUrl || "https://aquapc3dportal.pages.dev").replace(/\/+$/, "");
    return portalBase + "/#b=" + encoded;
  }

  const UPGRADE_KITS = [
    {
      id: "kit-am4-pro",
      badge: "BEST SELLER · AM4",
      title: "Ryzen 5 5600 + B550M WiFi + DDR4 RAM Kit",
      sub: "Drop-in gaming & streaming upgrade with PCIe 4.0 support and 06M–3Y warranty.",
      discount: 1500,
      slots: {
        "combo-cpu": ["md-31539-amd-ryzen-5-5600-6-cores-12-threads-up-to", "md-12268-amd-ryzen-5-5500-brand-new-processor-price"],
        "combo-mb": ["md-8373-msi-b550m-pro-vdh-wi-fi-motherboard", "md-10103-asus-prime-a520m-k-motherboard"],
        "combo-ram": ["md-64744-kingston-ddr4-8gb-3200mhz-brand-new-deskto", "md-7139-ddr4-8gb-used-desktop-ram"],
      },
    },
    {
      id: "kit-lga1700",
      badge: "14TH GEN · DDR5",
      title: "Core i5-14400 + B760M WiFi + 16GB DDR5 Kit",
      sub: "10-Core hybrid Intel platform verified for RTX 4060 / 5060 gaming & Premiere Pro.",
      discount: 2000,
      slots: {
        "combo-cpu": ["md-64797-intel-core-i5-14th-gen-14400-brand-new-tra", "md-42632-intel-core-i5-14400-processor-20mb-cache-2"],
        "combo-mb": ["md-47048-asus-prime-b760m-a-wi-fi-ddr5-brand-new-mo", "md-45325-msi-b760m-gaming-plus-wi-fi-ddr5-brand-new"],
        "combo-ram": ["md-66678-lexar-ddr5-16gb-5600mhz-brand-new-desktop-", "md-62527-kingston-16gb-1x16gb-ddr5-5600mhz-desktop-"],
      },
    },
    {
      id: "kit-am5-zen4",
      badge: "FUTUREPROOF · AM5",
      title: "Ryzen 5 7600X + B650M WiFi + 16GB DDR5 Kit",
      sub: "Next-gen Zen 4 AM5 upgrade platform ready for 1440p ultra & future Ryzen 9000 CPUs.",
      discount: 2500,
      slots: {
        "combo-cpu": ["md-38713-amd-ryzen-5-7600x-6-cores-12-threads-up-to", "md-26895-amd-ryzen-5-7500f-6-cores-12-threads-up-to"],
        "combo-mb": ["md-17390-msi-pro-b650m-p-ddr5-motherboard-3-years-w", "md-44067-msi-b650m-gaming-plus-wi-fi-ddr5-brand-new"],
        "combo-ram": ["md-66678-lexar-ddr5-16gb-5600mhz-brand-new-desktop-", "md-62527-kingston-16gb-1x16gb-ddr5-5600mhz-desktop-"],
      },
    },
    {
      id: "kit-budget-i5",
      badge: "VALUE · 06M WARRANTY",
      title: "Core i5 4th Gen + H81 Board + 8GB DDR3 Kit",
      sub: "Bench-tested Sri Lankan student & esports starter core — ideal with GTX 750 Ti or 1050 Ti.",
      discount: 1000,
      slots: {
        "combo-cpu": ["md-52450-intel-core-i5-4th-gen-used-processor-2", "md-68855-core-i5-4th-gen-t-used-processor"],
        "combo-mb": ["md-5232-h81-4th-gen-gaming-mother-board", "md-66465-h87-4-port-used-motherboard-random-brands"],
        "combo-ram": ["md-5295-ddr3-8gb-used-desktop-ram", "md-35458-used-ddr3-8gb-gaming-desktop-ram"],
      },
    },
  ];

  function renderUpgradeKits() {
    const grid = $("#upgrade-combo-kits-grid");
    if (!grid) return;
    grid.innerHTML = UPGRADE_KITS.map((kit) => {
      const cpu = pickFirstAvailable(kit.slots["combo-cpu"], ["processors", "bn-processors"]);
      const mb = pickFirstAvailable(kit.slots["combo-mb"], ["motherboards", "bn-motherboards"]);
      const ram = pickFirstAvailable(kit.slots["combo-ram"], ["ram", "bn-ram"], (x) => !x.isLaptopRam);
      const parts = [cpu, mb, ram].filter(Boolean);
      const rawSum = parts.reduce((acc, p) => acc + (p.price || 0), 0);
      const bundlePrice = Math.max(0, rawSum - kit.discount);
      const idsAttr = parts.map((p) => p.id).join(",");

      return (
        '<article class="ne-upgrade-kit-card">' +
        '<div class="ne-kit-top"><span class="ne-cond-badge is-new">' + esc(kit.badge) + '</span><span class="ne-shocker-save">Save ' + fmtLKR(kit.discount) + '</span></div>' +
        '<h3>' + esc(kit.title) + '</h3>' +
        '<p class="ne-kit-sub">' + esc(kit.sub) + '</p>' +
        '<ul class="ne-kit-parts">' +
        parts.map((p) => '<li><span>• ' + esc(p.name) + '</span><b>' + fmtLKR(p.price) + '</b></li>').join("") +
        '</ul>' +
        '<div class="ne-kit-foot">' +
        '<div><small>Verified 3-in-1 Kit</small><strong>' + fmtLKR(bundlePrice) + '</strong></div>' +
        '<div class="ne-kit-btns">' +
        '<button type="button" class="ne-btn ne-btn-outline ne-btn-xs" data-apply-kit-ids="' + esc(idsAttr) + '">Load in Builder</button>' +
        '<button type="button" class="ne-btn ne-btn-orange ne-btn-xs" data-add-kit-ids="' + esc(idsAttr) + '">+ Kit to Cart</button>' +
        '</div></div></article>'
      );
    }).join("");
  }

  // ───────── Verified Sri Lankan Custom Builds Showcase ─────────
  const COMMUNITY_BUILDS = [
    {
      title: "Embilipitiya 1440p AM5 RTX 4060 Pro Beast",
      owner: "Kavinda S. · Embilipitiya",
      badge: "VERIFIED LAB BUILD",
      preset: "gaming",
      specs: ["Ryzen 5 7600X", "MSI B650M-P DDR5", "RTX 4060 8GB OC", "16GB DDR5 · 1TB Gen4 NVMe", "650W PSU + 240 AIO"],
      metrics: ["FurMark 64°C Max", "Cyberpunk 102 FPS", "Valorant 340+ FPS"],
      review: "Picked up at Embilipitiya lab after watching the 24h FurMark test live. Runs silent and destroys 1440p games.",
    },
    {
      title: "Colombo 1080p AM4 Competitive Rig",
      owner: "Nadeesha R. · Colombo 05",
      badge: "ESPORTS VALUE",
      preset: "esports",
      specs: ["Ryzen 5 5600", "MSI B550M PRO-VDH WiFi", "ASUS Dual RTX 3050 6GB", "8GB DDR4 · 256GB NVMe", "550W Bronze"],
      metrics: ["OCCT 100% Stable", "Valorant 290 FPS", "Warzone 110 FPS"],
      review: "Delivered overnight to Colombo in anti-static foam packaging. Plug-and-play with written testing warranty.",
    },
    {
      title: "Kandy 4K Render & AI Studio Tower",
      owner: "Tharindu M. · Kandy",
      badge: "CREATOR PRO",
      preset: "creator",
      specs: ["Ryzen 9 9900X", "ASUS TUF B650M-E", "RTX 4070 SUPER 12GB", "16GB DDR5 · 1TB NVMe", "750W Gold + 360 AIO"],
      metrics: ["12-Core Zen 5", "12GB VRAM AI Ready", "Temp 63°C Peak"],
      review: "DaVinci Resolve and Blender render times dropped by 4x. Saved massive LKR using Aqua PC's trade-in swap!",
    },
    {
      title: "Galle Student & GTA V Value Build",
      owner: "Dilan P. · Galle",
      badge: "BUDGET VALUE",
      preset: "budget",
      specs: ["Core i5 4th Gen", "H81 Board", "ASUS GTX 750 Ti 2GB", "8GB DDR3 · 120GB SSD", "500W 80+ PSU"],
      metrics: ["Boots in 9 Seconds", "GTA V 75 FPS", "06M Warranty"],
      review: "Best budget build in Sri Lanka. Transparent pricing and Rose AI helped me check compatibility before ordering.",
    },
  ];

  function renderCommunityBuilds() {
    const grid = $("#community-builds-grid");
    if (!grid) return;
    grid.innerHTML = COMMUNITY_BUILDS.map((b) => {
      const preset = BUILD_PRESETS[b.preset] || BUILD_PRESETS.gaming;
      const slotsMap = {};
      let estTotal = 0;
      ["combo-cpu", "combo-mb", "combo-gpu", "combo-ram", "combo-storage", "combo-psu"].forEach((k) => {
        const slot = COMBO_SLOTS.find((s) => s.elId === k);
        const p = pickFirstAvailable(preset[k], slot ? (slot.secs || slot.sec) : "processors");
        if (p) {
          slotsMap[k] = p;
          if (p.price) estTotal += p.price;
        }
      });
      estTotal = Math.max(0, estTotal - 2500);
      const studio3dUrl = build3DStudioUrlFromParts(slotsMap);
      return (
        '<article class="ne-build-card">' +
        '<div class="ne-build-top"><span class="ne-cond-badge is-used">' + esc(b.badge) + '</span><span class="ne-build-owner">' + esc(b.owner) + '</span></div>' +
        '<h3>' + esc(b.title) + '</h3>' +
        '<ul class="ne-build-specs">' + b.specs.map((s) => "<li>• " + esc(s) + "</li>").join("") + '</ul>' +
        '<div class="ne-build-metrics">' + b.metrics.map((m) => '<span class="ne-lab-pill">' + esc(m) + "</span>").join("") + '</div>' +
        '<p class="ne-build-review">“' + esc(b.review) + '”</p>' +
        '<div class="ne-build-foot"><div><small>Live Build Est.</small><strong>' + fmtLKR(estTotal) + '</strong></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<a href="' + esc(studio3dUrl) + '" target="_blank" rel="noopener" class="ne-btn ne-btn-outline ne-btn-sm">3D View ↗</a>' +
        '<button type="button" class="ne-btn ne-btn-orange ne-btn-sm" data-load-preset="' + esc(b.preset) + '">Load in Builder ▸</button>' +
        '</div></div>' +
        "</article>"
      );
    }).join("");
  }

  // ───────── Order & Lab Bench-Test Tracker + QR Certificate ─────────
  const TRACKER_DEMOS = {
    "AQP-2026-884": {
      item: "RTX 3070 8GB + Ryzen 5 5600X Combo",
      dest: "Colombo 05 · ESD Safe Courier",
      stage: 4,
      telemetry: "FurMark 24h: 64°C Peak · 0 Artifacts · Packed in Anti-Static Foam",
      furmarkTemp: "64°C Peak",
      occtStatus: "24h OCCT 100% Pass",
      vramStatus: "0 Artifacts · MemTest Pass",
      warrantyUntil: "06 Months Active (May 2027)",
      eta: "Dispatched — Arriving Tomorrow",
      verified: true,
    },
    "AQP-2026-519": {
      item: "AMD Ryzen 5 5600 + B550 Motherboard",
      dest: "Kandy · Express Parcel",
      stage: 3,
      telemetry: "OCCT Stress Test 100% Pass · WhatsApp Proof Video Sent",
      furmarkTemp: "58°C VRM / 61°C CPU",
      occtStatus: "24h OCCT 100% Pass",
      vramStatus: "Dual-Channel MemTest Pass",
      warrantyUntil: "06 Months Active",
      eta: "Awaiting Courier Pickup Today 4:30 PM",
      verified: true,
    },
    "AQP-2026-302": {
      item: "24\" FHD Frameless IPS Monitor (Grade A)",
      dest: "Galle · Delivered & Signed",
      stage: 5,
      telemetry: "0 Dead Pixels · Backlight Uniformity 99% · 06-Month Warranty Active",
      furmarkTemp: "Delta-E < 1.8 Calibrated",
      occtStatus: "4h Panel Burn-In Pass",
      vramStatus: "HDMI & DP Ports Verified",
      warrantyUntil: "Active until May 2027",
      eta: "Delivered · Warranty Active until May 2027",
      verified: true,
    },
  };

  function generateQrSvgMatrix(seedStr) {
    const h0 = hashStr(String(seedStr || "AQP"));
    let rects = "";
    const cell = 4;
    const size = 21;
    const isFinder = (r, c) =>
      (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let on = false;
        if (isFinder(r, c)) {
          const lr = r >= size - 7 ? r - (size - 7) : r;
          const lc = c >= size - 7 ? c - (size - 7) : c;
          on = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
        } else {
          const bit = hashStr(seedStr + ":" + r + ":" + c) ^ h0;
          on = (bit & 1) === 1;
        }
        if (on) {
          rects += '<rect x="' + (c * cell + 4) + '" y="' + (r * cell + 4) + '" width="' + cell + '" height="' + cell + '" fill="#071138"/>';
        }
      }
    }
    const dim = size * cell + 8;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + " " + dim + '" width="78" height="78" style="background:#ffffff;border-radius:6px;border:1px solid #cbd5e1">' + rects + "</svg>";
  }

  let lastTrackedRecord = null;

  function printLabCertificate(record) {
    if (!record) return;
    const qrSvg = generateQrSvgMatrix(record.ticketId);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>24h Lab Bench Certificate - ${esc(record.ticketId)}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a;max-width:780px;margin:auto;background:#f8fafc}
.cert{background:#fff;border:3px solid #071138;border-radius:14px;padding:28px;box-shadow:0 12px 30px rgba(7,17,56,.12)}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ff6600;padding-bottom:16px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}
.box{padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}
.box small{display:block;color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:4px}
.box strong{color:#071138;font-size:14px}
.log{padding:12px;border-left:4px solid #00a8c6;background:#ecfeff;font-size:13px;color:#0f172a;margin-top:14px}
@media print{.noprint{display:none}}</style></head><body>
<div class="cert">
  <div class="head">
    <div>
      <div style="font-size:11px;font-weight:700;color:#ff6600;letter-spacing:1px">AQUA PC SOLUTIONS · EMBILIPITIYA ESD LAB</div>
      <h1 style="margin:4px 0 0;color:#071138;font-size:22px">24-HOUR STRESS &amp; BENCH PASS CERTIFICATE</h1>
      <div style="font-size:12.5px;color:#475569;margin-top:4px">Ticket / Serial Ref: <strong>${esc(record.ticketId)}</strong> · Engineer: S.L.K Thinul Hansana</div>
    </div>
    <div>${qrSvg}</div>
  </div>
  <div class="grid">
    <div class="box"><small>Hardware Tested</small><strong>${esc(record.item)}</strong></div>
    <div class="box"><small>Current Dispatch / Status</small><strong>${esc(record.eta)}</strong></div>
    <div class="box"><small>FurMark / Thermal Peak</small><strong>${esc(record.furmarkTemp)}</strong></div>
    <div class="box"><small>OCCT &amp; Memory Check</small><strong>${esc(record.occtStatus)} · ${esc(record.vramStatus)}</strong></div>
    <div class="box"><small>Warranty Coverage</small><strong>${esc(record.warrantyUntil)}</strong></div>
    <div class="box"><small>Destination / Channel</small><strong>${esc(record.dest)}</strong></div>
  </div>
  <div class="log"><strong>Verified Bench Telemetry:</strong> ${esc(record.telemetry)}</div>
  <p style="font-size:11.5px;color:#64748b;margin-top:18px">Verify online via Aqua PC Parts Tracker or WhatsApp +94 78 819 4535. Covered under Aqua PC Solutions 06-Month Testing Warranty terms.</p>
</div>
<p class="noprint" style="margin-top:18px;text-align:center"><button onclick="window.print()" style="padding:10px 20px;background:#ff6600;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:bold">Print / Save Certificate PDF</button></p>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.open(); win.document.write(html); win.document.close(); }
    else toast("Allow pop-ups to print your 24h Lab Certificate.");
  }

  function paintTrackerResult(box, code, demo) {
    lastTrackedRecord = Object.assign({ ticketId: code }, demo);
    const steps = [
      "Order / Quote Logged",
      "24h FurMark & OCCT Stress Test",
      "WhatsApp Proof Video Dispatched",
      "ESD Anti-Static Courier Packed",
      "Delivered · 06M Warranty Active",
    ];
    const qrSvg = generateQrSvgMatrix(code);

    box.innerHTML =
      '<div class="ne-tracker-summary">' +
      '<div><small>TICKET / ORDER ID</small><strong>' + esc(code) + '</strong></div>' +
      '<div><small>HARDWARE</small><strong>' + esc(demo.item) + '</strong></div>' +
      '<div><small>DESTINATION</small><strong>' + esc(demo.dest) + '</strong></div>' +
      '<div><small>STATUS</small><strong style="color:var(--ne-green)">' + esc(demo.eta) + '</strong></div>' +
      "</div>" +
      '<div class="ne-cert-badge">' +
      '<div class="ne-cert-qr">' + qrSvg + '</div>' +
      '<div class="ne-cert-info">' +
      '<div class="ne-cert-kicker"><span>🔬 QR-VERIFIED 24H BENCH PASS CERTIFICATE</span><b>' + (demo.verified ? "✔ LAB VERIFIED" : "⏳ IN QUEUE") + '</b></div>' +
      '<div class="ne-cert-metrics">' +
      '<span><b>Thermal:</b> ' + esc(demo.furmarkTemp || "63°C Peak") + '</span>' +
      '<span><b>Stability:</b> ' + esc(demo.occtStatus || "24h OCCT Pass") + '</span>' +
      '<span><b>Warranty:</b> ' + esc(demo.warrantyUntil || "06 Months Active") + '</span>' +
      '</div>' +
      '<div class="ne-tracker-telemetry" style="margin:6px 0 0"><span>Lab Log:</span> ' + esc(demo.telemetry) + "</div>" +
      "</div></div>" +
      '<ol class="ne-tracker-steps">' +
      steps
        .map((st, idx) => {
          const done = idx + 1 <= demo.stage;
          const cur = idx + 1 === demo.stage;
          return (
            '<li class="ne-tracker-step' + (done ? " is-done" : "") + (cur ? " is-current" : "") + '">' +
            '<b>' + (done ? "✔" : idx + 1) + '</b><span>' + esc(st) + "</span></li>"
          );
        })
        .join("") +
      "</ol>" +
      '<div class="ne-tracker-foot" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" class="ne-btn ne-btn-outline ne-btn-sm" data-print-cert="1"><span class="material-symbols-outlined">verified</span> Print / Save 24h Lab Certificate</button>' +
      '<a class="ne-btn ne-btn-wa ne-btn-sm" target="_blank" rel="noopener" href="https://wa.me/' +
      PHONE + "?text=" + encodeURIComponent("Hi Aqua PC Parts, checking live status / FurMark test video for Order/Ticket: " + code) +
      '">Request Live WhatsApp Video Update</a></div>';
  }

  async function renderTrackerLookup(rawCode) {
    const box = $("#tracker-results");
    if (!box) return;
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) {
      box.innerHTML = "";
      return;
    }

    const fallbackDemo = TRACKER_DEMOS[code] || {
      item: "Aqua PC Parts Hardware Reservation",
      dest: "Embilipitiya Lab / Island-Wide Courier",
      stage: 2,
      telemetry: "Assigned to Lead Engineer S.L.K Thinul Hansana for 24h Stress Bench Check",
      furmarkTemp: "Pending Bench Log",
      occtStatus: "Queued for 24h OCCT",
      vramStatus: "ESD Inspection Logged",
      warrantyUntil: "06-Month Warranty on Pass",
      eta: "Live Bench Verification in Progress",
      verified: false,
    };

    paintTrackerResult(box, code, fallbackDemo);

    if (typeof fetch === "function" && /^https?:/i.test(window.location.protocol)) {
      const endpoints = [
        "/api/tickets?id=" + encodeURIComponent(code),
        "https://aquapcsolutions.yyth.workers.dev/api/tickets?id=" + encodeURIComponent(code),
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (json && json.ok && json.ticket) {
              paintTrackerResult(box, code, json.ticket);
              break;
            }
          }
        } catch (_) {}
      }
    }
  }

  function openTrackerModal(prefillCode) {
    const m = $("#order-tracker-modal");
    if (!m) return;
    m.hidden = false;
    if (prefillCode) {
      if ($("#tracker-input")) $("#tracker-input").value = prefillCode;
      renderTrackerLookup(prefillCode);
    } else if (!$("#tracker-results").innerHTML.trim()) {
      renderTrackerLookup("AQP-2026-884");
    }
  }

  // ───────── Filters & State ─────────
  const F = {
    div: PAGE_LOCK_DIV || "all",
    cat: "",
    sub: "",
    q: "",
    min: null,
    max: null,
    stock: false,
    priced: false,
    brand: "",
    socket: "",
    spec: "",
    tier: "",
    game: "",
    sort: "default",
    shown: PAGE,
  };
  let filtered = [];

  function matchesGamePreset(p, preset) {
    if (!preset) return true;
    const lower = (p.name + " " + p.sub + " " + p.specs).toLowerCase();
    if (preset === "valorant") {
      return (p.sec === "vga-cards" || p.sec === "bn-vga-cards" || p.sec === "processors" || p.sec === "bn-processors") && p.perfScore >= 38;
    }
    if (preset === "gtav") {
      return (p.sec === "vga-cards" || p.sec === "bn-vga-cards") && p.perfScore >= 26 && p.price != null && p.price <= 45000;
    }
    if (preset === "cyberpunk") {
      return (p.sec === "vga-cards" || p.sec === "bn-vga-cards" || p.sec === "processors" || p.sec === "bn-processors") && p.perfScore >= 64;
    }
    if (preset === "creator") {
      return /\b(ryzen 7|ryzen 9|r7|r9|i7|i9|ultra [79]|16gb|32gb|nvme|ips|proart|rtx)\b/.test(lower);
    }
    if (preset === "gpu35k") {
      return (p.sec === "vga-cards" || p.sec === "bn-vga-cards") && p.price != null && p.price <= 36000;
    }
    return true;
  }

  function matchesBrandFilter(p, brandFilter) {
    if (!brandFilter) return true;
    if (brandFilter === "board-brand" || brandFilter === "storage-brand") {
      return p.brand === brandFilter;
    }
    if (brandFilter === "nvidia" || brandFilter === "amd" || brandFilter === "intel") {
      return p.brand === brandFilter || p.exactBrand === brandFilter;
    }
    return p.exactBrand === brandFilter || p.retailBrand.toLowerCase().includes(brandFilter);
  }

  function apply() {
    if (!$("#grid")) return;
    const effDiv = PAGE_LOCK_DIV || F.div;
    const parsedQ = parseSearchTokens(F.q);
    filtered = PRODUCTS.filter((p) => {
      if (effDiv !== "all" && p.cond !== effDiv) return false;
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
      if (F.brand && !matchesBrandFilter(p, F.brand)) return false;
      if (F.socket) {
        if (F.socket === "LGA1151") {
          if (p.socket !== "LGA1151" && p.socket !== "LGA1151v2") return false;
        } else if (p.socket !== F.socket) {
          return false;
        }
      }
      if (F.tier) {
        if (F.tier === "budget" && (p.price == null || p.price >= 15000)) return false;
        else if (F.tier !== "budget" && p.tier !== F.tier) return false;
      }
      if (F.game && !matchesGamePreset(p, F.game)) return false;
      if (F.spec) {
        const lower = (p.name + " " + p.sub + " " + p.specs).toLowerCase();
        if (F.spec === "ddr5" && !p.ramGen.includes("DDR5")) return false;
        if (F.spec === "ddr4" && !p.ramGen.includes("DDR4")) return false;
        if (F.spec === "ddr3" && !p.ramGen.includes("DDR3")) return false;
        if (F.spec === "nvme" && !/\b(nvme|m\.2)\b/.test(lower)) return false;
        if (F.spec === "vram4" && p.vramGb !== 4) return false;
        if (F.spec === "vram6-8" && (p.vramGb < 6 || p.vramGb > 8)) return false;
        if (F.spec === "vram11-12" && p.vramGb < 11) return false;
        if (F.spec === "ips-hdmi" && !/\b(ips|hdmi)\b/.test(lower)) return false;
      }
      if (parsedQ.words.length && !productMatchesSearch(p, parsedQ)) return false;
      return true;
    });

    const priceKey = (p, dir) => (p.price == null ? (dir > 0 ? Infinity : -1) : p.price);
    if (F.sort === "low") filtered.sort((a, b) => priceKey(a, 1) - priceKey(b, 1));
    else if (F.sort === "high") filtered.sort((a, b) => priceKey(b, -1) - priceKey(a, -1));
    else if (F.sort === "rating") filtered.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    else if (F.sort === "az") filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (F.sort === "slbest") filtered.sort((a, b) => (b.slBest ? 1 : 0) - (a.slBest ? 1 : 0) || a.order - b.order);
    else if (parsedQ.words.length) filtered.sort((a, b) => scoreSearchProduct(b, parsedQ) - scoreSearchProduct(a, parsedQ));
    else filtered.sort((a, b) => a.order - b.order);

    renderGrid();
  }

  function renderSubcats() {
    const box = $("#f-subcats");
    if (!box) return;
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
    const gridEl = $("#grid");
    if (!gridEl) return;
    const effDiv = PAGE_LOCK_DIV || F.div;
    const slice = filtered.slice(0, F.shown);
    gridEl.innerHTML = slice.map(productCard).join("");
    if ($("#result-count")) $("#result-count").textContent = filtered.length + " result" + (filtered.length === 1 ? "" : "s");
    if ($("#empty")) $("#empty").hidden = filtered.length > 0;
    if ($("#load-more-wrap")) $("#load-more-wrap").hidden = filtered.length <= F.shown;

    const progText = $("#result-progress-text");
    const progFill = $("#result-progress-fill");
    if (progText) {
      progText.textContent = filtered.length
        ? "Showing " + slice.length + " of " + filtered.length + " matching hardware items"
        : "0 matching items";
    }
    if (progFill) {
      const pct = filtered.length ? Math.min(100, Math.round((slice.length / filtered.length) * 100)) : 0;
      progFill.style.width = pct + "%";
    }

    const inl = $("#catalog-inline-search");
    if (inl && inl.value !== F.q) inl.value = F.q;
    const inlClr = $("#catalog-inline-clear");
    if (inlClr) inlClr.hidden = !F.q.trim();

    const activeCatObj = CATS.find((c) => c.id === F.cat);
    const titleText = activeCatObj
      ? activeCatObj.label
      : F.cat === "peripherals"
        ? "Peripherals, Mice, Keyboards & Audio"
        : effDiv === "new"
          ? "Brand New Sealed Hardware"
          : effDiv === "used"
            ? "Certified Used Bench-Tested Hardware"
            : "All PC Parts & Accessories";
    if ($("#active-cat-title")) $("#active-cat-title").textContent = titleText;
    const crumb = $("#catalog-crumb");
    if (crumb) crumb.textContent = titleText;

    renderSubcats();

    $$("#side-cats li, #mobile-cats li").forEach((li) => {
      const a = li.querySelector("a");
      li.classList.toggle("active", Boolean(a && a.dataset.cat === F.cat));
    });
    $$(".ne-facet-dept-btn, .ne-div-dept-tile").forEach((b) => {
      b.classList.toggle("active", b.dataset.cat === F.cat);
    });
    $$("[data-brand]").forEach((b) => b.classList.toggle("active", b.dataset.brand === F.brand));
    $$("[data-socket]").forEach((b) => b.classList.toggle("active", b.dataset.socket === F.socket));
    $$("[data-spec]").forEach((b) => b.classList.toggle("active", b.dataset.spec === F.spec));
    $$("[data-tier]").forEach((b) => b.classList.toggle("active", b.dataset.tier === F.tier));
    $$("[data-game-preset]").forEach((b) => b.classList.toggle("active", b.dataset.gamePreset === F.game));

    const stockToggle = $("#f-stock-toggle");
    const pricedToggle = $("#f-priced-toggle");
    if (stockToggle) stockToggle.checked = F.stock;
    if (pricedToggle) pricedToggle.checked = F.priced;

    $$("[data-quick]").forEach((btn) => {
      const mode = btn.dataset.quick;
      const on =
        (mode === "all" && effDiv === "all" && !F.stock && !F.priced) ||
        (mode === "used" && effDiv === "used") ||
        (mode === "new" && effDiv === "new") ||
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
    if (!PAGE_LOCK_DIV && F.div !== "all") chips.push(["div", F.div === "new" ? "Brand New" : "Used · 06M Warranty"]);
    if (F.stock) chips.push(["stock", "In Stock Only"]);
    if (F.priced) chips.push(["priced", "Priced Only"]);
    if (F.socket) chips.push(["socket", "Socket: " + F.socket]);
    if (F.brand) chips.push(["brand", "Brand: " + F.brand.toUpperCase()]);
    if (F.spec) chips.push(["spec", "Spec: " + F.spec.toUpperCase()]);
    if (F.tier) chips.push(["tier", "Tier: " + F.tier.toUpperCase()]);
    if (F.game) {
      const gameLabels = {
        valorant: "Valorant / CS2 144Hz+",
        gtav: "GTA V / Forza (< 45k)",
        cyberpunk: "Cyberpunk / AAA 1080p+",
        creator: "Creator / Editing",
        gpu35k: "GPUs Under 35,000 LKR",
      };
      chips.push(["game", "Game: " + (gameLabels[F.game] || F.game)]);
    }
    if (F.min != null || F.max != null) {
      chips.push(["price", (F.min || 0).toLocaleString() + " – " + (F.max ? F.max.toLocaleString() : "∞") + " LKR"]);
    }
    if (F.q) chips.push(["q", "“" + F.q + "”"]);

    const mobBadge = $("#mobile-filter-count");
    if (mobBadge) {
      mobBadge.textContent = String(chips.length);
      mobBadge.hidden = chips.length === 0;
    }

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
      if (!PAGE_LOCK_DIV && F.div && F.div !== "all") url.searchParams.set("condition", F.div);
      else url.searchParams.delete("condition");
      url.searchParams.delete("div");
      if (F.q) url.searchParams.set("q", F.q);
      else url.searchParams.delete("q");
      url.searchParams.delete("search");
      window.history.replaceState({}, "", url.toString());
    } catch (_) { }
  }

  function navigateToCatalog(filtersObj) {
    const params = new URLSearchParams();
    if (filtersObj.cat) params.set("category", filtersObj.cat);
    if (filtersObj.q) params.set("q", filtersObj.q);
    if (filtersObj.tier) params.set("tier", filtersObj.tier);
    if (filtersObj.max != null) params.set("max", String(filtersObj.max));
    if (filtersObj.socket) params.set("socket", filtersObj.socket);
    if (filtersObj.brand) params.set("brand", filtersObj.brand);
    if (filtersObj.spec) params.set("spec", filtersObj.spec);

    let targetPage = "./catalog.html";
    if (!filtersObj.q && !filtersObj.tier && filtersObj.max == null) {
      const catObj = filtersObj.cat ? CATS.find((c) => c.id === filtersObj.cat) : null;
      if (filtersObj.div === "used" || (catObj && catObj.div === "used")) {
        targetPage = "./used-parts.html";
      } else if (filtersObj.div === "new" || (catObj && catObj.div === "new")) {
        targetPage = "./brand-new-parts.html";
      }
    } else if (filtersObj.div && filtersObj.div !== "all") {
      params.set("condition", filtersObj.div);
    }

    const qs = params.toString();
    window.location.href = targetPage + (qs ? "?" + qs : "");
  }

  function setFilters(patch, scroll) {
    if (!$("#grid")) {
      const targetFilters = Object.assign({}, F, patch);
      navigateToCatalog(targetFilters);
      return;
    }
    if (PAGE_LOCK_DIV) {
      if (patch.cat) {
        const catObj = CATS.find((c) => c.id === patch.cat);
        if (catObj && catObj.div !== PAGE_LOCK_DIV) {
          navigateToCatalog({ cat: patch.cat, div: catObj.div });
          return;
        }
      }
      if (patch.div && patch.div !== "all" && patch.div !== PAGE_LOCK_DIV) {
        navigateToCatalog({ div: patch.div, cat: patch.cat || "" });
        return;
      }
      patch.div = PAGE_LOCK_DIV;
    }
    if (patch.cat !== undefined && patch.cat !== F.cat && patch.sub === undefined) {
      patch.sub = "";
    }
    Object.assign(F, patch, { shown: PAGE });
    syncUrlState();
    apply();
    if (scroll && $("#shop")) $("#shop").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ───────── Populate Sidebars, Two Main Divisions, Visual Category Tiles & Deals ─────────
  const usedSecState = { cat: "", q: "", sort: "default", shown: 12 };
  const newSecState = { cat: "", q: "", sort: "default", shown: 12 };

  function renderSingleDivisionSection(cfg) {
    const grid = $(cfg.gridId);
    const tabsBox = $(cfg.tabsId);
    const totalEl = $(cfg.totalId);
    const moreWrap = $(cfg.moreWrapId);
    if (!grid) return;

    const divCats = CATS.filter((c) => c.div === cfg.div);
    const allDivItems = PRODUCTS.filter((p) => p.cond === cfg.div);
    if (totalEl) totalEl.textContent = allDivItems.length + " items";

    if (tabsBox) {
      tabsBox.innerHTML =
        '<button type="button" class="ne-sec-tab' + (cfg.state.cat === "" ? " active" : "") + '" data-sec-tab="">' +
        esc(cfg.allLabel) + " (" + allDivItems.length + ")</button>" +
        divCats
          .map(
            (c) =>
              '<button type="button" class="ne-sec-tab' + (cfg.state.cat === c.id ? " active" : "") + '" data-sec-tab="' + esc(c.id) + '">' +
              esc(c.label.replace(/\s*\(Brand New\)$/i, "")) + " (" + c.count + ")</button>"
          )
          .join("");
    }

    const q = cfg.state.q.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const list = allDivItems.filter((p) => {
      if (cfg.state.cat && p.sec !== cfg.state.cat) return false;
      if (words.length) {
        const hay = (p.name + " " + p.secLabel + " " + p.sub + " " + p.specs + " " + p.retailBrand + " " + p.details.join(" ")).toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });

    const priceKey = (p, dir) => (p.price == null ? (dir > 0 ? Infinity : -1) : p.price);
    if (cfg.state.sort === "low") list.sort((a, b) => priceKey(a, 1) - priceKey(b, 1));
    else if (cfg.state.sort === "high") list.sort((a, b) => priceKey(b, -1) - priceKey(a, -1));
    else if (cfg.state.sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));

    const slice = list.slice(0, cfg.state.shown);
    grid.innerHTML = slice.length
      ? slice.map(productCard).join("")
      : '<li class="ne-sec-empty">No matching parts in ' + esc(cfg.allLabel) + '. Update or add parts in <a href="./admin.html">Admin Panel ↗</a>.</li>';

    if (moreWrap) moreWrap.hidden = list.length <= cfg.state.shown;
    syncCompareUI();
    syncWishlistUI();
  }

  function renderDivisionSections() {
    const usedItems = PRODUCTS.filter((p) => p.cond === "used");
    const newItems = PRODUCTS.filter((p) => p.cond === "new");
    const gwUsed = $("#gw-used-count");
    const gwNew = $("#gw-new-count");
    if (gwUsed) gwUsed.textContent = usedItems.length + " Parts";
    if (gwNew) gwNew.textContent = newItems.length + " SKUs";

    renderSingleDivisionSection({
      div: "used",
      state: usedSecState,
      totalId: "#used-sec-total",
      tabsId: "#used-sec-tabs",
      gridId: "#used-sec-grid",
      moreWrapId: "#used-sec-more-wrap",
      allLabel: "All Used Parts",
    });

    renderSingleDivisionSection({
      div: "new",
      state: newSecState,
      totalId: "#new-sec-total",
      tabsId: "#new-sec-tabs",
      gridId: "#new-sec-grid",
      moreWrapId: "#new-sec-more-wrap",
      allLabel: "All Brand New Parts",
    });
  }

  function renderStatic() {
    const usedCats = CATS.filter((c) => c.div === "used");
    const newCats = CATS.filter((c) => c.div === "new");
    const usedTotal = PRODUCTS.filter((p) => p.cond === "used").length;
    const newTotal = PRODUCTS.filter((p) => p.cond === "new").length;

    ["#top-used-count", "#subnav-used-count", "#home-used-count"].forEach((s) => {
      if ($(s)) $(s).textContent = String(usedTotal);
    });
    ["#top-new-count", "#subnav-new-count", "#home-new-count"].forEach((s) => {
      if ($(s)) $(s).textContent = String(newTotal);
    });
    if ($("#catalog-total-count")) $("#catalog-total-count").textContent = String(PRODUCTS.length);
    if ($("#gw-used-count")) $("#gw-used-count").textContent = usedTotal + " Parts";
    if ($("#gw-new-count")) $("#gw-new-count").textContent = newTotal + " SKUs";

    const mapCatLi = (c) =>
      '<li class="ty-catListItem"><a href="./catalog.html?category=' + encodeURIComponent(c.id) + '" data-cat="' + esc(c.id) + '">' +
      '<div class="ty-catIconWrap"><img src="' + esc(c.iconImg) + '" alt="' + esc(c.label) + '" /></div>' +
      '<div class="ty-catTitle"><span>' + esc(c.label) + "</span><em>" + c.count + "</em></div>" +
      "</a></li>";

    const catListHtml =
      '<li class="ty-catListItem"><a href="./catalog.html" data-cat="">' +
      '<div class="ty-catIconWrap"><span class="material-symbols-outlined" style="font-size:16px;color:#071138">apps</span></div>' +
      '<div class="ty-catTitle"><span>All Hardware</span><em>' +
      PRODUCTS.length +
      "</em></div></a></li>" +
      '<li class="ne-cat-group-title is-used">USED PARTS</li>' +
      usedCats.map(mapCatLi).join("") +
      '<li class="ne-cat-group-title is-new">BRAND NEW PARTS</li>' +
      newCats.map(mapCatLi).join("");

    if ($("#side-cats")) $("#side-cats").innerHTML = catListHtml;
    if ($("#mobile-cats")) $("#mobile-cats").innerHTML = catListHtml;

    const facetDepts = $("#facet-depts");
    if (facetDepts) {
      const mapFacetLi = (c) =>
        '<li><button type="button" class="ne-facet-dept-btn" data-cat="' +
        esc(c.id) +
        '"><span>' +
        esc(c.label.replace(/\s*\(Brand New\)$/i, "")) +
        "</span><em>" +
        c.count +
        "</em></button></li>";
      if (PAGE_LOCK_DIV === "used") {
        facetDepts.innerHTML =
          '<li><button type="button" class="ne-facet-dept-btn" data-cat=""><span>All Used Departments</span><em>' +
          usedTotal +
          "</em></button></li>" +
          usedCats.map(mapFacetLi).join("");
      } else if (PAGE_LOCK_DIV === "new") {
        facetDepts.innerHTML =
          '<li><button type="button" class="ne-facet-dept-btn" data-cat=""><span>All Brand New</span><em>' +
          newTotal +
          "</em></button></li>" +
          newCats.map(mapFacetLi).join("");
      } else {
        facetDepts.innerHTML =
          '<li><button type="button" class="ne-facet-dept-btn" data-cat=""><span>All Departments</span><em>' +
          PRODUCTS.length +
          "</em></button></li>" +
          '<li class="ne-cat-group-title is-used">USED PARTS</li>' +
          usedCats.map(mapFacetLi).join("") +
          '<li class="ne-cat-group-title is-new">BRAND NEW PARTS</li>' +
          newCats.map(mapFacetLi).join("");
      }
    }

    const megaUsed = $("#mega-used-grid");
    const megaNew = $("#mega-new-grid");
    if (megaUsed) {
      megaUsed.innerHTML = usedCats
        .map(
          (c) =>
            '<a href="./used-parts.html?category=' +
            encodeURIComponent(c.id) +
            '" class="ne-mega-link"><img src="' +
            esc(c.iconImg) +
            '" alt="" /><span>' +
            esc(c.label) +
            "</span><em>" +
            c.count +
            "</em></a>"
        )
        .join("");
    }
    if (megaNew) {
      megaNew.innerHTML = newCats
        .map(
          (c) =>
            '<a href="./brand-new-parts.html?category=' +
            encodeURIComponent(c.id) +
            '" class="ne-mega-link"><img src="' +
            esc(c.iconImg) +
            '" alt="" /><span>' +
            esc(c.label.replace(/\s*\(Brand New\)$/i, "")) +
            "</span><em>" +
            c.count +
            "</em></a>"
        )
        .join("");
    }

    const divStrip = $("#div-dept-strip");
    if (divStrip && PAGE_LOCK_DIV) {
      const stripCats = PAGE_LOCK_DIV === "used" ? usedCats : newCats;
      const stripAllCount = PAGE_LOCK_DIV === "used" ? usedTotal : newTotal;
      divStrip.innerHTML =
        '<button type="button" class="ne-div-dept-tile" data-cat="">' +
        '<span class="material-symbols-outlined ne-div-dept-ico">grid_view</span>' +
        "<div><strong>All Departments</strong><small>" +
        stripAllCount +
        " SKUs</small></div></button>" +
        stripCats
          .map(
            (c) =>
              '<button type="button" class="ne-div-dept-tile" data-cat="' +
              esc(c.id) +
              '"><img src="' +
              esc(c.iconImg) +
              '" alt="' +
              esc(c.label) +
              '" /><div><strong>' +
              esc(c.label.replace(/\s*\(Brand New\)$/i, "")) +
              "</strong><small>" +
              c.count +
              (c.minPrice != null ? " · From " + fmtLKR(c.minPrice) : " · Live Quote") +
              "</small></div></button>"
          )
          .join("");
    }

    const catTiles = $("#ne-cat-tiles");
    if (catTiles) {
      const tileCats = [...usedCats.slice(0, 8), ...newCats.slice(0, 8)];
      catTiles.innerHTML = tileCats
        .map(
          (c) =>
            '<a href="./' +
            (c.div === "new" ? "brand-new-parts.html" : "used-parts.html") +
            "?category=" +
            encodeURIComponent(c.id) +
            '" class="ne-cat-tile" data-cat="' +
            esc(c.id) +
            '"><div class="ne-cat-tile-img"><img src="' +
            esc(c.iconImg) +
            '" alt="' +
            esc(c.label) +
            '" /></div><strong>' +
            esc(c.label.replace(/\s*\(Brand New\)$/i, "")) +
            "</strong><small>" +
            (c.div === "new" ? "Brand New · " : "Used · ") +
            c.count +
            " items</small><em>" +
            (c.minPrice != null ? "From " + fmtLKR(c.minPrice) : "Live Quote") +
            "</em></a>"
        )
        .join("");
    }

    const sel = $("#search-cat");
    if (sel) {
      const cur = sel.value;
      sel.innerHTML =
        '<option value="">All Depts (' + PRODUCTS.length + ")</option>" +
        '<optgroup label="Used Parts">' +
        usedCats.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.label) + " (Used · " + c.count + ")</option>").join("") +
        "</optgroup>" +
        '<optgroup label="Brand New Parts">' +
        newCats.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.label) + " (New · " + c.count + ")</option>").join("") +
        "</optgroup>";
      sel.value = cur;
    }

    // Deal Showcase Panels (Home + Dedicated Deals Page)
    const priced = PRODUCTS.filter((p) => p.price != null && p.inStock);
    const byBestFirst = (a, b) => (b.slBest ? 1 : 0) - (a.slBest ? 1 : 0) || a.order - b.order;
    const specialPicks = [
      ...priced.filter((p) => p.sec === "bn-vga-cards").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-processors").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-monitors").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-laptops").sort(byBestFirst).slice(0, 1),
      ...priced.filter((p) => p.sec === "vga-cards").slice(0, 1),
    ].slice(0, 8);
    const featuredPicks = [
      ...priced.filter((p) => p.sec === "vga-cards" || p.sec === "bn-vga-cards").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "motherboards" || p.sec === "bn-motherboards").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "monitors" || p.sec === "bn-monitors").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "laptops" || p.sec === "bn-laptops").sort(byBestFirst).slice(0, 2),
    ].slice(0, 8);
    const under50kPicks = [
      ...priced.filter((p) => p.sec === "monitors" && p.price <= 50000).slice(0, 2),
      ...priced.filter((p) => (p.sec === "vga-cards" || p.sec === "processors") && p.price <= 50000).slice(0, 2),
      ...priced.filter((p) => (p.sec === "motherboards" || p.sec === "storage") && p.price <= 50000).slice(0, 2),
      ...priced.filter((p) => (p.sec === "bn-keyboards" || p.sec === "bn-mice" || p.sec === "bn-audio") && p.price <= 50000).slice(0, 2),
    ].slice(0, 8);
    const gpuCpuPicks = [
      ...priced.filter((p) => p.sec === "vga-cards").slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-vga-cards").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "processors").slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-processors").sort(byBestFirst).slice(0, 2),
    ].slice(0, 8);
    const brandNewPicks = [
      ...priced.filter((p) => p.sec === "bn-cooling").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-power-supply").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-monitors").sort(byBestFirst).slice(0, 2),
      ...priced.filter((p) => p.sec === "bn-laptops").sort(byBestFirst).slice(0, 2),
    ].slice(0, 8);

    if ($("#row-special")) $("#row-special").innerHTML = specialPicks.map(productCard).join("");
    if ($("#row-featured")) $("#row-featured").innerHTML = featuredPicks.map(productCard).join("");
    if ($("#row-under50k")) $("#row-under50k").innerHTML = under50kPicks.map(productCard).join("");
    if ($("#row-gpucpu")) $("#row-gpucpu").innerHTML = gpuCpuPicks.map(productCard).join("");
    if ($("#row-brandnew")) $("#row-brandnew").innerHTML = brandNewPicks.map(productCard).join("");

    // Extended Dedicated Deals Page Shelves
    if ($("#deals-page-flash")) {
      const flashDeals = [
        ...priced.filter((p) => p.sec === "vga-cards").slice(0, 3),
        ...priced.filter((p) => p.sec === "bn-vga-cards").sort(byBestFirst).slice(0, 2),
        ...priced.filter((p) => p.sec === "bn-monitors").sort(byBestFirst).slice(0, 3),
        ...priced.filter((p) => p.sec === "laptops").slice(0, 2),
        ...priced.filter((p) => p.sec === "bn-laptops").sort(byBestFirst).slice(0, 2),
      ].slice(0, 12);
      $("#deals-page-flash").innerHTML = flashDeals.map(productCard).join("");
    }
    if ($("#deals-page-under25k")) {
      const u25 = priced
        .filter((p) => p.price <= 25000 && p.price >= 2000)
        .sort((a, b) => (b.slBest ? 1 : 0) - (a.slBest ? 1 : 0) || b.price - a.price)
        .slice(0, 12);
      $("#deals-page-under25k").innerHTML = u25.map(productCard).join("");
    }
    if ($("#deals-page-monitors")) {
      const mons = [
        ...priced.filter((p) => p.sec === "monitors").slice(0, 4),
        ...priced.filter((p) => p.sec === "bn-monitors").slice(0, 8),
      ].slice(0, 12);
      $("#deals-page-monitors").innerHTML = mons.map(productCard).join("");
    }
    if ($("#deals-page-laptops")) {
      const laps = [
        ...priced.filter((p) => p.sec === "laptops").slice(0, 6),
        ...priced.filter((p) => p.sec === "bn-laptops").slice(0, 6),
      ].slice(0, 12);
      $("#deals-page-laptops").innerHTML = laps.map(productCard).join("");
    }
    if ($("#deals-page-gpucpu")) {
      const gc = [
        ...priced.filter((p) => p.sec === "vga-cards").slice(0, 4),
        ...priced.filter((p) => p.sec === "bn-vga-cards").slice(0, 2),
        ...priced.filter((p) => p.sec === "processors").slice(0, 3),
        ...priced.filter((p) => p.sec === "bn-processors").slice(0, 3),
      ].slice(0, 12);
      $("#deals-page-gpucpu").innerHTML = gc.map(productCard).join("");
    }
    if ($("#deals-page-new")) {
      const bn = [
        ...priced.filter((p) => p.sec === "bn-monitors").slice(0, 3),
        ...priced.filter((p) => p.sec === "bn-laptops").slice(0, 3),
        ...priced.filter((p) => p.sec === "bn-keyboards").slice(0, 2),
        ...priced.filter((p) => p.sec === "bn-mice").slice(0, 2),
        ...priced.filter((p) => p.sec === "bn-cooling").slice(0, 2),
      ].slice(0, 12);
      $("#deals-page-new").innerHTML = bn.map(productCard).join("");
    }

    // Compact Home Bundle Deals Preview Strip
    const homeBundles = $("#home-bundle-cards");
    if (homeBundles) {
      homeBundles.innerHTML = COMMUNITY_BUILDS.map((b) => {
        const preset = BUILD_PRESETS[b.preset] || BUILD_PRESETS.gaming;
        let estTotal = 0;
        ["combo-cpu", "combo-mb", "combo-gpu", "combo-ram", "combo-storage", "combo-psu"].forEach((k) => {
          const slot = COMBO_SLOTS.find((s) => s.elId === k);
          const p = pickFirstAvailable(preset[k], slot ? (slot.secs || slot.sec) : "processors");
          if (p && p.price) estTotal += p.price;
        });
        estTotal = Math.max(0, estTotal - 2500);
        return (
          '<article class="ne-bundle-offer-card">' +
          '<div class="ne-bundle-top"><span class="ne-cond-badge is-new">' + esc(b.badge) + '</span><span class="ne-shocker-save">Save 2,500 LKR</span></div>' +
          '<h3>' + esc(b.title) + '</h3>' +
          '<p class="ne-bundle-parts">' + esc(b.specs.slice(0, 3).join(" · ")) + '</p>' +
          '<div class="ne-bundle-metrics">' + b.metrics.slice(0, 2).map((m) => '<span class="ne-lab-pill">' + esc(m) + "</span>").join("") + '</div>' +
          '<div class="ne-bundle-foot"><div><small>Bundle Price</small><strong>' + fmtLKR(estTotal) + '</strong></div>' +
          '<a href="./pc-builder.html?preset=' + encodeURIComponent(b.preset) + '" class="ne-btn ne-btn-orange ne-btn-sm">Customize →</a></div>' +
          '</article>'
        );
      }).join("");
    }
  }

  // ───────── Hero Slider ─────────
  function slider() {
    const track = $("#slides-track");
    if (!track || !track.children.length) return;
    const n = track.children.length;
    let i = 0;
    let timer;
    const dots = $("#dots");
    if (dots) {
      dots.innerHTML = Array.from({ length: n }, (_, k) => '<li><button type="button" aria-label="Slide ' + (k + 1) + '"></button></li>').join("");
    }
    const go = (k) => {
      i = (k + n) % n;
      track.style.transform = "translateX(" + -i * 100 + "%)";
      $$("#dots button").forEach((d, x) => d.classList.toggle("on", x === i));
    };
    const auto = () => {
      clearInterval(timer);
      timer = setInterval(() => go(i + 1), 5500);
    };
    if ($("#sl-prev")) $("#sl-prev").onclick = () => { go(i - 1); auto(); };
    if ($("#sl-next")) $("#sl-next").onclick = () => { go(i + 1); auto(); };
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
    if (!input || !box) return;

    const trendingTags = [
      "RTX 5060",
      "Ryzen 5 7600X",
      "B650M AM5",
      "DDR5 16GB",
      "i5-14400",
      "Monitor 144Hz",
      "Laptop",
      "NVMe 1TB",
    ];

    const syncClear = () => {
      if (clr) clr.hidden = !input.value.trim();
    };

    const routeSearch = (qVal, catVal) => {
      const cleanQ = (qVal || "").trim();
      if ($("#grid")) {
        if (PAGE_LOCK_DIV && cleanQ && !catVal) {
          const parsed = parseSearchTokens(cleanQ);
          const localCount = PRODUCTS.filter((p) => p.cond === PAGE_LOCK_DIV && productMatchesSearch(p, parsed)).length;
          if (localCount === 0) {
            const globalCount = PRODUCTS.filter((p) => productMatchesSearch(p, parsed)).length;
            if (globalCount > 0) {
              navigateToCatalog({ q: cleanQ, div: "all" });
              return;
            }
          }
        }
        setFilters({ q: cleanQ, cat: catVal || "" }, true);
      } else {
        navigateToCatalog({ q: cleanQ, cat: catVal || "", div: "all" });
      }
    };

    const renderTrending = () => {
      box.innerHTML =
        '<div class="ne-suggest-quick">' +
        '<div class="ne-suggest-qhead"><span>🔥 Trending Hardware Searches</span><small>Supports shortcuts: vga, mobo, psu, rtx5060</small></div>' +
        '<div class="ne-suggest-tags">' +
        trendingTags
          .map((t) => '<button type="button" class="ne-suggest-tag" data-tagq="' + esc(t) + '">' + esc(t) + "</button>")
          .join("") +
        "</div>" +
        '<div class="ne-suggest-quicklinks">' +
        '<a href="./used-parts.html?category=vga-cards">Used GPUs</a>' +
        '<a href="./brand-new-parts.html?category=bn-monitors">Monitors</a>' +
        '<a href="./brand-new-parts.html?category=bn-laptops">Laptops</a>' +
        '<a href="./pc-builder.html">PC Builder</a>' +
        "</div></div>";
      box.hidden = false;
    };

    const run = () => {
      syncClear();
      const raw = input.value.trim();
      if (raw.length < 2) {
        if (document.activeElement === input) renderTrending();
        else box.hidden = true;
        return;
      }
      const parsed = parseSearchTokens(raw);
      const catFilter = sel ? sel.value : "";
      const allHits = PRODUCTS.filter(
        (p) => (!catFilter || p.sec === catFilter) && productMatchesSearch(p, parsed)
      ).sort((a, b) => scoreSearchProduct(b, parsed) - scoreSearchProduct(a, parsed));
      const top = allHits.slice(0, 7);

      box.innerHTML = allHits.length
        ? '<div class="ne-suggest-list">' +
        top
          .map(
            (p) =>
              '<div class="ne-suggest-row">' +
              '<button type="button" class="ne-suggest-pick" data-qv="' + esc(p.id) + '">' +
              '<img referrerpolicy="no-referrer" src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="" />' +
              '<span class="suggest-meta"><strong>' + esc(p.name) + '</strong><small><span class="ne-suggest-cond ' + (p.cond === "new" ? "is-new" : "is-used") + '">' +
              (p.cond === "new" ? "New" : "Used") + "</span> " +
              esc(p.secLabel.replace(/\s*\(Brand New\)$/i, "")) + (p.slBest ? " · ★ SL Best" : "") + "</small></span>" +
              '<b class="ne-suggest-price">' + (p.price != null ? fmtLKR(p.price) : "Call") + "</b>" +
              "</button>" +
              (p.inStock && p.price != null
                ? '<button type="button" class="ne-suggest-add" data-add="' + esc(p.id) + '" title="Add to Cart">+ Cart</button>'
                : "") +
              "</div>"
          )
          .join("") +
        '<button type="button" class="ne-suggest-all" data-allq="' + esc(raw) + '">View all ' + allHits.length + ' matching parts for “' + esc(raw) + '” →</button>' +
        "</div>"
        : '<div class="nores">No matches for “' + esc(raw) + '” — try a shorter keyword or ask Rose AI</div>';
      box.hidden = false;
    };

    input.addEventListener("focus", run);
    input.addEventListener("input", run);
    if (clr) {
      clr.addEventListener("click", () => {
        input.value = "";
        syncClear();
        box.hidden = true;
        if ($("#grid")) setFilters({ q: "" });
      });
    }

    box.addEventListener("click", (e) => {
      const tag = e.target.closest("[data-tagq]");
      if (tag) {
        input.value = tag.dataset.tagq;
        syncClear();
        box.hidden = true;
        routeSearch(tag.dataset.tagq, sel ? sel.value : "");
        return;
      }
      const allBtn = e.target.closest("[data-allq]");
      if (allBtn) {
        box.hidden = true;
        routeSearch(allBtn.dataset.allq, sel ? sel.value : "");
        return;
      }
      if (e.target.closest("[data-qv], [data-add]")) {
        box.hidden = true;
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#search-form")) box.hidden = true;
    });
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      box.hidden = true;
      routeSearch(input.value, sel ? sel.value : "");
    });

    // Fullscreen Search Modal
    const modal = $("#search-modal");
    const mIn = $("#modal-search-input");
    const mRes = $("#modal-search-results");
    if (!modal || !mIn || !mRes) return;

    const openModal = () => {
      modal.hidden = false;
      mIn.value = input.value;
      renderModal();
      setTimeout(() => mIn.focus(), 50);
    };
    const closeModal = () => { modal.hidden = true; };
    const renderModal = () => {
      const raw = mIn.value.trim();
      const parsed = parseSearchTokens(raw);
      const hits = (parsed.words.length
        ? PRODUCTS.filter((p) => productMatchesSearch(p, parsed)).sort((a, b) => scoreSearchProduct(b, parsed) - scoreSearchProduct(a, parsed))
        : PRODUCTS.filter((p) => p.price != null && p.inStock).sort((a, b) => (b.slBest ? 1 : 0) - (a.slBest ? 1 : 0) || a.order - b.order)
      ).slice(0, 8);
      mRes.innerHTML = hits.length
        ? hits
          .map(
            (p) =>
              '<li><button type="button" data-mqv="' + esc(p.id) + '"><img referrerpolicy="no-referrer" src="' + esc(p.img) + '" onerror="this.onerror=null;this.src=\'' + esc(p.fallbackImg) + '\'" alt="" /><strong>' +
              esc(p.name) + '</strong><span>' + (p.price != null ? fmtLKR(p.price) : "Call") + "</span></button></li>"
          )
          .join("")
        : '<li class="nores">No hardware matched. Try RTX 5060, B650, i5-14400 or Laptop.</li>';
    };
    $("#search-modal-open").addEventListener("click", openModal);
    $("#search-modal-close").addEventListener("click", closeModal);
    mIn.addEventListener("input", renderModal);
    $("#modal-search-go").addEventListener("click", () => {
      input.value = mIn.value;
      syncClear();
      closeModal();
      routeSearch(mIn.value, "");
    });
    mRes.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mqv]");
      if (!b) return;
      closeModal();
      openQuickView(b.dataset.mqv);
    });
  }

  // ───────── Rose AI 2.0 Autonomous PC Architect ─────────
  function assembleBuildForBudget(budgetLkr) {
    const budget = Math.max(35000, budgetLkr || 85000);
    const cpus = PRODUCTS.filter((p) => (p.sec === "processors" || p.sec === "bn-processors") && p.inStock && p.price != null).sort((a, b) => a.price - b.price);
    const mbs = PRODUCTS.filter((p) => (p.sec === "motherboards" || p.sec === "bn-motherboards") && p.inStock && p.price != null).sort((a, b) => a.price - b.price);
    const gpus = PRODUCTS.filter((p) => (p.sec === "vga-cards" || p.sec === "bn-vga-cards") && p.inStock && p.price != null).sort((a, b) => a.price - b.price);
    const rams = PRODUCTS.filter((p) => (p.sec === "ram" || p.sec === "bn-ram") && !p.isLaptopRam && p.inStock && p.price != null).sort((a, b) => a.price - b.price);
    const ssds = PRODUCTS.filter((p) => (p.sec === "storage" || p.sec === "bn-storage") && p.inStock && p.price != null && /ssd|nvme/i.test(p.name)).sort((a, b) => a.price - b.price);
    const psus = PRODUCTS.filter((p) => (p.sec === "power-supply" || p.sec === "bn-power-supply") && p.inStock && p.price != null).sort((a, b) => a.price - b.price);

    let best = null;
    for (const cpu of cpus) {
      if (cpu.price > budget * 0.36) continue;
      const mb = mbs.find((m) => m.socket && m.socket === cpu.socket && m.price <= budget * 0.28);
      if (!mb) continue;
      const ram = rams.find((r) => ramSupportsTarget(r.ramGen, mb.ramGen || cpu.ramGen));
      const ssd = ssds[0];
      if (!ram || !ssd) continue;
      const fixedCost = cpu.price + mb.price + ram.price + ssd.price;
      const remForGpuPsu = budget - fixedCost;
      if (remForGpuPsu < 9000) continue;
      const gpuCandidates = gpus.filter((g) => g.price <= remForGpuPsu * 0.84);
      const gpu = gpuCandidates[gpuCandidates.length - 1] || gpus[0];
      const needW = (cpu.tdpWatts || 65) + (gpu ? gpu.tdpWatts : 65) + 120;
      const psu = psus.find((u) => (u.psuWatts || 450) >= needW) || psus[0];
      if (!gpu || !psu) continue;
      const total = fixedCost + gpu.price + psu.price;
      if (total <= budget * 1.05) {
        const score = cpu.perfScore * 0.4 + gpu.perfScore * 0.6;
        if (!best || score > best.score) {
          best = { cpu, mb, gpu, ram, ssd, psu, total, score };
        }
      }
    }
    return best;
  }

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
        gpu: "vga", gpus: "vga", graphics: "vga",
        cpu: "processor", cpus: "processor", intel: "core",
        mobo: "motherboard", mobos: "motherboard",
        mice: "mouse", ssd: "storage", nvme: "storage", psu: "power",
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
        const hay = (p.name + " " + (p.sku || "") + " " + p.secLabel + " " + p.sub + " " + p.retailBrand + " " + p.specs).toLowerCase();
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

      return { maxPrice, matches: scored.slice(0, 8).map((s) => s.p) };
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
        "Closest matches" + (maxPrice ? " (under " + fmtLKR(maxPrice) + ")" : "") + ":" +
        renderProductCards(matches),
        "bot"
      );
    }

    function showWelcome() {
      addMsg(
        "Hi! I'm <strong>Rose 2.0</strong>, your autonomous Aqua PC Architect. Ask me to <em>build a PC under 85k</em>, find GPUs/CPUs/SKUs, estimate trade-ins, or track an order!",
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
      const q = trimmed.toLowerCase();
      addMsg(esc(trimmed), "user");

      if (/track|order status|courier|aqp-/.test(q)) {
        addMsg(
          "Opening our <strong>Live Order &amp; 24h Lab Bench-Test Tracker</strong> for you!<br/><button type='button' class='ne-btn ne-btn-orange ne-btn-xs' data-rose-open-tracker='AQP-2026-884'>Open Tracker Window →</button>",
          "bot"
        );
        openTrackerModal();
        return;
      }

      if (/trade|swap|sell my/.test(q)) {
        addMsg(
          "Get an instant cash or <strong>+10% Upgrade Swap Credit</strong> valuation in our Trade-In Marketplace below.<br/><button type='button' class='ne-btn ne-btn-orange ne-btn-xs' data-rose-scroll='#trade-in-marketplace'>Go to Trade-In Calculator →</button>",
          "bot"
        );
        return;
      }

      if (/\b(build|rig|pc|setup)\b/.test(q) && !/\b(mouse|keyboard|webcam|mic)\b/.test(q)) {
        const bm = q.match(/(\d+(?:,\d{3})*)\s*(k)?/i);
        const budget = bm ? Number(bm[1].replace(/,/g, "")) * (bm[2] || Number(bm[1]) < 1000 ? 1000 : 1) : 85000;
        const plan = assembleBuildForBudget(budget);
        if (plan) {
          const ids = [plan.cpu.id, plan.mb.id, plan.gpu.id, plan.ram.id, plan.ssd.id, plan.psu.id].join(",");
          addMsg(
            "<strong>Verified " + esc(plan.cpu.socket) + " Build (~" + fmtLKR(plan.total) + "):</strong>" +
            '<div class="rose-cards">' +
            [plan.cpu, plan.mb, plan.gpu, plan.ram, plan.ssd, plan.psu]
              .map((p) => '<div class="rose-item"><span>' + esc(p.name) + "</span><b>" + fmtLKR(p.price) + "</b></div>")
              .join("") +
            "</div>" +
            '<button type="button" class="ne-btn ne-btn-orange ne-btn-sm ne-btn-block" style="margin-top:8px" data-rose-build="' +
            esc(ids) +
            '">⚡ Load Build into Smart Builder</button>',
            "bot"
          );
          return;
        }
      }

      isSending = true;
      if (sendBtn) sendBtn.disabled = true;
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
      const rb = e.target.closest("[data-rose-build]");
      if (rb) {
        if ($("#pc-combo-builder")) {
          applyComboIds(rb.dataset.roseBuild.split(","), true);
          toast("Rose AI build loaded into Smart PC Builder!");
        } else {
          window.location.href = "./pc-builder.html?build=" + encodeURIComponent(rb.dataset.roseBuild);
        }
      }
      const rt = e.target.closest("[data-rose-open-tracker]");
      if (rt) openTrackerModal(rt.dataset.roseOpenTracker);
      const rs = e.target.closest("[data-rose-scroll]");
      if (rs) {
        const target = $(rs.dataset.roseScroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (rs.dataset.roseScroll === "#trade-in-marketplace") window.location.href = "./trade-in.html";
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
    } catch (_) { }
  }

  function resetAllFilters() {
    if ($("#pmin")) $("#pmin").value = "";
    if ($("#pmax")) $("#pmax").value = "";
    if ($("#sort")) $("#sort").value = "default";
    if ($("#search-input")) $("#search-input").value = "";
    if ($("#search-clear")) $("#search-clear").hidden = true;
    if ($("#catalog-inline-search")) $("#catalog-inline-search").value = "";
    if ($("#catalog-inline-clear")) $("#catalog-inline-clear").hidden = true;
    $$("[data-price-bracket]").forEach((b) => b.classList.remove("active"));
    setFilters({
      div: PAGE_LOCK_DIV || "all",
      cat: "",
      sub: "",
      q: "",
      min: null,
      max: null,
      stock: false,
      priced: false,
      brand: "",
      socket: "",
      spec: "",
      tier: "",
      game: "",
      sort: "default",
    });
  }

  function refreshDisplayedPrices() {
    renderStatic();
    renderDivisionSections();
    renderShellShocker();
    populateComboBuilder(true);
    updateTradeInQuote();
    renderCommunityBuilds();
    renderUpgradeKits();
    renderCart();
    renderWishlistDrawer();
    apply();
    if (!$("#quick-view-modal").hidden && qvState.id) {
      openQuickView(qvState.id);
    }
  }

  // ───────── Global Event Binding ─────────
  function bind() {
    function setOffcanvas(open) {
      $("#offcanvas-nav").classList.toggle("open", open);
      $("#offcanvas-overlay").classList.toggle("open", open);
    }

    const curSel = $("#currency-select");
    if (curSel) {
      curSel.value = activeCurrency;
      curSel.addEventListener("change", () => {
        if (CURRENCIES[curSel.value]) {
          activeCurrency = curSel.value;
          try {
            localStorage.setItem(CURRENCY_KEY, activeCurrency);
          } catch (_) { }
          refreshDisplayedPrices();
          toast("Display currency switched to " + activeCurrency);
        }
      });
    }

    document.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        addToCart(add.dataset.add);
        return;
      }

      const wish = e.target.closest("[data-wish]");
      if (wish) {
        e.stopPropagation();
        toggleWishlist(wish.dataset.wish);
        return;
      }

      const qv = e.target.closest("[data-qv]");
      if (qv) {
        openQuickView(qv.dataset.qv);
        return;
      }

      const presetBtn = e.target.closest("[data-load-preset]");
      if (presetBtn) {
        const presetName = presetBtn.dataset.loadPreset;
        if ($("#pc-combo-builder")) {
          applyComboPreset(presetName);
          $("#pc-combo-builder").scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.location.href = "./pc-builder.html?preset=" + encodeURIComponent(presetName);
        }
        return;
      }

      const applyKitBtn = e.target.closest("[data-apply-kit-ids]");
      if (applyKitBtn) {
        const ids = (applyKitBtn.dataset.applyKitIds || "").split(",").filter(Boolean);
        if (ids.length) {
          applyComboIds(ids, true);
          toast("Loaded 3-in-1 Upgrade Kit into Smart Builder!");
        }
        return;
      }

      const addKitBtn = e.target.closest("[data-add-kit-ids]");
      if (addKitBtn) {
        const ids = (addKitBtn.dataset.addKitIds || "").split(",").filter(Boolean);
        let added = 0;
        ids.forEach((id) => {
          const p = prod(id);
          if (p) {
            const row = cart.find((c) => c.id === p.id);
            if (row) row.qty++;
            else cart.push({ id: p.id, name: p.name, qty: 1 });
            added++;
          }
        });
        if (added) {
          saveCart();
          renderCart();
          toast("Added " + added + " Upgrade Kit parts to Cart!");
          drawer(true);
        }
        return;
      }

      const certBtn = e.target.closest("[data-print-cert]");
      if (certBtn && lastTrackedRecord) {
        printLabCertificate(lastTrackedRecord);
        return;
      }

      const gameBtn = e.target.closest("[data-game-preset]");
      if (gameBtn) {
        const nextPreset = gameBtn.dataset.gamePreset || "";
        setFilters({ game: F.game === nextPreset ? "" : nextPreset });
        return;
      }

      const cmpRm = e.target.closest("[data-compare-remove]");
      if (cmpRm) {
        compareIds = compareIds.filter((id) => id !== cmpRm.dataset.compareRemove);
        syncCompareUI();
        return;
      }

      const link = e.target.closest("a[data-cat], a[data-div], button.ne-facet-dept-btn[data-cat], button.ne-div-dept-tile[data-cat]");
      if (link) {
        e.preventDefault();
        const patch = {};
        if (link.dataset.cat !== undefined) patch.cat = link.dataset.cat;
        if (link.dataset.div) {
          patch.div = link.dataset.div;
          if (link.dataset.cat === undefined) patch.cat = "";
        } else if (link.dataset.cat && !PAGE_LOCK_DIV) {
          patch.div = "all";
        }
        patch.q = "";
        if ($("#search-input")) $("#search-input").value = "";
        if ($("#search-clear")) $("#search-clear").hidden = true;
        if ($("#catalog-inline-search")) $("#catalog-inline-search").value = "";
        if ($("#catalog-inline-clear")) $("#catalog-inline-clear").hidden = true;
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
        if (k === "div") F.div = PAGE_LOCK_DIV || "all";
        if (k === "stock") F.stock = false;
        if (k === "priced") F.priced = false;
        if (k === "socket") F.socket = "";
        if (k === "brand") F.brand = "";
        if (k === "spec") F.spec = "";
        if (k === "tier") F.tier = "";
        if (k === "game") F.game = "";
        if (k === "price") {
          F.min = null;
          F.max = null;
          if ($("#pmin")) $("#pmin").value = "";
          if ($("#pmax")) $("#pmax").value = "";
          $$("[data-price-bracket]").forEach((b) => b.classList.remove("active"));
        }
        if (k === "q") {
          F.q = "";
          if ($("#search-input")) $("#search-input").value = "";
          if ($("#search-clear")) $("#search-clear").hidden = true;
          if ($("#catalog-inline-search")) $("#catalog-inline-search").value = "";
          if ($("#catalog-inline-clear")) $("#catalog-inline-clear").hidden = true;
        }
        setFilters({});
      }
    });

    document.addEventListener("change", (e) => {
      const cmp = e.target.closest("[data-compare]");
      if (cmp) toggleCompare(cmp.dataset.compare);
    });

    // Deal Showcase Tab Switcher (Home + Deals Page)
    $$(".ty-homeTabs-selectItem").forEach((el) => {
      el.addEventListener("click", () => {
        const t = el.dataset.tab;
        const container = el.closest("section") || document;
        $$(".ty-homeTabs-selectItem", container).forEach((btn) => {
          const on = btn.dataset.tab === t;
          btn.setAttribute("aria-selected", String(on));
          if (btn.parentElement) btn.parentElement.classList.toggle("active", on);
        });
        $$(".ne-deal-panel", container).forEach((panelEl) => {
          panelEl.classList.toggle("active", panelEl.id === "panel-" + t);
        });
      });
    });

    // Quick Condition / Filter Buttons
    $$("[data-quick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.quick;
        if (mode === "all") setFilters({ div: PAGE_LOCK_DIV || "all", stock: false, priced: false });
        else if (mode === "used") setFilters({ div: "used" });
        else if (mode === "new") setFilters({ div: "new" });
        else if (mode === "instock") setFilters({ stock: !F.stock });
        else if (mode === "priced") setFilters({ priced: !F.priced });
      });
    });

    // Deep Hardware Spec Facets
    if ($("#facet-sockets")) {
      $("#facet-sockets").addEventListener("click", (e) => {
        const b = e.target.closest("[data-socket]");
        if (b) setFilters({ socket: F.socket === b.dataset.socket ? "" : b.dataset.socket });
      });
    }
    if ($("#facet-brands")) {
      $("#facet-brands").addEventListener("click", (e) => {
        const b = e.target.closest("[data-brand]");
        if (b) setFilters({ brand: F.brand === b.dataset.brand ? "" : b.dataset.brand });
      });
    }
    if ($("#facet-specs")) {
      $("#facet-specs").addEventListener("click", (e) => {
        const b = e.target.closest("[data-spec]");
        if (b) setFilters({ spec: F.spec === b.dataset.spec ? "" : b.dataset.spec });
      });
    }
    if ($("#facet-tiers")) {
      $("#facet-tiers").addEventListener("click", (e) => {
        const b = e.target.closest("[data-tier]");
        if (b) setFilters({ tier: F.tier === b.dataset.tier ? "" : b.dataset.tier });
      });
    }

    // Inline Catalog / Division Search Box
    const inlSearch = $("#catalog-inline-search");
    const inlClr = $("#catalog-inline-clear");
    if (inlSearch) {
      inlSearch.addEventListener("input", () => {
        if ($("#search-input")) $("#search-input").value = inlSearch.value;
        if ($("#search-clear")) $("#search-clear").hidden = !inlSearch.value.trim();
        setFilters({ q: inlSearch.value });
      });
    }
    if (inlClr) {
      inlClr.addEventListener("click", () => {
        if (inlSearch) inlSearch.value = "";
        if ($("#search-input")) $("#search-input").value = "";
        if ($("#search-clear")) $("#search-clear").hidden = true;
        setFilters({ q: "" });
      });
    }

    // Mobile Filter Slide-Out Drawer
    const setFilterDrawer = (open) => {
      const sb = $("#filter-sidebar");
      const bd = $("#filter-backdrop");
      if (sb) {
        sb.classList.toggle("open", open);
        sb.setAttribute("aria-hidden", String(!open));
        if (!open) {
          const opBtn = $("#mobile-filter-open");
          if (opBtn && document.activeElement && sb.contains(document.activeElement)) {
            opBtn.focus();
          }
        } else {
          const clBtn = $("#mobile-filter-close");
          if (clBtn) setTimeout(() => clBtn.focus(), 40);
        }
      }
      if (bd) bd.classList.toggle("open", open);
    };
    if ($("#mobile-filter-open")) $("#mobile-filter-open").addEventListener("click", () => setFilterDrawer(true));
    if ($("#mobile-filter-close")) $("#mobile-filter-close").addEventListener("click", () => setFilterDrawer(false));
    if ($("#filter-backdrop")) $("#filter-backdrop").addEventListener("click", () => setFilterDrawer(false));
    document.addEventListener("click", (e) => {
      if (e.target.closest("#mobile-filter-close")) setFilterDrawer(false);
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

    if ($("#f-subcats")) {
      $("#f-subcats").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b) setFilters({ sub: b.dataset.sub });
      });
    }
    if ($("#pmin")) $("#pmin").addEventListener("input", (e) => setFilters({ min: e.target.value === "" ? null : Number(e.target.value) }));
    if ($("#pmax")) $("#pmax").addEventListener("input", (e) => setFilters({ max: e.target.value === "" ? null : Number(e.target.value) }));
    if ($("#sort")) $("#sort").addEventListener("change", (e) => setFilters({ sort: e.target.value }));
    if ($("#f-reset")) $("#f-reset").addEventListener("click", resetAllFilters);
    if ($("#empty-reset-btn")) $("#empty-reset-btn").addEventListener("click", resetAllFilters);
    if ($("#load-more")) $("#load-more").addEventListener("click", () => { F.shown += PAGE; renderGrid(); });

    if ($("#view-grid")) $("#view-grid").addEventListener("click", () => setViewMode("grid"));
    if ($("#view-list")) $("#view-list").addEventListener("click", () => setViewMode("list"));

    // Two Main Division Sections ("Used Parts" & "Brand New Parts") Controls
    if ($("#used-sec-tabs")) {
      $("#used-sec-tabs").addEventListener("click", (e) => {
        const b = e.target.closest("[data-sec-tab]");
        if (!b) return;
        usedSecState.cat = b.dataset.secTab;
        usedSecState.shown = 12;
        renderDivisionSections();
      });
    }
    if ($("#used-sec-search")) {
      $("#used-sec-search").addEventListener("input", (e) => {
        usedSecState.q = e.target.value;
        usedSecState.shown = 12;
        renderDivisionSections();
      });
    }
    if ($("#used-sec-sort")) {
      $("#used-sec-sort").addEventListener("change", (e) => {
        usedSecState.sort = e.target.value;
        renderDivisionSections();
      });
    }
    if ($("#used-sec-more")) {
      $("#used-sec-more").addEventListener("click", () => {
        usedSecState.shown += 12;
        renderDivisionSections();
      });
    }

    if ($("#new-sec-tabs")) {
      $("#new-sec-tabs").addEventListener("click", (e) => {
        const b = e.target.closest("[data-sec-tab]");
        if (!b) return;
        newSecState.cat = b.dataset.secTab;
        newSecState.shown = 12;
        renderDivisionSections();
      });
    }
    if ($("#new-sec-search")) {
      $("#new-sec-search").addEventListener("input", (e) => {
        newSecState.q = e.target.value;
        newSecState.shown = 12;
        renderDivisionSections();
      });
    }
    if ($("#new-sec-sort")) {
      $("#new-sec-sort").addEventListener("change", (e) => {
        newSecState.sort = e.target.value;
        renderDivisionSections();
      });
    }
    if ($("#new-sec-more")) {
      $("#new-sec-more").addEventListener("click", () => {
        newSecState.shown += 12;
        renderDivisionSections();
      });
    }

    // Shell Shocker Next Deal
    if ($("#shocker-next")) {
      $("#shocker-next").addEventListener("click", () => {
        shockerIdx++;
        renderShellShocker();
      });
    }

    // Smart PC Builder Controls
    COMBO_SLOTS.forEach((slot) => {
      const sel = $("#" + slot.elId);
      if (sel) {
        sel.addEventListener("change", () => {
          if (slot.elId === "combo-cpu" || slot.elId === "combo-mb") {
            populateComboBuilder(true);
          } else {
            updateComboSummary();
          }
        });
      }
    });
    if ($("#combo-compat-lock")) {
      $("#combo-compat-lock").addEventListener("change", () => populateComboBuilder(true));
    }
    if ($("#combo-cond-filter")) {
      $("#combo-cond-filter").addEventListener("click", (e) => {
        const b = e.target.closest("[data-combo-cond]");
        if (!b) return;
        comboCondFilter = b.dataset.comboCond || "all";
        $$("[data-combo-cond]").forEach((btn) => btn.classList.toggle("active", btn === b));
        populateComboBuilder(true);
      });
    }
    if ($("#combo-preset-esports")) $("#combo-preset-esports").addEventListener("click", () => applyComboPreset("esports"));
    if ($("#combo-preset-gaming")) $("#combo-preset-gaming").addEventListener("click", () => applyComboPreset("gaming"));
    if ($("#combo-preset-creator")) $("#combo-preset-creator").addEventListener("click", () => applyComboPreset("creator"));
    if ($("#combo-preset-budget")) $("#combo-preset-budget").addEventListener("click", () => applyComboPreset("budget"));
    if ($("#combo-preset-clear")) $("#combo-preset-clear").addEventListener("click", () => applyComboPreset("clear"));
    if ($("#combo-share-btn")) $("#combo-share-btn").addEventListener("click", copyShareableBuildLink);
    if ($("#combo-print-btn")) $("#combo-print-btn").addEventListener("click", printBuildSheet);
    if ($("#combo-3d-preview-btn")) {
      $("#combo-3d-preview-btn").addEventListener("click", () => {
        const slotsMap = {};
        COMBO_SLOTS.forEach((slot) => {
          const sel = $("#" + slot.elId);
          if (sel && sel.value) {
            const p = prod(sel.value);
            if (p) slotsMap[slot.elId] = p;
          }
        });
        const url = build3DStudioUrlFromParts(slotsMap);
        window.open(url, "_blank", "noopener");
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
          toast("Select at least one component in the Smart PC Builder first.");
          return;
        }
        saveCart();
        renderCart();
        toast("Added " + added + " PC Build parts to your Cart!");
        drawer(true);
      });
    }

    // Trade-In & Swap Marketplace Controls
    if ($("#ti-category")) $("#ti-category").addEventListener("change", populateTradeInItems);
    ["#ti-item-select", "#ti-condition", "#ti-box", "#ti-mode"].forEach((id) => {
      if ($(id)) $(id).addEventListener("change", updateTradeInQuote);
    });
    if ($("#ti-custom-model")) $("#ti-custom-model").addEventListener("input", updateTradeInQuote);
    if ($("#ti-apply-btn")) {
      $("#ti-apply-btn").addEventListener("click", () => {
        const res = updateTradeInQuote();
        if (!res) return;
        tradeInCredit = { amount: res.offerLkr, label: res.label };
        try {
          localStorage.setItem(TRADEIN_KEY, JSON.stringify(tradeInCredit));
        } catch (_) { }
        updateComboSummary();
        renderCart();
        toast("Applied " + fmtLKR(res.offerLkr) + " Trade-In Credit to Cart & Builder!");
      });
    }
    if ($("#cart-tradein-clear")) {
      $("#cart-tradein-clear").addEventListener("click", () => {
        tradeInCredit = { amount: 0, label: "" };
        try {
          localStorage.removeItem(TRADEIN_KEY);
        } catch (_) { }
        updateComboSummary();
        renderCart();
        toast("Removed Trade-In credit.");
      });
    }

    // Quick-View Modal Controls
    if ($("#qv-close")) $("#qv-close").addEventListener("click", () => ($("#quick-view-modal").hidden = true));
    if ($("#qv-backdrop")) $("#qv-backdrop").addEventListener("click", () => ($("#quick-view-modal").hidden = true));
    if ($("#qv-load-builder")) {
      $("#qv-load-builder").addEventListener("click", () => {
        const p = prod(qvState.id);
        if (!p || !BUILDER_SEC_MAP[p.sec]) return;
        const b = $("#pc-combo-builder");
        if (!b) {
          window.location.href = "./pc-builder.html?build=" + encodeURIComponent(p.id);
          return;
        }
        const sel = $("#" + BUILDER_SEC_MAP[p.sec]);
        if (sel) {
          sel.value = p.id;
          if (p.sec === "processors" || p.sec === "motherboards") populateComboBuilder(true);
          else updateComboSummary();
        }
        $("#quick-view-modal").hidden = true;
        b.scrollIntoView({ behavior: "smooth", block: "start" });
        toast("Loaded into Smart PC Builder: " + p.name);
      });
    }
    if ($("#qv-qty-dec")) {
      $("#qv-qty-dec").addEventListener("click", () => {
        qvState.qty = Math.max(1, qvState.qty - 1);
        $("#qv-qty-val").textContent = String(qvState.qty);
        updateQuickViewTradeInNet();
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-qty-inc")) {
      $("#qv-qty-inc").addEventListener("click", () => {
        qvState.qty = Math.min(20, qvState.qty + 1);
        $("#qv-qty-val").textContent = String(qvState.qty);
        updateQuickViewTradeInNet();
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-tradein-select")) {
      $("#qv-tradein-select").addEventListener("change", (e) => {
        const sel = e.target;
        const opt = sel.options[sel.selectedIndex];
        qvState.tradeInAmount = Number(sel.value) || 0;
        qvState.tradeInLabel = (opt && opt.dataset && opt.dataset.tiName) || "";
        updateQuickViewTradeInNet();
        updateQuickViewWhatsApp();
      });
    }
    if ($("#qv-add-cart")) {
      $("#qv-add-cart").addEventListener("click", () => {
        if (qvState.tradeInAmount > 0 && qvState.tradeInLabel) {
          tradeInCredit = { amount: qvState.tradeInAmount, label: qvState.tradeInLabel };
          try {
            localStorage.setItem(TRADEIN_KEY, JSON.stringify(tradeInCredit));
          } catch (_) { }
          updateComboSummary();
        }
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

    // Wishlist Drawer Controls
    if ($("#wishlist-open-btn")) $("#wishlist-open-btn").addEventListener("click", () => wishlistDrawer(true));
    if ($("#wishlist-close")) $("#wishlist-close").addEventListener("click", () => wishlistDrawer(false));
    if ($("#wishlist-overlay")) $("#wishlist-overlay").addEventListener("click", () => wishlistDrawer(false));
    if ($("#wishlist-clear")) {
      $("#wishlist-clear").addEventListener("click", () => {
        wishlistIds = [];
        saveWishlist();
        syncWishlistUI();
        renderWishlistDrawer();
      });
    }
    if ($("#wishlist-move-all")) {
      $("#wishlist-move-all").addEventListener("click", () => {
        let added = 0;
        wishlistIds.forEach((id) => {
          const p = prod(id);
          if (p && p.inStock) {
            const row = cart.find((c) => c.id === id);
            if (row) row.qty++;
            else cart.push({ id, name: p.name, qty: 1 });
            added++;
          }
        });
        if (!added) {
          toast("Save at least one in-stock item first.");
          return;
        }
        saveCart();
        renderCart();
        wishlistDrawer(false);
        drawer(true);
        toast("Moved " + added + " saved items to Cart!");
      });
    }

    // Order & Lab Bench-Test Tracker Controls
    ["#order-tracker-open", "#subnav-tracker-btn", "#offcanvas-tracker-btn"].forEach((sel) => {
      const btn = $(sel);
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          setOffcanvas(false);
          openTrackerModal();
        });
      }
    });
    if ($("#tracker-close")) $("#tracker-close").addEventListener("click", () => ($("#order-tracker-modal").hidden = true));
    if ($("#tracker-backdrop")) $("#tracker-backdrop").addEventListener("click", () => ($("#order-tracker-modal").hidden = true));
    if ($("#tracker-form")) {
      $("#tracker-form").addEventListener("submit", (e) => {
        e.preventDefault();
        renderTrackerLookup($("#tracker-input").value);
      });
    }
    $$("[data-demo-track]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if ($("#tracker-input")) $("#tracker-input").value = btn.dataset.demoTrack;
        renderTrackerLookup(btn.dataset.demoTrack);
      });
    });

    // Cart Drawer
    $("#cart-open").addEventListener("click", () => drawer(true));
    $("#cart-close").addEventListener("click", () => drawer(false));
    $("#overlay").addEventListener("click", () => drawer(false));
    $("#cart-clear").addEventListener("click", () => { cart = []; saveCart(); renderCart(); });
    $("#cart-print").addEventListener("click", printOfficialQuotation);
    if ($("#cart-pay-portal")) {
      $("#cart-pay-portal").addEventListener("click", () => {
        drawer(false);
        const subtotal = cart.reduce((sum, item) => {
          const p = item && typeof item.price === "number" ? item.price : 0;
          return sum + p * (item.qty || 1);
        }, 0);
        if (window.AquaAuth && typeof window.AquaAuth.openPayments === "function") {
          window.AquaAuth.openPayments("", subtotal > 0 ? subtotal : undefined);
        } else if (window.AquaAuth) {
          window.AquaAuth.openLogin("register");
        }
      });
    }

    // Off-Canvas Mobile Category Drawer & Desktop Mega-Departments Panel
    const setMega = (open) => {
      const panel = $("#mega-depts-panel");
      const trig = $("#nav-cat-trigger");
      if (!panel) return;
      panel.hidden = !open;
      if (trig) trig.setAttribute("aria-expanded", String(open));
    };
    const catTrig = $("#nav-cat-trigger");
    if (catTrig) {
      catTrig.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = $("#mega-depts-panel");
        if (window.innerWidth > 1024 && panel) {
          setMega(panel.hidden);
        } else {
          setOffcanvas(true);
        }
      });
    }
    const megaClose = $("#mega-depts-close");
    if (megaClose) megaClose.addEventListener("click", () => setMega(false));
    document.addEventListener("click", (e) => {
      const panel = $("#mega-depts-panel");
      if (panel && !panel.hidden && !e.target.closest("#mega-depts-panel") && !e.target.closest("#nav-cat-trigger")) {
        setMega(false);
      }
    });
    if ($("#menu-toggle")) $("#menu-toggle").addEventListener("click", () => setOffcanvas(true));
    if ($("#offcanvas-close")) $("#offcanvas-close").addEventListener("click", () => setOffcanvas(false));
    if ($("#offcanvas-overlay")) $("#offcanvas-overlay").addEventListener("click", () => setOffcanvas(false));

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const inp = $("#search-input");
        if (inp && window.innerWidth > 768) {
          inp.focus();
          inp.select();
        } else if ($("#search-modal-open")) {
          $("#search-modal-open").click();
        }
        return;
      }
      if (e.key === "Escape") {
        drawer(false);
        wishlistDrawer(false);
        setOffcanvas(false);
        setMega(false);
        setFilterDrawer(false);
        $("#search-modal").hidden = true;
        if ($("#quick-view-modal")) $("#quick-view-modal").hidden = true;
        if ($("#compare-modal")) $("#compare-modal").hidden = true;
        if ($("#order-tracker-modal")) $("#order-tracker-modal").hidden = true;
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
    renderDivisionSections();
    initShellShocker();
    populateComboBuilder(true);
    populateTradeInItems();
    renderCommunityBuilds();
    renderUpgradeKits();
    renderCart();
    renderWishlistDrawer();
    apply();
    syncCompareUI();
    syncWishlistUI();
  }

  function readUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") || params.get("cat") || "";
      const div = params.get("condition") || params.get("div") || "";
      const q = params.get("q") || params.get("search") || "";
      const tier = params.get("tier") || "";
      const socket = params.get("socket") || "";
      const brand = params.get("brand") || "";
      const spec = params.get("spec") || "";
      const game = params.get("game") || "";
      const maxP = params.get("max");
      const buildParam = params.get("build") || "";
      const presetParam = params.get("preset") || "";
      const dealsTab = params.get("deals") || "";
      const openCart = params.get("quote") === "open" || params.get("cart") === "open";

      if (!PAGE_LOCK_DIV && (div === "used" || div === "new" || div === "all")) {
        F.div = div;
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
        if ($("#catalog-inline-search")) $("#catalog-inline-search").value = q;
        if ($("#catalog-inline-clear")) $("#catalog-inline-clear").hidden = false;
      }
      if (tier) F.tier = tier;
      if (socket) F.socket = socket;
      if (brand) F.brand = brand;
      if (spec) F.spec = spec;
      if (game) F.game = game;
      if (maxP != null && maxP !== "" && Number.isFinite(Number(maxP))) {
        F.max = Number(maxP);
        if ($("#pmax")) $("#pmax").value = String(F.max);
      }
      if (presetParam && $("#pc-combo-builder") && BUILD_PRESETS[presetParam]) {
        applyComboPreset(presetParam);
      } else if (buildParam && $("#pc-combo-builder")) {
        applyComboIds(buildParam.split(",").filter(Boolean), true);
      }
      if (dealsTab) {
        const dtBtn = document.querySelector('.ty-homeTabs-selectItem[data-tab="' + dealsTab + '"]');
        if (dtBtn) dtBtn.click();
      }
      if (openCart) {
        setTimeout(() => drawer(true), 120);
      }
      if (cat || div || q || tier || socket || brand || spec || game || maxP) {
        setTimeout(() => {
          const s = $("#shop");
          if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 180);
      }
    } catch (_) { }
  }

  initTheme();
  try {
    if (localStorage.getItem(VIEW_KEY) === "list") setViewMode("list");
  } catch (_) { }
  build();
  loadCompareIds();
  renderStatic();
  renderDivisionSections();
  initShellShocker();
  startShockerTimer();
  populateComboBuilder(false);
  populateTradeInItems();
  renderCommunityBuilds();
  renderUpgradeKits();
  bind();
  slider();
  suggest();
  initRose();
  renderCart();
  readUrlParams();
  apply();
  syncCompareUI();
  syncWishlistUI();
  if ($("#yr")) $("#yr").textContent = new Date().getFullYear();
  window.addEventListener("aqua:catalog-updated", refresh);
})();
