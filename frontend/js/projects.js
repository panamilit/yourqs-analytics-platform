/**
 * projects.js
 * Owns the Projects Overview page: filter state, API calls for this page,
 * table/pagination rendering, and UI-state switching. No calculations on
 * financial figures happen here — only formatting and DOM updates.
 */

const ProjectsPage = (() => {
  const SORT_OPTIONS = [
    { value: "project_name", label: "Project name" },
    { value: "floor_area", label: "Floor area" },
    { value: "total_cost", label: "Total cost" },
    { value: "selling_price", label: "Selling price" },
    { value: "margin_percent", label: "Margin percentage" },
    { value: "selling_price_per_sqm", label: "Selling price per m\u00B2" }
  ];

  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  const SEARCH_DEBOUNCE_MS = 400;

  /** @type {{search:string,minFloorArea:string,maxFloorArea:string,levels:string,hasCostData:string,analyticsReady:string,sortBy:string,sortOrder:string,page:number,pageSize:number}} */
  let filters = {
    search: "",
    minFloorArea: "",
    maxFloorArea: "",
    levels: "",
    hasCostData: "",
    analyticsReady: "",
    sortBy: "project_name",
    sortOrder: "asc",
    page: 1,
    pageSize: 25
  };

  let els = {};
  let searchDebounceHandle = null;
  let projectsAbortController = null;
  let lastKnownTotalPages = 1;

  function init() {
    cacheElements();
    buildSortOptions();
    buildFilterListeners();
    loadSummary();
    loadProjects({ isInitial: true });
  }

  function cacheElements() {
    els = {
      summaryTotal: document.getElementById("summary-total"),
      summaryCostData: document.getElementById("summary-cost-data"),
      summaryAnalyticsReady: document.getElementById("summary-analytics-ready"),
      summaryState: document.getElementById("summary-state"),

      form: document.getElementById("filters-form"),
      searchInput: document.getElementById("filter-search"),
      minAreaInput: document.getElementById("filter-min-area"),
      maxAreaInput: document.getElementById("filter-max-area"),
      levelsInput: document.getElementById("filter-levels"),
      costDataSelect: document.getElementById("filter-cost-data"),
      analyticsReadySelect: document.getElementById("filter-analytics-ready"),
      sortBySelect: document.getElementById("filter-sort-by"),
      sortOrderSelect: document.getElementById("filter-sort-order"),
      clearFiltersBtn: document.getElementById("clear-filters-btn"),

      resultsRegion: document.getElementById("results-region"),
      tableWrapper: document.getElementById("table-wrapper"),
      tableBody: document.getElementById("projects-table-body"),
      loadingState: document.getElementById("state-loading"),
      errorState: document.getElementById("state-error"),
      errorMessage: document.getElementById("state-error-message"),
      retryBtn: document.getElementById("retry-btn"),
      emptyState: document.getElementById("state-empty"),
      noMatchState: document.getElementById("state-no-match"),
      filterLoadingBadge: document.getElementById("filter-loading-badge"),

      resultCount: document.getElementById("result-count"),
      pageSizeSelect: document.getElementById("page-size-select"),
      pageIndicator: document.getElementById("page-indicator"),
      pageNumbers: document.getElementById("page-numbers"),
      prevPageBtn: document.getElementById("prev-page-btn"),
      nextPageBtn: document.getElementById("next-page-btn")
    };
  }

  function buildSortOptions() {
    els.sortBySelect.innerHTML = SORT_OPTIONS.map(
      (opt) => `<option value="${opt.value}">${opt.label}</option>`
    ).join("");
    els.sortBySelect.value = filters.sortBy;

    els.pageSizeSelect.innerHTML = PAGE_SIZE_OPTIONS.map(
      (size) => `<option value="${size}">${size} / page</option>`
    ).join("");
    els.pageSizeSelect.value = String(filters.pageSize);
  }

  function buildFilterListeners() {
    els.form.addEventListener("submit", (e) => e.preventDefault());

    els.searchInput.addEventListener("input", (e) => {
      const value = e.target.value;
      window.clearTimeout(searchDebounceHandle);
      searchDebounceHandle = window.setTimeout(() => {
        filters.search = value.trim();
        filters.page = 1;
        loadProjects();
      }, SEARCH_DEBOUNCE_MS);
    });

    els.minAreaInput.addEventListener("change", (e) => {
      filters.minFloorArea = e.target.value;
      filters.page = 1;
      loadProjects();
    });

    els.maxAreaInput.addEventListener("change", (e) => {
      filters.maxFloorArea = e.target.value;
      filters.page = 1;
      loadProjects();
    });

    els.levelsInput.addEventListener("change", (e) => {
      filters.levels = e.target.value;
      filters.page = 1;
      loadProjects();
    });

    els.costDataSelect.addEventListener("change", (e) => {
      filters.hasCostData = e.target.value;
      filters.page = 1;
      loadProjects();
    });

    els.analyticsReadySelect.addEventListener("change", (e) => {
      filters.analyticsReady = e.target.value;
      filters.page = 1;
      loadProjects();
    });

    els.sortBySelect.addEventListener("change", (e) => {
      filters.sortBy = e.target.value;
      loadProjects();
    });

    els.sortOrderSelect.addEventListener("change", (e) => {
      filters.sortOrder = e.target.value;
      loadProjects();
    });

    els.pageSizeSelect.addEventListener("change", (e) => {
      filters.pageSize = Number(e.target.value);
      filters.page = 1;
      loadProjects();
    });

    els.clearFiltersBtn.addEventListener("click", () => {
      window.clearTimeout(searchDebounceHandle);
      filters = {
        search: "",
        minFloorArea: "",
        maxFloorArea: "",
        levels: "",
        hasCostData: "",
        analyticsReady: "",
        sortBy: "project_name",
        sortOrder: "asc",
        page: 1,
        pageSize: filters.pageSize
      };
      els.searchInput.value = "";
      els.minAreaInput.value = "";
      els.maxAreaInput.value = "";
      els.levelsInput.value = "";
      els.costDataSelect.value = "";
      els.analyticsReadySelect.value = "";
      els.sortBySelect.value = filters.sortBy;
      els.sortOrderSelect.value = filters.sortOrder;
      loadProjects();
    });

    els.retryBtn.addEventListener("click", () => {
      loadSummary();
      loadProjects();
    });

    els.prevPageBtn.addEventListener("click", () => {
      if (filters.page > 1) {
        filters.page -= 1;
        loadProjects();
      }
    });

    els.nextPageBtn.addEventListener("click", () => {
      if (filters.page < lastKnownTotalPages) {
        filters.page += 1;
        loadProjects();
      }
    });
  }

  async function loadSummary() {
    setSummaryState("loading");
    try {
      let data;
      if (window.APP_CONFIG.USE_DEV_FALLBACK) {
        data = window.DEV_FALLBACK.summary;
      } else {
        data = await Api.getProjectsSummary();
      }
      renderSummary(data);
      setSummaryState("ready");
    } catch (err) {
      setSummaryState("error");
    }
  }

  function renderSummary(data) {
    els.summaryTotal.textContent = Formatters.count(data.totalProjects);
    els.summaryCostData.textContent = Formatters.count(data.projectsWithCostData);
    els.summaryAnalyticsReady.textContent = Formatters.count(data.analyticsReadyProjects);
  }

  function setSummaryState(state) {
    els.summaryState.textContent =
      state === "error" ? "Summary figures could not be loaded." : "";
    els.summaryState.hidden = state !== "error";
  }

  async function loadProjects({ isInitial = false } = {}) {
    if (projectsAbortController) {
      projectsAbortController.abort();
    }
    projectsAbortController = new AbortController();
    const { signal } = projectsAbortController;

    showState(isInitial ? "loading" : "filterLoading");

    const queryParams = {
      search: filters.search || undefined,
      min_floor_area: filters.minFloorArea || undefined,
      max_floor_area: filters.maxFloorArea || undefined,
      levels: filters.levels || undefined,
      has_cost_data: filters.hasCostData || undefined,
      analytics_ready: filters.analyticsReady || undefined,
      page: filters.page,
      page_size: filters.pageSize,
      sort_by: filters.sortBy,
      sort_order: filters.sortOrder
    };

    try {
      let data;
      if (window.APP_CONFIG.USE_DEV_FALLBACK) {
        data = buildFallbackResponse(queryParams);
      } else {
        data = await Api.getProjects(queryParams, { signal });
      }

      if (signal.aborted) return;

      lastKnownTotalPages = Math.max(1, data.totalPages || 1);

      if (!data.items || data.items.length === 0) {
        showState(filters.search || hasActiveFilters() ? "noMatch" : "empty");
        renderPagination(data);
        return;
      }

      renderTable(data.items);
      renderPagination(data);
      showState("ready");
    } catch (err) {
      if (err.name === "AbortError") return; // superseded by a newer request
      showState("error", err.message);
    }
  }

  function hasActiveFilters() {
    return Boolean(
      filters.search ||
        filters.minFloorArea ||
        filters.maxFloorArea ||
        filters.levels ||
        filters.hasCostData ||
        filters.analyticsReady
    );
  }

  function buildFallbackResponse(queryParams) {
    let items = [...window.DEV_FALLBACK.projects];
    return {
      items,
      page: 1,
      pageSize: items.length,
      totalItems: items.length,
      totalPages: 1
    };
  }

  function renderTable(items) {
    els.tableBody.innerHTML = items
      .map((project) => {
        const status = Formatters.status(project);
        return `
          <tr>
            <td class="col-name">${escapeHtml(project.projectName)}</td>
            <td class="col-numeric">${Formatters.area(project.floorArea)}</td>
            <td class="col-numeric">${Formatters.count(project.numberOfLevels)}</td>
            <td class="col-numeric">${Formatters.count(project.totalBathroomCount)}</td>
            <td class="col-numeric">${Formatters.currency(project.totalCost)}</td>
            <td class="col-numeric">${Formatters.currency(project.totalSellingPrice)}</td>
            <td class="col-numeric">${Formatters.percent(project.marginPercent)}</td>
            <td class="col-numeric">${Formatters.currency(project.sellingPricePerSqm, { precise: true })}</td>
            <td><span class="status-badge status-${status.key}">${status.label}</span></td>
            <td><button type="button" class="btn btn-ghost btn-sm" data-project-id="${escapeHtml(
              project.projectId
            )}">View Details</button></td>
          </tr>
        `;
      })
      .join("");

    els.tableBody.querySelectorAll("[data-project-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const projectId = btn.getAttribute("data-project-id");
        window.location.href = `project.html?id=${encodeURIComponent(projectId)}`;
      });
    });
  }

  function renderPagination(data) {
    const { page = 1, pageSize = filters.pageSize, totalItems = 0, totalPages = 1 } = data;

    els.resultCount.textContent =
      totalItems === 0
        ? "0 results"
        : `${Formatters.count(totalItems)} result${totalItems === 1 ? "" : "s"}`;

    els.pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    els.prevPageBtn.disabled = page <= 1;
    els.nextPageBtn.disabled = page >= totalPages;

    els.pageNumbers.innerHTML = buildPageNumberList(page, totalPages)
      .map((entry) => {
        if (entry === "ellipsis") {
          return `<span class="page-ellipsis" aria-hidden="true">\u2026</span>`;
        }
        const isCurrent = entry === page;
        return `<button type="button" class="page-number-btn${
          isCurrent ? " is-current" : ""
        }" data-page="${entry}" ${isCurrent ? 'aria-current="page"' : ""}>${entry}</button>`;
      })
      .join("");

    els.pageNumbers.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = Number(btn.getAttribute("data-page"));
        if (target !== filters.page) {
          filters.page = target;
          loadProjects();
        }
      });
    });
  }

  function buildPageNumberList(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const result = [];
    let prev = null;
    sorted.forEach((p) => {
      if (prev !== null && p - prev > 1) result.push("ellipsis");
      result.push(p);
      prev = p;
    });
    return result;
  }

  /**
   * Central UI-state switch. States: loading, filterLoading, ready, error,
   * empty (no data has ever existed), noMatch (filters exclude everything).
   */
  function showState(state, errorMessage = "") {
    const isLoading = state === "loading";
    const isFilterLoading = state === "filterLoading";
    const isError = state === "error";
    const isEmpty = state === "empty";
    const isNoMatch = state === "noMatch";
    const isReady = state === "ready";

    els.loadingState.hidden = !isLoading;
    els.errorState.hidden = !isError;
    els.emptyState.hidden = !isEmpty;
    els.noMatchState.hidden = !isNoMatch;
    els.filterLoadingBadge.hidden = !isFilterLoading;

    // Keep the table visible under a "filter loading" overlay rather than
    // tearing it down, so results don't flash empty on every keystroke.
    els.tableWrapper.hidden = !(isReady || isFilterLoading);
    els.tableWrapper.setAttribute("aria-busy", String(isFilterLoading));

    if (isError) {
      els.errorMessage.textContent =
        errorMessage || "Something went wrong while loading projects.";
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
