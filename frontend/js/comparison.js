/**
 * comparison.js
 * Owns the Compare Projects page: searching and selecting 2–4 projects,
 * submitting them to the comparison endpoint, and rendering the summary,
 * full comparison table, and three comparison charts. No financial
 * calculations happen here — cost, margin, cost/m², and scope percentages
 * all come from the API exactly as supplied. The only frontend-side work is
 * building the union of scope names across selected projects for the scope
 * comparison chart/table, which is a presentation grouping, not a metric.
 */

const ComparisonPage = (() => {
  const MIN_PROJECTS = 2;
  const MAX_PROJECTS = 4;
  const SEARCH_DEBOUNCE_MS = 350;
  const SEARCH_PAGE_SIZE = 8;

  const PROJECT_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)"
  ];

  let els = {};
  let selectedProjects = []; // [{ projectId, projectName, floorArea }]
  let lastSubmittedIds = [];
  let searchDebounceHandle = null;
  let searchAbortController = null;

  function init() {
    cacheElements();
    wireProjectPicker();
    els.retryBtn.addEventListener("click", submitComparison);
    els.compareBtn.addEventListener("click", submitComparison);
    updateSelectionUI();
  }

  function cacheElements() {
    els = {
      searchInput: document.getElementById("cmp-search-input"),
      searchResults: document.getElementById("cmp-search-results"),
      selectedChips: document.getElementById("cmp-selected-chips"),
      pickerHint: document.getElementById("cmp-picker-hint"),
      compareBtn: document.getElementById("cmp-compare-btn"),

      stateInitial: document.getElementById("cmp-state-initial"),
      stateLoading: document.getElementById("cmp-state-loading"),
      stateError: document.getElementById("cmp-state-error"),
      errorMessage: document.getElementById("cmp-error-message"),
      retryBtn: document.getElementById("cmp-retry-btn"),
      content: document.getElementById("cmp-content"),

      summaryGrid: document.getElementById("cmp-summary-grid"),

      tableHead: document.getElementById("cmp-table-head"),
      tableBody: document.getElementById("cmp-table-body"),

      costChart: document.getElementById("cmp-cost-chart"),
      marginChart: document.getElementById("cmp-margin-chart"),
      costVsSellingChart: document.getElementById("cmp-cost-vs-selling-chart"),
      efficiencyChart: document.getElementById("cmp-efficiency-chart"),

      scopeChart: document.getElementById("cmp-scope-chart"),
      scopeTooltip: document.getElementById("cmp-scope-tooltip"),

      scopeTableHead: document.getElementById("cmp-scope-table-head"),
      scopeTableBody: document.getElementById("cmp-scope-table-body")
    };
  }

  /* ------------------------------------------------------------------ *
   * Project picker: search, add, remove, selection validation
   * ------------------------------------------------------------------ */

  function wireProjectPicker() {
    els.searchInput.addEventListener("input", (e) => {
      const value = e.target.value;
      window.clearTimeout(searchDebounceHandle);
      searchDebounceHandle = window.setTimeout(() => performSearch(value.trim()), SEARCH_DEBOUNCE_MS);
    });

    els.searchInput.addEventListener("focus", () => {
      if (els.searchInput.value.trim() && els.searchResults.children.length > 0) {
        els.searchResults.hidden = false;
        els.searchInput.setAttribute("aria-expanded", "true");
      }
    });

    document.addEventListener("click", (e) => {
      if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
        closeSearchResults();
      }
    });
  }

  async function performSearch(query) {
    if (searchAbortController) searchAbortController.abort();

    if (!query) {
      closeSearchResults();
      return;
    }

    searchAbortController = new AbortController();
    const { signal } = searchAbortController;

    try {
      const data = await Api.getProjects(
        { search: query, page: 1, page_size: SEARCH_PAGE_SIZE },
        { signal }
      );
      if (signal.aborted) return;
      renderSearchResults(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      renderSearchResults([], "Search failed. Try again.");
    }
  }

  function renderSearchResults(items, errorMessage = "") {
    const selectedIds = new Set(selectedProjects.map((p) => p.projectId));
    const candidates = items.filter((item) => !selectedIds.has(item.projectId));

    if (errorMessage) {
      els.searchResults.innerHTML = `<p class="picker-result-empty">${escapeHtml(errorMessage)}</p>`;
    } else if (candidates.length === 0) {
      els.searchResults.innerHTML = `<p class="picker-result-empty">No matching projects found.</p>`;
    } else {
      els.searchResults.innerHTML = candidates
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
              ${selectable ? "" : `title="Only analytics-ready projects with complete cost and floor-area data can be compared."`}
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

      els.searchResults.querySelectorAll("[data-project-id]:not(:disabled)").forEach((btn) => {
        btn.addEventListener("click", () => {
          addProject({
            projectId: btn.getAttribute("data-project-id"),
            projectName: btn.getAttribute("data-project-name")
          });
        });
      });
    }

    els.searchResults.hidden = false;
    els.searchInput.setAttribute("aria-expanded", "true");
  }

  function closeSearchResults() {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = "";
    els.searchInput.setAttribute("aria-expanded", "false");
  }

  function addProject(project) {
    if (selectedProjects.length >= MAX_PROJECTS) return;
    if (selectedProjects.some((p) => p.projectId === project.projectId)) return;

    selectedProjects.push(project);
    els.searchInput.value = "";
    closeSearchResults();
    renderChips();
    updateSelectionUI();
  }

  function removeProject(projectId) {
    selectedProjects = selectedProjects.filter((p) => p.projectId !== projectId);
    renderChips();
    updateSelectionUI();
  }

  function renderChips() {
    if (selectedProjects.length === 0) {
      els.selectedChips.innerHTML = "";
      return;
    }

    els.selectedChips.innerHTML = selectedProjects
      .map(
        (project, index) => `
          <span class="chip">
            <span class="chip-swatch" style="background:${PROJECT_COLORS[index]}" aria-hidden="true"></span>
            <span class="chip-name">${escapeHtml(project.projectName)}</span>
            <button type="button" class="chip-remove" data-remove-id="${escapeHtml(
              project.projectId
            )}" aria-label="Remove ${escapeHtml(project.projectName)} from comparison">×</button>
          </span>
        `
      )
      .join("");

    els.selectedChips.querySelectorAll("[data-remove-id]").forEach((btn) => {
      btn.addEventListener("click", () => removeProject(btn.getAttribute("data-remove-id")));
    });
  }

  function updateSelectionUI() {
    const count = selectedProjects.length;

    els.searchInput.disabled = count >= MAX_PROJECTS;
    els.searchInput.placeholder =
      count >= MAX_PROJECTS ? "Maximum of 4 projects selected" : "Search by project name…";

    els.compareBtn.disabled = count < MIN_PROJECTS || count > MAX_PROJECTS;

    els.pickerHint.classList.remove("is-ready", "is-max");
    if (count === 0) {
      els.pickerHint.textContent = "Select at least two projects to compare.";
    } else if (count < MIN_PROJECTS) {
      els.pickerHint.textContent = `${count} of ${MAX_PROJECTS} selected — select at least ${MIN_PROJECTS} to compare.`;
    } else if (count >= MAX_PROJECTS) {
      els.pickerHint.textContent = `${count} of ${MAX_PROJECTS} selected — maximum reached.`;
      els.pickerHint.classList.add("is-max");
    } else {
      els.pickerHint.textContent = `${count} of ${MAX_PROJECTS} selected. Ready to compare.`;
      els.pickerHint.classList.add("is-ready");
    }
  }

  /* ------------------------------------------------------------------ *
   * Comparison request + state
   * ------------------------------------------------------------------ */

  async function submitComparison() {
    if (selectedProjects.length < MIN_PROJECTS || selectedProjects.length > MAX_PROJECTS) return;

    lastSubmittedIds = selectedProjects.map((p) => p.projectId);
    showState("loading");

    try {
      const data = await Api.compareProjects(lastSubmittedIds);
      const projects = orderProjects(Array.isArray(data.projects) ? data.projects : []);

      if (projects.length < MIN_PROJECTS) {
        showState("error", "The server didn't return enough project data to compare.");
        return;
      }

      renderComparison(projects);
      showState("ready");
    } catch (err) {
      showState("error", err.message);
    }
  }

  /** Reorder the API's response to match the order the user selected
   *  projects in, so chip colours, table columns and chart bars stay
   *  consistent with the picker above. */
  function orderProjects(responseProjects) {
    const byId = new Map(responseProjects.map((p) => [p.projectId, p]));
    return lastSubmittedIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function showState(state, errorMessage = "") {
    const isInitial = state === "initial";
    const isLoading = state === "loading";
    const isError = state === "error";
    const isReady = state === "ready";

    els.stateInitial.hidden = !isInitial;
    els.stateLoading.hidden = !isLoading;
    els.stateError.hidden = !isError;
    els.content.hidden = !isReady;

    if (!isReady) {
      Charts.destroy("cmp-cost-chart");
      Charts.destroy("cmp-margin-chart");
      Charts.destroy("cmp-cost-vs-selling-chart");
      Charts.destroy("cmp-efficiency-chart");
    }

    if (isError) {
      els.errorMessage.textContent = errorMessage || "Something went wrong while comparing projects.";
    }
  }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  function renderComparison(projects) {
    renderSummary(projects);
    renderTable(projects);
    renderCostChart(projects);
    renderMarginChart(projects);
    renderCostVsSellingChart(projects);
    renderEfficiencyChart(projects);
    renderScopeComparison(projects);
  }

  function renderSummary(projects) {
    els.summaryGrid.innerHTML = projects
      .map(
        (project, index) => `
          <div class="compare-summary-card" style="border-left-color:${PROJECT_COLORS[index]}">
            <div class="compare-summary-name">${escapeHtml(project.projectName)}</div>
            <div class="compare-summary-meta">
              <span>${Formatters.area(project.floorArea)}</span>
              <span>${Formatters.count(project.numberOfLevels)} levels</span>
              <span>${Formatters.count(project.totalBathroomCount)} bathrooms</span>
            </div>
          </div>
        `
      )
      .join("");
  }

  const TABLE_METRICS = [
    { label: "Floor Area", render: (p) => Formatters.area(p.floorArea) },
    { label: "Levels", render: (p) => Formatters.count(p.numberOfLevels) },
    { label: "Bathrooms", render: (p) => Formatters.count(p.totalBathroomCount) },
    { label: "Total Cost", render: (p) => Formatters.currency(p.totalCost, { precise: true }) },
    {
      label: "Selling Price",
      render: (p) => Formatters.currency(p.totalSellingPrice, { precise: true })
    },
    { label: "Gross Margin", render: (p) => Formatters.currency(p.grossMargin, { precise: true }) },
    { label: "Margin", render: (p) => Formatters.percent(p.marginPercent, 2) },
    { label: "Cost / m²", render: (p) => Formatters.currency(p.costPerSqm, { precise: true }) },
    {
      label: "Selling Price / m²",
      render: (p) => Formatters.currency(p.sellingPricePerSqm, { precise: true })
    }
  ];

  function renderTable(projects) {
    els.tableHead.innerHTML = `
      <tr>
        <th scope="col">Metric</th>
        ${projects
          .map(
            (project, index) => `
              <th scope="col" class="col-numeric">
                <span class="table-project-header">
                  <span class="project-swatch" style="background:${PROJECT_COLORS[index]}" aria-hidden="true"></span>
                  ${escapeHtml(project.projectName)}
                </span>
              </th>
            `
          )
          .join("")}
      </tr>
    `;

    const metricRows = TABLE_METRICS.map(
      (metric) => `
        <tr>
          <td class="col-name">${escapeHtml(metric.label)}</td>
          ${projects.map((p) => `<td class="col-numeric">${metric.render(p)}</td>`).join("")}
        </tr>
      `
    ).join("");

    const actionsRow = `
      <tr>
        <td class="col-name">Actions</td>
        ${projects
          .map(
            (p) => `
              <td class="col-numeric">
                <div class="row-actions">
                  <button type="button" class="btn btn-ghost btn-sm" data-view-project-id="${escapeHtml(
                    p.projectId
                  )}">View Details</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-benchmark-project-id="${escapeHtml(
                    p.projectId
                  )}">Benchmark</button>
                </div>
              </td>
            `
          )
          .join("")}
      </tr>
    `;

    els.tableBody.innerHTML = metricRows + actionsRow;
    wireProjectNavButtons(els.tableBody);
  }

  function wireProjectNavButtons(container) {
    container.querySelectorAll("[data-view-project-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-view-project-id");
        window.location.href = `project.html?id=${encodeURIComponent(id)}`;
      });
    });
    container.querySelectorAll("[data-benchmark-project-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-benchmark-project-id");
        window.location.href = `benchmarking.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  /** Cost per m² — a real Chart.js vertical bar chart, one bar per
   *  selected project in the order they were selected. */
  function renderCostChart(projects) {
    const p = Charts.palette();
    Charts.renderSafely(
      "cmp-cost-chart",
      {
        type: "bar",
        data: {
          labels: projects.map((pr) => pr.projectName),
          datasets: [
            {
              label: "Cost / m²",
              data: projects.map((pr) => Number(pr.costPerSqm) || 0),
              backgroundColor: projects.map((_, i) => p.series[i % p.series.length]),
              borderRadius: 4,
              maxBarThickness: 64
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
                title: (items) => projects[items[0].dataIndex].projectName,
                label: (ctx) => `${Charts.currencyTooltip(ctx.parsed.y)} / m²`
              }
            }
          }
        }
      },
      { fallbackId: "cmp-cost-chart-fallback", fallbackMessage: "Chart unavailable. See the Full Comparison table above." }
    );
  }

  /** Margin % — same layout, using marginPercent directly from the backend. */
  function renderMarginChart(projects) {
    const p = Charts.palette();
    Charts.renderSafely(
      "cmp-margin-chart",
      {
        type: "bar",
        data: {
          labels: projects.map((pr) => pr.projectName),
          datasets: [
            {
              label: "Margin",
              data: projects.map((pr) => Number(pr.marginPercent) || 0),
              backgroundColor: projects.map((_, i) => p.series[i % p.series.length]),
              borderRadius: 4,
              maxBarThickness: 64
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
                title: (items) => projects[items[0].dataIndex].projectName,
                label: (ctx) => `Margin: ${Charts.percentTooltip(ctx.parsed.y)}`
              }
            }
          }
        }
      },
      { fallbackId: "cmp-margin-chart-fallback", fallbackMessage: "Chart unavailable. See the Full Comparison table above." }
    );
  }

  /** Total Cost vs Selling Price — a grouped bar chart, two bars per
   *  project, side by side. */
  function renderCostVsSellingChart(projects) {
    const p = Charts.palette();
    Charts.renderSafely(
      "cmp-cost-vs-selling-chart",
      {
        type: "bar",
        data: {
          labels: projects.map((pr) => pr.projectName),
          datasets: [
            {
              label: "Total Cost",
              data: projects.map((pr) => Number(pr.totalCost) || 0),
              backgroundColor: p.inkFaint,
              borderRadius: 4
            },
            {
              label: "Selling Price",
              data: projects.map((pr) => Number(pr.totalSellingPrice) || 0),
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
                title: (items) => projects[items[0].dataIndex].projectName,
                label: (ctx) => `${ctx.dataset.label}: ${Charts.currencyTooltip(ctx.parsed.y)}`
              }
            }
          }
        }
      },
      {
        fallbackId: "cmp-cost-vs-selling-chart-fallback",
        fallbackMessage: "Chart unavailable. See the Full Comparison table above."
      }
    );
  }

  /** Floor Area vs Cost/m² — a scatter plot, one point per selected
   *  project, coloured to match its identity elsewhere on the page. */
  function renderEfficiencyChart(projects) {
    const p = Charts.palette();
    Charts.renderSafely(
      "cmp-efficiency-chart",
      {
        type: "scatter",
        data: {
          datasets: projects.map((pr, i) => ({
            label: pr.projectName,
            data: [{ x: Number(pr.floorArea) || 0, y: Number(pr.costPerSqm) || 0 }],
            backgroundColor: p.series[i % p.series.length],
            pointRadius: 8,
            pointHoverRadius: 10
          }))
        },
        options: {
          interaction: { mode: "nearest", intersect: true },
          scales: {
            x: { title: { display: true, text: "Floor Area (m²)" }, grid: { color: p.border } },
            y: {
              title: { display: true, text: "Cost per m² (NZD)" },
              ticks: { callback: (value) => Charts.currencyTick(value) },
              grid: { color: p.border }
            }
          },
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                title: (items) => projects[items[0].datasetIndex].projectName,
                label: (ctx) => {
                  const pr = projects[ctx.datasetIndex];
                  return [`Floor Area: ${Formatters.area(pr.floorArea)}`, `Cost / m²: ${Charts.currencyTooltip(pr.costPerSqm)}`];
                }
              }
            }
          }
        }
      },
      {
        fallbackId: "cmp-efficiency-chart-fallback",
        fallbackMessage: "Chart unavailable. See the Full Comparison table above."
      }
    );
  }

  function buildBarRowHtml({ color, label, widthPct, value, ariaLabel, tooltipValueLabel, scopeName }) {
    const scopeAttr = scopeName ? ` data-tooltip-scope="${escapeHtml(scopeName)}"` : "";
    return `
      <div
        class="bar-row"
        tabindex="0"
        role="img"
        aria-label="${escapeHtml(ariaLabel)}"
        data-tooltip-name="${escapeHtml(label)}"
        data-tooltip-value="${escapeHtml(tooltipValueLabel)}"${scopeAttr}
      >
        <span class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        <span class="bar-track">
          <span class="bar-fill" style="width:${widthPct}%; background:${color};"></span>
        </span>
        <span class="bar-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  /** Union of scope names across all selected projects' topScopes, in
   *  first-seen order (project selection order, then each project's own
   *  scope order) — a presentation grouping only, not a recalculation. */
  function buildScopeUnion(projects) {
    const seen = new Set();
    const union = [];
    projects.forEach((project) => {
      (project.topScopes || []).forEach((scope) => {
        if (!seen.has(scope.scopeName)) {
          seen.add(scope.scopeName);
          union.push(scope.scopeName);
        }
      });
    });
    return union;
  }

  function scopePercentageFor(project, scopeName) {
    const match = (project.topScopes || []).find((s) => s.scopeName === scopeName);
    return match ? Number(match.percentage) || 0 : 0;
  }

  function renderScopeComparison(projects) {
    const scopeUnion = buildScopeUnion(projects);

    if (scopeUnion.length === 0) {
      els.scopeChart.innerHTML = `
        <div class="ui-state">
          <div class="ui-state-title">No scope data available</div>
          <p class="ui-state-body">None of the selected projects have top cost scope data yet.</p>
        </div>
      `;
      els.scopeTableHead.innerHTML = "";
      els.scopeTableBody.innerHTML = "";
      return;
    }

    els.scopeChart.innerHTML = scopeUnion
      .map((scopeName) => {
        const rows = projects
          .map((project, index) => {
            const pct = scopePercentageFor(project, scopeName);
            const widthPct = Math.max(pct, pct > 0 ? 2 : 0);
            const formatted = Formatters.percent(pct, 2);
            return buildBarRowHtml({
              color: PROJECT_COLORS[index],
              label: project.projectName,
              widthPct,
              value: formatted,
              ariaLabel: `${project.projectName}, ${scopeName}, ${formatted}`,
              tooltipValueLabel: formatted,
              scopeName
            });
          })
          .join("");

        return `
          <div class="scope-compare-group">
            <div class="scope-compare-title">${escapeHtml(scopeName)}</div>
            <div class="bar-chart">${rows}</div>
          </div>
        `;
      })
      .join("");

    wireBarTooltips(els.scopeChart, els.scopeTooltip);

    // Scope comparison table (transposed, same shape as the main table)
    els.scopeTableHead.innerHTML = `
      <tr>
        <th scope="col">Scope</th>
        ${projects
          .map(
            (project, index) => `
              <th scope="col" class="col-numeric">
                <span class="table-project-header">
                  <span class="project-swatch" style="background:${PROJECT_COLORS[index]}" aria-hidden="true"></span>
                  ${escapeHtml(project.projectName)}
                </span>
              </th>
            `
          )
          .join("")}
      </tr>
    `;

    els.scopeTableBody.innerHTML = scopeUnion
      .map(
        (scopeName) => `
          <tr>
            <td class="col-name">${escapeHtml(scopeName)}</td>
            ${projects
              .map((project) => `<td class="col-numeric">${Formatters.percent(scopePercentageFor(project, scopeName), 2)}</td>`)
              .join("")}
          </tr>
        `
      )
      .join("");
  }

  /* ------------------------------------------------------------------ *
   * Shared bar tooltip (hover + keyboard focus), scoped to one chart
   * container and its tooltip element at a time.
   * ------------------------------------------------------------------ */

  function wireBarTooltips(container, tooltipEl) {
    container.querySelectorAll(".bar-row[data-tooltip-name]").forEach((row) => {
      row.addEventListener("mouseenter", (e) =>
        activateBarTooltip(container, tooltipEl, row, { clientX: e.clientX, clientY: e.clientY })
      );
      row.addEventListener("mousemove", (e) =>
        positionTooltipAtPoint(container, tooltipEl, e.clientX, e.clientY)
      );
      row.addEventListener("mouseleave", () => deactivateBarTooltip(container, tooltipEl));
      row.addEventListener("focus", () => activateBarTooltip(container, tooltipEl, row, null));
      row.addEventListener("blur", () => deactivateBarTooltip(container, tooltipEl));
    });
  }

  function activateBarTooltip(container, tooltipEl, rowEl, pointerCoords) {
    container.querySelectorAll(".bar-row").forEach((el) => el.classList.toggle("is-active", el === rowEl));

    const name = rowEl.getAttribute("data-tooltip-name");
    const value = rowEl.getAttribute("data-tooltip-value");
    const scope = rowEl.getAttribute("data-tooltip-scope");
    tooltipEl.innerHTML = scope
      ? `
        <div class="bar-tooltip-name">${escapeHtml(scope)}</div>
        <div class="bar-tooltip-value">${escapeHtml(name)}</div>
        <div class="bar-tooltip-value">${escapeHtml(value)}</div>
      `
      : `
        <div class="bar-tooltip-name">${escapeHtml(name)}</div>
        <div class="bar-tooltip-value">${escapeHtml(value)}</div>
      `;
    tooltipEl.hidden = false;

    if (pointerCoords) {
      positionTooltipAtPoint(container, tooltipEl, pointerCoords.clientX, pointerCoords.clientY);
    } else {
      positionTooltipAtRow(container, tooltipEl, rowEl);
    }
  }

  function deactivateBarTooltip(container, tooltipEl) {
    container.querySelectorAll(".bar-row").forEach((el) => el.classList.remove("is-active"));
    tooltipEl.hidden = true;
  }

  function positionTooltipAtPoint(container, tooltipEl, clientX, clientY) {
    if (tooltipEl.hidden) return;
    const panel = tooltipEl.closest(".panel");
    const panelRect = panel.getBoundingClientRect();
    const left = clientX - panelRect.left + 14;
    const top = clientY - panelRect.top + 14;
    placeTooltip(panel, tooltipEl, left, top);
  }

  function positionTooltipAtRow(container, tooltipEl, rowEl) {
    const panel = tooltipEl.closest(".panel");
    const panelRect = panel.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();
    const left = rowRect.left - panelRect.left + rowRect.width / 2;
    const top = rowRect.top - panelRect.top - 8;
    placeTooltip(panel, tooltipEl, left, top);
  }

  function placeTooltip(panel, tooltipEl, left, top) {
    const panelRect = panel.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const minLeft = 4;
    const minTop = 4;
    const maxLeft = panelRect.width - tooltipRect.width - 4;
    const maxTop = panelRect.height - tooltipRect.height - 4;

    const clampedLeft = Math.min(Math.max(left, minLeft), Math.max(maxLeft, minLeft));
    const clampedTop = Math.min(Math.max(top, minTop), Math.max(maxTop, minTop));

    tooltipEl.style.left = `${clampedLeft}px`;
    tooltipEl.style.top = `${clampedTop}px`;
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
