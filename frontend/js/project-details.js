/**
 * project-details.js
 * Owns the Project Analysis (detail) page: reading the project id from the
 * URL, loading /api/projects/{id}/details, and rendering the summary,
 * info panel, top cost drivers, charts, and full breakdown table. No
 * business calculations happen here — margin, selling price per m², and
 * scope costs/percentages all come from the API. The only aggregation done
 * here is the frontend-only "Other" bucket for the distribution chart,
 * which the brief explicitly allows as a presentation-only grouping.
 */

const ProjectDetailsPage = (() => {
  const TOP_BAR_COUNT = 10;
  const TOP_DISTRIBUTION_COUNT = 8;
  const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--chart-7)",
    "var(--chart-8)"
  ];
  const OTHER_COLOR = "var(--chart-other)";

  let els = {};
  let projectId = null;

  function init() {
    cacheElements();
    els.retryBtn.addEventListener("click", loadDetails);

    projectId = new URLSearchParams(window.location.search).get("id");

    if (!projectId) {
      showState("missing-id");
      return;
    }

    loadDetails();
  }

  function cacheElements() {
    els = {
      pageProjectName: document.getElementById("detail-project-name"),

      stateLoading: document.getElementById("detail-state-loading"),
      stateMissingId: document.getElementById("detail-state-missing-id"),
      stateNotFound: document.getElementById("detail-state-not-found"),
      stateError: document.getElementById("detail-state-error"),
      errorMessage: document.getElementById("detail-error-message"),
      retryBtn: document.getElementById("detail-retry-btn"),
      content: document.getElementById("detail-content"),

      kpiTotalCost: document.getElementById("kpi-total-cost"),
      kpiSellingPrice: document.getElementById("kpi-selling-price"),
      kpiMargin: document.getElementById("kpi-margin"),
      kpiPricePerSqm: document.getElementById("kpi-price-per-sqm"),

      infoGrid: document.getElementById("info-grid"),

      driversPanel: document.getElementById("drivers-panel"),
      driverList: document.getElementById("driver-list"),
      driversEmpty: document.getElementById("drivers-empty"),

      breakdownPanel: document.getElementById("breakdown-panel"),
      breakdownEmpty: document.getElementById("breakdown-empty"),
      breakdownCharts: document.getElementById("breakdown-charts"),
      barChart: document.getElementById("bar-chart"),
      donutWrapper: document.querySelector(".donut-wrapper"),
      donut: document.getElementById("donut"),
      donutCenterValue: document.getElementById("donut-center-value"),
      donutTooltip: document.getElementById("donut-tooltip"),
      donutLegend: document.getElementById("donut-legend"),
      breakdownTableWrapper: document.getElementById("breakdown-table-wrapper"),
      breakdownTableBody: document.getElementById("breakdown-table-body")
    };
  }

  async function loadDetails() {
    showState("loading");
    try {
      const data = await Api.getProjectDetails(projectId);
      renderPage(data);
      showState("ready");
    } catch (err) {
      if (err.status === 404) {
        showState("not-found");
      } else {
        showState("error", err.message);
      }
    }
  }

  function renderPage(data) {
    const project = data.project || {};
    const costBreakdown = Array.isArray(data.costBreakdown) ? data.costBreakdown : [];
    const topCostDrivers = Array.isArray(data.topCostDrivers) ? data.topCostDrivers : [];

    renderHeader(project);
    renderKpis(project);
    renderInfo(project);
    renderDrivers(topCostDrivers);
    renderBreakdown(costBreakdown, project);
  }

  function renderHeader(project) {
    const name = project.projectName || "Untitled project";
    els.pageProjectName.textContent = name;
    document.title = `${name} — Project Analysis — YourQS Analytics`;
  }

  function renderKpis(project) {
    els.kpiTotalCost.textContent = Formatters.currency(project.totalCost, { precise: true });
    els.kpiSellingPrice.textContent = Formatters.currency(project.totalSellingPrice, {
      precise: true
    });
    els.kpiMargin.textContent = Formatters.percent(project.marginPercent, 2);
    els.kpiPricePerSqm.textContent = Formatters.currency(project.sellingPricePerSqm, {
      precise: true
    });
  }

  function renderInfo(project) {
    const status = Formatters.status(project);
    const rows = [
      { label: "Floor Area", value: Formatters.area(project.floorArea) },
      { label: "Levels", value: Formatters.count(project.numberOfLevels) },
      { label: "Bathrooms", value: Formatters.count(project.totalBathroomCount) },
      { label: "Models", value: Formatters.count(project.modelCount) },
      { label: "Cost Items", value: Formatters.count(project.costItemCount) }
    ];

    els.infoGrid.innerHTML =
      rows
        .map(
          (row) => `
            <div class="info-item">
              <span class="info-item-label">${escapeHtml(row.label)}</span>
              <span class="info-item-value">${escapeHtml(row.value)}</span>
            </div>
          `
        )
        .join("") +
      `
        <div class="info-item">
          <span class="info-item-label">Status</span>
          <span class="info-item-value">
            <span class="status-badge status-${status.key}">${escapeHtml(status.label)}</span>
          </span>
        </div>
      `;
  }

  function renderDrivers(topCostDrivers) {
    if (topCostDrivers.length === 0) {
      els.driverList.hidden = true;
      els.driversEmpty.hidden = false;
      return;
    }

    els.driverList.hidden = false;
    els.driversEmpty.hidden = true;
    els.driverList.innerHTML = topCostDrivers
      .map(
        (driver, index) => `
          <li class="driver-item">
            <span class="driver-rank" aria-hidden="true">${index + 1}</span>
            <span class="driver-name">${escapeHtml(driver.scopeName)}</span>
            <span class="driver-figures">
              <span class="driver-cost">${Formatters.currency(driver.totalCost, {
                precise: true
              })}</span>
              <span class="driver-percent">${Formatters.percent(driver.percentage, 2)}</span>
            </span>
          </li>
        `
      )
      .join("");
  }

  function renderBreakdown(costBreakdown, project) {
    if (costBreakdown.length === 0) {
      els.breakdownCharts.hidden = true;
      els.breakdownTableWrapper.hidden = true;
      els.breakdownEmpty.hidden = false;
      return;
    }

    els.breakdownCharts.hidden = false;
    els.breakdownTableWrapper.hidden = false;
    els.breakdownEmpty.hidden = true;

    renderBarChart(costBreakdown);
    renderDistribution(costBreakdown, project);
    renderFullTable(costBreakdown);
  }

  /** Top 10 cost scopes as a horizontal bar chart. Backend already sorts
   *  costBreakdown by cost descending, so no re-sort is performed. */
  function renderBarChart(costBreakdown) {
    const top = costBreakdown.slice(0, TOP_BAR_COUNT);
    const maxCost = top.reduce((max, item) => Math.max(max, Number(item.totalCost) || 0), 0);

    els.barChart.innerHTML = top
      .map((item) => {
        const cost = Number(item.totalCost) || 0;
        const widthPct = maxCost > 0 ? Math.max((cost / maxCost) * 100, 2) : 0;
        return `
          <div class="bar-row">
            <span class="bar-label" title="${escapeHtml(item.scopeName)}">${escapeHtml(
              item.scopeName
            )}</span>
            <span class="bar-track">
              <span class="bar-fill" style="width:${widthPct}%"></span>
            </span>
            <span class="bar-value">${Formatters.currencyCompact(item.totalCost)}</span>
          </div>
        `;
      })
      .join("");
  }

  /** Top 8 scopes + a frontend-only "Other" bucket, shown as a donut with a
   *  text legend. Summing the remaining scopes into "Other" is the one
   *  aggregation the brief allows on the frontend. */
  function renderDistribution(costBreakdown, project) {
    const top = costBreakdown.slice(0, TOP_DISTRIBUTION_COUNT);
    const rest = costBreakdown.slice(TOP_DISTRIBUTION_COUNT);

    const segments = top.map((item, index) => ({
      name: item.scopeName,
      cost: Number(item.totalCost) || 0,
      percentage: Number(item.percentage) || 0,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));

    if (rest.length > 0) {
      const otherCost = rest.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
      const otherPercentage = rest.reduce(
        (sum, item) => sum + (Number(item.percentage) || 0),
        0
      );
      segments.push({
        name: "Other",
        cost: otherCost,
        percentage: otherPercentage,
        color: OTHER_COLOR
      });
    }

    let cumulative = 0;
    const boundedSegments = segments.map((seg) => {
      const start = cumulative;
      cumulative += seg.percentage;
      return { ...seg, start, end: cumulative };
    });

    renderDonutSegments(boundedSegments);

    els.donutCenterValue.textContent = Formatters.currencyCompact(project.totalCost);

    els.donutLegend.innerHTML = boundedSegments
      .map(
        (seg) => `
          <li class="legend-item">
            <span class="legend-swatch" style="background:${seg.color}" aria-hidden="true"></span>
            <span class="legend-name">${escapeHtml(seg.name)}</span>
            <span class="legend-figures">${Formatters.percent(seg.percentage, 1)} · ${Formatters.currencyCompact(
              seg.cost
            )}</span>
          </li>
        `
      )
      .join("");
  }

  /**
   * Render the donut as individually hoverable/focusable wedge buttons
   * (rather than a single flat gradient) so each scope can show a tooltip
   * on hover and on keyboard focus. Visual proportions and colours are
   * identical to the previous conic-gradient rendering.
   */
  function renderDonutSegments(boundedSegments) {
    els.donut.innerHTML = boundedSegments
      .map((seg) => {
        const clipPath = buildWedgeClipPath(seg.start, seg.end);
        const mid = (seg.start + seg.end) / 2;
        const ariaLabel = `${seg.name}, ${seg.percentage.toFixed(2)} percent, ${Formatters.currency(
          seg.cost,
          { precise: true }
        )}`;
        return `
          <button
            type="button"
            class="donut-segment"
            style="background:${seg.color}; clip-path:${clipPath};"
            data-name="${escapeHtml(seg.name)}"
            data-percentage="${seg.percentage}"
            data-cost="${seg.cost}"
            data-mid="${mid}"
            aria-label="${escapeHtml(ariaLabel)}"
          ></button>
        `;
      })
      .join("");

    els.donut.querySelectorAll(".donut-segment").forEach((segmentEl) => {
      segmentEl.addEventListener("mouseenter", (e) =>
        activateDonutSegment(segmentEl, { clientX: e.clientX, clientY: e.clientY })
      );
      segmentEl.addEventListener("mousemove", (e) =>
        positionDonutTooltipAtPoint(e.clientX, e.clientY)
      );
      segmentEl.addEventListener("mouseleave", deactivateDonutSegments);
      segmentEl.addEventListener("focus", () => activateDonutSegment(segmentEl, null));
      segmentEl.addEventListener("blur", deactivateDonutSegments);
    });
  }

  /** Highlight the given segment, mute the rest, and show its tooltip. */
  function activateDonutSegment(segmentEl, pointerCoords) {
    els.donut.querySelectorAll(".donut-segment").forEach((el) => {
      const isActive = el === segmentEl;
      el.classList.toggle("is-active", isActive);
      el.classList.toggle("is-muted", !isActive);
    });

    const name = segmentEl.dataset.name;
    const percentage = Number(segmentEl.dataset.percentage);
    const cost = Number(segmentEl.dataset.cost);

    els.donutTooltip.innerHTML = `
      <div class="donut-tooltip-name">${escapeHtml(name)}</div>
      <div class="donut-tooltip-percent">${Formatters.percent(percentage, 2)}</div>
      <div class="donut-tooltip-cost">${Formatters.currency(cost, { precise: true })}</div>
    `;
    els.donutTooltip.hidden = false;

    if (pointerCoords) {
      positionDonutTooltipAtPoint(pointerCoords.clientX, pointerCoords.clientY);
    } else {
      positionDonutTooltipAtSegment(segmentEl);
    }
  }

  /** Clear hover/focus emphasis and hide the tooltip. */
  function deactivateDonutSegments() {
    els.donut.querySelectorAll(".donut-segment").forEach((el) => {
      el.classList.remove("is-active", "is-muted");
    });
    els.donutTooltip.hidden = true;
  }

  /** Position the tooltip near the mouse pointer, clamped inside the donut card. */
  function positionDonutTooltipAtPoint(clientX, clientY) {
    if (els.donutTooltip.hidden) return;
    const wrapperRect = els.donutWrapper.getBoundingClientRect();
    const left = clientX - wrapperRect.left + 14;
    const top = clientY - wrapperRect.top + 14;
    placeDonutTooltip(left, top);
  }

  /** Position the tooltip near a focused segment's outer edge (no pointer coordinates available). */
  function positionDonutTooltipAtSegment(segmentEl) {
    const wrapperRect = els.donutWrapper.getBoundingClientRect();
    const mid = Number(segmentEl.dataset.mid);
    const angle = (mid / 100) * 2 * Math.PI;
    const radius = wrapperRect.width * 0.42;
    const cx = wrapperRect.width / 2;
    const cy = wrapperRect.height / 2;
    const px = cx + radius * Math.sin(angle);
    const py = cy - radius * Math.cos(angle);
    placeDonutTooltip(px, py);
  }

  /** Clamp the tooltip's top/left so it stays within the donut card area. */
  function placeDonutTooltip(left, top) {
    const wrapperRect = els.donutWrapper.getBoundingClientRect();
    const panelRect = els.donutWrapper.closest(".panel").getBoundingClientRect();
    const tooltipRect = els.donutTooltip.getBoundingClientRect();

    // Bounds expressed in donut-wrapper-relative coordinates, since that's
    // the tooltip's positioning context.
    const minLeft = panelRect.left - wrapperRect.left + 4;
    const minTop = panelRect.top - wrapperRect.top + 4;
    const maxLeft = panelRect.right - wrapperRect.left - tooltipRect.width - 4;
    const maxTop = panelRect.bottom - wrapperRect.top - tooltipRect.height - 4;

    const clampedLeft = Math.min(Math.max(left, minLeft), Math.max(maxLeft, minLeft));
    const clampedTop = Math.min(Math.max(top, minTop), Math.max(maxTop, minTop));

    els.donutTooltip.style.left = `${clampedLeft}px`;
    els.donutTooltip.style.top = `${clampedTop}px`;
  }

  /** A point on the donut's circumference for a given percent (0–100),
   *  measured clockwise from the top — matching conic-gradient's default
   *  start angle, so wedges line up with the donut's visual orientation. */
  function polarPercentPoint(percent) {
    const angle = (percent / 100) * 2 * Math.PI;
    const x = 50 + 50 * Math.sin(angle);
    const y = 50 - 50 * Math.cos(angle);
    return `${x}% ${y}%`;
  }

  /** Build a clip-path polygon tracing a pie wedge from startPercent to
   *  endPercent, sampling enough points along the arc to look smooth. */
  function buildWedgeClipPath(startPercent, endPercent) {
    const span = endPercent - startPercent;
    if (span <= 0) {
      return "polygon(50% 50%, 50% 50%, 50% 50%)";
    }
    const steps = Math.max(2, Math.ceil(span / 2));
    const points = ["50% 50%"];
    for (let i = 0; i <= steps; i++) {
      points.push(polarPercentPoint(startPercent + (span * i) / steps));
    }
    return `polygon(${points.join(", ")})`;
  }

  /** Every scope, in the order the backend returned it. */
  function renderFullTable(costBreakdown) {
    els.breakdownTableBody.innerHTML = costBreakdown
      .map(
        (item) => `
          <tr>
            <td class="col-name">${escapeHtml(item.scopeName)}</td>
            <td class="col-numeric">${Formatters.currency(item.totalCost, { precise: true })}</td>
            <td class="col-numeric">${Formatters.percent(item.percentage, 2)}</td>
          </tr>
        `
      )
      .join("");
  }

  /**
   * Central UI-state switch for the detail page. States: loading,
   * missing-id (no ?id= in the URL), not-found (API 404), error (any other
   * API failure), ready (content rendered).
   */
  function showState(state, errorMessage = "") {
    const isLoading = state === "loading";
    const isMissingId = state === "missing-id";
    const isNotFound = state === "not-found";
    const isError = state === "error";
    const isReady = state === "ready";

    els.stateLoading.hidden = !isLoading;
    els.stateMissingId.hidden = !isMissingId;
    els.stateNotFound.hidden = !isNotFound;
    els.stateError.hidden = !isError;
    els.content.hidden = !isReady;

    if (isError) {
      els.errorMessage.textContent =
        errorMessage || "Something went wrong while loading this project.";
    }
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return { init };
})();
