var UI_NOTIFY_CONTAINER_ID = "linkedin-engage-notify-container";
var UI_NOTIFY_COUNTER = 0;
var UI_NOTIFY_MAX_VISIBLE = 4;
var UI_NOTIFY_AUTO_DISMISS_MS = {
  info: 8000,
  success: 6000,
  warning: 12000,
  error: 0,
};

var UI_NOTIFY_COLORS = {
  error: { border: "#d32f2f", bg: "rgba(211,47,47,0.12)", icon: "\u26D4" },
  warning: {
    border: "#e65100",
    bg: "rgba(230,81,0,0.10)",
    icon: "\u26A0\uFE0F",
  },
  info: {
    border: "#1976d2",
    bg: "rgba(25,118,210,0.10)",
    icon: "\u2139\uFE0F",
  },
  success: { border: "#2e7d32", bg: "rgba(46,125,50,0.10)", icon: "\u2705" },
};

function getNotifyContainer() {
  if (typeof document === "undefined") return null;
  var existing = document.getElementById(UI_NOTIFY_CONTAINER_ID);
  if (existing) return existing;

  var container = document.createElement("div");
  container.id = UI_NOTIFY_CONTAINER_ID;
  container.setAttribute(
    "style",
    [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:2147483647",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "pointer-events:none",
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      "padding:8px 16px 0",
    ].join(";"),
  );
  document.body.appendChild(container);
  return container;
}

function dismissTopNotification(notifyEl) {
  if (!notifyEl || !notifyEl.parentNode) return;
  notifyEl.style.opacity = "0";
  notifyEl.style.transform = "translateY(-100%)";
  setTimeout(function () {
    if (notifyEl.parentNode) {
      notifyEl.parentNode.removeChild(notifyEl);
    }
  }, 300);
}

function showTopNotification(message, type, options) {
  var container = getNotifyContainer();
  if (!container) return null;
  var opts = options || {};
  var palette = UI_NOTIFY_COLORS[type] || UI_NOTIFY_COLORS.info;
  var id = "le-notify-" + ++UI_NOTIFY_COUNTER;

  while (container.children.length >= UI_NOTIFY_MAX_VISIBLE) {
    dismissTopNotification(container.children[0]);
  }

  var bar = document.createElement("div");
  bar.id = id;
  bar.setAttribute("role", "alert");
  bar.setAttribute(
    "style",
    [
      "pointer-events:auto",
      "width:100%",
      "max-width:720px",
      "display:flex",
      "align-items:flex-start",
      "gap:10px",
      "padding:10px 14px",
      "margin-bottom:6px",
      "border-radius:8px",
      "border-left:4px solid " + palette.border,
      "background:" + palette.bg,
      "backdrop-filter:blur(12px)",
      "-webkit-backdrop-filter:blur(12px)",
      "color:#f5f5f5",
      "font-size:13px",
      "line-height:1.45",
      "box-shadow:0 4px 24px rgba(0,0,0,0.35),0 1px 4px rgba(0,0,0,0.2)",
      "opacity:0",
      "transform:translateY(-100%)",
      "transition:opacity 0.3s ease,transform 0.3s ease",
    ].join(";"),
  );

  var iconSpan = document.createElement("span");
  iconSpan.setAttribute("style", "font-size:16px;flex-shrink:0;margin-top:1px");
  iconSpan.textContent = palette.icon;

  var textSpan = document.createElement("span");
  textSpan.setAttribute("style", "flex:1;word-break:break-word");
  textSpan.textContent = message;

  var closeBtn = document.createElement("button");
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.setAttribute(
    "style",
    [
      "background:none",
      "border:none",
      "color:#ccc",
      "cursor:pointer",
      "font-size:16px",
      "padding:0 2px",
      "flex-shrink:0",
      "line-height:1",
      "margin-top:-1px",
    ].join(";"),
  );
  closeBtn.textContent = "\u2715";
  closeBtn.addEventListener("click", function () {
    dismissTopNotification(bar);
  });

  bar.appendChild(iconSpan);
  bar.appendChild(textSpan);
  bar.appendChild(closeBtn);
  container.appendChild(bar);

  var raf =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : function (fn) {
          setTimeout(fn, 0);
        };
  raf(function () {
    raf(function () {
      bar.style.opacity = "1";
      bar.style.transform = "translateY(0)";
    });
  });

  var autoDismiss =
    opts.duration != null
      ? opts.duration
      : UI_NOTIFY_AUTO_DISMISS_MS[type] || 0;
  if (autoDismiss > 0) {
    setTimeout(function () {
      dismissTopNotification(bar);
    }, autoDismiss);
  }

  return bar;
}

function clearAllTopNotifications() {
  var container =
    typeof document !== "undefined"
      ? document.getElementById(UI_NOTIFY_CONTAINER_ID)
      : null;
  if (!container) return;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showTopNotification,
    dismissTopNotification,
    clearAllTopNotifications,
    getNotifyContainer,
    UI_NOTIFY_CONTAINER_ID,
    UI_NOTIFY_AUTO_DISMISS_MS,
    UI_NOTIFY_COLORS,
    UI_NOTIFY_MAX_VISIBLE,
  };
}
