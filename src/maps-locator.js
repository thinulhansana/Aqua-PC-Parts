import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// ───────── Section 8 Case A: Tier 1 Global Quota Defense (Auto-Provisioned Demo Key) ─────────
let quotaBannerShown = false;

function showQuotaBanner() {
  if (quotaBannerShown || document.getElementById("gmp-quota-banner")) return;
  quotaBannerShown = true;
  const bar = document.createElement("div");
  bar.id = "gmp-quota-banner";
  bar.style.cssText =
    "background:#fffbeb;border-bottom:1px solid #fde68a;color:#78350f;padding:10px 16px;font-size:13px;text-align:center;position:sticky;top:0;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.12);font-family:system-ui,-apple-system,sans-serif;";
  bar.innerHTML =
    '<span>Google Maps Platform quota reached. If you are the app owner, visit ' +
    '<a href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors" ' +
    'target="_blank" rel="noopener noreferrer" style="text-decoration:underline;font-weight:700;color:#451a03;">maps developer site</a> ' +
    "for instructions to update your account.</span>";
  document.body.prepend(bar);
}

window.addEventListener("gmp-quota-exceeded", showQuotaBanner);

window.gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
};

const origConsoleError = console.error;
console.error = (...args) => {
  origConsoleError.apply(console, args);
  const msg = args.map((a) => String(a)).join(" ");
  if (msg.includes("OverQuotaMapError") || msg.includes("QuotaExceededError")) {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
  }
};

function isQuotaError(err) {
  const txt = String((err && (err.message || err.status || err.code)) || err || "");
  return (
    txt.includes("RESOURCE_EXHAUSTED") ||
    txt.includes("OVER_QUERY_LIMIT") ||
    txt.includes("OverQuotaMapError") ||
    txt.includes("QuotaExceededError") ||
    txt.includes("429")
  );
}

// Embilipitiya Workshop Showroom coordinates (Sabaragamuwa Province, Sri Lanka)
const SHOWROOM_LOC = { lat: 6.3369, lng: 80.8495 };
const ATTRIBUTION_ID = "gmp_mcp_codeassist_v1_aistudio";

// Quick Sri Lanka city presets for instant 1-click delivery route estimation
const LK_HUB_PRESETS = [
  { label: "Colombo", lat: 6.9271, lng: 79.8612, address: "Colombo, Western Province, Sri Lanka" },
  { label: "Ratnapura", lat: 6.7056, lng: 80.3847, address: "Ratnapura, Sabaragamuwa Province, Sri Lanka" },
  { label: "Galle", lat: 6.0535, lng: 80.221, address: "Galle, Southern Province, Sri Lanka" },
  { label: "Kandy", lat: 7.2906, lng: 80.6337, address: "Kandy, Central Province, Sri Lanka" },
  { label: "Matara", lat: 5.9549, lng: 80.555, address: "Matara, Southern Province, Sri Lanka" },
];

