/**
 * feasibility.js
 * Public Feasibility Assessment page.
 */

document.addEventListener("DOMContentLoaded", () => {
  FeasibilityPage.init();
});

const FeasibilityPage = (() => {
  const FLOWS = {
    new_build: [
      "type",
      "details",
      "scope",
      "budget",
      "review"
    ],

    renovation: [
      "type",
      "property",
      "scope",
      "budget",
      "review"
    ],

    extension: [
      "type",
      "property",
      "scope",
      "budget",
      "review"
    ],

    multi_unit: [
      "type",
      "details",
      "budget",
      "review"
    ]
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
    {
      value: "new_build",
      title: "New Build",
      desc: "A brand new, standalone home."
    },

    {
      value: "renovation",
      title: "Renovation",
      desc: "Reworking part of an existing home."
    },

    {
      value: "extension",
      title: "Extension / Addition",
      desc: "Adding new floor area to an existing home."
    },

    {
      value: "multi_unit",
      title: "Multi-Unit Development",
      desc: "Two or more dwellings on one site."
    }
  ];


  const SCOPE_QUESTIONS = {
    new_build: [
      {
        field: "retaining",
        label:
          "Will significant retaining work be required?"
      },

      {
        field: "demolition",
        label:
          "Does an existing structure need to be demolished?"
      },

      {
        field: "pool",
        label:
          "Is a swimming pool included?"
      },

      {
        field: "outbuilding",
        label:
          "Is a separate garage or outbuilding included?"
      }
    ],


    renovation: [
      {
        field: "demolition",
        label:
          "Significant demolition?"
      },

      {
        field: "recladding",
        label:
          "Recladding included?"
      },

      {
        field: "outbuilding",
        label:
          "Garage / outbuilding works included?"
      }
    ],


    extension: [
      {
        field: "demolition",
        label:
          "Significant demolition?"
      },

      {
        field: "retaining",
        label:
          "Significant retaining?"
      },

      {
        field: "roofing",
        label:
          "Roof alterations?"
      },

      {
        field: "outbuilding",
        label:
          "Garage / outbuilding included?"
      }
    ]
  };


  const TIMEFRAME_OPTIONS = [
    {
      value: "asap",
      label: "As soon as possible"
    },

    {
      value: "within_6_months",
      label: "Within 6 months"
    },

    {
      value: "6_12_months",
      label: "6–12 months"
    },

    {
      value: "more_than_12_months",
      label: "More than 12 months"
    },

    {
      value: "researching",
      label: "Just researching"
    }
  ];


  const VERDICT_CLASS = {
    feasible: "is-feasible",
    borderline: "is-borderline",
    unlikely: "is-unlikely"
  };


  let state =
    createInitialState();

  let els = {};

  let lastAssessment = null;

  let selectedReviewFile = null;

  let reviewSubmitting = false;


  const SESSION_STORAGE_KEY =
    "yourqs_feasibility_session_id";

  const feasibilitySessionId =
    getOrCreateSessionId();


  const MAX_FILE_SIZE_BYTES =
    15 * 1024 * 1024;


  const ALLOWED_FILE_EXTENSIONS = [
    ".pdf",
    ".docx",
    ".xlsx",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
  ];


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
    if (!state.projectType) {
      return [
        "type"
      ];
    }

    return FLOWS[
      state.projectType
    ];
  }


  function init() {
    cacheElements();

    wireStaticEvents();

    renderStep();
  }


  function cacheElements() {
    els = {
      wizardShell:
        document.getElementById(
          "fp-wizard-shell"
        ),

      stepper:
        document.getElementById(
          "fp-stepper"
        ),

      stepMobileCount:
        document.getElementById(
          "fp-step-mobile-count"
        ),

      stepMobileTitle:
        document.getElementById(
          "fp-step-mobile-title"
        ),

      stepContent:
        document.getElementById(
          "fp-step-content"
        ),

      backBtn:
        document.getElementById(
          "fp-back-btn"
        ),

      continueBtn:
        document.getElementById(
          "fp-continue-btn"
        ),

      stateLoading:
        document.getElementById(
          "fp-state-loading"
        ),

      stateError:
        document.getElementById(
          "fp-state-error"
        ),

      errorMessage:
        document.getElementById(
          "fp-error-message"
        ),

      errorRetryBtn:
        document.getElementById(
          "fp-error-retry-btn"
        ),

      results:
        document.getElementById(
          "fp-results"
        )
    };
  }


  function wireStaticEvents() {
    els.continueBtn.addEventListener(
      "click",
      handleContinue
    );

    els.backBtn.addEventListener(
      "click",
      handleBack
    );

    els.errorRetryBtn.addEventListener(
      "click",
      submitAssessment
    );
  }


  function renderStep() {
    const flow =
      getActiveFlow();

    const stepId =
      flow[
        state.currentStepIndex
      ];


    const card =
      els.stepContent.closest(
        ".fp-card"
      );


    if (card) {
      card.classList.remove(
        "fp-step-fade"
      );

      void card.offsetWidth;

      card.classList.add(
        "fp-step-fade"
      );
    }


    els.stepContent.innerHTML =
      STEP_RENDERERS[
        stepId
      ]();


    wireStepInputs(
      stepId
    );


    updateStepper(
      flow,
      stepId
    );


    updateNav(
      flow,
      stepId
    );
  }


  const STEP_RENDERERS = {
    type:
      renderTypeStep,

    details:
      renderDetailsStep,

    property:
      renderPropertyStep,

    scope:
      renderScopeStep,

    budget:
      renderBudgetStep,

    review:
      renderReviewStep
  };


  function renderTypeStep() {
    return `
      <h2 class="fp-step-heading">
        What are you planning?
      </h2>

      <p class="fp-step-subheading">
        Choose the option closest to your project.
      </p>

      <div class="fp-type-grid">

        ${
          TYPE_OPTIONS
            .map(
              (
                option
              ) => `
                <button
                  type="button"
                  class="
                    fp-type-card
                    ${
                      state.projectType ===
                      option.value
                        ? "is-selected"
                        : ""
                    }
                  "
                  data-type="${
                    option.value
                  }"
                  aria-pressed="${
                    state.projectType ===
                    option.value
                  }"
                >

                  <span
                    class="fp-type-title"
                  >
                    ${
                      escapeHtml(
                        option.title
                      )
                    }
                  </span>

                  <span
                    class="fp-type-desc"
                  >
                    ${
                      escapeHtml(
                        option.desc
                      )
                    }
                  </span>

                </button>
              `
            )
            .join("")
        }

      </div>

      <p
        class="fp-field-error"
        id="fp-step-error"
        hidden
      ></p>
    `;
  }


  function wireTypeStep() {
    els.stepContent
      .querySelectorAll(
        ".fp-type-card"
      )
      .forEach(
        (
          card
        ) => {
          card.addEventListener(
            "click",
            () => {
              const newType =
                card.dataset.type;


              if (
                newType !==
                state.projectType
              ) {
                const budget =
                  state.data.budget;

                const timeframe =
                  state.data.timeframe;


                state.data = {
                  ...createInitialState()
                    .data,

                  budget,

                  timeframe
                };


                state.projectType =
                  newType;
              }


              renderStep();
            }
          );
        }
      );
  }


  function renderDetailsStep() {
    const isMultiUnit =
      state.projectType ===
      "multi_unit";


    const floorAreaLabel =
      isMultiUnit
        ? "Approximate total development floor area"
        : "Approximate floor area";


    return `
      <h2 class="fp-step-heading">
        Project details
      </h2>

      <p class="fp-step-subheading">
        Tell us a little about the size and layout.
      </p>


      <div class="fp-field">

        <label
          class="fp-field-label"
          for="fp-floor-area"
        >
          ${floorAreaLabel} (m²)
        </label>


        <input
          type="number"
          inputmode="numeric"
          class="fp-text-input"
          id="fp-floor-area"
          min="1"
          step="1"
          placeholder="e.g. 180"
          value="${
            state.data
              .floorArea ??
            ""
          }"
        />


        <p
          class="fp-field-error"
          id="fp-floor-area-error"
          hidden
        ></p>

      </div>


      <div class="fp-field-row">

        ${
          quantityFieldHtml(
            "levels",
            "How many levels?"
          )
        }

        ${
          quantityFieldHtml(
            "bathrooms",
            "How many bathrooms?"
          )
        }

      </div>


      <div class="fp-field">

        ${
          quantityFieldHtml(
            "kitchens",
            "How many kitchens?"
          )
        }

      </div>


      <p
        class="fp-field-error"
        id="fp-step-error"
        hidden
      ></p>
    `;
  }


  function wireDetailsStep() {
    const floorAreaInput =
      document.getElementById(
        "fp-floor-area"
      );


    floorAreaInput.addEventListener(
      "input",
      () => {
        state.data.floorArea =
          floorAreaInput.value ===
          ""
            ? null
            : Number(
                floorAreaInput.value
              );


        setFieldError(
          "fp-floor-area-error",
          ""
        );
      }
    );


    wireQuantityFields(
      [
        "levels",
        "bathrooms",
        "kitchens"
      ]
    );
  }


  function renderPropertyStep() {
    const isExtension =
      state.projectType ===
      "extension";


    const affectedLabel =
      isExtension
        ? "Approximate extension / affected area"
        : "Approximate area being renovated";


    const bathroomsLabel =
      isExtension
        ? "Bathrooms added or affected"
        : "Bathrooms affected";


    const kitchensLabel =
      isExtension
        ? "Kitchens added or affected"
        : "Kitchens affected";


    return `
      <h2 class="fp-step-heading">
        Property details
      </h2>

      <p class="fp-step-subheading">
        This helps us match your project against similar historical work.
      </p>


      <div class="fp-field">

        <label
          class="fp-field-label"
          for="fp-existing-area"
        >
          Existing home floor area (m²)

          <span class="fp-optional">
            (approximate, for context)
          </span>
        </label>


        <input
          type="number"
          inputmode="numeric"
          class="fp-text-input"
          id="fp-existing-area"
          min="0"
          step="1"
          placeholder="e.g. 200"
          value="${
            state.data
              .existingFloorArea ??
            ""
          }"
        />

      </div>


      <div class="fp-field">

        <label
          class="fp-field-label"
          for="fp-affected-area"
        >
          ${affectedLabel} (m²)
        </label>


        <input
          type="number"
          inputmode="numeric"
          class="fp-text-input"
          id="fp-affected-area"
          min="1"
          step="1"
          placeholder="e.g. 90"
          value="${
            state.data
              .affectedArea ??
            ""
          }"
        />


        <p
          class="fp-field-error"
          id="fp-affected-area-error"
          hidden
        ></p>

      </div>


      <div class="fp-field-row">

        ${
          quantityFieldHtml(
            "levels",
            "Levels involved"
          )
        }

        ${
          quantityFieldHtml(
            "bathrooms",
            bathroomsLabel
          )
        }

      </div>


      <div class="fp-field">

        ${
          quantityFieldHtml(
            "kitchens",
            kitchensLabel
          )
        }

      </div>


      <p
        class="fp-field-error"
        id="fp-step-error"
        hidden
      ></p>
    `;
  }


  function wirePropertyStep() {
    const existingAreaInput =
      document.getElementById(
        "fp-existing-area"
      );


    existingAreaInput.addEventListener(
      "input",
      () => {
        state.data
          .existingFloorArea =
          existingAreaInput.value ===
          ""
            ? null
            : Number(
                existingAreaInput.value
              );
      }
    );


    const affectedAreaInput =
      document.getElementById(
        "fp-affected-area"
      );


    affectedAreaInput.addEventListener(
      "input",
      () => {
        state.data.affectedArea =
          affectedAreaInput.value ===
          ""
            ? null
            : Number(
                affectedAreaInput.value
              );


        setFieldError(
          "fp-affected-area-error",
          ""
        );
      }
    );


    wireQuantityFields(
      [
        "levels",
        "bathrooms",
        "kitchens"
      ]
    );
  }


  function quantityFieldHtml(
    field,
    label
  ) {
    const value =
      state.data[field] ??
      1;


    return `
      <div class="fp-field">

        <label
          class="fp-field-label"
          id="fp-${field}-label"
        >
          ${escapeHtml(label)}
        </label>


        <div
          class="fp-stepper-control"
          data-field="${field}"
          role="group"
          aria-labelledby="fp-${field}-label"
        >

          <button
            type="button"
            class="fp-stepper-btn"
            data-step="-1"
            aria-label="Decrease"
          >
            −
          </button>


          <span
            class="fp-stepper-value"
            data-value-for="${field}"
          >
            ${value}
          </span>


          <button
            type="button"
            class="fp-stepper-btn"
            data-step="1"
            aria-label="Increase"
          >
            +
          </button>

        </div>

      </div>
    `;
  }


  function wireQuantityFields(
    fields
  ) {
    fields.forEach(
      (
        field
      ) => {
        const control =
          els.stepContent
            .querySelector(
              `.fp-stepper-control[data-field="${field}"]`
            );


        if (!control) {
          return;
        }


        control
          .querySelectorAll(
            ".fp-stepper-btn"
          )
          .forEach(
            (
              btn
            ) => {
              btn.addEventListener(
                "click",
                () => {
                  const delta =
                    Number(
                      btn.dataset
                        .step
                    );


                  const current =
                    state.data[
                      field
                    ] ??
                    1;


                  const next =
                    Math.max(
                      1,

                      Math.min(
                        20,
                        current +
                          delta
                      )
                    );


                  state.data[
                    field
                  ] =
                    next;


                  const valueEl =
                    control
                      .querySelector(
                        `[data-value-for="${field}"]`
                      );


                  if (valueEl) {
                    valueEl.textContent =
                      String(
                        next
                      );
                  }
                }
              );
            }
          );
      }
    );
  }


  function renderScopeStep() {
    const questions =
      SCOPE_QUESTIONS[
        state.projectType
      ] || [];


    return `
      <h2 class="fp-step-heading">
        Scope
      </h2>

      <p class="fp-step-subheading">
        These help match your project to similar historical work.
        If you're not certain, that's fine - choose "Not sure".
      </p>


      ${
        questions
          .map(
            (
              question
            ) => `
              <div
                class="fp-scope-question"
              >

                <p
                  class="fp-scope-label"
                  id="fp-scope-${question.field}-label"
                >
                  ${
                    escapeHtml(
                      question.label
                    )
                  }
                </p>


                <div
                  class="fp-segmented"
                  data-field="${question.field}"
                  role="group"
                  aria-labelledby="fp-scope-${question.field}-label"
                >

                  ${
                    triStateButtonHtml(
                      question.field,
                      "true",
                      "Yes"
                    )
                  }


                  ${
                    triStateButtonHtml(
                      question.field,
                      "false",
                      "No"
                    )
                  }


                  ${
                    triStateButtonHtml(
                      question.field,
                      "null",
                      "Not sure"
                    )
                  }

                </div>

              </div>
            `
          )
          .join("")
      }
    `;
  }


  function triStateButtonHtml(
    field,
    value,
    label
  ) {
    const current =
      state.data[
        field
      ];


    const isSelected =
      (
        value ===
          "true" &&
        current === true
      ) ||
      (
        value ===
          "false" &&
        current === false
      ) ||
      (
        value ===
          "null" &&
        current === null
      );


    return `
      <button
        type="button"
        class="
          fp-segmented-btn
          ${
            isSelected
              ? "is-selected"
              : ""
          }
        "
        data-field="${field}"
        data-value="${value}"
        aria-pressed="${isSelected}"
      >
        ${label}
      </button>
    `;
  }


  function wireScopeStep() {
    els.stepContent
      .querySelectorAll(
        ".fp-segmented"
      )
      .forEach(
        (
          group
        ) => {
          const field =
            group.dataset
              .field;


          group
            .querySelectorAll(
              ".fp-segmented-btn"
            )
            .forEach(
              (
                btn
              ) => {
                btn.addEventListener(
                  "click",
                  () => {
                    state.data[
                      field
                    ] =
                      parseTriStateValue(
                        btn.dataset
                          .value
                      );


                    group
                      .querySelectorAll(
                        ".fp-segmented-btn"
                      )
                      .forEach(
                        (
                          sibling
                        ) => {
                          const selected =
                            sibling ===
                            btn;


                          sibling
                            .classList
                            .toggle(
                              "is-selected",
                              selected
                            );


                          sibling
                            .setAttribute(
                              "aria-pressed",
                              String(
                                selected
                              )
                            );
                        }
                      );
                  }
                );
              }
            );
        }
      );
  }


  function parseTriStateValue(
    value
  ) {
    if (
      value ===
      "true"
    ) {
      return true;
    }


    if (
      value ===
      "false"
    ) {
      return false;
    }


    return null;
  }


  function triStateDisplay(
    value
  ) {
    if (
      value === true
    ) {
      return "Yes";
    }


    if (
      value === false
    ) {
      return "No";
    }


    return "Not sure";
  }


  function renderBudgetStep() {
    return `
      <h2 class="fp-step-heading">
        What's your approximate construction budget?
      </h2>

      <p class="fp-step-subheading">
        This helps us assess how your budget compares with similar historical projects.
      </p>

      <div class="fp-field">
        <label
          class="fp-field-label"
          for="fp-budget-input"
        >
          Budget (NZD)
        </label>

        <div class="fp-budget-input-wrap">
          <span
            class="fp-budget-prefix"
            aria-hidden="true"
          >
            $
          </span>

          <input
            type="text"
            inputmode="numeric"
            id="fp-budget-input"
            class="fp-budget-input"
            placeholder="900,000"
            value="${formatBudgetDisplay(
              state.data.budget
            )}"
          />
        </div>

        <p
          class="fp-field-error"
          id="fp-budget-error"
          hidden
        ></p>
      </div>

      <div class="fp-field">
        <label
          class="fp-field-label"
          for="fp-timeframe"
        >
          When are you hoping to start?
          <span class="fp-optional">
            (optional)
          </span>
        </label>

        <select
          id="fp-timeframe"
          class="fp-text-input"
        >
          <option value="">
            Prefer not to say
          </option>

          ${
            TIMEFRAME_OPTIONS
              .map(
                (
                  option
                ) => `
                  <option
                    value="${option.value}"
                    ${
                      state.data.timeframe ===
                      option.value
                        ? "selected"
                        : ""
                    }
                  >
                    ${
                      escapeHtml(
                        option.label
                      )
                    }
                  </option>
                `
              )
              .join("")
          }
        </select>

        <p class="fp-field-hint">
          This is for context only and does not change your estimate.
        </p>
      </div>

      <p
        class="fp-field-error"
        id="fp-step-error"
        hidden
      ></p>
    `;
  }


  function formatBudgetDisplay(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(value)
    ) {
      return "";
    }

    return Number(
      value
    ).toLocaleString(
      "en-NZ"
    );
  }


  function wireBudgetStep() {
    const budgetInput =
      document.getElementById(
        "fp-budget-input"
      );


    budgetInput.addEventListener(
      "input",
      () => {
        const digitsOnly =
          budgetInput.value.replace(
            /[^\d]/g,
            ""
          );


        state.data.budget =
          digitsOnly === ""
            ? null
            : Number(
                digitsOnly
              );


        budgetInput.value =
          digitsOnly === ""
            ? ""
            : Number(
                digitsOnly
              ).toLocaleString(
                "en-NZ"
              );


        setFieldError(
          "fp-budget-error",
          ""
        );
      }
    );


    const timeframe =
      document.getElementById(
        "fp-timeframe"
      );


    timeframe.addEventListener(
      "change",
      (
        event
      ) => {
        state.data.timeframe =
          event.target.value;
      }
    );
  }


  function renderReviewStep() {
    const typeLabel =
      TYPE_OPTIONS.find(
        (
          type
        ) =>
          type.value ===
          state.projectType
      )?.title || "";


    const flow =
      getActiveFlow();


    const sections = [];


    sections.push({
      title:
        "Project type",

      stepId:
        "type",

      lines: [
        typeLabel
      ]
    });


    if (
      flow.includes(
        "details"
      )
    ) {
      const isMultiUnit =
        state.projectType ===
        "multi_unit";


      sections.push({
        title:
          isMultiUnit
            ? "Development details"
            : "Project details",

        stepId:
          "details",

        lines: [
          Formatters.area(
            state.data.floorArea
          ),

          `${state.data.levels} level${
            state.data.levels ===
            1
              ? ""
              : "s"
          }`,

          `${state.data.bathrooms} bathroom${
            state.data.bathrooms ===
            1
              ? ""
              : "s"
          }`,

          `${state.data.kitchens} kitchen${
            state.data.kitchens ===
            1
              ? ""
              : "s"
          }`
        ]
      });
    }


    if (
      flow.includes(
        "property"
      )
    ) {
      const lines = [];


      if (
        state.data
          .existingFloorArea
      ) {
        lines.push(
          `Existing home: ${
            Formatters.area(
              state.data
                .existingFloorArea
            )
          }`
        );
      }


      lines.push(
        `Affected area: ${
          Formatters.area(
            state.data
              .affectedArea
          )
        }`
      );


      lines.push(
        `${state.data.levels} level${
          state.data.levels ===
          1
            ? ""
            : "s"
        } involved`
      );


      lines.push(
        `${state.data.bathrooms} bathroom${
          state.data.bathrooms ===
          1
            ? ""
            : "s"
        }`
      );


      lines.push(
        `${state.data.kitchens} kitchen${
          state.data.kitchens ===
          1
            ? ""
            : "s"
        }`
      );


      sections.push({
        title:
          "Property details",

        stepId:
          "property",

        lines
      });
    }


    if (
      flow.includes(
        "scope"
      )
    ) {
      const questions =
        SCOPE_QUESTIONS[
          state.projectType
        ] || [];


      sections.push({
        title:
          "Scope",

        stepId:
          "scope",

        lines:
          questions.map(
            (
              question
            ) =>
              `${
                question.label.replace(
                  /\?$/,
                  ""
                )
              }: ${
                triStateDisplay(
                  state.data[
                    question.field
                  ]
                )
              }`
          )
      });
    }


    sections.push({
      title:
        "Budget",

      stepId:
        "budget",

      lines: [
        Formatters.currency(
          state.data.budget
        ),

        state.data.timeframe
          ? `Start: ${
              TIMEFRAME_OPTIONS.find(
                (
                  option
                ) =>
                  option.value ===
                  state.data
                    .timeframe
              )?.label || ""
            }`
          : null
      ].filter(
        Boolean
      )
    });


    return `
      <h2 class="fp-step-heading">
        Review your project
      </h2>

      <p class="fp-step-subheading">
        Check the details below, then calculate your feasibility assessment.
      </p>

      ${
        sections
          .map(
            (
              section
            ) => `
              <div class="fp-review-section">

                <div
                  class="fp-review-section-header"
                >
                  <span
                    class="fp-review-section-title"
                  >
                    ${
                      escapeHtml(
                        section.title
                      )
                    }
                  </span>

                  <button
                    type="button"
                    class="fp-review-edit"
                    data-goto="${section.stepId}"
                  >
                    Edit
                  </button>
                </div>

                <ul class="fp-review-list">
                  ${
                    section.lines
                      .map(
                        (
                          line
                        ) => `
                          <li
                            class="fp-review-value"
                          >
                            ${
                              escapeHtml(
                                line
                              )
                            }
                          </li>
                        `
                      )
                      .join("")
                  }
                </ul>

              </div>
            `
          )
          .join("")
      }

      <p
        class="fp-field-error"
        id="fp-step-error"
        hidden
      ></p>
    `;
  }


  function wireReviewStep() {
    els.stepContent
      .querySelectorAll(
        "[data-goto]"
      )
      .forEach(
        (
          btn
        ) => {
          btn.addEventListener(
            "click",
            () => {
              const flow =
                getActiveFlow();


              const targetIndex =
                flow.indexOf(
                  btn.dataset
                    .goto
                );


              if (
                targetIndex >=
                0
              ) {
                state.currentStepIndex =
                  targetIndex;

                renderStep();
              }
            }
          );
        }
      );
  }


  function wireStepInputs(
    stepId
  ) {
    if (
      stepId ===
      "type"
    ) {
      wireTypeStep();
    }

    else if (
      stepId ===
      "details"
    ) {
      wireDetailsStep();
    }

    else if (
      stepId ===
      "property"
    ) {
      wirePropertyStep();
    }

    else if (
      stepId ===
      "scope"
    ) {
      wireScopeStep();
    }

    else if (
      stepId ===
      "budget"
    ) {
      wireBudgetStep();
    }

    else if (
      stepId ===
      "review"
    ) {
      wireReviewStep();
    }
  }


  function updateStepper(
    flow,
    currentStepId
  ) {
    const currentIndex =
      flow.indexOf(
        currentStepId
      );


    els.stepper.innerHTML =
      flow
        .map(
          (
            stepId,
            index
          ) => {
            const isDone =
              index <
              currentIndex;


            const isCurrent =
              index ===
              currentIndex;


            const dotContent =
              isDone
                ? "✓"
                : String(
                    index + 1
                  );


            const connector =
              index <
              flow.length - 1
                ? `
                  <span
                    class="fp-stepper-line"
                    aria-hidden="true"
                  ></span>
                `
                : "";


            return `
              <span
                class="
                  fp-stepper-item
                  ${
                    isDone
                      ? "is-done"
                      : ""
                  }
                  ${
                    isCurrent
                      ? "is-current"
                      : ""
                  }
                "
              >

                <span
                  class="fp-stepper-dot"
                  aria-hidden="true"
                >
                  ${dotContent}
                </span>

                <span
                  class="fp-stepper-label"
                >
                  ${
                    escapeHtml(
                      STEP_TITLES[
                        stepId
                      ]
                    )
                  }
                </span>

              </span>

              ${connector}
            `;
          }
        )
        .join("");


    els.stepMobileCount
      .textContent =
      `Step ${
        currentIndex + 1
      } of ${
        flow.length
      }`;


    els.stepMobileTitle
      .textContent =
      STEP_TITLES[
        currentStepId
      ];
  }


  function updateNav(
    flow,
    stepId
  ) {
    els.backBtn.hidden =
      state.currentStepIndex ===
      0;


    els.continueBtn
      .textContent =
      stepId ===
      "review"
        ? "Calculate Feasibility"
        : "Continue";
  }


  function handleContinue() {
    const flow =
      getActiveFlow();


    const stepId =
      flow[
        state.currentStepIndex
      ];


    const error =
      validateStep(
        stepId
      );


    if (
      error
    ) {
      showStepError(
        error
      );

      return;
    }


    clearStepError();


    if (
      stepId ===
      "review"
    ) {
      submitAssessment();

      return;
    }


    if (
      state.currentStepIndex <
      flow.length - 1
    ) {
      state.currentStepIndex +=
        1;


      renderStep();

      scrollWizardIntoView();
    }
  }


  function handleBack() {
    if (
      state.currentStepIndex >
      0
    ) {
      state.currentStepIndex -=
        1;


      renderStep();

      scrollWizardIntoView();
    }
  }


  function scrollWizardIntoView() {
    if (
      typeof els
        .wizardShell
        .scrollIntoView ===
      "function"
    ) {
      els.wizardShell
        .scrollIntoView({
          behavior:
            "smooth",

          block:
            "start"
        });
    }
  }


  function validateStep(
    stepId
  ) {
    if (
      stepId ===
      "type"
    ) {
      return state.projectType
        ? null
        : "Choose a project type to continue.";
    }


    if (
      stepId ===
      "details"
    ) {
      if (
        !state.data
          .floorArea ||
        state.data
          .floorArea <= 0
      ) {
        return "Enter an approximate floor area.";
      }

      return null;
    }


    if (
      stepId ===
      "property"
    ) {
      if (
        !state.data
          .affectedArea ||
        state.data
          .affectedArea <=
          0
      ) {
        return state.projectType ===
          "extension"
          ? "Enter the approximate extension or affected area."
          : "Enter the area being renovated.";
      }

      return null;
    }


    if (
      stepId ===
      "budget"
    ) {
      if (
        !state.data
          .budget ||
        state.data
          .budget <= 0
      ) {
        return "Enter your approximate construction budget.";
      }

      return null;
    }


    return null;
  }


  function showStepError(
    message
  ) {
    setFieldError(
      "fp-step-error",
      message
    );
  }


  function clearStepError() {
    setFieldError(
      "fp-step-error",
      ""
    );
  }


  function setFieldError(
    elementId,
    message
  ) {
    const element =
      document.getElementById(
        elementId
      );


    if (
      !element
    ) {
      return;
    }


    element.textContent =
      message || "";


    element.hidden =
      !message;
  }


  async function submitAssessment() {
    els.wizardShell.hidden =
      true;


    els.stateError.hidden =
      true;


    els.stateLoading.hidden =
      false;


    try {
      const payload =
        buildPayload();


      const data =
        await Api.request(
          "/api/feasibility/assess",
          {
            method:
              "POST",

            body:
              payload
          }
        );


      els.stateLoading.hidden =
        true;


      renderResults(
        data
      );
    } catch (
      err
    ) {
      els.stateLoading.hidden =
        true;


      els.stateError.hidden =
        false;


      els.errorMessage
        .textContent =
        formatApiError(
          err
        );
    }
  }


  function buildPayload() {
    const base = {
      session_id:
        feasibilitySessionId,

      project_type:
        state.projectType,

      budget:
        state.data.budget
    };


    if (
      state.projectType ===
      "new_build"
    ) {
      return {
        ...base,

        area: {
          floor_area:
            state.data.floorArea
        },

        layout: {
          levels:
            state.data.levels,

          bathrooms:
            state.data.bathrooms,

          kitchens:
            state.data.kitchens
        },

        scope: {
          retaining:
            state.data.retaining,

          demolition:
            state.data.demolition,

          recladding:
            null,

          roofing:
            null,

          pool:
            state.data.pool,

          outbuilding:
            state.data.outbuilding,

          secondary_dwelling:
            null,

          structural_complexity:
            null,

          electrical_upgrade:
            null,

          plumbing_upgrade:
            null
        }
      };
    }


    if (
      state.projectType ===
      "renovation"
    ) {
      return {
        ...base,

        area: {
          floor_area:
            state.data
              .existingFloorArea ??
            null,

          affected_area:
            state.data
              .affectedArea
        },

        layout: {
          levels:
            state.data.levels,

          bathrooms:
            state.data.bathrooms,

          kitchens:
            state.data.kitchens
        },

        scope: {
          retaining:
            null,

          demolition:
            state.data.demolition,

          recladding:
            state.data.recladding,

          roofing:
            null,

          pool:
            null,

          outbuilding:
            state.data.outbuilding,

          secondary_dwelling:
            null,

          structural_complexity:
            null,

          electrical_upgrade:
            null,

          plumbing_upgrade:
            null
        }
      };
    }


    if (
      state.projectType ===
      "extension"
    ) {
      return {
        ...base,

        area: {
          floor_area:
            state.data
              .existingFloorArea ??
            null,

          affected_area:
            state.data
              .affectedArea
        },

        layout: {
          levels:
            state.data.levels,

          bathrooms:
            state.data.bathrooms,

          kitchens:
            state.data.kitchens
        },

        scope: {
          retaining:
            state.data.retaining,

          demolition:
            state.data.demolition,

          recladding:
            null,

          roofing:
            state.data.roofing,

          pool:
            null,

          outbuilding:
            state.data.outbuilding,

          secondary_dwelling:
            null,

          structural_complexity:
            null,

          electrical_upgrade:
            null,

          plumbing_upgrade:
            null
        }
      };
    }


    return {
      ...base,

      area: {
        floor_area:
          state.data.floorArea
      },

      layout: {
        levels:
          state.data.levels,

        bathrooms:
          state.data.bathrooms,

        kitchens:
          state.data.kitchens
      },

      scope: {
        retaining:
          null,

        demolition:
          null,

        recladding:
          null,

        roofing:
          null,

        pool:
          null,

        outbuilding:
          null,

        secondary_dwelling:
          null,

        structural_complexity:
          null,

        electrical_upgrade:
          null,

        plumbing_upgrade:
          null
      }
    };
  }


  function renderResults(
    data
  ) {
    lastAssessment =
      data;


    els.results.innerHTML =
      data.status ===
      "insufficient_data"
        ? renderInsufficientReport(
            data
          )
        : renderCompletedReport(
            data
          );


    els.results.hidden =
      false;


    wireResultsEvents();


    if (
      typeof els.results
        .scrollIntoView ===
      "function"
    ) {
      els.results
        .scrollIntoView({
          behavior:
            "smooth",

          block:
            "start"
        });
    }
  }


  function renderCompletedReport(
    data
  ) {
    const estimate =
      data.estimate || {};


    const budget =
      data.budget || {};


    const evidence =
      data.evidence || {};


    const assessment =
      data.assessment || {};


    const low =
      Number(
        estimate.low
      );


    const typical =
      Number(
        estimate.typical
      );


    const high =
      Number(
        estimate.high
      );


    const typicalPerSqm =
      Number(
        estimate
          .typical_per_sqm
      );


    const budgetAmount =
      Number(
        budget.amount
      );


    const difference =
      Number(
        budget
          .difference_from_typical
      );


    const differencePercent =
      Number(
        budget
          .difference_percent
      );


    const verdictClass =
      VERDICT_CLASS[
        budget.verdict
      ] ||
      "is-borderline";


    const diffTone =
      difference >= 0
        ? "is-diff-favorable"
        : "is-diff-caution";


    const matched =
      Array.isArray(
        assessment
          .matched_scope_characteristics
      )
        ? assessment
            .matched_scope_characteristics
        : [];


    return `
      <div class="fp-report-header">

        <p class="fp-report-eyebrow">
          Your Project Feasibility
        </p>

        <span
          class="fp-verdict ${verdictClass}"
        >
          ${
            escapeHtml(
              budget.verdict_label ||
              "Assessment"
            )
          }
        </span>

        <p class="fp-report-summary">
          ${
            escapeHtml(
              assessment.summary ||
              ""
            )
          }
        </p>

        <p class="fp-report-evidence">
          Based on ${
            escapeHtml(
              Formatters.count(
                evidence
                  .comparable_count
              )
            )
          } relevant historical YourQS projects.
        </p>

        <span class="fp-report-confidence">
          ${
            escapeHtml(
              evidence
                .confidence_label ||
              ""
            )
          }
        </span>

      </div>


      <section class="fp-report-section">

        <h2 class="fp-report-section-title">
          The numbers
        </h2>


        <div class="fp-estimate-grid">

          <div>
            <div class="fp-estimate-item-label">
              Typical Estimate
            </div>

            <div class="fp-estimate-item-value">
              ${
                Formatters.currency(
                  typical
                )
              }
            </div>
          </div>


          <div>
            <div class="fp-estimate-item-label">
              Estimated Range
            </div>

            <div class="fp-estimate-item-value">
              ${
                Formatters.currency(
                  low
                )
              }
              –
              ${
                Formatters.currency(
                  high
                )
              }
            </div>
          </div>


          <div>
            <div class="fp-estimate-item-label">
              Typical Rate
            </div>

            <div class="fp-estimate-item-value">
              ${
                Formatters.currency(
                  typicalPerSqm
                )
              }

              <span class="fp-estimate-item-sub">
                / m²
              </span>
            </div>
          </div>


          <div>
            <div class="fp-estimate-item-label">
              Your Budget
            </div>

            <div class="fp-estimate-item-value">
              ${
                Formatters.currency(
                  budgetAmount
                )
              }
            </div>
          </div>


          <div>
            <div class="fp-estimate-item-label">
              Difference
            </div>

            <div
              class="
                fp-estimate-item-value
                ${diffTone}
              "
            >
              ${
                Formatters.currencySigned(
                  difference
                )
              }
            </div>

            <div class="fp-estimate-item-sub">
              ${
                Formatters.percentSigned(
                  differencePercent
                )
              }
            </div>
          </div>

        </div>


        ${
          renderRangeViz(
            low,
            typical,
            high,
            budgetAmount
          )
        }

      </section>


      ${
        matched.length > 0
          ? renderMatchedCharacteristics(
              matched
            )
          : ""
      }


      ${
        renderProjectSummarySection()
      }


      ${
        renderAssumptionsSection(
          data.assumptions
        )
      }


      ${
        renderDetailedReviewCta()
      }


      <button
        type="button"
        class="fp-restart-link"
        id="fp-restart-btn"
      >
        Start a new assessment
      </button>
    `;
  }


  function renderInsufficientReport(
    data
  ) {
    const evidence =
      data.evidence || {};


    const assessment =
      data.assessment || {};


    return `
      <div class="fp-report-header">

        <p class="fp-report-eyebrow">
          Your Project Feasibility
        </p>

        <span
          class="fp-verdict is-insufficient"
        >
          Detailed Review Recommended
        </span>

        <p class="fp-report-summary">
          ${
            escapeHtml(
              assessment.summary ||
              "There are not enough sufficiently similar historical projects to produce a reliable automated feasibility estimate."
            )
          }
        </p>

      </div>


      <section class="fp-report-section">

        <p class="fp-insufficient-note">
          Your project can still be reviewed in more detail by YourQS.
        </p>

        ${
          evidence.comparable_count !==
          undefined
            ? `
              <p class="fp-report-evidence">
                Historical projects reviewed so far:
                ${
                  escapeHtml(
                    Formatters.count(
                      evidence
                        .comparable_count
                    )
                  )
                }.
              </p>
            `
            : ""
        }

      </section>


      ${
        renderProjectSummarySection()
      }


      ${
        renderAssumptionsSection(
          data.assumptions
        )
      }


      ${
        renderDetailedReviewCta()
      }


      <button
        type="button"
        class="fp-restart-link"
        id="fp-restart-btn"
      >
        Start a new assessment
      </button>
    `;
  }


  function renderRangeViz(
    low,
    typical,
    high,
    budgetAmount
  ) {
    if (
      ![
        low,
        typical,
        high,
        budgetAmount
      ].every(
        Number.isFinite
      ) ||
      high <= low
    ) {
      return "";
    }


    const toPct =
      (
        value
      ) =>
        (
          (
            value -
            low
          ) /
          (
            high -
            low
          )
        ) *
        100;


    const typicalPct =
      clampPct(
        toPct(
          typical
        )
      );


    const rawBudgetPct =
      toPct(
        budgetAmount
      );


    const budgetPct =
      clampPct(
        rawBudgetPct
      );


    let note = "";


    if (
      rawBudgetPct <
      0
    ) {
      note =
        "Below the estimated range";
    }

    else if (
      rawBudgetPct >
      100
    ) {
      note =
        "Above the estimated range";
    }


    return `
      <div class="fp-range-viz">

        <div class="fp-range-labels">

          <div class="fp-range-label-item">
            <span class="fp-range-label-title">
              Low
            </span>

            <span class="fp-range-label-value">
              ${
                Formatters.currencyCompact(
                  low
                )
              }
            </span>
          </div>


          <div
            class="
              fp-range-label-item
              is-typical
            "
          >
            <span class="fp-range-label-title">
              Typical
            </span>

            <span class="fp-range-label-value">
              ${
                Formatters.currencyCompact(
                  typical
                )
              }
            </span>
          </div>


          <div class="fp-range-label-item">
            <span class="fp-range-label-title">
              High
            </span>

            <span class="fp-range-label-value">
              ${
                Formatters.currencyCompact(
                  high
                )
              }
            </span>
          </div>

        </div>


        <div class="fp-range-track">

          <div
            class="fp-range-fill"
          ></div>


          <div
            class="fp-range-tick"
            style="
              left:${typicalPct}%;
            "
            aria-hidden="true"
          ></div>


          <div
            class="fp-range-marker"
            style="
              left:${budgetPct}%;
            "
          >

            <span
              class="fp-range-marker-dot"
              aria-hidden="true"
            ></span>


            <span
              class="fp-range-marker-label"
            >
              Your budget

              <strong>
                ${
                  Formatters.currencyCompact(
                    budgetAmount
                  )
                }
              </strong>

              ${
                note
                  ? `
                    <span
                      class="fp-range-marker-note"
                    >
                      ${
                        escapeHtml(
                          note
                        )
                      }
                    </span>
                  `
                  : ""
              }

            </span>

          </div>

        </div>

      </div>
    `;
  }


  function clampPct(
    value
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        value
      )
    );
  }


  function renderMatchedCharacteristics(
    matched
  ) {
    return `
      <section class="fp-report-section">

        <h2 class="fp-report-section-title">
          Project characteristics considered
        </h2>

        <ul class="fp-plain-list">
          ${
            matched
              .map(
                (
                  item
                ) => `
                  <li>
                    ${
                      escapeHtml(
                        item
                      )
                    }
                  </li>
                `
              )
              .join("")
          }
        </ul>

      </section>
    `;
  }


  function renderProjectSummarySection() {
    const typeLabel =
      TYPE_OPTIONS.find(
        (
          type
        ) =>
          type.value ===
          state.projectType
      )?.title || "";


    const flow =
      FLOWS[
        state.projectType
      ] || [];


    const lines = [
      typeLabel
    ];


    if (
      flow.includes(
        "details"
      )
    ) {
      lines.push(
        Formatters.area(
          state.data.floorArea
        )
      );


      lines.push(
        `${state.data.levels} level${
          state.data.levels ===
          1
            ? ""
            : "s"
        }`
      );


      lines.push(
        `${state.data.bathrooms} bathroom${
          state.data.bathrooms ===
          1
            ? ""
            : "s"
        }`
      );


      lines.push(
        `${state.data.kitchens} kitchen${
          state.data.kitchens ===
          1
            ? ""
            : "s"
        }`
      );
    }


    if (
      flow.includes(
        "property"
      )
    ) {
      lines.push(
        `Affected area: ${
          Formatters.area(
            state.data
              .affectedArea
          )
        }`
      );


      lines.push(
        `${state.data.levels} level${
          state.data.levels ===
          1
            ? ""
            : "s"
        } involved`
      );


      lines.push(
        `${state.data.bathrooms} bathroom${
          state.data.bathrooms ===
          1
            ? ""
            : "s"
        }`
      );


      lines.push(
        `${state.data.kitchens} kitchen${
          state.data.kitchens ===
          1
            ? ""
            : "s"
        }`
      );
    }


    if (
      flow.includes(
        "scope"
      )
    ) {
      (
        SCOPE_QUESTIONS[
          state.projectType
        ] || []
      ).forEach(
        (
          question
        ) => {
          const value =
            state.data[
              question.field
            ];


          const prefix =
            value === true
              ? ""
              : value === false
                ? "No "
                : "Unsure re. ";


          lines.push(
            `${
              prefix
            }${
              question.label
                .replace(
                  /\?$/,
                  ""
                )
            }`.trim()
          );
        }
      );
    }


    lines.push(
      `Budget: ${
        Formatters.currency(
          state.data.budget
        )
      }`
    );


    return `
      <section class="fp-report-section">

        <h2 class="fp-report-section-title">
          Project summary
        </h2>

        <ul class="fp-plain-list">

          ${
            lines
              .map(
                (
                  line
                ) => `
                  <li>
                    ${
                      escapeHtml(
                        line
                      )
                    }
                  </li>
                `
              )
              .join("")
          }

        </ul>

      </section>
    `;
  }


  function renderAssumptionsSection(
    assumptions
  ) {
    const list =
      Array.isArray(
        assumptions
      )
        ? assumptions
        : [];


    if (
      list.length ===
      0
    ) {
      return "";
    }


    return `
      <section class="fp-report-section">

        <h2 class="fp-report-section-title">
          Important assumptions
        </h2>

        <ul
          class="
            fp-plain-list
            fp-assumptions-list
          "
        >

          ${
            list
              .map(
                (
                  item
                ) => `
                  <li>
                    ${
                      escapeHtml(
                        item
                      )
                    }
                  </li>
                `
              )
              .join("")
          }

        </ul>


        <p class="fp-disclaimer">
          This is an indicative feasibility estimate based on historical YourQS project data.
          It is not a formal quotation or quantity survey.
        </p>

      </section>
    `;
  }


  function renderDetailedReviewCta() {
    return `
      <section
        class="fp-cta-section"
        id="fp-cta-section"
      >
        <h2 class="fp-cta-title">
          Want a more detailed assessment?
        </h2>

        <p class="fp-cta-body">
          Every project is different. YourQS can review your plans,
          specifications and project requirements in more detail.
        </p>

        <button
          type="button"
          class="fp-btn fp-btn-primary"
          id="fp-review-cta-btn"
        >
          Request a Detailed Review
        </button>

        <div
          id="fp-review-form-slot"
        ></div>
      </section>
    `;
  }


  function wireResultsEvents() {
    const restartBtn =
      document.getElementById(
        "fp-restart-btn"
      );

    if (
      restartBtn
    ) {
      restartBtn.addEventListener(
        "click",
        restartWizard
      );
    }


    const reviewBtn =
      document.getElementById(
        "fp-review-cta-btn"
      );

    if (
      reviewBtn
    ) {
      reviewBtn.addEventListener(
        "click",
        openReviewForm
      );
    }
  }


  function openReviewForm() {
    const button =
      document.getElementById(
        "fp-review-cta-btn"
      );


    const slot =
      document.getElementById(
        "fp-review-form-slot"
      );


    if (
      !slot
    ) {
      return;
    }


    if (
      !lastAssessment ||
      !lastAssessment
        .assessment_id
    ) {
      slot.innerHTML = `
        <p class="fp-field-error">
          This assessment cannot be linked to a review request.
          Please run the feasibility assessment again.
        </p>
      `;

      return;
    }


    if (
      button
    ) {
      button.hidden =
        true;
    }


    selectedReviewFile =
      null;

    reviewSubmitting =
      false;


    slot.innerHTML =
      renderReviewFormHtml();


    wireReviewForm();


    const firstInput =
      document.getElementById(
        "fp-rf-first-name"
      );


    if (
      firstInput
    ) {
      firstInput.focus();
    }
  }


  function closeReviewForm() {
    if (
      reviewSubmitting
    ) {
      return;
    }


    const button =
      document.getElementById(
        "fp-review-cta-btn"
      );


    const slot =
      document.getElementById(
        "fp-review-form-slot"
      );


    if (
      slot
    ) {
      slot.innerHTML =
        "";
    }


    selectedReviewFile =
      null;


    if (
      button
    ) {
      button.hidden =
        false;
    }
  }


  function renderReviewFormHtml() {
    return `
      <form
        class="
          fp-review-form
          fp-step-fade
        "
        id="fp-review-form"
        novalidate
      >

        <div class="fp-field-row">

          <div class="fp-field">

            <label
              class="fp-field-label"
              for="fp-rf-first-name"
            >
              First name *
            </label>

            <input
              type="text"
              class="fp-text-input"
              id="fp-rf-first-name"
              autocomplete="given-name"
            />

            <p
              class="fp-field-error"
              id="fp-rf-first-name-error"
              hidden
            ></p>

          </div>


          <div class="fp-field">

            <label
              class="fp-field-label"
              for="fp-rf-last-name"
            >
              Last name *
            </label>

            <input
              type="text"
              class="fp-text-input"
              id="fp-rf-last-name"
              autocomplete="family-name"
            />

            <p
              class="fp-field-error"
              id="fp-rf-last-name-error"
              hidden
            ></p>

          </div>

        </div>


        <div class="fp-field-row">

          <div class="fp-field">

            <label
              class="fp-field-label"
              for="fp-rf-email"
            >
              Email *
            </label>

            <input
              type="email"
              class="fp-text-input"
              id="fp-rf-email"
              autocomplete="email"
            />

            <p
              class="fp-field-error"
              id="fp-rf-email-error"
              hidden
            ></p>

          </div>


          <div class="fp-field">

            <label
              class="fp-field-label"
              for="fp-rf-phone"
            >
              Phone

              <span
                class="fp-optional"
              >
                (optional)
              </span>
            </label>

            <input
              type="tel"
              class="fp-text-input"
              id="fp-rf-phone"
              autocomplete="tel"
            />

          </div>

        </div>


        <div class="fp-field-row">

          <div class="fp-field">

            <label
              class="fp-field-label"
              for="fp-rf-location"
            >
              Suburb / City

              <span
                class="fp-optional"
              >
                (optional)
              </span>
            </label>

            <input
              type="text"
              class="fp-text-input"
              id="fp-rf-location"
              autocomplete="address-level2"
            />

          </div>


          <div class="fp-field">

            <label
              class="fp-field-label"
              for="fp-rf-postcode"
            >
              Postcode

              <span
                class="fp-optional"
              >
                (optional)
              </span>
            </label>

            <input
              type="text"
              class="fp-text-input"
              id="fp-rf-postcode"
              autocomplete="postal-code"
            />

          </div>

        </div>


        <div class="fp-field">

          <label
            class="fp-field-label"
            for="fp-rf-description"
          >
            Project description *
          </label>

          <textarea
            class="fp-text-input"
            id="fp-rf-description"
            rows="4"
            placeholder="Tell us a bit more about your project…"
          ></textarea>

          <p
            class="fp-field-error"
            id="fp-rf-description-error"
            hidden
          ></p>

        </div>


        <div class="fp-field">

          <label
            class="fp-field-label"
            for="fp-rf-comments"
          >
            Additional comments

            <span
              class="fp-optional"
            >
              (optional)
            </span>
          </label>

          <textarea
            class="fp-text-input"
            id="fp-rf-comments"
            rows="3"
          ></textarea>

        </div>


        <div class="fp-field">

          <label
            class="fp-field-label"
            for="fp-rf-timeframe"
          >
            Planned start timeframe

            <span
              class="fp-optional"
            >
              (optional)
            </span>
          </label>


          <select
            class="fp-text-input"
            id="fp-rf-timeframe"
          >
            <option value="">
              Prefer not to say
            </option>

            ${
              TIMEFRAME_OPTIONS
                .map(
                  (
                    option
                  ) => `
                    <option
                      value="${option.value}"
                    >
                      ${
                        escapeHtml(
                          option.label
                        )
                      }
                    </option>
                  `
                )
                .join("")
            }
          </select>

        </div>


        <div class="fp-field">

          <label
            class="fp-field-label"
            for="fp-rf-file-input"
          >
            Attach a project document *

            <span
              class="fp-optional"
            >
              (PDF, DOCX, XLSX, JPG, PNG or WEBP - up to 15MB)
            </span>
          </label>


          <div class="fp-file-field">

            <label
              class="
                fp-btn
                fp-btn-ghost
                fp-file-picker
              "
              for="fp-rf-file-input"
            >
              Choose file
            </label>


            <input
              type="file"
              id="fp-rf-file-input"
              class="visually-hidden"
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp"
            />


            <span
              id="fp-rf-file-chip-slot"
            ></span>

          </div>


          <p
            class="fp-field-error"
            id="fp-rf-file-error"
            hidden
          ></p>

        </div>


        <div class="fp-checkbox-field">

          <input
            type="checkbox"
            id="fp-rf-consent"
          />

          <label
            for="fp-rf-consent"
          >
            I agree to be contacted by YourQS about this project. *
          </label>

        </div>


        <p
          class="fp-field-error"
          id="fp-rf-consent-error"
          hidden
        ></p>


        <div
          class="fp-review-submit-error"
          id="fp-rf-form-error"
          role="alert"
          hidden
        ></div>


        <div class="fp-wizard-nav">

          <button
            type="button"
            class="
              fp-btn
              fp-btn-ghost
            "
            id="fp-rf-cancel-btn"
          >
            Cancel
          </button>


          <button
            type="submit"
            class="
              fp-btn
              fp-btn-primary
            "
            id="fp-rf-submit-btn"
          >
            Submit Request
          </button>

        </div>

      </form>
    `;
  }


  function wireReviewForm() {
    const form =
      document.getElementById(
        "fp-review-form"
      );


    const fileInput =
      document.getElementById(
        "fp-rf-file-input"
      );


    const cancelBtn =
      document.getElementById(
        "fp-rf-cancel-btn"
      );


    if (
      !form ||
      !fileInput ||
      !cancelBtn
    ) {
      return;
    }


    [
      "first-name",
      "last-name",
      "email",
      "description"
    ].forEach(
      (
        field
      ) => {
        const input =
          document.getElementById(
            `fp-rf-${field}`
          );


        if (
          input
        ) {
          input.addEventListener(
            "input",
            () => {
              setFieldError(
                `fp-rf-${field}-error`,
                ""
              );
            }
          );
        }
      }
    );


    const consent =
      document.getElementById(
        "fp-rf-consent"
      );


    if (
      consent
    ) {
      consent.addEventListener(
        "change",
        () => {
          setFieldError(
            "fp-rf-consent-error",
            ""
          );
        }
      );
    }


    fileInput.addEventListener(
      "change",
      handleReviewFileChange
    );


    cancelBtn.addEventListener(
      "click",
      closeReviewForm
    );


    form.addEventListener(
      "submit",
      handleReviewSubmit
    );
  }


  function handleReviewFileChange(
    event
  ) {
    const input =
      event.currentTarget;


    const file =
      input.files &&
      input.files[0];


    setFieldError(
      "fp-rf-file-error",
      ""
    );


    if (
      !file
    ) {
      selectedReviewFile =
        null;

      renderFileChip();

      return;
    }


    const validationError =
      validateReviewFile(
        file
      );


    if (
      validationError
    ) {
      input.value =
        "";


      selectedReviewFile =
        null;


      renderFileChip();


      setFieldError(
        "fp-rf-file-error",
        validationError
      );


      return;
    }


    selectedReviewFile =
      file;


    renderFileChip();
  }


  function validateReviewFile(
    file
  ) {
    const name =
      file.name || "";


    const ext =
      name.includes(
        "."
      )
        ? `.${
            name
              .split(".")
              .pop()
              .toLowerCase()
          }`
        : "";


    if (
      !ALLOWED_FILE_EXTENSIONS
        .includes(
          ext
        )
    ) {
      return "That file type isn't supported. Please attach a PDF, DOCX, XLSX, JPG, PNG or WEBP file.";
    }


    if (
      file.size <= 0
    ) {
      return "The selected file is empty.";
    }


    if (
      file.size >
      MAX_FILE_SIZE_BYTES
    ) {
      return "That file is too large. The maximum size is 15MB.";
    }


    return null;
  }


  function renderFileChip() {
    const slot =
      document.getElementById(
        "fp-rf-file-chip-slot"
      );


    if (
      !slot
    ) {
      return;
    }


    if (
      !selectedReviewFile
    ) {
      slot.innerHTML =
        "";

      return;
    }


    slot.innerHTML = `
      <span class="fp-file-chip">

        <span
          class="fp-file-chip-name"
        >
          ${
            escapeHtml(
              selectedReviewFile
                .name
            )
          }
        </span>


        <span
          class="fp-file-chip-size"
        >
          (
            ${
              formatFileSize(
                selectedReviewFile
                  .size
              )
            }
          )
        </span>


        <button
          type="button"
          class="fp-file-chip-remove"
          id="fp-rf-file-remove"
          aria-label="Remove ${
            escapeHtml(
              selectedReviewFile
                .name
            )
          }"
        >
          ×
        </button>

      </span>
    `;


    const removeBtn =
      document.getElementById(
        "fp-rf-file-remove"
      );


    if (
      removeBtn
    ) {
      removeBtn.addEventListener(
        "click",
        () => {
          selectedReviewFile =
            null;


          const input =
            document.getElementById(
              "fp-rf-file-input"
            );


          if (
            input
          ) {
            input.value =
              "";
          }


          renderFileChip();


          setFieldError(
            "fp-rf-file-error",
            ""
          );
        }
      );
    }
  }


  function formatFileSize(
    bytes
  ) {
    if (
      bytes <
      1024
    ) {
      return `${bytes} B`;
    }


    if (
      bytes <
      1024 * 1024
    ) {
      return `${
        (
          bytes /
          1024
        ).toFixed(
          0
        )
      } KB`;
    }


    return `${
      (
        bytes /
        (
          1024 *
          1024
        )
      ).toFixed(
        1
      )
    } MB`;
  }


  function validateReviewForm() {
    const errors =
      {};


    const firstName =
      document
        .getElementById(
          "fp-rf-first-name"
        )
        ?.value
        .trim() ||
      "";


    const lastName =
      document
        .getElementById(
          "fp-rf-last-name"
        )
        ?.value
        .trim() ||
      "";


    const email =
      document
        .getElementById(
          "fp-rf-email"
        )
        ?.value
        .trim() ||
      "";


    const description =
      document
        .getElementById(
          "fp-rf-description"
        )
        ?.value
        .trim() ||
      "";


    const consent =
      document
        .getElementById(
          "fp-rf-consent"
        )
        ?.checked ||
      false;


    if (
      !firstName
    ) {
      errors[
        "fp-rf-first-name-error"
      ] =
        "Enter your first name.";
    }


    if (
      !lastName
    ) {
      errors[
        "fp-rf-last-name-error"
      ] =
        "Enter your last name.";
    }


    if (
      !email
    ) {
      errors[
        "fp-rf-email-error"
      ] =
        "Enter your email address.";
    }

    else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
          email
        )
    ) {
      errors[
        "fp-rf-email-error"
      ] =
        "Enter a valid email address.";
    }


    if (
      description.length <
      10
    ) {
      errors[
        "fp-rf-description-error"
      ] =
        "Tell us a little more about your project.";
    }


    if (
      !consent
    ) {
      errors[
        "fp-rf-consent-error"
      ] =
        "Please confirm you're happy to be contacted about this project.";
    }


    if (
      !selectedReviewFile
    ) {
      errors[
        "fp-rf-file-error"
      ] =
        "Attach a project document to continue.";
    }


    return errors;
  }


  const REVIEW_FORM_ERROR_IDS = [
    "fp-rf-first-name-error",
    "fp-rf-last-name-error",
    "fp-rf-email-error",
    "fp-rf-description-error",
    "fp-rf-consent-error",
    "fp-rf-file-error"
  ];


  function clearReviewErrors() {
    REVIEW_FORM_ERROR_IDS
      .forEach(
        (
          id
        ) => {
          setFieldError(
            id,
            ""
          );
        }
      );


    setReviewSubmitError(
      ""
    );
  }


  function setReviewSubmitError(
    message
  ) {
    const element =
      document.getElementById(
        "fp-rf-form-error"
      );


    if (
      !element
    ) {
      return;
    }


    element.textContent =
      message || "";


    element.hidden =
      !message;
  }


  async function handleReviewSubmit(
    event
  ) {
    event.preventDefault();


    if (
      reviewSubmitting
    ) {
      return;
    }


    clearReviewErrors();


    if (
      !lastAssessment ||
      !lastAssessment
        .assessment_id
    ) {
      setReviewSubmitError(
        "This assessment cannot be linked to a review request. Please run the feasibility assessment again."
      );

      return;
    }


    const errors =
      validateReviewForm();


    if (
      Object.keys(
        errors
      ).length >
      0
    ) {
      Object.entries(
        errors
      ).forEach(
        (
          [
            id,
            message
          ]
        ) => {
          setFieldError(
            id,
            message
          );
        }
      );


      const firstErrorId =
        Object.keys(
          errors
        )[0];


      const firstError =
        document.getElementById(
          firstErrorId
        );


      if (
        firstError
      ) {
        firstError
          .scrollIntoView({
            behavior:
              "smooth",

            block:
              "center"
          });
      }


      return;
    }


    const formData =
      new FormData();


    formData.append(
      "assessment_id",
      lastAssessment
        .assessment_id
    );


    formData.append(
      "first_name",
      document
        .getElementById(
          "fp-rf-first-name"
        )
        .value
        .trim()
    );


    formData.append(
      "last_name",
      document
        .getElementById(
          "fp-rf-last-name"
        )
        .value
        .trim()
    );


    formData.append(
      "email",
      document
        .getElementById(
          "fp-rf-email"
        )
        .value
        .trim()
    );


    formData.append(
      "phone",
      document
        .getElementById(
          "fp-rf-phone"
        )
        .value
        .trim()
    );


    formData.append(
      "location",
      document
        .getElementById(
          "fp-rf-location"
        )
        .value
        .trim()
    );


    formData.append(
      "postcode",
      document
        .getElementById(
          "fp-rf-postcode"
        )
        .value
        .trim()
    );


    formData.append(
      "project_description",
      document
        .getElementById(
          "fp-rf-description"
        )
        .value
        .trim()
    );


    formData.append(
      "additional_comments",
      document
        .getElementById(
          "fp-rf-comments"
        )
        .value
        .trim()
    );


    formData.append(
      "timeframe",
      document
        .getElementById(
          "fp-rf-timeframe"
        )
        .value
    );


    formData.append(
      "consent_to_contact",
      "true"
    );


    formData.append(
      "file",
      selectedReviewFile,
      selectedReviewFile
        .name
    );


    reviewSubmitting =
      true;


    const submitBtn =
      document.getElementById(
        "fp-rf-submit-btn"
      );


    const cancelBtn =
      document.getElementById(
        "fp-rf-cancel-btn"
      );


    if (
      submitBtn
    ) {
      submitBtn.disabled =
        true;

      submitBtn.textContent =
        "Submitting…";
    }


    if (
      cancelBtn
    ) {
      cancelBtn.disabled =
        true;
    }


    try {
      await Api.submitFormData(
        "/api/feasibility/review-requests",
        formData
      );


      showReviewSuccess();
    } catch (
      err
    ) {
      reviewSubmitting =
        false;


      if (
        submitBtn
      ) {
        submitBtn.disabled =
          false;

        submitBtn.textContent =
          "Submit Request";
      }


      if (
        cancelBtn
      ) {
        cancelBtn.disabled =
          false;
      }


      setReviewSubmitError(
        formatApiError(
          err
        )
      );
    }
  }


  function showReviewSuccess() {
    reviewSubmitting =
      false;


    selectedReviewFile =
      null;


    const slot =
      document.getElementById(
        "fp-review-form-slot"
      );


    if (
      !slot
    ) {
      return;
    }


    slot.innerHTML = `
      <div
        class="
          fp-review-success
          fp-step-fade
        "
        id="fp-rf-success"
        role="status"
      >

        <div class="fp-state-title">
          Request submitted
        </div>

        <p class="fp-state-body">
          Your project details and document have been sent to YourQS for review.
        </p>

      </div>
    `;
  }


  function restartWizard() {
    state =
      createInitialState();


    lastAssessment =
      null;


    selectedReviewFile =
      null;


    reviewSubmitting =
      false;


    els.results.hidden =
      true;


    els.results.innerHTML =
      "";


    els.stateError.hidden =
      true;


    els.wizardShell.hidden =
      false;


    renderStep();


    if (
      typeof els
        .wizardShell
        .scrollIntoView ===
      "function"
    ) {
      els.wizardShell
        .scrollIntoView({
          behavior:
            "smooth",

          block:
            "start"
        });
    }
  }


  function formatApiError(
    err
  ) {
    if (
      !err
    ) {
      return "Something went wrong. Please try again.";
    }


    if (
      err.detail
    ) {
      if (
        typeof err.detail ===
        "string"
      ) {
        return err.detail;
      }


      if (
        Array.isArray(
          err.detail
        ) &&
        err.detail.length >
          0
      ) {
        const first =
          err.detail[0];


        if (
          typeof first ===
          "string"
        ) {
          return first;
        }


        if (
          first &&
          typeof first.msg ===
          "string"
        ) {
          return first.msg;
        }
      }
    }


    if (
      typeof err.message ===
      "string" &&
      err.message
    ) {
      return err.message;
    }


    return "Something went wrong. Please try again.";
  }


  function getOrCreateSessionId() {
    try {
      const existing =
        sessionStorage
          .getItem(
            SESSION_STORAGE_KEY
          );


      if (
        existing
      ) {
        return existing;
      }


      const generated =
        typeof crypto !==
          "undefined" &&
        typeof crypto
          .randomUUID ===
          "function"
          ? crypto.randomUUID()
          : `${
              Date.now()
            }-${
              Math.random()
                .toString(
                  16
                )
                .slice(
                  2
                )
            }`;


      sessionStorage
        .setItem(
          SESSION_STORAGE_KEY,
          generated
        );


      return generated;
    } catch (
      _
    ) {
      return (
        typeof crypto !==
          "undefined" &&
        typeof crypto
          .randomUUID ===
          "function"
          ? crypto.randomUUID()
          : `${
              Date.now()
            }-${
              Math.random()
                .toString(
                  16
                )
                .slice(
                  2
                )
            }`
      );
    }
  }


  function escapeHtml(
    value
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }


    return String(
      value
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#39;"
      );
  }


  return {
    init
  };
})();