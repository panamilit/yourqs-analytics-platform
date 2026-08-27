/**
 * what-if.js
 * Owns the What-if Analysis page: selecting an analytics-ready project,
 * loading and immediately displaying every one of its cost scopes, and
 * recalculating the scenario automatically (debounced) as the user edits
 * any scope's percentage. No scenario math happens here — total cost,
 * cost/m², margin, and every adjustment's adjusted cost all come from the
 * API exactly as supplied. The scenario is never persisted; it lives only
 * in this page's in-memory state.
 *
 * Architecture note on the scope-search bug this replaces: the previous
 * version required manually adding scopes via search, and re-rendered the
 * whole adjustments block (including, transitively, controls near it) on
 * every state change. Here, the scope search <input> and the sort <select>
 * are permanent DOM nodes whose innerHTML is never touched — only the
 * `#wi-scope-list` container inside them is rebuilt, and only in response
 * to a filter/sort change, a fresh project load, or Reset. Typing a percent
 * value or dragging a slider never triggers a full list re-render — it
 * mutates just that one row's DOM directly — so no input, including the
 * scope search box itself, is ever recreated or loses focus mid-edit.
 * Scope search state (`scopeFilterText`) and scenario result state
 * (`lastScenarioResult`) are tracked independently for the same reason.
 */

