/**
 * @jest-environment jsdom
 */
"use strict";

const {
  showTopNotification,
  dismissTopNotification,
  clearAllTopNotifications,
  getNotifyContainer,
  UI_NOTIFY_CONTAINER_ID,
  UI_NOTIFY_AUTO_DISMISS_MS,
  UI_NOTIFY_COLORS,
  UI_NOTIFY_MAX_VISIBLE,
} = require("../extension/lib/ui-notify");

beforeEach(() => {
  document.body.innerHTML = "";
});

// ─── Constants ─────────────────────────────────────────────────────────────

describe("ui-notify constants", () => {
  test("exports expected container ID", () => {
    expect(UI_NOTIFY_CONTAINER_ID).toBe("linkedin-engage-notify-container");
  });

  test("error auto-dismiss is 0 (persistent)", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.error).toBe(0);
  });

  test("info auto-dismiss is 8000ms", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.info).toBe(8000);
  });

  test("success auto-dismiss is 6000ms", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.success).toBe(6000);
  });

  test("warning auto-dismiss is 12000ms", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.warning).toBe(12000);
  });

  test("max visible is 4", () => {
    expect(UI_NOTIFY_MAX_VISIBLE).toBe(4);
  });

  test("all 4 color types have border, bg, and icon", () => {
    for (const type of ["error", "warning", "info", "success"]) {
      expect(UI_NOTIFY_COLORS[type]).toBeDefined();
      expect(UI_NOTIFY_COLORS[type].border).toBeTruthy();
      expect(UI_NOTIFY_COLORS[type].bg).toBeTruthy();
      expect(UI_NOTIFY_COLORS[type].icon).toBeTruthy();
    }
  });
});

// ─── getNotifyContainer ────────────────────────────────────────────────────

describe("getNotifyContainer", () => {
  test("creates container on first call", () => {
    const container = getNotifyContainer();
    expect(container).toBeTruthy();
    expect(container.id).toBe(UI_NOTIFY_CONTAINER_ID);
    expect(document.getElementById(UI_NOTIFY_CONTAINER_ID)).toBe(container);
  });

  test("returns same container on repeated calls", () => {
    const first = getNotifyContainer();
    const second = getNotifyContainer();
    expect(first).toBe(second);
  });

  test("container has position fixed and top 0", () => {
    const style = getNotifyContainer().getAttribute("style");
    expect(style).toContain("position:fixed");
    expect(style).toContain("top:0");
  });

  test("container has max z-index", () => {
    const style = getNotifyContainer().getAttribute("style");
    expect(style).toContain("z-index:2147483647");
  });

  test("container has pointer-events none", () => {
    const style = getNotifyContainer().getAttribute("style");
    expect(style).toContain("pointer-events:none");
  });
});

// ─── showTopNotification ───────────────────────────────────────────────────

describe("showTopNotification", () => {
  test("creates a notification bar in the container", () => {
    const bar = showTopNotification("Test message", "info");
    expect(bar).toBeTruthy();
    expect(bar.getAttribute("role")).toBe("alert");
    expect(bar.textContent).toContain("Test message");
  });

  test("notification contains close button", () => {
    const bar = showTopNotification("Hello", "error");
    const closeBtn = bar.querySelector("button");
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.textContent).toBe("\u2715");
    expect(closeBtn.getAttribute("aria-label")).toBe("Dismiss");
  });

  test("notification bar has pointer-events auto", () => {
    const style = showTopNotification("m", "info").getAttribute("style");
    expect(style).toContain("pointer-events:auto");
  });

  test("returns element with unique id", () => {
    const a = showTopNotification("A", "info");
    const b = showTopNotification("B", "info");
    expect(a.id).not.toBe(b.id);
    expect(a.id).toMatch(/^le-notify-/);
  });

  test("applies error color border", () => {
    const style = showTopNotification("E", "error").getAttribute("style");
    expect(style).toContain(UI_NOTIFY_COLORS.error.border);
  });

  test("applies warning color border", () => {
    const style = showTopNotification("W", "warning").getAttribute("style");
    expect(style).toContain(UI_NOTIFY_COLORS.warning.border);
  });

  test("applies success color border", () => {
    const style = showTopNotification("S", "success").getAttribute("style");
    expect(style).toContain(UI_NOTIFY_COLORS.success.border);
  });

  test("applies info color for unknown type", () => {
    const style = showTopNotification("U", "bogus").getAttribute("style");
    expect(style).toContain(UI_NOTIFY_COLORS.info.border);
  });

  test("shows correct icon for each type", () => {
    for (const type of ["error", "warning", "info", "success"]) {
      document.body.innerHTML = "";
      const bar = showTopNotification("msg", type);
      const icon = bar.querySelector("span");
      expect(icon.textContent).toBe(UI_NOTIFY_COLORS[type].icon);
    }
  });

  test("accepts null options without throwing", () => {
    expect(() => showTopNotification("hello", "info", null)).not.toThrow();
  });

  test("accepts no options argument without throwing", () => {
    expect(() => showTopNotification("hello", "info")).not.toThrow();
  });

  test("passing custom duration option does not throw", () => {
    expect(() =>
      showTopNotification("custom duration", "success", { duration: 1000 })
    ).not.toThrow();
  });

  test("passing duration 0 does not throw", () => {
    expect(() =>
      showTopNotification("persistent", "success", { duration: 0 })
    ).not.toThrow();
  });

  test("text span contains the message", () => {
    const bar = showTopNotification("My message text", "info");
    const spans = bar.querySelectorAll("span");
    const textSpan = Array.from(spans).find(
      (s) => s.textContent === "My message text"
    );
    expect(textSpan).toBeTruthy();
  });

  test("bar is appended to the container", () => {
    const bar = showTopNotification("Appended", "info");
    expect(getNotifyContainer().contains(bar)).toBe(true);
  });

  test("multiple notifications are all in the container", () => {
    const a = showTopNotification("A", "error");
    const b = showTopNotification("B", "error");
    const c = showTopNotification("C", "error");
    const container = getNotifyContainer();
    expect(container.contains(a)).toBe(true);
    expect(container.contains(b)).toBe(true);
    expect(container.contains(c)).toBe(true);
  });
});

