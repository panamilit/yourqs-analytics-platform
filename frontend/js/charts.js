/**
 * charts.js
 *
 * Shared Chart.js configuration used across:
 * - Project Analysis
 * - Benchmarking
 * - Compare Projects
 * - What-if Analysis
 *
 * Responsibilities:
 * - shared palette / typography;
 * - shared Chart.js defaults;
 * - tooltips;
 * - hover interaction;
 * - mouse + touch events;
 * - safe chart lifecycle;
 * - chart destruction before re-render;
 * - formatting helpers.
 */

const Charts = (() => {
  const registry = new Map();
  let defaultsApplied = false;

  /**
   * Read a CSS custom property and return its resolved value.
   */
  function cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  /**
   * Application chart palette.
   *
   * Chart.js cannot directly resolve CSS var(...) values inside canvas,
   * so they are resolved here first.
   */
  function palette() {
    return {
      ink: cssVar("--color-ink"),
      inkMuted: cssVar("--color-ink-muted"),
      inkFaint: cssVar("--color-ink-faint"),

      border: cssVar("--color-border"),
      borderStrong: cssVar("--color-border-strong"),

      surface: cssVar("--color-surface"),
      surfaceSunken: cssVar("--color-surface-sunken"),

      accent: cssVar("--color-accent"),
      accentDark: cssVar("--color-accent-dark"),
      accentTint: cssVar("--color-accent-tint"),

      warn: cssVar("--color-warn"),
      danger: cssVar("--color-danger"),

      series: [
        cssVar("--chart-1"),
        cssVar("--chart-2"),
        cssVar("--chart-3"),
        cssVar("--chart-4"),
        cssVar("--chart-5"),
        cssVar("--chart-6"),
        cssVar("--chart-7"),
        cssVar("--chart-8")
      ],

      other: cssVar("--chart-other"),

      fontFamily: cssVar("--font-sans"),
      fontMono: cssVar("--font-mono")
    };
  }

  /**
   * Apply shared Chart.js defaults once.
   */
  function applyDefaults() {
    if (
      typeof Chart === "undefined" ||
      defaultsApplied
    ) {
      return;
    }

    const p = palette();

    /* Typography */
    Chart.defaults.font.family = p.fontFamily;
    Chart.defaults.font.size = 12;

    Chart.defaults.color = p.inkMuted;
    Chart.defaults.borderColor = p.border;

    /* Responsive behaviour */
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;

    /**
     * IMPORTANT:
     *
     * Do not do:
     *
     * Chart.defaults.animation = { duration: 200 }
     *
     * because replacing the entire internal animation config can break
     * Chart.js hover animations and cause:
     *
     * this._fn is not a function
     */
    Chart.defaults.animation.duration = 200;

    /**
     * Shared interaction behaviour.
     *
     * Page-specific charts may override these settings.
     */
    Chart.defaults.interaction.mode = "nearest";
    Chart.defaults.interaction.intersect = false;

    /**
     * Explicit browser events supported by every chart.
     */
    Chart.defaults.events = [
      "mousemove",
      "mouseout",
      "click",
      "touchstart",
      "touchmove"
    ];

    /* Hover */
    Chart.defaults.hover.mode = "nearest";
    Chart.defaults.hover.intersect = false;

    /* Legend */
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 12;
    Chart.defaults.plugins.legend.labels.color = p.inkMuted;

    Chart.defaults.plugins.legend.labels.font = {
      family: p.fontFamily,
      size: 11.5
    };

    /* Tooltip */
    Chart.defaults.plugins.tooltip.enabled = true;

    Chart.defaults.plugins.tooltip.backgroundColor =
      p.surface;

    Chart.defaults.plugins.tooltip.titleColor =
      p.ink;

    Chart.defaults.plugins.tooltip.bodyColor =
      p.inkMuted;

    Chart.defaults.plugins.tooltip.borderColor =
      p.border;

    Chart.defaults.plugins.tooltip.borderWidth = 1;

    Chart.defaults.plugins.tooltip.padding = 10;

    Chart.defaults.plugins.tooltip.cornerRadius = 6;

    Chart.defaults.plugins.tooltip.displayColors = false;

    Chart.defaults.plugins.tooltip.titleFont = {
      family: p.fontFamily,
      size: 12.5,
      weight: "600"
    };

    Chart.defaults.plugins.tooltip.bodyFont = {
      family: p.fontMono,
      size: 11.5
    };

    defaultsApplied = true;
  }

  /**
   * Prepare a chart config without destroying page-specific settings.
   *
   * This is where we ensure every chart stays interactive.
   */
  function prepareConfig(config) {
    const prepared = config || {};

    prepared.options =
      prepared.options || {};

    const options = prepared.options;

    /**
     * Preserve each chart's own interaction settings.
     *
     * Example:
     * scatter may use intersect:true;
     * grouped bars may use mode:index.
     */
    options.interaction = {
      mode: "nearest",
      intersect: false,
      ...(options.interaction || {})
    };

    /**
     * Hover behaviour follows interaction by default.
     */
    options.hover = {
      mode:
        options.interaction.mode ||
        "nearest",

      intersect:
        options.interaction.intersect ??
        false,

      ...(options.hover || {})
    };

    /**
     * Explicit event list.
     */
    options.events = [
      "mousemove",
      "mouseout",
      "click",
      "touchstart",
      "touchmove"
    ];

    /**
     * Preserve all page-specific plugins.
     */
    options.plugins =
      options.plugins || {};

    /**
     * Force tooltip enabled, but preserve callbacks already supplied
     * by project-details.js / benchmarking.js / comparison.js /
     * what-if.js.
     */
    options.plugins.tooltip = {
      enabled: true,
      ...(options.plugins.tooltip || {})
    };

    /**
     * Cursor feedback only.
     *
     * No manual tooltip creation or pinning.
     * Native Chart.js tooltip system handles hover/touch.
     */
    const existingOnHover =
      options.onHover;

    options.onHover = function (
      event,
      activeElements,
      chart
    ) {
      if (chart && chart.canvas) {
        chart.canvas.style.cursor =
          activeElements &&
          activeElements.length > 0
            ? "pointer"
            : "default";
      }

      if (
        typeof existingOnHover ===
        "function"
      ) {
        existingOnHover(
          event,
          activeElements,
          chart
        );
      }
    };

    return prepared;
  }

  /**
   * Render a chart.
   *
   * Existing chart bound to the same canvas is always destroyed first.
   */
  function render(
    canvasId,
    config
  ) {
    if (
      typeof Chart === "undefined"
    ) {
      if (!render._warned) {
        console.error(
          "Chart.js did not load. Charts on this page will not render."
        );

        render._warned = true;
      }

      return null;
    }

    applyDefaults();

    destroy(canvasId);

    const canvas =
      document.getElementById(
        canvasId
      );

    if (!canvas) {
      console.warn(
        `Chart canvas "${canvasId}" was not found.`
      );

      return null;
    }

    /**
     * Ensure browser events reach canvas.
     */
    canvas.style.pointerEvents =
      "auto";

    canvas.style.touchAction =
      "manipulation";

    canvas.style.cursor =
      "default";

    /**
     * Make chart reachable with keyboard focus.
     */
    if (
      !canvas.hasAttribute(
        "tabindex"
      )
    ) {
      canvas.tabIndex = 0;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      console.error(
        `Could not obtain 2D context for chart "${canvasId}".`
      );

      return null;
    }

    const preparedConfig =
      prepareConfig(config);

    const chart = new Chart(
      context,
      preparedConfig
    );

    registry.set(
      canvasId,
      chart
    );

    return chart;
  }

  /**
   * Safe chart rendering wrapper.
   *
   * A broken visualisation must never break:
   * - API data;
   * - tables;
   * - KPI cards;
   * - page state.
   */
  function renderSafely(
    canvasId,
    config,
    options
  ) {
    const opts =
      options || {};

    const canvas =
      document.getElementById(
        canvasId
      );

    const fallbackEl =
      opts.fallbackId
        ? document.getElementById(
            opts.fallbackId
          )
        : null;

    const message =
      opts.fallbackMessage ||
      "Chart unavailable. Data is still shown elsewhere on this page.";

    function showFallback() {
      if (canvas) {
        canvas.hidden = true;
      }

      if (fallbackEl) {
        fallbackEl.hidden = false;
        fallbackEl.textContent =
          message;
      }
    }

    function hideFallback() {
      if (canvas) {
        canvas.hidden = false;
      }

      if (fallbackEl) {
        fallbackEl.hidden = true;
      }
    }

    try {
      const chart = render(
        canvasId,
        config
      );

      if (chart) {
        hideFallback();
      } else {
        showFallback();
      }

      return chart;
    } catch (err) {
      console.error(
        `Chart "${canvasId}" failed to render:`,
        err
      );

      destroy(canvasId);

      showFallback();

      return null;
    }
  }

  /**
   * Destroy one chart instance.
   */
  function destroy(canvasId) {
    const existing =
      registry.get(
        canvasId
      );

    if (!existing) {
      return;
    }

    existing.destroy();

    registry.delete(
      canvasId
    );

    const canvas =
      document.getElementById(
        canvasId
      );

    if (canvas) {
      canvas.style.cursor =
        "default";
    }
  }

  /**
   * Destroy every active chart.
   */
  function destroyAll() {
    registry.forEach(
      (chart) => {
        chart.destroy();
      }
    );

    registry.clear();
  }

  /**
   * Retrieve active Chart instance.
   *
   * Useful for debugging.
   */
  function get(canvasId) {
    return (
      registry.get(canvasId) ||
      null
    );
  }

  /**
   * Check whether an active chart exists.
   */
  function exists(canvasId) {
    return registry.has(
      canvasId
    );
  }

  /**
   * Shared formatting helpers.
   */

  function currencyTooltip(
    value
  ) {
    return Formatters.currency(
      value,
      {
        precise: true
      }
    );
  }

  function currencyTick(
    value
  ) {
    return Formatters.currencyCompact(
      value
    );
  }

  function percentTooltip(
    value,
    digits
  ) {
    return Formatters.percent(
      value,
      digits === undefined
        ? 2
        : digits
    );
  }

  /**
   * Public API.
   */
  const api = {
    palette,
    applyDefaults,

    render,
    renderSafely,

    destroy,
    destroyAll,

    get,
    exists,

    currencyTooltip,
    currencyTick,
    percentTooltip
  };

  /**
   * Explicit global export.
   */
  window.Charts = api;

  return api;
})();