const WhatIfPage = (() => {
  const SEARCH_PAGE_SIZE = 8;
  const PROJECT_SEARCH_DEBOUNCE_MS = 350;
  const RECALC_DEBOUNCE_MS = 400;
  const CHANGE_MIN = -100;
  const CHANGE_MAX = 500;
  const SLIDER_MIN = -100;
  const SLIDER_MAX = 100;
  const STEP_INCREMENT = 1;

  let els = {};
  let selectedProject = null; // { projectId, projectName }
  let availableScopes = []; // full costBreakdown for the selected project, backend order (cost desc)
  let changeByTradeId = {}; // tradeId -> raw string value currently in that scope's input
  let scopeFilterText = ""; // scope search state, independent of scenario state
  let sortMode = "cost-desc";
  let lastScenarioResult = null; // last successful /what-if response, or null

  let projectSearchDebounceHandle = null;
  let projectSearchAbortController = null;
  let recalcDebounceHandle = null;
  let recalcAbortController = null;

  function init() {
    cacheElements();
    wireProjectPicker();
    wireScopeControls();
    els.detailsRetryBtn.addEventListener("click", loadProjectDetails);
    els.resetBtn.addEventListener("click", resetScenario);
    showSummaryState("hidden");
  }

  function cacheElements() {
    els = {
      projectName: document.getElementById("wi-project-name"),

      projectSearchInput: document.getElementById("wi-project-search"),
      projectResults: document.getElementById("wi-project-results"),
      selectedProjectChip: document.getElementById("wi-selected-project-chip"),

      stateDetailsLoading: document.getElementById("wi-state-details-loading"),
      stateDetailsError: document.getElementById("wi-state-details-error"),
      detailsErrorMessage: document.getElementById("wi-details-error-message"),
      detailsRetryBtn: document.getElementById("wi-details-retry-btn"),
      stateNoScopes: document.getElementById("wi-state-no-scopes"),

      summaryPanel: document.getElementById("wi-summary-panel"),
      summaryEmpty: document.getElementById("wi-summary-empty"),
      summaryBody: document.getElementById("wi-summary-body"),
      summaryTableBody: document.getElementById("wi-summary-table-body"),
      updatingBadge: document.getElementById("wi-updating-badge"),
      recalcError: document.getElementById("wi-recalc-error"),

      adjustmentsPanel: document.getElementById("wi-adjustments-panel"),
      scopeSearchInput: document.getElementById("wi-scope-search"),
      sortSelect: document.getElementById("wi-sort-select"),
      scopeCountHint: document.getElementById("wi-scope-count-hint"),
      scopeList: document.getElementById("wi-scope-list"),
      resetBtn: document.getElementById("wi-reset-btn"),

      costChartPanel: document.getElementById("wi-cost-chart-panel"),
      marginChartPanel: document.getElementById("wi-margin-chart-panel"),
      scopeImpactPanel: document.getElementById("wi-scope-impact-panel"),
      scopeImpactEmpty: document.getElementById("wi-scope-impact-empty"),
      scopeImpactContainer: document.getElementById("wi-scope-impact-container"),
      scopeComparePanel: document.getElementById("wi-scope-compare-panel"),
      distributionPanel: document.getElementById("wi-distribution-panel"),

      resultsTablePanel: document.getElementById("wi-results-table-panel"),
      resultsBody: document.getElementById("wi-adjustment-results-body")
    };
  }

  /* ------------------------------------------------------------------ *
   * Project picker (single selection) — unchanged, independent of scope
   * search below.
   * ------------------------------------------------------------------ */

  function wireProjectPicker() {
    els.projectSearchInput.addEventListener("input", (e) => {
      const value = e.target.value;
      window.clearTimeout(projectSearchDebounceHandle);
      projectSearchDebounceHandle = window.setTimeout(
        () => performProjectSearch(value.trim()),
        PROJECT_SEARCH_DEBOUNCE_MS
      );
    });

    document.addEventListener("click", (e) => {
      if (!els.projectResults.contains(e.target) && e.target !== els.projectSearchInput) {
        closeProjectResults();
      }
    });
  }

  async function performProjectSearch(query) {
    if (projectSearchAbortController) projectSearchAbortController.abort();

    if (!query) {
      closeProjectResults();
      return;
    }

    projectSearchAbortController = new AbortController();
    const { signal } = projectSearchAbortController;

    try {
      const data = await Api.getProjects(
        { search: query, page: 1, page_size: SEARCH_PAGE_SIZE },
        { signal }
      );
      if (signal.aborted) return;
      renderProjectResults(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      renderProjectResults([], "Search failed. Try again.");
    }
  }

  function renderProjectResults(items, errorMessage = "") {
    if (errorMessage) {
      els.projectResults.innerHTML = `<p class="picker-result-empty">${escapeHtml(errorMessage)}</p>`;
    } else if (items.length === 0) {
      els.projectResults.innerHTML = `<p class="picker-result-empty">No matching projects found.</p>`;
    } else {
      els.projectResults.innerHTML = items
        .map((item) => {
          const status = Formatters.status(item);
          const selectable = status.key === "ready";
          return `
            <button
              type="button"
              class="picker-result-item"
              data-project-id="${escapeHtml(item.projectId)}"
              data-project-name="${escapeHtml(item.projectName)}"
              ${selectable ? "" : "disabled"}
              ${selectable ? "" : `title="Only analytics-ready projects with complete cost and floor-area data can be used for What-if Analysis."`}
            >
              <span class="picker-result-name">${escapeHtml(item.projectName)}</span>
              <span class="picker-result-status-group">
                <span class="status-badge status-${status.key}">${escapeHtml(status.label)}</span>
                <span class="picker-result-meta">${Formatters.area(item.floorArea)}</span>
              </span>
            </button>
          `;
        })
        .join("");

      els.projectResults.querySelectorAll("[data-project-id]:not(:disabled)").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectProject({
            projectId: btn.getAttribute("data-project-id"),
            projectName: btn.getAttribute("data-project-name")
          });
        });
      });
    }

    els.projectResults.hidden = false;
    els.projectSearchInput.setAttribute("aria-expanded", "true");
  }

  function closeProjectResults() {
    els.projectResults.hidden = true;
    els.projectResults.innerHTML = "";
    els.projectSearchInput.setAttribute("aria-expanded", "false");
  }

  function selectProject(project) {
    selectedProject = project;
    els.projectSearchInput.value = "";
    closeProjectResults();
    renderSelectedProjectChip();

    els.projectName.hidden = false;
    els.projectName.textContent = project.projectName;

    // Switching projects invalidates any in-progress scenario.
    teardownScenarioState();
    availableScopes = [];
    changeByTradeId = {};
    scopeFilterText = "";
    els.scopeSearchInput.value = "";
    sortMode = "cost-desc";
    els.sortSelect.value = "cost-desc";
    els.adjustmentsPanel.hidden = true;

    loadProjectDetails();
  }

  function clearProject() {
    selectedProject = null;
    availableScopes = [];
    changeByTradeId = {};
    els.selectedProjectChip.innerHTML = "";
    els.projectName.hidden = true;
    els.adjustmentsPanel.hidden = true;
    showDetailsState("idle");
    teardownScenarioState();
  }

  function renderSelectedProjectChip() {
    if (!selectedProject) {
      els.selectedProjectChip.innerHTML = "";
      return;
    }
    els.selectedProjectChip.innerHTML = `
      <span class="chip">
        <span class="chip-name">${escapeHtml(selectedProject.projectName)}</span>
        <button type="button" class="chip-remove" id="wi-clear-project-btn" aria-label="Remove ${escapeHtml(
          selectedProject.projectName
        )} and choose a different project">×</button>
      </span>
    `;
    document.getElementById("wi-clear-project-btn").addEventListener("click", clearProject);
  }

  /* ------------------------------------------------------------------ *
   * Project details / available scopes — every scope renders immediately,
   * no manual "add scope" step.
   * ------------------------------------------------------------------ */

  async function loadProjectDetails() {
    if (!selectedProject) return;
    showDetailsState("loading");
    els.adjustmentsPanel.hidden = true;

    try {
      const data = await Api.getProjectDetails(selectedProject.projectId);
      availableScopes = Array.isArray(data.costBreakdown) ? data.costBreakdown : [];
      changeByTradeId = {};
      availableScopes.forEach((scope) => {
        changeByTradeId[scope.tradeId] = "0";
      });

      if (availableScopes.length === 0) {
        showDetailsState("no-scopes");
        return;
      }

      showDetailsState("ready");
      els.adjustmentsPanel.hidden = false;
      renderScopeList();
      els.distributionPanel.hidden = false;
      renderScenarioDistributionChart();
    } catch (err) {
      if (err.status === 404) {
        showDetailsState("error", "This project could not be found.");
      } else {
        showDetailsState("error", err.message);
      }
    }
  }

  function showDetailsState(state, message = "") {
    els.stateDetailsLoading.hidden = state !== "loading";
    els.stateDetailsError.hidden = state !== "error";
    els.stateNoScopes.hidden = state !== "no-scopes";

    if (state === "error") {
      els.detailsErrorMessage.textContent =
        message || "Something went wrong while loading this project's cost scopes.";
    }
  }

  /* ------------------------------------------------------------------ *
   * Scope search + sort — filters/reorders the always-visible list.
   * Never controls whether a scope exists in the scenario.
   * ------------------------------------------------------------------ */

  function wireScopeControls() {
    els.scopeSearchInput.addEventListener("input", (e) => {
      scopeFilterText = e.target.value.trim();
      renderScopeList();
    });

    els.sortSelect.addEventListener("change", (e) => {
      sortMode = e.target.value;
      renderScopeList();
    });
  }

  function getVisibleScopes() {
    let list = availableScopes;

    if (scopeFilterText) {
      const q = scopeFilterText.toLowerCase();
      list = list.filter((s) => s.scopeName.toLowerCase().includes(q));
    }

    list = list.slice();
    switch (sortMode) {
      case "cost-asc":
        list.sort((a, b) => (Number(a.totalCost) || 0) - (Number(b.totalCost) || 0));
        break;
      case "name":
        list.sort((a, b) => a.scopeName.localeCompare(b.scopeName));
        break;
      case "largest-adjustment":
        list.sort(
          (a, b) =>
            Math.abs(Number(changeByTradeId[b.tradeId]) || 0) -
            Math.abs(Number(changeByTradeId[a.tradeId]) || 0)
        );
        break;
      case "cost-desc":
      default:
        // costBreakdown already arrives ordered by cost descending; no
        // re-sort needed for the default view.
        break;
    }
    return list;
  }

  /* ------------------------------------------------------------------ *
   * Scope list rendering. Full re-render happens ONLY for: initial load,
   * filter change, sort change, and Reset. Editing a value never triggers
   * this — see updateRowVisualState / handlers below.
   * ------------------------------------------------------------------ */

  function renderScopeList() {
    const visible = getVisibleScopes();
    const modifiedCount = availableScopes.filter(
      (s) => isValidPercentRaw(changeByTradeId[s.tradeId]) && (Number(changeByTradeId[s.tradeId]) || 0) !== 0
    ).length;

    els.scopeCountHint.textContent = scopeFilterText
      ? `Showing ${visible.length} of ${availableScopes.length} scopes · ${modifiedCount} modified`
      : `${availableScopes.length} scopes · ${modifiedCount} modified`;

    if (visible.length === 0) {
      els.scopeList.innerHTML = `<p class="picker-result-empty">No scopes match "${escapeHtml(scopeFilterText)}".</p>`;
      return;
    }

    els.scopeList.innerHTML = visible.map((scope) => scopeRowHtml(scope)).join("");

    visible.forEach((scope) => {
      wireScopeRow(scope.tradeId);
      updateRowVisualState(scope.tradeId);
    });
  }

  function scopeRowHtml(scope) {
    const raw = changeByTradeId[scope.tradeId] !== undefined ? changeByTradeId[scope.tradeId] : "0";
    const numeric = Number(raw) || 0;
    const sliderValue = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, numeric));
    const isModified = isValidPercentRaw(raw) && numeric !== 0;

    return `
      <div class="wi-scope-row" data-trade-id="${escapeHtml(scope.tradeId)}">
        <div class="wi-scope-info">
          <span class="wi-scope-name" title="${escapeHtml(scope.scopeName)}">${escapeHtml(scope.scopeName)}</span>
          <span class="wi-scope-cost">${Formatters.currency(scope.totalCost, { precise: true })}</span>
          <span class="wi-scope-badge" ${isModified ? "" : "hidden"}>${escapeHtml(
      Formatters.percentSigned(numeric, 0)
    )}</span>
        </div>
        <div class="wi-scope-controls-row">
          <button type="button" class="wi-step-btn" data-step="-1" aria-label="Decrease ${escapeHtml(
            scope.scopeName
          )} by 1 percent">−</button>
          <input
            type="number"
            class="table-input wi-percent-input"
            value="${escapeHtml(raw)}"
            min="${CHANGE_MIN}"
            max="${CHANGE_MAX}"
            step="1"
            aria-label="Change percent for ${escapeHtml(scope.scopeName)}"
          />
          <span class="wi-percent-sign">%</span>
          <button type="button" class="wi-step-btn" data-step="1" aria-label="Increase ${escapeHtml(
            scope.scopeName
          )} by 1 percent">+</button>
          <input
            type="range"
            class="wi-slider"
            min="${SLIDER_MIN}"
            max="${SLIDER_MAX}"
            step="1"
            value="${sliderValue}"
            aria-label="Change percent slider for ${escapeHtml(scope.scopeName)}"
          />
        </div>
      </div>
    `;
  }

  function wireScopeRow(tradeId) {
    const rowEl = getRowEl(tradeId);
    if (!rowEl) return;

    const input = rowEl.querySelector(".wi-percent-input");
    const slider = rowEl.querySelector(".wi-slider");
    const [decBtn, incBtn] = rowEl.querySelectorAll(".wi-step-btn");

    input.addEventListener("input", (e) => {
      onScopeValueChanged(tradeId, e.target.value, { source: "input" });
    });

    slider.addEventListener("input", (e) => {
      onScopeValueChanged(tradeId, e.target.value, { source: "slider" });
    });

    decBtn.addEventListener("click", () => onStepClick(tradeId, -STEP_INCREMENT));
    incBtn.addEventListener("click", () => onStepClick(tradeId, STEP_INCREMENT));
  }

  function getRowEl(tradeId) {
    return els.scopeList.querySelector(`[data-trade-id="${cssEscape(tradeId)}"]`);
  }

  /* ------------------------------------------------------------------ *
   * Per-row value changes: mutate state + that one row's DOM only. Never
   * re-renders the list, so no control (including this row's own input)
   * ever loses focus mid-edit, and the scope search box above is never
   * touched by this path at all.
   * ------------------------------------------------------------------ */

  function onScopeValueChanged(tradeId, rawValue, { source }) {
    changeByTradeId[tradeId] = rawValue;
    updateRowVisualState(tradeId, { skipInput: source === "input", skipSlider: source === "slider" });
    scheduleRecalculation();
  }

  function onStepClick(tradeId, delta) {
    const current = Number(changeByTradeId[tradeId]) || 0;
    const next = Math.max(CHANGE_MIN, Math.min(CHANGE_MAX, current + delta));
    changeByTradeId[tradeId] = String(next);
    updateRowVisualState(tradeId);
    scheduleRecalculation();
  }

  function isValidPercentRaw(raw) {
    if (raw === "" || raw === undefined || raw === null) return true; // treated as 0, not an error
    if (raw === "-" || raw === "." || raw === "-.") return true; // mid-typing, not an error yet
    const num = Number(raw);
    return Number.isFinite(num) && num >= CHANGE_MIN && num <= CHANGE_MAX;
  }

  /** Updates one row's highlight/badge and keeps its slider and number
   *  input in sync with each other, without ever overwriting whichever
   *  control the user is currently typing/dragging in. */
  function updateRowVisualState(tradeId, options) {
    const opts = options || {};
    const skipInput = Boolean(opts.skipInput);
    const skipSlider = Boolean(opts.skipSlider);
    const rowEl = getRowEl(tradeId);
    if (!rowEl) return; // row may be filtered out — state itself is preserved regardless

    const raw = changeByTradeId[tradeId] !== undefined ? changeByTradeId[tradeId] : "0";
    const valid = isValidPercentRaw(raw);
    const numeric = Number(raw) || 0;
    const isModified = valid && numeric !== 0;

    rowEl.classList.toggle("is-modified", isModified);
    rowEl.classList.toggle("is-invalid-row", !valid);

    const badge = rowEl.querySelector(".wi-scope-badge");
    if (badge) {
      badge.hidden = !isModified;
      if (isModified) badge.textContent = Formatters.percentSigned(numeric, 0);
    }

    const input = rowEl.querySelector(".wi-percent-input");
    if (input) {
      input.classList.toggle("is-invalid", !valid);
      if (!skipInput && document.activeElement !== input && String(input.value) !== String(raw)) {
        input.value = raw;
      }
    }

    const slider = rowEl.querySelector(".wi-slider");
    if (slider && !skipSlider && document.activeElement !== slider) {
      const clamped = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, numeric));
      if (String(slider.value) !== String(clamped)) slider.value = String(clamped);
    }
  }

  /* ------------------------------------------------------------------ *
   * Automatic, debounced scenario recalculation
   * ------------------------------------------------------------------ */

  function scheduleRecalculation() {
    window.clearTimeout(recalcDebounceHandle);
    recalcDebounceHandle = window.setTimeout(runAutoRecalculation, RECALC_DEBOUNCE_MS);
  }

  function collectAdjustmentPayload() {
    return availableScopes
      .map((scope) => ({ tradeId: scope.tradeId, changePercent: Number(changeByTradeId[scope.tradeId]) || 0 }))
      .filter((a) => a.changePercent !== 0);
  }

  function hasInvalidValues() {
    return availableScopes.some((scope) => !isValidPercentRaw(changeByTradeId[scope.tradeId]));
  }

  async function runAutoRecalculation() {
    if (!selectedProject) return;

    if (hasInvalidValues()) {
      setRecalcError("Fix invalid percentage values (-100 to 500) to continue.");
      return;
    }
    setRecalcError("");

    const payload = collectAdjustmentPayload();

    if (payload.length === 0) {
      // Zero-adjustment state: never call the backend with an empty
      // adjustments array. Fall back to showing the original values as
      // both baseline and current scenario, using the last confirmed
      // response if we have one, or a neutral prompt if we don't.
      if (recalcAbortController) recalcAbortController.abort();
      setUpdatingBadge(false);
      renderSummaryAndVisualisations();
      return;
    }

    if (recalcAbortController) recalcAbortController.abort();
    recalcAbortController = new AbortController();
    const { signal } = recalcAbortController;

    setUpdatingBadge(true);

    try {
      const data = await Api.runWhatIfScenario(selectedProject.projectId, payload, { signal });
      if (signal.aborted) return;
      lastScenarioResult = data;
      setUpdatingBadge(false);
      renderSummaryAndVisualisations();
    } catch (err) {
      if (err.name === "AbortError") return; // superseded by a newer edit
      setUpdatingBadge(false);
      setRecalcError(err.message || "Something went wrong while recalculating this scenario.");
    }
  }

  function setUpdatingBadge(isUpdating) {
    els.updatingBadge.hidden = !isUpdating;
  }

  function setRecalcError(message) {
    els.recalcError.hidden = !message;
    els.recalcError.textContent = message;
  }

  function resetScenario() {
    if (recalcAbortController) recalcAbortController.abort();
    window.clearTimeout(recalcDebounceHandle);

    availableScopes.forEach((scope) => {
      changeByTradeId[scope.tradeId] = "0";
    });
    lastScenarioResult = null;
    setUpdatingBadge(false);
    setRecalcError("");
    renderScopeList();
    showSummaryState("empty");
    hideScenarioChartPanels();
    renderScenarioDistributionChart();
  }

  /** Used when switching/clearing the selected project. */
  function teardownScenarioState() {
    if (recalcAbortController) recalcAbortController.abort();
    window.clearTimeout(recalcDebounceHandle);
    lastScenarioResult = null;
    setUpdatingBadge(false);
    setRecalcError("");
    showSummaryState("hidden");
    hideScenarioChartPanels();
    els.distributionPanel.hidden = true;
    Charts.destroy("wi-distribution-chart");
  }

  /** Hides and destroys every scenario-dependent chart (everything except
   *  the always-available Scenario Cost Distribution donut). */
  function hideScenarioChartPanels() {
    els.costChartPanel.hidden = true;
    els.marginChartPanel.hidden = true;
    els.scopeImpactPanel.hidden = true;
    els.scopeImpactEmpty.hidden = true;
    els.scopeComparePanel.hidden = true;
    els.resultsTablePanel.hidden = true;
    Charts.destroy("wi-cost-chart");
    Charts.destroy("wi-margin-chart");
    Charts.destroy("wi-scope-impact-chart");
    Charts.destroy("wi-scope-compare-chart");
  }

  /* ------------------------------------------------------------------ *
   * Summary panel (Before/Scenario visualisation) + state switching
   * ------------------------------------------------------------------ */

  function showSummaryState(state) {
    // hidden: no project selected yet / scopes not loaded
    // empty: project + scopes ready, but no scenario has ever run
    // shown: at least one confirmed scenario response exists
    if (state === "hidden") {
      els.summaryPanel.hidden = true;
      return;
    }
    els.summaryPanel.hidden = false;
    els.summaryEmpty.hidden = state !== "empty";
    els.summaryBody.hidden = state !== "shown";
  }

  /** Renders the summary table and every scenario chart from
   *  lastScenarioResult. If there are no non-zero adjustments but we have a
   *  previous result cached, show original vs original (a true no-change
   *  scenario) rather than calling the backend again. The Scenario Cost
   *  Distribution donut always reflects the current state, even before any
   *  scenario has ever run. */
  function renderSummaryAndVisualisations() {
    const hasNonZero = collectAdjustmentPayload().length > 0;

    if (!lastScenarioResult) {
      showSummaryState("empty");
      hideScenarioChartPanels();
      renderScenarioDistributionChart();
      return;
    }

    const data = lastScenarioResult;
    const original = data.original || {};
    // When every scope has been returned to 0%, show original vs original
    // rather than the stale adjusted figures from the last non-zero state.
    const adjusted = hasNonZero ? data.adjusted || {} : original;
    const impact = hasNonZero
      ? data.impact || {}
      : { costDifference: 0, costDifferencePercent: 0, marginDifferencePercentagePoints: 0 };
    const adjustments = hasNonZero ? (Array.isArray(data.adjustments) ? data.adjustments : []) : [];

    showSummaryState("shown");
    renderSummaryTable(original, adjusted, impact);

    els.costChartPanel.hidden = false;
    els.marginChartPanel.hidden = false;
    renderCostImpactChart(original, adjusted);
    renderMarginImpactChart(original, adjusted);

    // Scope Cost Impact stays visible whenever a scenario is active, even
    // with nothing to show yet — an informative placeholder, never blank
    // whitespace, and never a vanishing/reappearing panel.
    els.scopeImpactPanel.hidden = false;
    if (adjustments.length === 0) {
      els.scopeImpactEmpty.hidden = false;
      els.scopeImpactContainer.hidden = true;
      Charts.destroy("wi-scope-impact-chart");
    } else {
      els.scopeImpactEmpty.hidden = true;
      els.scopeImpactContainer.hidden = false;
      renderScopeImpactChart(adjustments);
    }

    if (adjustments.length === 0) {
      els.scopeComparePanel.hidden = true;
      Charts.destroy("wi-scope-compare-chart");
    } else {
      els.scopeComparePanel.hidden = false;
      renderScopeComparisonChart(adjustments);
    }

    renderResultsTable(adjustments);
    renderScenarioDistributionChart();
  }

  function toneForDelta(value, favorableWhenNegative) {
    if (!value) return "is-neutral";
    const isPositive = value > 0;
    const favorable = favorableWhenNegative ? !isPositive : isPositive;
    return favorable ? "is-favorable" : "is-caution";
  }

  function renderSummaryTable(original, adjusted, impact) {
    const rows = [
      {
        label: "Total Cost",
        original: Formatters.currency(original.totalCost, { precise: true }),
        scenario: Formatters.currency(adjusted.totalCost, { precise: true }),
        impact: impact.costDifference
          ? `${Formatters.currencySigned(impact.costDifference, { precise: true })} (${Formatters.percentSigned(
              impact.costDifferencePercent
            )})`
          : "No change",
        tone: toneForDelta(impact.costDifference, true)
      },
      {
        label: "Cost / m²",
        original: Formatters.currency(original.costPerSqm, { precise: true }),
        scenario: Formatters.currency(adjusted.costPerSqm, { precise: true }),
        impact: "",
        tone: "is-neutral"
      },
      {
        label: "Margin",
        original: Formatters.percent(original.marginPercent, 2),
        scenario: Formatters.percent(adjusted.marginPercent, 2),
        impact: impact.marginDifferencePercentagePoints
          ? Formatters.percentagePoints(impact.marginDifferencePercentagePoints)
          : "No change",
        tone: toneForDelta(impact.marginDifferencePercentagePoints, false)
      }
    ];

    els.summaryTableBody.innerHTML = rows
      .map(
        (row) => `
          <tr>
            <td class="wi-summary-metric">${escapeHtml(row.label)}</td>
            <td class="col-numeric">${escapeHtml(row.original)}</td>
            <td class="wi-summary-arrow" aria-hidden="true">→</td>
            <td class="col-numeric">${escapeHtml(row.scenario)}</td>
            <td class="col-numeric wi-summary-impact ${row.tone}">${escapeHtml(row.impact)}</td>
          </tr>
        `
      )
      .join("");
  }

  /** Original vs Scenario Total Cost — two bars, always available once a
   *  scenario has run. */
  function renderCostImpactChart(original, adjusted) {
    const p = Charts.palette();
    Charts.renderSafely(
      "wi-cost-chart",
      {
        type: "bar",
        data: {
          labels: ["Original", "Scenario"],
          datasets: [
            {
              data: [Number(original.totalCost) || 0, Number(adjusted.totalCost) || 0],
              backgroundColor: [p.inkFaint, p.accent],
              borderRadius: 4,
              maxBarThickness: 70
            }
          ]
        },
        options: {
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false } },
            y: { ticks: { callback: (value) => Charts.currencyTick(value) }, grid: { color: p.border } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => items[0].label,
                label: (ctx) => Charts.currencyTooltip(ctx.parsed.y)
              }
            }
          }
        }
      },
      { fallbackId: "wi-cost-chart-fallback", fallbackMessage: "Chart unavailable. See the summary above." }
    );
  }

  /** Margin % Before vs After — same two-bar layout, percentage values. */
  function renderMarginImpactChart(original, adjusted) {
    const p = Charts.palette();
    Charts.renderSafely(
      "wi-margin-chart",
      {
        type: "bar",
        data: {
          labels: ["Original", "Scenario"],
          datasets: [
            {
              data: [Number(original.marginPercent) || 0, Number(adjusted.marginPercent) || 0],
              backgroundColor: [p.inkFaint, p.accent],
              borderRadius: 4,
              maxBarThickness: 70
            }
          ]
        },
        options: {
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false } },
            y: { ticks: { callback: (value) => `${value}%` }, grid: { color: p.border } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => items[0].label,
                label: (ctx) => Formatters.percent(ctx.parsed.y, 2)
              }
            }
          }
        }
      },
      { fallbackId: "wi-margin-chart-fallback", fallbackMessage: "Chart unavailable. See the summary above." }
    );
  }

  /** Diverging horizontal bar: positive cost differences extend right,
   *  negative extend left, using Chart.js's own signed-value bar layout.
   *  Only scopes with a genuinely non-zero cost impact are plotted —
   *  callers are still expected to show the "adjust a scope" placeholder
   *  when this filters everything out. */
  function renderScopeImpactChart(adjustments) {
    const changed = adjustments.filter((a) => Number(a.costDifference) !== 0);

    if (changed.length === 0) {
      Charts.destroy("wi-scope-impact-chart");
      els.scopeImpactEmpty.hidden = false;
      els.scopeImpactContainer.hidden = true;
      return;
    }

    const sorted = changed.slice().sort((a, b) => Number(b.costDifference) - Number(a.costDifference));
    const p = Charts.palette();

    Charts.renderSafely(
      "wi-scope-impact-chart",
      {
        type: "bar",
        data: {
          labels: sorted.map((a) => a.scopeName),
          datasets: [
            {
              data: sorted.map((a) => Number(a.costDifference) || 0),
              backgroundColor: sorted.map((a) => (Number(a.costDifference) >= 0 ? p.warn : p.accent)),
              borderRadius: 4,
              maxBarThickness: 22
            }
          ]
        },
        options: {
          indexAxis: "y",
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { ticks: { callback: (value) => Charts.currencyTick(value) }, grid: { color: p.border } },
            y: { grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => sorted[items[0].dataIndex].scopeName,
                label: (ctx) => {
                  const a = sorted[ctx.dataIndex];
                  return [
                    `Original: ${Charts.currencyTooltip(a.originalCost)}`,
                    `Adjustment: ${Formatters.percentSigned(a.changePercent, 2)}`,
                    `Adjusted: ${Charts.currencyTooltip(a.adjustedCost)}`,
                    `Impact: ${Formatters.currencySigned(a.costDifference, { precise: true })}`
                  ];
                }
              }
            }
          }
        }
      },
      {
        fallbackId: "wi-scope-impact-chart-fallback",
        fallbackMessage: "Chart unavailable. See the Adjustment Detail table below."
      }
    );
  }

  /** Original vs Adjusted cost, changed scopes only — a grouped bar
   *  chart giving the Adjustment Detail table a graphical counterpart. */
  function renderScopeComparisonChart(adjustments) {
    const p = Charts.palette();
    Charts.renderSafely(
      "wi-scope-compare-chart",
      {
        type: "bar",
        data: {
          labels: adjustments.map((a) => a.scopeName),
          datasets: [
            {
              label: "Original",
              data: adjustments.map((a) => Number(a.originalCost) || 0),
              backgroundColor: p.inkFaint,
              borderRadius: 4
            },
            {
              label: "Adjusted",
              data: adjustments.map((a) => Number(a.adjustedCost) || 0),
              backgroundColor: p.accent,
              borderRadius: 4
            }
          ]
        },
        options: {
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false } },
            y: { ticks: { callback: (value) => Charts.currencyTick(value) }, grid: { color: p.border } }
          },
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                title: (items) => items[0].label,
                label: (ctx) => `${ctx.dataset.label}: ${Charts.currencyTooltip(ctx.parsed.y)}`
              }
            }
          }
        }
      },
      {
        fallbackId: "wi-scope-compare-chart-fallback",
        fallbackMessage: "Chart unavailable. See the Adjustment Detail table below."
      }
    );
  }

  /** Scenario Cost Distribution — a donut separate from the Project
   *  Analysis Cost Distribution chart, showing the current scenario's cost
   *  composition: adjusted cost for modified scopes (backend-confirmed,
   *  from lastScenarioResult), original cost for everything else. This
   *  combination is presentation-only — it never substitutes for or alters
   *  the backend's totalCost/margin/cost-per-m² anywhere else on the page. */
  function renderScenarioDistributionChart() {
    if (availableScopes.length === 0) {
      Charts.destroy("wi-distribution-chart");
      return;
    }

    const adjustedByTradeId = new Map();
    if (lastScenarioResult && Array.isArray(lastScenarioResult.adjustments)) {
      lastScenarioResult.adjustments.forEach((a) => adjustedByTradeId.set(a.tradeId, Number(a.adjustedCost) || 0));
    }

    const full = availableScopes
      .map((scope) => ({
        scopeName: scope.scopeName,
        cost: adjustedByTradeId.has(scope.tradeId) ? adjustedByTradeId.get(scope.tradeId) : Number(scope.totalCost) || 0
      }))
      .sort((a, b) => b.cost - a.cost);

    const top8 = full.slice(0, 8);
    const rest = full.slice(8);
    const segments = top8.slice();
    if (rest.length > 0) {
      segments.push({ scopeName: "Other", cost: rest.reduce((sum, x) => sum + x.cost, 0) });
    }

    const total = segments.reduce((sum, x) => sum + x.cost, 0);
    const p = Charts.palette();
    const colors = segments.map((_, i) => (i < 8 ? p.series[i % p.series.length] : p.other));
    if (rest.length > 0) colors[colors.length - 1] = p.other;

    Charts.renderSafely(
      "wi-distribution-chart",
      {
        type: "doughnut",
        data: {
          labels: segments.map((s) => s.scopeName),
          datasets: [
            {
              data: segments.map((s) => s.cost),
              backgroundColor: colors,
              borderColor: p.surface,
              borderWidth: 2
            }
          ]
        },
        options: {
          cutout: "62%",
          interaction: { mode: "nearest", intersect: true },
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 8, boxHeight: 8, padding: 10, font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                title: (items) => segments[items[0].dataIndex].scopeName,
                label: (ctx) => {
                  const seg = segments[ctx.dataIndex];
                  const pct = total > 0 ? (seg.cost / total) * 100 : 0;
                  return [`Scenario Cost: ${Charts.currencyTooltip(seg.cost)}`, `Share: ${pct.toFixed(2)}%`];
                }
              }
            }
          }
        }
      },
      {
        fallbackId: "wi-distribution-chart-fallback",
        fallbackMessage: "Chart unavailable. The Adjustment Detail table below still shows exact figures."
      }
    );
  }

  function renderResultsTable(adjustments) {
    if (adjustments.length === 0) {
      els.resultsTablePanel.hidden = true;
      return;
    }
    els.resultsTablePanel.hidden = false;

    const sorted = adjustments
      .slice()
      .sort((a, b) => Math.abs(Number(b.costDifference) || 0) - Math.abs(Number(a.costDifference) || 0));

    els.resultsBody.innerHTML = sorted
      .map(
        (a) => `
          <tr>
            <td class="col-name">${escapeHtml(a.scopeName)}</td>
            <td class="col-numeric">${Formatters.currency(a.originalCost, { precise: true })}</td>
            <td class="col-numeric">${Formatters.percentSigned(a.changePercent, 2)}</td>
            <td class="col-numeric">${Formatters.currency(a.adjustedCost, { precise: true })}</td>
            <td class="col-numeric">${Formatters.currencySigned(a.costDifference, { precise: true })}</td>
          </tr>
        `
      )
      .join("");
  }

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
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