function estimateCourierLkr(distanceMeters) {
  const km = Math.max(1, distanceMeters / 1000);
  if (km <= 25) return { fee: 550, eta: "Same-Day Workshop Rider (2–5 hrs)" };
  if (km <= 100) return { fee: 850, eta: "Next-Day ESD-Safe Courier (18–24 hrs)" };
  if (km <= 220) return { fee: 1150, eta: "1–2 Business Days ESD-Safe Courier" };
  return { fee: 1450, eta: "2 Business Days Insured Express Courier" };
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

async function initMapsLocator() {
  const mapHost = document.getElementById("aqua-google-map");
  const acSlot = document.getElementById("aqua-map-autocomplete-slot");
  const statusEl = document.getElementById("aqua-route-status");
  const statsBox = document.getElementById("aqua-route-stats");
  const distEl = document.getElementById("aqua-route-dist");
  const timeEl = document.getElementById("aqua-route-time");
  const courierEl = document.getElementById("aqua-route-courier");
  const etaEl = document.getElementById("aqua-route-eta");
  const applyFormBtn = document.getElementById("aqua-route-apply-btn");
  const presetsWrap = document.getElementById("aqua-map-hub-presets");

  if (!mapHost) return;

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? "#fca5a5" : "#94a3b8";
  }

  let cfg = null;
  try {
    const res = await fetch("/api/maps/config", { cache: "no-store" });
    if (res.ok) cfg = await res.json();
  } catch (_) {}

  if (!cfg || !cfg.configured || !cfg.apiKey) {
    setStatus("Interactive Google Maps requires a provisioned Maps API key.", true);
    mapHost.innerHTML =
      '<div style="height:100%;display:grid;place-items:center;padding:24px;text-align:center;color:#94a3b8;font-size:0.88rem;">' +
      "<div><strong style='color:#e2e8f0;display:block;margin-bottom:6px;'>Aqua PC Parts Showroom — Embilipitiya, Sri Lanka</strong>" +
      "<span>Google Maps key is being configured. You can still open directions directly in Google Maps below.</span></div></div>";
    return;
  }

  try {
    // Load Maps JS API using modern @googlemaps/js-api-loader setOptions + importLibrary
    // Docs: https://developers.google.com/maps/documentation/javascript/load-maps-js-api?utm_campaign=gmp_mcp_codeassist_v1_aistudio
    setOptions({
      key: cfg.apiKey,
      v: "weekly",
      language: cfg.language || "en",
      region: cfg.region || "LK",
    });

    const [
      { Map, InfoWindow },
      { AdvancedMarkerElement, PinElement },
      { PlaceAutocompleteElement },
      { Route },
    ] = await Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("places"),
      importLibrary("routes"),
    ]);

    const map = new Map(mapHost, {
      center: SHOWROOM_LOC,
      zoom: 13,
      mapId: cfg.mapId || "DEMO_MAP_ID",
      gestureHandling: "cooperative",
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    // Showroom Pin using modern PinElement (glyphText, no deprecated PinElement.element)
    const showroomPin = new PinElement({
      background: "#00b8d4",
      borderColor: "#042f3d",
      glyphColor: "#041620",
      glyphText: "AQ",
      scale: 1.15,
    });

    const showroomMarker = new AdvancedMarkerElement({
      map,
      position: SHOWROOM_LOC,
      title: "Aqua PC Parts — Embilipitiya Hardware Showroom & ESD Lab",
    });
    showroomMarker.append(showroomPin);

    const infoWindow = new InfoWindow({
      content:
        '<div style="color:#0f172a;font-family:Plus Jakarta Sans,sans-serif;padding:4px 2px;max-width:240px;">' +
        '<strong style="font-size:14px;display:block;margin-bottom:3px;">Aqua PC Parts Showroom</strong>' +
        '<div style="font-size:12px;color:#334155;line-height:1.4;">Embilipitiya, Sabaragamuwa (70200), Sri Lanka<br/>Mon–Fri 8AM–7PM · Sat 10AM–5PM<br/><strong>+94 78 819 4535</strong></div>' +
        "</div>",
    });

    showroomMarker.addEventListener("click", () => {
      infoWindow.open({ map, anchor: showroomMarker });
    });

    let activePolylines = [];
    let destMarker = null;
    let lastRouteSummary = null;

    function clearRouteOverlays() {
      activePolylines.forEach((pl) => pl.setMap(null));
      activePolylines = [];
      if (destMarker) {
        destMarker.map = null;
        destMarker = null;
      }
    }

    async function computeDeliveryRoute(destinationLoc, destLabel) {
      clearRouteOverlays();
      setStatus("Calculating live road route from Embilipitiya Showroom to " + destLabel + "...", false);

      try {
        // Modern Routes API JS Route.computeRoutes (replaces legacy DirectionsService)
        // Docs: https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_mcp_codeassist_v1_aistudio
        const result = await Route.computeRoutes({
          origin: SHOWROOM_LOC,
          destination: destinationLoc,
          travelMode: "DRIVING",
          fields: ["path", "distanceMeters", "durationMillis", "localizedValues", "viewport"],
        });

        const route = result && Array.isArray(result.routes) ? result.routes[0] : null;
        if (!route) {
          setStatus("No driving route returned for " + destLabel + ". Try selecting a nearby Sri Lanka town.", true);
          return;
        }

        const polylines = route.createPolylines({
          polylineOptions: {
            strokeColor: "#00d4ff",
            strokeOpacity: 0.92,
            strokeWeight: 5,
          },
        });
        polylines.forEach((pl) => pl.setMap(map));
        activePolylines = polylines;

        const destPin = new PinElement({
          background: "#ff6b00",
          borderColor: "#7c2d12",
          glyphColor: "#ffffff",
          glyphText: "B",
        });
        destMarker = new AdvancedMarkerElement({
          map,
          position: destinationLoc,
          title: "Delivery Destination: " + destLabel,
        });
        destMarker.append(destPin);

        if (route.viewport) {
          map.fitBounds(route.viewport, 44);
        }

        const distMeters = Number(route.distanceMeters) || 0;
        const distText =
          (route.localizedValues && route.localizedValues.distance) ||
          (distMeters > 0 ? (distMeters / 1000).toFixed(1) + " km" : "—");
        const durText =
          (route.localizedValues && route.localizedValues.duration) ||
          formatDurationMs(Number(route.durationMillis));

        const est = estimateCourierLkr(distMeters);
        lastRouteSummary = {
          destLabel,
          distText,
          durText,
          courierLkr: est.fee,
          eta: est.eta,
        };

        if (distEl) distEl.textContent = distText;
        if (timeEl) timeEl.textContent = durText;
        if (courierEl) courierEl.textContent = "Rs. " + est.fee.toLocaleString("en-LK");
        if (etaEl) etaEl.textContent = est.eta;
        if (statsBox) statsBox.hidden = false;

        setStatus("Route ready: Embilipitiya Showroom → " + destLabel, false);
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
        }
        setStatus("Unable to calculate route right now. Please try another Sri Lanka city.", true);
      }
    }

    // Mount modern Places API (New) PlaceAutocompleteElement restricted to Sri Lanka
    if (acSlot) {
      acSlot.innerHTML = "";
      const placeAutocomplete = new PlaceAutocompleteElement({
        includedRegionCodes: ["lk"],
      });
      placeAutocomplete.setAttribute("internal-usage-attribution-ids", ATTRIBUTION_ID);
      placeAutocomplete.placeholder = "Enter your Sri Lanka city or address (e.g. Colombo, Galle, Kandy)...";
      acSlot.appendChild(placeAutocomplete);

      placeAutocomplete.addEventListener("gmp-select", async ({ placePrediction }) => {
        if (!placePrediction) return;
        try {
          const place = placePrediction.toPlace();
          await place.fetchFields({
            fields: ["displayName", "formattedAddress", "location"],
          });
          if (!place.location) {
            setStatus("Selected place has no map coordinates. Please pick a specific town or address.", true);
            return;
          }
          const loc = {
            lat: typeof place.location.lat === "function" ? place.location.lat() : place.location.lat,
            lng: typeof place.location.lng === "function" ? place.location.lng() : place.location.lng,
          };
          const label = place.displayName || place.formattedAddress || "Selected Destination";
          await computeDeliveryRoute(loc, label);
        } catch (err) {
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
          }
          setStatus("Could not load details for that location. Please try again.", true);
        }
      });
    }

    // Quick-select Sri Lanka hub buttons
    if (presetsWrap) {
      presetsWrap.innerHTML = "";
      LK_HUB_PRESETS.forEach((hub) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "map-hub-btn";
        btn.textContent = hub.label;
        btn.addEventListener("click", () => {
          presetsWrap.querySelectorAll(".map-hub-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          computeDeliveryRoute({ lat: hub.lat, lng: hub.lng }, hub.label);
        });
        presetsWrap.appendChild(btn);
      });
    }

    // 1-click copy route & courier estimate directly into the Contact Inquiry Form
    if (applyFormBtn) {
      applyFormBtn.addEventListener("click", () => {
        if (!lastRouteSummary) return;
        const fulfillSel = document.getElementById("contact-fulfillment");
        const noteEl = document.getElementById("contact-message");
        if (fulfillSel) fulfillSel.value = "Island-Wide Safe Courier Delivery";
        if (noteEl) {
          const routeLine = `Delivery Destination: ${lastRouteSummary.destLabel} (${lastRouteSummary.distText} from Embilipitiya · Est. Courier Rs. ${lastRouteSummary.courierLkr.toLocaleString("en-LK")})`;
          noteEl.value = noteEl.value ? noteEl.value + "\n" + routeLine : routeLine;
          noteEl.scrollIntoView({ behavior: "smooth", block: "center" });
          noteEl.focus();
        }
        setStatus("Destination copied into the inquiry form!", false);
      });
    }

    setStatus("Select a Sri Lanka city above to calculate live road distance & ESD courier rate.", false);
  } catch (err) {
    if (isQuotaError(err)) {
      window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
    }
    setStatus("Unable to initialize interactive Google Maps right now.", true);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMapsLocator);
} else {
  initMapsLocator();
}
