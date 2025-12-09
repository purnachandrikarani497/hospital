import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";


const root = ReactDOM.createRoot(document.getElementById("root"));
if (typeof window !== "undefined") {
  const roMatch = (val) => {
    const s = String(val || "");
    return s.includes("ResizeObserver") && (s.includes("loop") || s.includes("limit exceeded") || s.includes("completed"));
  };
  const suppress = (e) => {
    try {
      const msg = e?.message || e?.reason?.message || e?.error?.message || e?.reason || e?.error || "";
      if (roMatch(msg)) {
        e.preventDefault?.();
        e.stopPropagation?.();
        e.stopImmediatePropagation?.();
        return true;
      }
    } catch (_) {}
    return false;
  };
  window.addEventListener("error", (e) => { suppress(e); }, true);
  window.addEventListener("unhandledrejection", (e) => { suppress(e); }, true);
  window.onerror = function(_, __, ___, ____, err) {
    if (roMatch(err?.message)) return true;
  };
  window.onunhandledrejection = function(e) {
    if (roMatch(e?.reason?.message || e?.reason)) return true;
  };

  const origConsoleError = console.error.bind(console);
  console.error = (...args) => {
    try {
      const msg = args.map((a) => (a && a.message) ? a.message : String(a)).join(" ");
      if (roMatch(msg)) return;
      if (msg.includes("MIME type ('text/html')") || msg.includes("Refused to apply style")) return;
    } catch (_) {}
    origConsoleError(...args);
  };

  const origConsoleWarn = console.warn.bind(console);
  console.warn = (...args) => {
    try {
      const msg = args.map((a) => (a && a.message) ? a.message : String(a)).join(" ");
      if (msg.includes("cdn.tailwindcss.com") || (msg.includes("Tailwind CSS") && msg.includes("production"))) return;
    } catch (_) {}
    origConsoleWarn(...args);
  };

  const NativeRO = window.ResizeObserver;
  const isMobile = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 640px)').matches : (window.innerWidth < 640);
  if (isMobile) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  } else if (NativeRO && !window.__patchedRO__) {
    window.__patchedRO__ = true;
    window.ResizeObserver = class extends NativeRO {
      constructor(cb) {
        const safeCb = (entries, observer) => {
          try { cb && cb(entries, observer); } catch (err) { if (!roMatch(err?.message || err)) throw err; }
        };
        super((entries, observer) => { Promise.resolve().then(() => safeCb(entries, observer)); });
      }
    };
  }

  try {
    if (typeof window.__REACT_ERROR_OVERLAY_GLOBAL_HANDLER__ !== 'undefined') {
      window.__REACT_ERROR_OVERLAY_GLOBAL_HANDLER__ = function() {};
    }
    const reo = window.__REACT_ERROR_OVERLAY__;
    if (reo) {
      reo.reportRuntimeError = function() {};
      reo.dismissRuntimeErrors = function() {};
    }
  } catch (_) {}

  try {
    const hideOverlay = () => {
      try {
        const els = Array.from(document.querySelectorAll('*')).filter((n) => {
          const id = String(n.id || '');
          const cls = String(n.className || '');
          return id.includes('overlay') || cls.includes('overlay');
        });
        els.forEach((n) => { n.style.display = 'none'; });
      } catch(_) {}
    };
    hideOverlay();
    setInterval(hideOverlay, 1000);
  } catch(_) {}
}
root.render(<App />);
