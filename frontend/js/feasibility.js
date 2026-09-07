/**
 * feasibility.js
 * Owns the entire public Feasibility Assessment product: a guided
 * multi-step wizard (Project Type -> Details/Property -> Scope -> Budget ->
 * Review) followed by a professional results report. Renders into the
 * feasibility.css design system (the `fp-` prefixed classes) — a
 * deliberately separate visual identity from the internal analytics
 * dashboard's styles.css.
 *
 * This page is intentionally unauthenticated: it does not include auth.js
 * and never attaches an Authorization header, so it works identically for
 * anonymous visitors. "Sign in" is just a plain link to auth.html.
 *
 * PRIVACY: the current backend response contains no historical project
 * names, addresses, IDs or individual comparable figures — only aggregate
 * `estimate`, `budget`, `evidence` and `assessment` objects. This module
 * never assumes or reads a `comparables` field. If the backend response
 * shape ever changes, do not add code that renders individual historical
 * records here.
 */

document.addEventListener("DOMContentLoaded", () => {
  FeasibilityPage.init();
});

const FeasibilityPage = (() => {
  /* ------------------------------------------------------------------ *
   * Flow / content configuration
   * ------------------------------------------------------------------ */

  const FLOWS = {
    new_build: ["type", "details", "scope", "budget", "review"],
    renovation: ["type", "property", "scope", "budget", "review"],
    extension: ["type", "property", "scope", "budget", "review"],
    multi_unit: ["type", "details", "budget", "review"]
  };

  const STEP_TITLES = {
    type: "What are you planning?",
    details: "Project details",
    property: "Property details",
    scope: "Scope",
    budget: "Budget",
    review: "Review"
  };

  const TYPE_OPTIONS = [
    { value: "new_build", title: "New Build", desc: "A brand new, standalone home." },
    { value: "renovation", title: "Renovation", desc: "Reworking part of an existing home." },
    { value: "extension", title: "Extension / Addition", desc: "Adding new floor area to an existing home." },
    { value: "multi_unit", title: "Multi-Unit Development", desc: "Two or more dwellings on one site." }
  ];

  const SCOPE_QUESTIONS = {
    new_build: [
      { field: "retaining", label: "Will significant retaining work be required?" },
      { field: "demolition", label: "Does an existing structure need to be demolished?" },
      { field: "pool", label: "Is a swimming pool included?" },
      { field: "outbuilding", label: "Is a separate garage or outbuilding included?" }
    ],
    renovation: [
      { field: "demolition", label: "Significant demolition?" },
      { field: "recladding", label: "Recladding included?" },
      { field: "outbuilding", label: "Garage / outbuilding works included?" }
    ],
    extension: [
      { field: "demolition", label: "Significant demolition?" },
      { field: "retaining", label: "Significant retaining?" },
      { field: "roofing", label: "Roof alterations?" },
      { field: "outbuilding", label: "Garage / outbuilding included?" }
    ]
  };

  const TIMEFRAME_OPTIONS = [
    { value: "asap", label: "As soon as possible" },
    { value: "within_6_months", label: "Within 6 months" },
    { value: "6_12_months", label: "6–12 months" },
    { value: "more_than_12_months", label: "More than 12 months" },
    { value: "researching", label: "Just researching" }
  ];

  const VERDICT_CLASS = {
    feasible: "is-feasible",
    borderline: "is-borderline",
    unlikely: "is-unlikely"
  };

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */

  let state = createInitialState();
  let els = {};

  function createInitialState() {
    return {
      currentStepIndex: 0,
      projectType: null,
      data: {
        floorArea: null,
        existingFloorArea: null,
        affectedArea: null,
        levels: 1,
        bathrooms: 1,
        kitchens: 1,
        retaining: null,
        demolition: null,
        recladding: null,
        roofing: null,
        pool: null,
        outbuilding: null,
        budget: null,
        timeframe: ""
      }
    };
  }

  function getActiveFlow() {
    if (!state.projectType) return ["type"];
    return FLOWS[state.projectType];
  }

  /* ------------------------------------------------------------------ *
   * Init
   * ------------------------------------------------------------------ */

  function init() {
    cacheElements();
    wireStaticEvents();
    renderStep();
  }

  function cacheElements() {
    els = {
      wizardShell: document.getElementById("fp-wizard-shell"),
      stepper: document.getElementById("fp-stepper"),
      stepMobileCount: document.getElementById("fp-step-mobile-count"),
      stepMobileTitle: document.getElementById("fp-step-mobile-title"),
      stepContent: document.getElementById("fp-step-content"),
      backBtn: document.getElementById("fp-back-btn"),
      continueBtn: document.getElementById("fp-continue-btn"),

      stateLoading: document.getElementById("fp-state-loading"),
      stateError: document.getElementById("fp-state-error"),
      errorMessage: document.getElementById("fp-error-message"),
      errorRetryBtn: document.getElementById("fp-error-retry-btn"),

      results: document.getElementById("fp-results")
    };
  }

  function wireStaticEvents() {
    els.continueBtn.addEventListener("click", handleContinue);
    els.backBtn.addEventListener("click", handleBack);
    els.errorRetryBtn.addEventListener("click", submitAssessment);
  }

  /* ------------------------------------------------------------------ *
   * Step rendering dispatch
   * ------------------------------------------------------------------ */

  function renderStep() {
    const flow = getActiveFlow();
    const stepId = flow[state.currentStepIndex];

    const card = els.stepContent.closest(".fp-card");
    if (card) {
      card.classList.remove("fp-step-fade");
      // Force reflow so the fade-in animation replays on every step change.
      void card.offsetWidth;
      card.classList.add("fp-step-fade");
    }

    els.stepContent.innerHTML = STEP_RENDERERS[stepId]();
    wireStepInputs(stepId);
    updateStepper(flow, stepId);
    updateNav(flow, stepId);
  }

  const STEP_RENDERERS = {
    type: renderTypeStep,
    details: renderDetailsStep,
    property: renderPropertyStep,
    scope: renderScopeStep,
    budget: renderBudgetStep,
    review: renderReviewStep
  };

  /* ------------------------------------------------------------------ *
   * Step: Project Type
   * ------------------------------------------------------------------ */

  function renderTypeStep() {
    return `
      <h2 class="fp-step-heading">What are you planning?</h2>
      <p class="fp-step-subheading">Choose the option closest to your project.</p>
      <div class="fp-type-grid">
        ${TYPE_OPTIONS.map(
          (opt) => `
            <button
              type="button"
              class="fp-type-card ${state.projectType === opt.value ? "is-selected" : ""}"
              data-type="${opt.value}"
              aria-pressed="${state.projectType === opt.value}"
            >
              <span class="fp-type-title">${escapeHtml(opt.title)}</span>
              <span class="fp-type-desc">${escapeHtml(opt.desc)}</span>
            </button>
          `
        ).join("")}
      </div>
      <p class="fp-field-error" id="fp-step-error" hidden></p>
    `;
  }

  function wireTypeStep() {
    els.stepContent.querySelectorAll(".fp-type-card").forEach((card) => {
      card.addEventListener("click", () => {
        const newType = card.dataset.type;
        if (newType !== state.projectType) {
          // Switching type discards downstream answers that no longer
          // apply, but keeps the budget/timeframe (still relevant either way).
          const budget = state.data.budget;
          const timeframe = state.data.timeframe;
          state.data = { ...createInitialState().data, budget, timeframe };
          state.projectType = newType;
        }
        renderStep();
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Step: Project Details (New Build / Multi-Unit)
   * ------------------------------------------------------------------ */

  function renderDetailsStep() {
    const isMultiUnit = state.projectType === "multi_unit";
    const floorAreaLabel = isMultiUnit ? "Approximate total development floor area" : "Approximate floor area";

    return `
      <h2 class="fp-step-heading">Project details</h2>
      <p class="fp-step-subheading">Tell us a little about the size and layout.</p>

      <div class="fp-field">
        <label class="fp-field-label" for="fp-floor-area">${floorAreaLabel} (m²)</label>
        <input
          type="number"
          inputmode="numeric"
          class="fp-text-input"
          id="fp-floor-area"
          min="1"
          step="1"
          placeholder="e.g. 180"
          value="${state.data.floorArea ?? ""}"
        />
        <p class="fp-field-error" id="fp-floor-area-error" hidden></p>
      </div>

      <div class="fp-field-row">
        ${quantityFieldHtml("levels", "How many levels?")}
        ${quantityFieldHtml("bathrooms", "How many bathrooms?")}
      </div>
      <div class="fp-field">
        ${quantityFieldHtml("kitchens", "How many kitchens?")}
      </div>

      <p class="fp-field-error" id="fp-step-error" hidden></p>
    `;
  }

  function wireDetailsStep() {
    const floorAreaInput = document.getElementById("fp-floor-area");
    floorAreaInput.addEventListener("input", () => {
      state.data.floorArea = floorAreaInput.value === "" ? null : Number(floorAreaInput.value);
      setFieldError("fp-floor-area-error", "");
    });
    wireQuantityFields(["levels", "bathrooms", "kitchens"]);
  }

  /* ------------------------------------------------------------------ *
   * Step: Property (Renovation / Extension)
   * ------------------------------------------------------------------ */

  function renderPropertyStep() {
    const isExtension = state.projectType === "extension";
    const affectedLabel = isExtension
      ? "Approximate extension / affected area"
      : "Approximate area being renovated";
    const bathroomsLabel = isExtension ? "Bathrooms added or affected" : "Bathrooms affected";
    const kitchensLabel = isExtension ? "Kitchens added or affected" : "Kitchens affected";

    return `
      <h2 class="fp-step-heading">Property details</h2>
      <p class="fp-step-subheading">This helps us match your project against similar historical work.</p>

      <div class="fp-field">
        <label class="fp-field-label" for="fp-existing-area">
          Existing home floor area (m²) <span class="fp-optional">(approximate, for context)</span>
        </label>
        <input
          type="number"
          inputmode="numeric"
          class="fp-text-input"
          id="fp-existing-area"
          min="0"
          step="1"
          placeholder="e.g. 200"
          value="${state.data.existingFloorArea ?? ""}"
        />
      </div>

      <div class="fp-field">
        <label class="fp-field-label" for="fp-affected-area">${affectedLabel} (m²)</label>
        <input
          type="number"
          inputmode="numeric"
          class="fp-text-input"
          id="fp-affected-area"
          min="1"
          step="1"
          placeholder="e.g. 90"
          value="${state.data.affectedArea ?? ""}"
        />
        <p class="fp-field-error" id="fp-affected-area-error" hidden></p>
      </div>

      <div class="fp-field-row">
        ${quantityFieldHtml("levels", "Levels involved")}
        ${quantityFieldHtml("bathrooms", bathroomsLabel)}
      </div>
      <div class="fp-field">
        ${quantityFieldHtml("kitchens", kitchensLabel)}
      </div>

      <p class="fp-field-error" id="fp-step-error" hidden></p>
    `;
  }

  function wirePropertyStep() {
    const existingAreaInput = document.getElementById("fp-existing-area");
    existingAreaInput.addEventListener("input", () => {
      state.data.existingFloorArea = existingAreaInput.value === "" ? null : Number(existingAreaInput.value);
    });
    const affectedAreaInput = document.getElementById("fp-affected-area");
    affectedAreaInput.addEventListener("input", () => {
      state.data.affectedArea = affectedAreaInput.value === "" ? null : Number(affectedAreaInput.value);
      setFieldError("fp-affected-area-error", "");
    });
    wireQuantityFields(["levels", "bathrooms", "kitchens"]);
  }

  /* ------------------------------------------------------------------ *
   * Quantity stepper control (levels / bathrooms / kitchens)
   * ------------------------------------------------------------------ */

  function quantityFieldHtml(field, label) {
    const value = state.data[field] ?? 1;
    return `
      <div class="fp-field">
        <label class="fp-field-label" id="fp-${field}-label">${escapeHtml(label)}</label>
        <div class="fp-stepper-control" data-field="${field}" role="group" aria-labelledby="fp-${field}-label">
          <button type="button" class="fp-stepper-btn" data-step="-1" aria-label="Decrease">−</button>
          <span class="fp-stepper-value" data-value-for="${field}">${value}</span>
          <button type="button" class="fp-stepper-btn" data-step="1" aria-label="Increase">+</button>
        </div>
      </div>
    `;
  }

  function wireQuantityFields(fields) {
    fields.forEach((field) => {
      const control = els.stepContent.querySelector(`.fp-stepper-control[data-field="${field}"]`);
      if (!control) return;
      control.querySelectorAll(".fp-stepper-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const delta = Number(btn.dataset.step);
          const current = state.data[field] ?? 1;
          const next = Math.max(1, Math.min(20, current + delta));
          state.data[field] = next;
          control.querySelector(`[data-value-for="${field}"]`).textContent = String(next);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Step: Scope (tri-state Yes / No / Not sure)
   * ------------------------------------------------------------------ */

  function renderScopeStep() {
    const questions = SCOPE_QUESTIONS[state.projectType] || [];
    return `
      <h2 class="fp-step-heading">Scope</h2>
      <p class="fp-step-subheading">
        These help match your project to similar historical work. If you're not certain, that's fine —
        choose "Not sure".
      </p>
      ${questions
        .map(
          (q) => `
            <div class="fp-scope-question">
              <p class="fp-scope-label" id="fp-scope-${q.field}-label">${escapeHtml(q.label)}</p>
              <div class="fp-segmented" data-field="${q.field}" role="group" aria-labelledby="fp-scope-${q.field}-label">
                ${triStateButtonHtml(q.field, "true", "Yes")}
                ${triStateButtonHtml(q.field, "false", "No")}
                ${triStateButtonHtml(q.field, "null", "Not sure")}
              </div>
            </div>
          `
        )
        .join("")}
    `;
  }

  function triStateButtonHtml(field, value, label) {
    const current = state.data[field];
    const isSelected =
      (value === "true" && current === true) ||
      (value === "false" && current === false) ||
      (value === "null" && current === null);
    return `
      <button
        type="button"
        class="fp-segmented-btn ${isSelected ? "is-selected" : ""}"
        data-field="${field}"
        data-value="${value}"
        aria-pressed="${isSelected}"
      >${label}</button>
    `;
  }

  function wireScopeStep() {
    els.stepContent.querySelectorAll(".fp-segmented").forEach((group) => {
      const field = group.dataset.field;
      group.querySelectorAll(".fp-segmented-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.data[field] = parseTriStateValue(btn.dataset.value);
          group.querySelectorAll(".fp-segmented-btn").forEach((sibling) => {
            const selected = sibling === btn;
            sibling.classList.toggle("is-selected", selected);
            sibling.setAttribute("aria-pressed", String(selected));
          });
        });
      });
    });
  }

  function parseTriStateValue(raw) {
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  }

  function triStateDisplay(value) {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Not sure";
  }

  /* ------------------------------------------------------------------ *
   * Step: Budget
   * ------------------------------------------------------------------ */

  function renderBudgetStep() {
    return `
      <h2 class="fp-step-heading">What's your approximate construction budget?</h2>
      <p class="fp-step-subheading">This helps us assess how your budget compares with similar historical projects.</p>

      <div class="fp-field">
        <label class="fp-field-label" for="fp-budget-input">Budget (NZD)</label>
        <div class="fp-budget-input-wrap">
          <span class="fp-budget-prefix" aria-hidden="true">$</span>
          <input
            type="text"
            inputmode="numeric"
            id="fp-budget-input"
            class="fp-budget-input"
            placeholder="900,000"
            value="${formatBudgetDisplay(state.data.budget)}"
          />
        </div>
        <p class="fp-field-error" id="fp-budget-error" hidden></p>
      </div>

      <div class="fp-field">
        <label class="fp-field-label" for="fp-timeframe">
          When are you hoping to start? <span class="fp-optional">(optional)</span>
        </label>
        <select id="fp-timeframe" class="fp-text-input">
          <option value="">Prefer not to say</option>
          ${TIMEFRAME_OPTIONS.map(
            (opt) =>
              `<option value="${opt.value}" ${state.data.timeframe === opt.value ? "selected" : ""}>${escapeHtml(
                opt.label
              )}</option>`
          ).join("")}
        </select>
        <p class="fp-field-hint">This is for context only and does not change your estimate.</p>
      </div>

      <p class="fp-field-error" id="fp-step-error" hidden></p>
    `;
  }

  function formatBudgetDisplay(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "";
    return Number(value).toLocaleString("en-NZ");
  }

  function wireBudgetStep() {
    const budgetInput = document.getElementById("fp-budget-input");
    budgetInput.addEventListener("input", () => {
      const digitsOnly = budgetInput.value.replace(/[^\d]/g, "");
      state.data.budget = digitsOnly === "" ? null : Number(digitsOnly);
      budgetInput.value = digitsOnly === "" ? "" : Number(digitsOnly).toLocaleString("en-NZ");
      setFieldError("fp-budget-error", "");
    });

    document.getElementById("fp-timeframe").addEventListener("change", (e) => {
      state.data.timeframe = e.target.value;
    });
  }

  /* ------------------------------------------------------------------ *
   * Step: Review
   * ------------------------------------------------------------------ */

  function renderReviewStep() {
    const typeLabel = TYPE_OPTIONS.find((t) => t.value === state.projectType)?.title || "";
    const flow = getActiveFlow();

    const sections = [];

    sections.push({
      title: "Project type",
      stepId: "type",
      lines: [typeLabel]
    });

    if (flow.includes("details")) {
      const isMultiUnit = state.projectType === "multi_unit";
      sections.push({
        title: isMultiUnit ? "Development details" : "Project details",
        stepId: "details",
        lines: [
          `${Formatters.area(state.data.floorArea)}`,
          `${state.data.levels} level${state.data.levels === 1 ? "" : "s"}`,
          `${state.data.bathrooms} bathroom${state.data.bathrooms === 1 ? "" : "s"}`,
          `${state.data.kitchens} kitchen${state.data.kitchens === 1 ? "" : "s"}`
        ]
      });
    }

    if (flow.includes("property")) {
      const lines = [];
      if (state.data.existingFloorArea) {
        lines.push(`Existing home: ${Formatters.area(state.data.existingFloorArea)}`);
      }
      lines.push(`Affected area: ${Formatters.area(state.data.affectedArea)}`);
      lines.push(`${state.data.levels} level${state.data.levels === 1 ? "" : "s"} involved`);
      lines.push(`${state.data.bathrooms} bathroom${state.data.bathrooms === 1 ? "" : "s"}`);
      lines.push(`${state.data.kitchens} kitchen${state.data.kitchens === 1 ? "" : "s"}`);
      sections.push({ title: "Property details", stepId: "property", lines });
    }

    if (flow.includes("scope")) {
      const questions = SCOPE_QUESTIONS[state.projectType] || [];
      sections.push({
        title: "Scope",
        stepId: "scope",
        lines: questions.map((q) => `${q.label.replace(/\?$/, "")}: ${triStateDisplay(state.data[q.field])}`)
      });
    }

    sections.push({
      title: "Budget",
      stepId: "budget",
      lines: [
        Formatters.currency(state.data.budget),
        state.data.timeframe
          ? `Start: ${TIMEFRAME_OPTIONS.find((t) => t.value === state.data.timeframe)?.label || ""}`
          : null
      ].filter(Boolean)
    });

    return `
      <h2 class="fp-step-heading">Review your project</h2>
      <p class="fp-step-subheading">Check the details below, then calculate your feasibility assessment.</p>

      ${sections
        .map(
          (section) => `
            <div class="fp-review-section">
              <div class="fp-review-section-header">
                <span class="fp-review-section-title">${escapeHtml(section.title)}</span>
                <button type="button" class="fp-review-edit" data-goto="${section.stepId}">Edit</button>
              </div>
              <ul class="fp-review-list">
                ${section.lines.map((line) => `<li class="fp-review-value">${escapeHtml(line)}</li>`).join("")}
              </ul>
            </div>
          `
        )
        .join("")}

      <p class="fp-field-error" id="fp-step-error" hidden></p>
    `;
  }

  function wireReviewStep() {
    els.stepContent.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const flow = getActiveFlow();
        const targetIndex = flow.indexOf(btn.dataset.goto);
        if (targetIndex >= 0) {
          state.currentStepIndex = targetIndex;
          renderStep();
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Step input wiring dispatch
   * ------------------------------------------------------------------ */

  function wireStepInputs(stepId) {
    if (stepId === "type") wireTypeStep();
    else if (stepId === "details") wireDetailsStep();
    else if (stepId === "property") wirePropertyStep();
    else if (stepId === "scope") wireScopeStep();
    else if (stepId === "budget") wireBudgetStep();
    else if (stepId === "review") wireReviewStep();
  }

  /* ------------------------------------------------------------------ *
   * Stepper (desktop) / compact step label (mobile)
   * ------------------------------------------------------------------ */

  function updateStepper(flow, currentStepId) {
    const currentIndex = flow.indexOf(currentStepId);

    els.stepper.innerHTML = flow
      .map((stepId, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const dotContent = isDone ? "✓" : String(i + 1);
        const connector =
          i < flow.length - 1 ? '<span class="fp-stepper-line" aria-hidden="true"></span>' : "";
        return `
          <span class="fp-stepper-item ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}">
            <span class="fp-stepper-dot" aria-hidden="true">${dotContent}</span>
            <span class="fp-stepper-label">${escapeHtml(STEP_TITLES[stepId])}</span>
          </span>
          ${connector}
        `;
      })
      .join("");

    els.stepMobileCount.textContent = `Step ${currentIndex + 1} of ${flow.length}`;
    els.stepMobileTitle.textContent = STEP_TITLES[currentStepId];
  }

  function updateNav(flow, stepId) {
    els.backBtn.hidden = state.currentStepIndex === 0;
    els.continueBtn.textContent = stepId === "review" ? "Calculate Feasibility" : "Continue";
  }

  /* ------------------------------------------------------------------ *
   * Wizard navigation
   * ------------------------------------------------------------------ */

  function handleContinue() {
    const flow = getActiveFlow();
    const stepId = flow[state.currentStepIndex];

    const error = validateStep(stepId);
    if (error) {
      showStepError(error);
      return;
    }
    clearStepError();

    if (stepId === "review") {
      submitAssessment();
      return;
    }

    if (state.currentStepIndex < flow.length - 1) {
      state.currentStepIndex += 1;
      renderStep();
      scrollWizardIntoView();
    }
  }

  function handleBack() {
    if (state.currentStepIndex > 0) {
      state.currentStepIndex -= 1;
      renderStep();
      scrollWizardIntoView();
    }
  }

  function scrollWizardIntoView() {
    if (typeof els.wizardShell.scrollIntoView === "function") {
      els.wizardShell.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ------------------------------------------------------------------ *
   * Validation
   * ------------------------------------------------------------------ */

  function validateStep(stepId) {
    if (stepId === "type") {
      return state.projectType ? null : "Choose a project type to continue.";
    }

    if (stepId === "details") {
      if (!state.data.floorArea || state.data.floorArea <= 0) return "Enter an approximate floor area.";
      return null;
    }

    if (stepId === "property") {
      if (!state.data.affectedArea || state.data.affectedArea <= 0) {
        return state.projectType === "extension"
          ? "Enter the approximate extension or affected area."
          : "Enter the area being renovated.";
      }
      return null;
    }

    if (stepId === "budget") {
      if (!state.data.budget || state.data.budget <= 0) return "Enter your approximate construction budget.";
      return null;
    }

    return null;
  }

  function showStepError(message) {
    setFieldError("fp-step-error", message);
  }

  function clearStepError() {
    setFieldError("fp-step-error", "");
  }

  function setFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message || "";
    el.hidden = !message;
  }

  /* ------------------------------------------------------------------ *
   * Submission
   * ------------------------------------------------------------------ */

  async function submitAssessment() {
    els.wizardShell.hidden = true;
    els.stateError.hidden = true;
    els.stateLoading.hidden = false;

    try {
      const payload = buildPayload();
      const data = await Api.request("/api/feasibility/assess", {
        method: "POST",
        body: payload
      });
      els.stateLoading.hidden = true;
      renderResults(data);
    } catch (err) {
      els.stateLoading.hidden = true;
      els.stateError.hidden = false;
      els.errorMessage.textContent = formatApiError(err);
    }
  }

  function buildPayload() {
    const base = {
      project_type: state.projectType,
      budget: state.data.budget
    };

    if (state.projectType === "new_build") {
      return {
        ...base,
        area: { floor_area: state.data.floorArea },
        layout: { levels: state.data.levels, bathrooms: state.data.bathrooms, kitchens: state.data.kitchens },
        scope: {
          retaining: state.data.retaining,
          demolition: state.data.demolition,
          recladding: null,
          roofing: null,
          pool: state.data.pool,
          outbuilding: state.data.outbuilding,
          secondary_dwelling: null,
          structural_complexity: null,
          electrical_upgrade: null,
          plumbing_upgrade: null
        }
      };
    }

    if (state.projectType === "renovation") {
      return {
        ...base,
        area: { floor_area: state.data.existingFloorArea ?? null, affected_area: state.data.affectedArea },
        layout: { levels: state.data.levels, bathrooms: state.data.bathrooms, kitchens: state.data.kitchens },
        scope: {
          retaining: null,
          demolition: state.data.demolition,
          recladding: state.data.recladding,
          roofing: null,
          pool: null,
          outbuilding: state.data.outbuilding,
          secondary_dwelling: null,
          structural_complexity: null,
          electrical_upgrade: null,
          plumbing_upgrade: null
        }
      };
    }

    if (state.projectType === "extension") {
      return {
        ...base,
        area: { floor_area: state.data.existingFloorArea ?? null, affected_area: state.data.affectedArea },
        layout: { levels: state.data.levels, bathrooms: state.data.bathrooms, kitchens: state.data.kitchens },
        scope: {
          retaining: state.data.retaining,
          demolition: state.data.demolition,
          recladding: null,
          roofing: state.data.roofing,
          pool: null,
          outbuilding: state.data.outbuilding,
          secondary_dwelling: null,
          structural_complexity: null,
          electrical_upgrade: null,
          plumbing_upgrade: null
        }
      };
    }

    // multi_unit
    return {
      ...base,
      area: { floor_area: state.data.floorArea },
      layout: { levels: state.data.levels, bathrooms: state.data.bathrooms, kitchens: state.data.kitchens },
      scope: {
        retaining: null,
        demolition: null,
        recladding: null,
        roofing: null,
        pool: null,
        outbuilding: null,
        secondary_dwelling: null,
        structural_complexity: null,
        electrical_upgrade: null,
        plumbing_upgrade: null
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * Results — a professional mini feasibility report, not a card grid.
   * Only ever reads `estimate`, `budget`, `evidence`, `assessment` and
   * `assumptions`. Never reads or renders individual historical records.
   * ------------------------------------------------------------------ */

  function renderResults(data) {
    els.results.innerHTML =
      data.status === "insufficient_data" ? renderInsufficientReport(data) : renderCompletedReport(data);
    els.results.hidden = false;
    wireResultsEvents();
    if (typeof els.results.scrollIntoView === "function") {
      els.results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderCompletedReport(data) {
    const estimate = data.estimate || {};
    const budget = data.budget || {};
    const evidence = data.evidence || {};
    const assessment = data.assessment || {};

    const low = Number(estimate.low);
    const typical = Number(estimate.typical);
    const high = Number(estimate.high);
    const typicalPerSqm = Number(estimate.typical_per_sqm);
    const budgetAmount = Number(budget.amount);
    const difference = Number(budget.difference_from_typical);
    const differencePercent = Number(budget.difference_percent);

    const verdictClass = VERDICT_CLASS[budget.verdict] || "is-borderline";
    const diffTone = difference >= 0 ? "is-diff-favorable" : "is-diff-caution";

    const matched = Array.isArray(assessment.matched_scope_characteristics)
      ? assessment.matched_scope_characteristics
      : [];

    return `
      <div class="fp-report-header">
        <p class="fp-report-eyebrow">Your Project Feasibility</p>
        <span class="fp-verdict ${verdictClass}">${escapeHtml(budget.verdict_label || "Assessment")}</span>
        <p class="fp-report-summary">${escapeHtml(assessment.summary || "")}</p>
        <p class="fp-report-evidence">Based on ${escapeHtml(
          Formatters.count(evidence.comparable_count)
        )} relevant historical YourQS projects.</p>
        <span class="fp-report-confidence">${escapeHtml(evidence.confidence_label || "")}</span>
      </div>

      <section class="fp-report-section">
        <h2 class="fp-report-section-title">The numbers</h2>
        <div class="fp-estimate-grid">
          <div>
            <div class="fp-estimate-item-label">Typical Estimate</div>
            <div class="fp-estimate-item-value">${Formatters.currency(typical)}</div>
          </div>
          <div>
            <div class="fp-estimate-item-label">Estimated Range</div>
            <div class="fp-estimate-item-value">${Formatters.currency(low)} – ${Formatters.currency(high)}</div>
          </div>
          <div>
            <div class="fp-estimate-item-label">Typical Rate</div>
            <div class="fp-estimate-item-value">${Formatters.currency(
              typicalPerSqm
            )} <span class="fp-estimate-item-sub">/ m²</span></div>
          </div>
          <div>
            <div class="fp-estimate-item-label">Your Budget</div>
            <div class="fp-estimate-item-value">${Formatters.currency(budgetAmount)}</div>
          </div>
          <div>
            <div class="fp-estimate-item-label">Difference</div>
            <div class="fp-estimate-item-value ${diffTone}">${Formatters.currencySigned(difference)}</div>
            <div class="fp-estimate-item-sub">${Formatters.percentSigned(differencePercent)}</div>
          </div>
        </div>

        ${renderRangeViz(low, typical, high, budgetAmount)}
      </section>

      ${matched.length > 0 ? renderMatchedCharacteristics(matched) : ""}

      ${renderProjectSummarySection()}

      ${renderAssumptionsSection(data.assumptions)}

      ${renderDetailedReviewCta()}

      <button type="button" class="fp-restart-link" id="fp-restart-btn">Start a new assessment</button>
    `;
  }

  function renderInsufficientReport(data) {
    const evidence = data.evidence || {};
    const assessment = data.assessment || {};

    return `
      <div class="fp-report-header">
        <p class="fp-report-eyebrow">Your Project Feasibility</p>
        <span class="fp-verdict is-insufficient">Detailed Review Recommended</span>
        <p class="fp-report-summary">${escapeHtml(
          assessment.summary ||
            "There are not enough sufficiently similar historical projects to produce a reliable automated feasibility estimate."
        )}</p>
      </div>

      <section class="fp-report-section">
        <p class="fp-insufficient-note">Your project can still be reviewed in more detail by YourQS.</p>
        ${
          evidence.comparable_count !== undefined
            ? `<p class="fp-report-evidence">Historical projects reviewed so far: ${escapeHtml(
                Formatters.count(evidence.comparable_count)
              )}.</p>`
            : ""
        }
      </section>

      ${renderProjectSummarySection()}

      ${renderAssumptionsSection(data.assumptions)}

      ${renderDetailedReviewCta()}

      <button type="button" class="fp-restart-link" id="fp-restart-btn">Start a new assessment</button>
    `;
  }

  /** A deliberate, report-like range visualisation — not a generic
   *  progress bar or chart library. The budget marker is clamped to the
   *  track if outside the low/high range, with a note indicating so. */
  function renderRangeViz(low, typical, high, budgetAmount) {
    if (![low, typical, high, budgetAmount].every(Number.isFinite) || high <= low) {
      return "";
    }

    const toPct = (v) => ((v - low) / (high - low)) * 100;
    const typicalPct = clampPct(toPct(typical));
    const rawBudgetPct = toPct(budgetAmount);
    const budgetPct = clampPct(rawBudgetPct);

    let note = "";
    if (rawBudgetPct < 0) note = "Below the estimated range";
    else if (rawBudgetPct > 100) note = "Above the estimated range";

    return `
      <div class="fp-range-viz">
        <div class="fp-range-labels">
          <div class="fp-range-label-item">
            <span class="fp-range-label-title">Low</span>
            <span class="fp-range-label-value">${Formatters.currencyCompact(low)}</span>
          </div>
          <div class="fp-range-label-item is-typical">
            <span class="fp-range-label-title">Typical</span>
            <span class="fp-range-label-value">${Formatters.currencyCompact(typical)}</span>
          </div>
          <div class="fp-range-label-item">
            <span class="fp-range-label-title">High</span>
            <span class="fp-range-label-value">${Formatters.currencyCompact(high)}</span>
          </div>
        </div>
        <div class="fp-range-track">
          <div class="fp-range-fill"></div>
          <div class="fp-range-tick" style="left:${typicalPct}%;" aria-hidden="true"></div>
          <div class="fp-range-marker" style="left:${budgetPct}%;">
            <span class="fp-range-marker-dot" aria-hidden="true"></span>
            <span class="fp-range-marker-label">
              Your budget
              <strong>${Formatters.currencyCompact(budgetAmount)}</strong>
              ${note ? `<span class="fp-range-marker-note">${escapeHtml(note)}</span>` : ""}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function clampPct(value) {
    return Math.max(0, Math.min(100, value));
  }

  function renderMatchedCharacteristics(matched) {
    return `
      <section class="fp-report-section">
        <h2 class="fp-report-section-title">Project characteristics considered</h2>
        <ul class="fp-plain-list">
          ${matched.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderProjectSummarySection() {
    const typeLabel = TYPE_OPTIONS.find((t) => t.value === state.projectType)?.title || "";
    const flow = FLOWS[state.projectType] || [];
    const lines = [typeLabel];

    if (flow.includes("details")) {
      lines.push(Formatters.area(state.data.floorArea));
      lines.push(`${state.data.levels} level${state.data.levels === 1 ? "" : "s"}`);
      lines.push(`${state.data.bathrooms} bathroom${state.data.bathrooms === 1 ? "" : "s"}`);
      lines.push(`${state.data.kitchens} kitchen${state.data.kitchens === 1 ? "" : "s"}`);
    }
    if (flow.includes("property")) {
      lines.push(`Affected area: ${Formatters.area(state.data.affectedArea)}`);
      lines.push(`${state.data.levels} level${state.data.levels === 1 ? "" : "s"} involved`);
      lines.push(`${state.data.bathrooms} bathroom${state.data.bathrooms === 1 ? "" : "s"}`);
      lines.push(`${state.data.kitchens} kitchen${state.data.kitchens === 1 ? "" : "s"}`);
    }
    if (flow.includes("scope")) {
      (SCOPE_QUESTIONS[state.projectType] || []).forEach((q) => {
        const value = state.data[q.field];
        const prefix = value === true ? "" : value === false ? "No " : "Unsure re. ";
        lines.push(`${prefix}${q.label.replace(/\?$/, "")}`.trim());
      });
    }
    lines.push(`Budget: ${Formatters.currency(state.data.budget)}`);

    return `
      <section class="fp-report-section">
        <h2 class="fp-report-section-title">Project summary</h2>
        <ul class="fp-plain-list">
          ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderAssumptionsSection(assumptions) {
    const list = Array.isArray(assumptions) ? assumptions : [];
    if (list.length === 0) return "";
    return `
      <section class="fp-report-section">
        <h2 class="fp-report-section-title">Important assumptions</h2>
        <ul class="fp-plain-list fp-assumptions-list">
          ${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <p class="fp-disclaimer">
          This is an indicative feasibility estimate based on historical YourQS project data. It is not a
          formal quotation or quantity survey.
        </p>
      </section>
    `;
  }

  function renderDetailedReviewCta() {
    return `
      <section class="fp-cta-section">
        <h2 class="fp-cta-title">Want a more detailed assessment?</h2>
        <p class="fp-cta-body">
          Every project is different. YourQS can review your plans, specifications and project requirements
          in more detail.
        </p>
        <button type="button" class="fp-btn fp-btn-primary" id="fp-review-cta-btn">Request a Detailed Review</button>
        <p class="fp-cta-ack" id="fp-review-cta-ack" hidden></p>
      </section>
    `;
  }

  function wireResultsEvents() {
    const restartBtn = document.getElementById("fp-restart-btn");
    if (restartBtn) restartBtn.addEventListener("click", restartWizard);

    const reviewBtn = document.getElementById("fp-review-cta-btn");
    if (reviewBtn) {
      reviewBtn.addEventListener("click", () => {
        // TODO: replace this acknowledgement with a real submission to a
        // lead-capture endpoint or a link to a contact page once one
        // exists. No backend integration is invented here.
        const ack = document.getElementById("fp-review-cta-ack");
        ack.textContent = "Thanks — please contact YourQS directly and we'll arrange a detailed review.";
        ack.hidden = false;
      });
    }
  }

  function restartWizard() {
    state = createInitialState();
    els.results.hidden = true;
    els.results.innerHTML = "";
    els.stateError.hidden = true;
    els.wizardShell.hidden = false;
    renderStep();
    if (typeof els.wizardShell.scrollIntoView === "function") {
      els.wizardShell.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ------------------------------------------------------------------ *
   * Utilities
   * ------------------------------------------------------------------ */

  /** Mirrors Auth.formatErrorMessage's logic locally — this page stays
   *  independent of auth.js since it never needs authentication. */
  function formatApiError(err) {
    if (!err) return "Something went wrong. Please try again.";
    if (err.detail) {
      if (typeof err.detail === "string") return err.detail;
      if (Array.isArray(err.detail) && err.detail.length > 0) {
        const first = err.detail[0];
        if (typeof first === "string") return first;
        if (first && typeof first.msg === "string") return first.msg;
      }
    }
    if (typeof err.message === "string" && err.message) return err.message;
    return "Something went wrong. Please try again.";
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
