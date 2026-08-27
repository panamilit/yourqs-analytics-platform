/**
 * benchmarking.js
 * Owns the Benchmarking page: reading the project id from the URL, loading
 * /api/benchmarking/projects/{id}, and rendering the KPI cards, cost
 * position/percentile scale, value comparison bars, dataset range and
 * information, and similar projects table. No benchmark math happens here
 * — cost per m², dataset median/average, variance, percentile, and position
 * classification all come from the API exactly as supplied.
 */

const BenchmarkingPage = (() => {
  /** Maps the backend's 6 position values to one of 4 restrained visual
   *  tiers, reusing the same palette as the existing status badges. */
  const POSITION_TIER = {
    very_low: "favorable",
    below_typical: "favorable",
    typical: "neutral",
    above_typical: "caution",
    high: "caution",
    extreme: "critical"
  };

  /** Presentation-only explanation text per backend position value. This
   *  never overrides or recalculates the backend's classification. */
  const POSITION_EXPLANATIONS = {
    very_low:
      "This project's cost per m² is among the lowest in the benchmark dataset.",
    below_typical:
      "This project's cost per m² is below the typical range of benchmark projects.",
    typical:
      "This project's cost per m² sits near the middle of the benchmark dataset.",
    above_typical:
      "This project's cost per m² is above the typical benchmark range.",
    high:
      "This project's cost per m² is high relative to most benchmark projects.",
    extreme:
      "This project's cost per m² is at the extreme upper end of the benchmark dataset."
  };

  let els = {};
  let projectId = null;

  function init() {
    cacheElements();
    els.retryBtn.addEventListener("click", loadBenchmark);

    projectId = new URLSearchParams(window.location.search).get("id");

    if (!projectId) {
      showState("missing-id");
      return;
    }

    const analysisUrl = `project.html?id=${encodeURIComponent(projectId)}`;
    els.backLink.href = analysisUrl;
    els.insufficientBackLink.href = analysisUrl;
    els.navProjectAnalysisLink.href = analysisUrl;

    loadBenchmark();
  }

  function cacheElements() {
    els = {
      backLink: document.getElementById("bm-back-link"),
      insufficientBackLink: document.getElementById("bm-insufficient-back-link"),
      navProjectAnalysisLink: document.getElementById("nav-project-analysis-link"),
      pageProjectName: document.getElementById("bm-project-name"),

      stateLoading: document.getElementById("bm-state-loading"),
      stateMissingId: document.getElementById("bm-state-missing-id"),
      stateNotFound: document.getElementById("bm-state-not-found"),
      stateInsufficient: document.getElementById("bm-state-insufficient"),
      stateError: document.getElementById("bm-state-error"),
      errorMessage: document.getElementById("bm-error-message"),
      retryBtn: document.getElementById("bm-retry-btn"),
      content: document.getElementById("bm-content"),

      kpiProject: document.getElementById("bm-kpi-project"),
      kpiMedian: document.getElementById("bm-kpi-median"),
      kpiMedianVariance: document.getElementById("bm-kpi-median-variance"),
      kpiAverage: document.getElementById("bm-kpi-average"),
      kpiAverageVariance: document.getElementById("bm-kpi-average-variance"),

      positionBadge: document.getElementById("bm-position-badge"),
      positionPercentile: document.getElementById("bm-position-percentile"),
      positionExplanation: document.getElementById("bm-position-explanation"),
      percentileMarker: document.getElementById("bm-percentile-marker"),
      percentileMarkerLabel: document.getElementById("bm-percentile-marker-label"),
      percentileDescription: document.getElementById("bm-percentile-description"),

      comparisonBars: document.getElementById("bm-comparison-bars"),

      rangeGrid: document.getElementById("bm-range-grid"),
      datasetInfoGrid: document.getElementById("bm-dataset-info-grid"),

      similarEmpty: document.getElementById("bm-similar-empty"),
      similarTableWrapper: document.getElementById("bm-similar-table-wrapper"),
      similarTableBody: document.getElementById("bm-similar-table-body")
    };
  }

  async function loadBenchmark() {
    showState("loading");
    try {
      const data = await Api.getProjectBenchmark(projectId);
      renderHeader(data);

      const hasCoreMetrics =
        data.projectCostPerSqm !== null &&
        data.projectCostPerSqm !== undefined &&
        data.datasetMedian !== null &&
        data.datasetMedian !== undefined &&
        data.percentile !== null &&
        data.percentile !== undefined;

      if (!hasCoreMetrics) {
        showState("insufficient");
        return;
      }

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

  function renderHeader(data) {
    const name = data.projectName || "Untitled project";
    els.pageProjectName.textContent = name;
    document.title = `${name} — Benchmarking — YourQS Analytics`;
  }

  function renderPage(data) {
    renderKpis(data);
    renderPosition(data);
    renderPositionChart(data);
    renderComparisonBars(data);
    renderRange(data);
    renderDatasetInfo(data);
    renderSimilarProjects(Array.isArray(data.similarProjects) ? data.similarProjects : []);
  }

  function renderKpis(data) {
    els.kpiProject.textContent = Formatters.currency(data.projectCostPerSqm, { precise: true });

    els.kpiMedian.textContent = Formatters.currency(data.datasetMedian, { precise: true });
    els.kpiMedianVariance.textContent = varianceText(data.varianceFromMedianPercent, "median");
    els.kpiMedianVariance.className = `summary-card-sub ${varianceTone(data.varianceFromMedianPercent)}`;

    els.kpiAverage.textContent = Formatters.currency(data.datasetAverage, { precise: true });
    els.kpiAverageVariance.textContent = varianceText(data.varianceFromAveragePercent, "average");
    els.kpiAverageVariance.className = `summary-card-sub ${varianceTone(data.varianceFromAveragePercent)}`;
  }

  /** "31.53% below median" / "12% above average" — direction comes from the
   *  backend-supplied variance's sign, not a frontend recalculation. */
  function varianceText(variancePercent, label) {
    if (variancePercent === null || variancePercent === undefined || Number.isNaN(Number(variancePercent))) {
      return "N/A";
    }
    const magnitude = Formatters.percent(Math.abs(variancePercent), 2);
    if (variancePercent < 0) return `${magnitude} below ${label}`;
    if (variancePercent > 0) return `${magnitude} above ${label}`;
    return `At ${label}`;
  }

  /** Restrained tone (not bright red/green) matching the position badge palette. */
  function varianceTone(variancePercent) {
    if (variancePercent === null || variancePercent === undefined || Number.isNaN(Number(variancePercent))) {
      return "is-neutral";
    }
    if (variancePercent < 0) return "is-favorable";
    if (variancePercent > 0) return "is-caution";
    return "is-neutral";
  }

  function renderPosition(data) {
    const tier = POSITION_TIER[data.position] || "neutral";
    els.positionBadge.textContent = data.positionLabel || "Unclassified";
    els.positionBadge.className = `position-badge is-${tier}`;

    els.positionPercentile.textContent = Formatters.percentile(data.percentile, 1);

    els.positionExplanation.textContent =
      POSITION_EXPLANATIONS[data.position] ||
      "This project's benchmark position could not be classified.";

    const clampedPercentile = Math.min(100, Math.max(0, Number(data.percentile) || 0));
    els.percentileMarker.style.left = `${clampedPercentile}%`;
    els.percentileMarkerLabel.textContent = ordinalOnly(data.percentile);

    els.percentileDescription.textContent = `This project sits at the ${Formatters.percentile(
      data.percentile,
      1
    )} of the benchmark dataset (${data.positionLabel || "unclassified"}).`;
  }

  /** Compact ordinal for the marker bubble, e.g. 37.617 -> "37.6th". */
  function ordinalOnly(value) {
    const full = Formatters.percentile(value, 1);
    return full === "N/A" ? "N/A" : full.replace(" percentile", "");
  }

  /** A one-axis scatter showing only the statistics the API actually
   *  supplies (min, average, median, max, and this project) — never
   *  fabricated individual dataset points. Each is its own dataset so it
   *  gets its own legend entry, colour, and tooltip. Uses renderSafely so
   *  a chart failure never affects the rest of the (already-rendered)
   *  page — KPIs, percentile scale, and similar projects stay unaffected. */
  function renderPositionChart(data) {
    const p = Charts.palette();
    const candidates = [
      { label: "Minimum", value: data.datasetMin, color: p.inkFaint, radius: 5 },
      { label: "Dataset Average", value: data.datasetAverage, color: p.series[1], radius: 6 },
      { label: "Dataset Median", value: data.datasetMedian, color: p.series[2], radius: 6 },
      { label: "Maximum", value: data.datasetMax, color: p.inkFaint, radius: 5 },
      { label: "Selected Project", value: data.projectCostPerSqm, color: p.accent, radius: 9 }
    ].filter((pt) => pt.value !== null && pt.value !== undefined && Number.isFinite(Number(pt.value)));

    if (candidates.length === 0) {
      Charts.destroy("benchmark-position-chart");
      const canvas = document.getElementById("benchmark-position-chart");
      const fallback = document.getElementById("benchmark-position-chart-fallback");
      if (canvas) canvas.hidden = true;
      if (fallback) {
        fallback.hidden = false;
        fallback.textContent = "No benchmark statistics available for this project yet.";
      }
      return;
    }

    Charts.renderSafely(
      "benchmark-position-chart",
      {
        type: "scatter",
        data: {
          datasets: candidates.map((pt) => ({
            label: pt.label,
            data: [{ x: Number(pt.value), y: 0 }],
            backgroundColor: pt.color,
            borderColor: p.surface,
            borderWidth: 2,
            pointRadius: pt.radius,
            pointHoverRadius: pt.radius + 2
          }))
        },
        options: {
          interaction: { mode: "nearest", intersect: true },
          scales: {
            x: {
              title: { display: true, text: "Cost per m² (NZD)" },
              ticks: { callback: (value) => Charts.currencyTick(value) },
              grid: { color: p.border }
            },
            y: { display: false, min: -1, max: 1 }
          },
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                title: (items) => candidates[items[0].datasetIndex].label,
                label: (ctx) => {
                  const pt = candidates[ctx.datasetIndex];
                  const lines = [`${Charts.currencyTooltip(pt.value)} / m²`];
                  if (pt.label === "Selected Project") {
                    lines.push(Formatters.percentile(data.percentile, 1));
                  }
                  return lines;
                }
              }
            }
          }
        }
      },
      {
        fallbackId: "benchmark-position-chart-fallback",
        fallbackMessage: "Chart unavailable. The figures above and the percentile scale below are still accurate."
      }
    );
  }

  /** Horizontal proportional bars comparing Project / Median / Average,
   *  reusing the existing bar-chart component from Project Analysis. */
  function renderComparisonBars(data) {
    const rows = [
      { label: "Project", value: Number(data.projectCostPerSqm) || 0 },
      { label: "Median", value: Number(data.datasetMedian) || 0 },
      { label: "Average", value: Number(data.datasetAverage) || 0 }
    ];
    const maxValue = rows.reduce((max, row) => Math.max(max, row.value), 0);

    els.comparisonBars.innerHTML = rows
      .map((row) => {
        const widthPct = maxValue > 0 ? Math.max((row.value / maxValue) * 100, 2) : 0;
        return `
          <div class="bar-row">
            <span class="bar-label">${escapeHtml(row.label)}</span>
            <span class="bar-track">
              <span class="bar-fill" style="width:${widthPct}%"></span>
            </span>
            <span class="bar-value">${Formatters.currency(row.value, { precise: true })}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderRange(data) {
    els.rangeGrid.innerHTML = [
      { label: "Minimum", value: `${Formatters.currency(data.datasetMin, { precise: true })} / m²` },
      { label: "Maximum", value: `${Formatters.currency(data.datasetMax, { precise: true })} / m²` }
    ]
      .map(
        (row) => `
          <div class="info-item">
            <span class="info-item-label">${escapeHtml(row.label)}</span>
            <span class="info-item-value">${escapeHtml(row.value)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderDatasetInfo(data) {
    const included = Formatters.count(data.benchmarkProjectCount);
    const excluded = Formatters.count(data.excludedOutlierCount);
    els.datasetInfoGrid.innerHTML = [
      { label: "Included", value: included === "N/A" ? "N/A" : `${included} projects` },
      { label: "Excluded Outliers", value: excluded === "N/A" ? "N/A" : `${excluded} projects` }
    ]
      .map(
        (row) => `
          <div class="info-item">
            <span class="info-item-label">${escapeHtml(row.label)}</span>
            <span class="info-item-value">${escapeHtml(row.value)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderSimilarProjects(similarProjects) {
    if (similarProjects.length === 0) {
      els.similarTableWrapper.hidden = true;
      els.similarEmpty.hidden = false;
      return;
    }

    els.similarTableWrapper.hidden = false;
    els.similarEmpty.hidden = true;

    els.similarTableBody.innerHTML = similarProjects
      .map(
        (project) => `
          <tr>
            <td class="col-name">${escapeHtml(project.projectName)}</td>
            <td class="col-numeric">${Formatters.area(project.floorArea)}</td>
            <td class="col-numeric">${Formatters.count(project.numberOfLevels)}</td>
            <td class="col-numeric">${Formatters.count(project.totalBathroomCount)}</td>
            <td class="col-numeric">${Formatters.currency(project.totalCost, { precise: true })}</td>
            <td class="col-numeric">${Formatters.currency(project.costPerSqm, { precise: true })}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-view-project-id="${escapeHtml(
                  project.projectId
                )}">View Details</button>
                <button type="button" class="btn btn-ghost btn-sm" data-benchmark-project-id="${escapeHtml(
                  project.projectId
                )}">Benchmark</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");

    els.similarTableBody.querySelectorAll("[data-view-project-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-view-project-id");
        window.location.href = `project.html?id=${encodeURIComponent(id)}`;
      });
    });

    els.similarTableBody.querySelectorAll("[data-benchmark-project-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-benchmark-project-id");
        window.location.href = `benchmarking.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  /**
   * Central UI-state switch. States: loading, missing-id (no ?id= in the
   * URL), not-found (API 404), insufficient (200 response but the project
   * lacks the core metrics needed to benchmark it), error (any other API
   * failure), ready (content rendered).
   */
  function showState(state, errorMessage = "") {
    const isLoading = state === "loading";
    const isMissingId = state === "missing-id";
    const isNotFound = state === "not-found";
    const isInsufficient = state === "insufficient";
    const isError = state === "error";
    const isReady = state === "ready";

    els.stateLoading.hidden = !isLoading;
    els.stateMissingId.hidden = !isMissingId;
    els.stateNotFound.hidden = !isNotFound;
    els.stateInsufficient.hidden = !isInsufficient;
    els.stateError.hidden = !isError;
    els.content.hidden = !isReady;

    if (!isReady) {
      Charts.destroy("benchmark-position-chart");
    }

    if (isError) {
      els.errorMessage.textContent =
        errorMessage || "Something went wrong while loading benchmark data.";
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