// ─── dismissTopNotification ────────────────────────────────────────────────

describe("dismissTopNotification", () => {
  test("sets opacity to 0", () => {
    const bar = showTopNotification("Bye", "info");
    dismissTopNotification(bar);
    expect(bar.style.opacity).toBe("0");
  });

  test("sets transform for slide-up", () => {
    const bar = showTopNotification("Slide", "info");
    dismissTopNotification(bar);
    expect(bar.style.transform).toBe("translateY(-100%)");
  });

  test("handles null gracefully", () => {
    expect(() => dismissTopNotification(null)).not.toThrow();
  });

  test("handles already-removed element", () => {
    const bar = showTopNotification("Gone", "info");
    bar.parentNode.removeChild(bar);
    expect(() => dismissTopNotification(bar)).not.toThrow();
  });

  test("element stays in DOM immediately (removal is deferred)", () => {
    const bar = showTopNotification("Deferred", "info");
    dismissTopNotification(bar);
    // Immediately after dismiss call, opacity is 0 but element may still be in DOM
    expect(bar.style.opacity).toBe("0");
  });
});

// ─── clearAllTopNotifications ──────────────────────────────────────────────

describe("clearAllTopNotifications", () => {
  test("removes all notifications", () => {
    showTopNotification("A", "error");
    showTopNotification("B", "error");
    showTopNotification("C", "error");
    const container = getNotifyContainer();
    expect(container.children.length).toBe(3);
    clearAllTopNotifications();
    expect(container.children.length).toBe(0);
  });

  test("does not throw when no container exists", () => {
    document.body.innerHTML = "";
    expect(() => clearAllTopNotifications()).not.toThrow();
  });

  test("can be called multiple times safely", () => {
    showTopNotification("A", "error");
    clearAllTopNotifications();
    expect(() => clearAllTopNotifications()).not.toThrow();
    expect(getNotifyContainer().children.length).toBe(0);
  });
});

// ─── Close button ──────────────────────────────────────────────────────────

describe("close button interaction", () => {
  test("clicking close sets opacity to 0", () => {
    const bar = showTopNotification("Closeable", "warning");
    bar.querySelector("button").click();
    expect(bar.style.opacity).toBe("0");
  });

  test("clicking close sets slide-up transform", () => {
    const bar = showTopNotification("Slide close", "info");
    bar.querySelector("button").click();
    expect(bar.style.transform).toBe("translateY(-100%)");
  });
});

// ─── Auto-dismiss configuration ────────────────────────────────────────────

describe("auto-dismiss configuration", () => {
  test("error has duration 0 (no auto-dismiss)", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.error).toBe(0);
  });

  test("info has positive duration", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.info).toBeGreaterThan(0);
  });

  test("warning has longer duration than info", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.warning).toBeGreaterThan(
      UI_NOTIFY_AUTO_DISMISS_MS.info,
    );
  });

  test("success has shorter duration than info", () => {
    expect(UI_NOTIFY_AUTO_DISMISS_MS.success).toBeLessThan(
      UI_NOTIFY_AUTO_DISMISS_MS.info,
    );
  });
});

// ─── Capacity management ───────────────────────────────────────────────────

describe("capacity management", () => {
  test("exactly MAX_VISIBLE notifications fit without any eviction", () => {
    for (let i = 0; i < UI_NOTIFY_MAX_VISIBLE; i++) {
      showTopNotification(`Message ${i}`, "error");
    }
    const container = getNotifyContainer();
    expect(container.children.length).toBe(UI_NOTIFY_MAX_VISIBLE);
  });

  test("each notification id is unique", () => {
    const ids = new Set();
    for (let i = 0; i < UI_NOTIFY_MAX_VISIBLE; i++) {
      ids.add(showTopNotification(`Message ${i}`, "error").id);
    }
    expect(ids.size).toBe(UI_NOTIFY_MAX_VISIBLE);
  });
});
