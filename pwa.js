(function () {
  "use strict";

  let deferredPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      });
    }
  }

  function ensureOfflineBanner() {
    let banner = document.getElementById("aqua-offline-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "aqua-offline-banner";
      banner.className = "aqua-offline-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.hidden = true;
      banner.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">cloud_off</span>' +
        '<span>Offline Mode &mdash; Showing cached Aqua PC Parts catalog. Live stock &amp; orders will sync when you reconnect.</span>';
      document.body.appendChild(banner);
    }
    const sync = () => {
      banner.hidden = navigator.onLine !== false;
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
  }

  function openIosGuideModal() {
    let modal = document.getElementById("aqua-ios-install-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "aqua-ios-install-modal";
      modal.className = "aqua-auth-overlay";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "aqua-ios-install-title");
      modal.innerHTML =
        '<div class="aqua-auth-card" style="max-width:420px">' +
        '<button type="button" class="aqua-auth-close" id="aqua-ios-close" aria-label="Close install guide">' +
        '<span class="material-symbols-outlined">close</span></button>' +
        '<div class="aqua-auth-head">' +
        '<div class="aqua-auth-brand">' +
        '<img src="/pwa-192x192.png" alt="Aqua PC Parts App" />' +
        '<div><span class="aqua-auth-eyebrow">INSTALL AQUA PC PARTS APP</span>' +
        '<h2 id="aqua-ios-install-title">Add to Home Screen</h2></div></div>' +
        '<p class="aqua-auth-sub">Install Aqua PC Parts for instant offline catalog access, faster SKU search, and one-tap order tracking.</p>' +
        "</div>" +
        '<ol class="aqua-ios-steps">' +
        '<li>Tap the <strong>Share</strong> icon <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">ios_share</span> in your browser toolbar.</li>' +
        '<li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>' +
        '<li>Tap <strong>Add</strong> in the top-right corner to launch Aqua Parts like a native app.</li>' +
        "</ol>" +
        '<button type="button" class="aqua-primary-btn" id="aqua-ios-ok" style="width:100%;margin-top:14px">Got It</button>' +
        "</div>";
      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });
      document.body.appendChild(modal);
      const close = () => {
        modal.hidden = true;
        modal.classList.remove("open");
      };
      modal.querySelector("#aqua-ios-close").addEventListener("click", close);
      modal.querySelector("#aqua-ios-ok").addEventListener("click", close);
    }
    modal.hidden = false;
    modal.classList.add("open");
  }

  function mountInstallButton() {
    if (isStandalone()) return;
    if (document.getElementById("aqua-pwa-install-btn")) return;

    const target =
      document.querySelector(".ne-header-actions") ||
      document.querySelector(".header-actions");
    if (!target) return;

    const btn = document.createElement("button");
    btn.id = "aqua-pwa-install-btn";
    btn.type = "button";
    btn.className = "aqua-pwa-btn";
    btn.title = "Install Aqua PC Parts App";
    btn.setAttribute("aria-label", "Install Aqua PC Parts App");
    btn.innerHTML =
      '<span class="material-symbols-outlined" aria-hidden="true">download</span>' +
      '<span class="aqua-pwa-btn-label">Install App</span>';

    // Show immediately if iOS or when beforeinstallprompt fires (also allow manual guide click)
    btn.addEventListener("click", async () => {
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (choice && choice.outcome === "accepted") {
            btn.hidden = true;
          }
        } catch (_) {
          openIosGuideModal();
        }
      } else {
        openIosGuideModal();
      }
    });

    // Place cleanly at start of header actions
    target.insertBefore(btn, target.firstChild);
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mountInstallButton();
    const btn = document.getElementById("aqua-pwa-install-btn");
    if (btn) btn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const btn = document.getElementById("aqua-pwa-install-btn");
    if (btn) btn.hidden = true;
  });

  registerServiceWorker();

  function boot() {
    ensureOfflineBanner();
    mountInstallButton();
    if (isStandalone()) {
      const btn = document.getElementById("aqua-pwa-install-btn");
      if (btn) btn.hidden = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
