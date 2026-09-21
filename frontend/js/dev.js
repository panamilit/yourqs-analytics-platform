/**
 * dev.js
 *
 * YourQS Analytics Admin Panel
 *
 * Sections:
 * - Overview
 * - Feasibility
 *   - Assessment Logs
 *   - Detailed Review Requests
 * - Feedback
 * - Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  DevPage.init();
});


const DevPage = (() => {
  const MAX_MESSAGE_LENGTH = 20000;

  const CATEGORY_LABELS = {
    feature: "Feature idea",
    bug: "Bug",
    ux: "UX / Usability",
    data: "Data issue",
    future_project: "Future project creation",
    other: "Other"
  };

  const FEEDBACK_STATUS_INFO = {
    new: {
      label: "New",
      tone: "status-feedback-new"
    },

    reviewed: {
      label: "Reviewed",
      tone: "status-feedback-reviewed"
    },

    planned: {
      label: "Planned",
      tone: "status-feedback-planned"
    },

    done: {
      label: "Done",
      tone: "status-feedback-done"
    },

    rejected: {
      label: "Rejected",
      tone: "status-feedback-rejected"
    }
  };

  const REVIEW_STATUS_INFO = {
    new: {
      label: "New",
      tone: "admin-status-new"
    },

    reviewing: {
      label: "Reviewing",
      tone: "admin-status-reviewing"
    },

    contacted: {
      label: "Contacted",
      tone: "admin-status-contacted"
    },

    completed: {
      label: "Completed",
      tone: "admin-status-completed"
    },

    closed: {
      label: "Closed",
      tone: "admin-status-closed"
    }
  };

  const PROJECT_TYPE_LABELS = {
    new_build: "New Build",
    renovation: "Renovation",
    extension: "Extension",
    multi_unit: "Multi-Unit"
  };

  const VERDICT_LABELS = {
    feasible: "Feasible",
    borderline: "Borderline",
    unlikely: "Unlikely",
    none: "No verdict"
  };

  const CONFIDENCE_LABELS = {
    high: "High",
    medium: "Medium",
    low: "Low",
    insufficient: "Insufficient"
  };


  let els = {};

  let currentUser = null;

  let activeAdminTab = "overview";

  let activeFeasibilityTab = "assessments";


  let overviewLoaded = false;

  let assessmentsLoaded = false;

  let reviewsLoaded = false;

  let feedbackLoaded = false;


  let assessmentPage = 1;

  let assessmentPageSize = 25;

  let assessmentTotalPages = 0;


  let reviewPage = 1;

  let reviewPageSize = 25;

  let reviewTotalPages = 0;


  let allFeedback = [];

  let activeFeedbackFilter = "all";

  let feedbackSubmitting = false;


  async function init() {
    cacheElements();

    const sessionOk =
      await verifySession();

    if (!sessionOk) {
      return;
    }

    wireAdminTabs();

    wireFeasibilityTabs();

    wireOverviewEvents();

    wireAssessmentEvents();

    wireReviewEvents();

    wireDrawerEvents();

    wireFeedbackEvents();

    wirePlatformEvents();

    updateFeedbackCharCount();

    await loadOverview();
  }


  /* ==========================================================
     Elements
     ========================================================== */

  function cacheElements() {
    els = {
      headerAvatar:
        document.getElementById(
          "header-user-avatar"
        ),

      headerName:
        document.getElementById(
          "header-user-name"
        ),

      headerSub:
        document.getElementById(
          "header-user-sub"
        ),

      logoutBtn:
        document.getElementById(
          "logout-btn"
        ),


      adminTabs:
        Array.from(
          document.querySelectorAll(
            "[data-admin-tab]"
          )
        ),

      adminPanels:
        Array.from(
          document.querySelectorAll(
            "[data-admin-panel]"
          )
        ),


      feasibilityTabs:
        Array.from(
          document.querySelectorAll(
            "[data-feasibility-tab]"
          )
        ),

      feasibilityPanels:
        Array.from(
          document.querySelectorAll(
            "[data-feasibility-panel]"
          )
        ),


      overviewLoading:
        document.getElementById(
          "admin-overview-loading"
        ),

      overviewError:
        document.getElementById(
          "admin-overview-error"
        ),

      overviewErrorMessage:
        document.getElementById(
          "admin-overview-error-message"
        ),

      overviewContent:
        document.getElementById(
          "admin-overview-content"
        ),

      overviewRefreshBtn:
        document.getElementById(
          "admin-overview-refresh-btn"
        ),

      overviewRetryBtn:
        document.getElementById(
          "admin-overview-retry-btn"
        ),


      kpiTotalAssessments:
        document.getElementById(
          "admin-kpi-total-assessments"
        ),

      kpiUniqueSessions:
        document.getElementById(
          "admin-kpi-unique-sessions"
        ),

      kpiReviewRequests:
        document.getElementById(
          "admin-kpi-review-requests"
        ),

      kpiConversion:
        document.getElementById(
          "admin-kpi-conversion"
        ),

      kpiToday:
        document.getElementById(
          "admin-kpi-today"
        ),

      kpiSevenDays:
        document.getElementById(
          "admin-kpi-seven-days"
        ),

      kpiThirtyDays:
        document.getElementById(
          "admin-kpi-thirty-days"
        ),

      kpiNewReviews:
        document.getElementById(
          "admin-kpi-new-reviews"
        ),

      statCompleted:
        document.getElementById(
          "admin-stat-completed"
        ),

      statInsufficient:
        document.getElementById(
          "admin-stat-insufficient"
        ),

      statConfidence:
        document.getElementById(
          "admin-stat-confidence"
        ),

      projectTypeDistribution:
        document.getElementById(
          "admin-project-type-distribution"
        ),

      verdictDistribution:
        document.getElementById(
          "admin-verdict-distribution"
        ),

      confidenceDistribution:
        document.getElementById(
          "admin-confidence-distribution"
        ),

      reviewNewCount:
        document.getElementById(
          "admin-review-new-count"
        ),


      assessmentFilterType:
        document.getElementById(
          "assessment-filter-type"
        ),

      assessmentFilterStatus:
        document.getElementById(
          "assessment-filter-status"
        ),

      assessmentFilterVerdict:
        document.getElementById(
          "assessment-filter-verdict"
        ),

      assessmentFilterConfidence:
        document.getElementById(
          "assessment-filter-confidence"
        ),

      assessmentClearFiltersBtn:
        document.getElementById(
          "assessment-clear-filters-btn"
        ),

      assessmentRefreshBtn:
        document.getElementById(
          "assessment-refresh-btn"
        ),

      assessmentLoading:
        document.getElementById(
          "assessment-list-loading"
        ),

      assessmentError:
        document.getElementById(
          "assessment-list-error"
        ),

      assessmentErrorMessage:
        document.getElementById(
          "assessment-list-error-message"
        ),

      assessmentRetryBtn:
        document.getElementById(
          "assessment-list-retry-btn"
        ),

      assessmentEmpty:
        document.getElementById(
          "assessment-list-empty"
        ),

      assessmentTableRegion:
        document.getElementById(
          "assessment-table-region"
        ),

      assessmentTableBody:
        document.getElementById(
          "assessment-table-body"
        ),

      assessmentPaginationSummary:
        document.getElementById(
          "assessment-pagination-summary"
        ),

      assessmentPageSize:
        document.getElementById(
          "assessment-page-size"
        ),

      assessmentPageIndicator:
        document.getElementById(
          "assessment-page-indicator"
        ),

      assessmentPrevBtn:
        document.getElementById(
          "assessment-prev-btn"
        ),

      assessmentNextBtn:
        document.getElementById(
          "assessment-next-btn"
        ),


      reviewSearch:
        document.getElementById(
          "review-filter-search"
        ),

      reviewFilterStatus:
        document.getElementById(
          "review-filter-status"
        ),

      reviewFilterType:
        document.getElementById(
          "review-filter-type"
        ),

      reviewClearFiltersBtn:
        document.getElementById(
          "review-clear-filters-btn"
        ),

      reviewRefreshBtn:
        document.getElementById(
          "review-refresh-btn"
        ),

      reviewLoading:
        document.getElementById(
          "review-list-loading"
        ),

      reviewError:
        document.getElementById(
          "review-list-error"
        ),

      reviewErrorMessage:
        document.getElementById(
          "review-list-error-message"
        ),

      reviewRetryBtn:
        document.getElementById(
          "review-list-retry-btn"
        ),

      reviewEmpty:
        document.getElementById(
          "review-list-empty"
        ),

      reviewTableRegion:
        document.getElementById(
          "review-table-region"
        ),

      reviewTableBody:
        document.getElementById(
          "review-table-body"
        ),

      reviewPaginationSummary:
        document.getElementById(
          "review-pagination-summary"
        ),

      reviewPageSize:
        document.getElementById(
          "review-page-size"
        ),

      reviewPageIndicator:
        document.getElementById(
          "review-page-indicator"
        ),

      reviewPrevBtn:
        document.getElementById(
          "review-prev-btn"
        ),

      reviewNextBtn:
        document.getElementById(
          "review-next-btn"
        ),


      drawerBackdrop:
        document.getElementById(
          "admin-drawer-backdrop"
        ),

      drawer:
        document.getElementById(
          "admin-detail-drawer"
        ),

      drawerEyebrow:
        document.getElementById(
          "admin-drawer-eyebrow"
        ),

      drawerTitle:
        document.getElementById(
          "admin-drawer-title"
        ),

      drawerBody:
        document.getElementById(
          "admin-drawer-body"
        ),

      drawerCloseBtn:
        document.getElementById(
          "admin-drawer-close-btn"
        ),


      feedbackFormPanel:
        document.getElementById(
          "feedback-form-panel"
        ),

      feedbackForm:
        document.getElementById(
          "feedback-form"
        ),

      feedbackAlert:
        document.getElementById(
          "feedback-alert"
        ),

      feedbackCategory:
        document.getElementById(
          "feedback-category"
        ),

      feedbackCategoryError:
        document.getElementById(
          "feedback-category-error"
        ),

      feedbackFeature:
        document.getElementById(
          "feedback-feature"
        ),

      feedbackMessage:
        document.getElementById(
          "feedback-message"
        ),

      feedbackMessageError:
        document.getElementById(
          "feedback-message-error"
        ),

      feedbackCharCount:
        document.getElementById(
          "feedback-char-count"
        ),

      feedbackSubmitBtn:
        document.getElementById(
          "feedback-submit-btn"
        ),

      feedbackListLoading:
        document.getElementById(
          "feedback-list-loading"
        ),

      feedbackListError:
        document.getElementById(
          "feedback-list-error"
        ),

      feedbackListErrorMessage:
        document.getElementById(
          "feedback-list-error-message"
        ),

      feedbackListRetryBtn:
        document.getElementById(
          "feedback-list-retry-btn"
        ),

      feedbackListEmpty:
        document.getElementById(
          "feedback-list-empty"
        ),

      feedbackEmptyTitle:
        document.getElementById(
          "feedback-empty-title"
        ),

      feedbackEmptyMessage:
        document.getElementById(
          "feedback-empty-message"
        ),

      feedbackList:
        document.getElementById(
          "feedback-list"
        ),

      feedbackFilterTabs:
        Array.from(
          document.querySelectorAll(
            "[data-feedback-filter]"
          )
        ),

      suggestRequirementsBtn:
        document.getElementById(
          "suggest-requirements-btn"
        )
    };
  }


  /* ==========================================================
     Authentication
     ========================================================== */

  async function verifySession() {
    if (!Auth.requireAuth()) {
      return false;
    }

    try {
      currentUser =
        await Auth.getCurrentUser();

      renderUser(
        currentUser
      );

      return true;

    } catch (err) {
      Auth.logout();

      window.location.href =
        "auth.html?returnTo=dev.html";

      return false;
    }
  }


  function renderUser(user) {
    const name =
      user?.name ||
      "Signed in";

    if (els.headerAvatar) {
      els.headerAvatar.textContent =
        getInitials(
          name
        );
    }

    if (els.headerName) {
      els.headerName.textContent =
        name;
    }

    if (els.headerSub) {
      els.headerSub.textContent =
        user?.company ||
        "Signed in";
    }
  }


  function getInitials(name) {
    if (!name) {
      return "?";
    }

    const parts =
      String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
      return "?";
    }

    const first =
      parts[0][0] || "";

    const last =
      parts.length > 1
        ? parts[
            parts.length - 1
          ][0]
        : "";

    return (
      first + last
    ).toUpperCase();
  }


  /* ==========================================================
     Main admin tabs
     ========================================================== */

  function wireAdminTabs() {
    els.adminTabs.forEach(
      (button) => {
        button.addEventListener(
          "click",
          async () => {
            await setAdminTab(
              button.dataset.adminTab
            );
          }
        );
      }
    );

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener(
        "click",
        handleLogout
      );
    }
  }


  async function setAdminTab(tab) {
    activeAdminTab =
      tab;

    els.adminTabs.forEach(
      (button) => {
        const selected =
          button.dataset.adminTab ===
          tab;

        button.classList.toggle(
          "is-active",
          selected
        );

        button.setAttribute(
          "aria-selected",
          String(selected)
        );
      }
    );

    els.adminPanels.forEach(
      (panel) => {
        panel.hidden =
          panel.dataset.adminPanel !==
          tab;
      }
    );

    if (
      tab === "overview" &&
      !overviewLoaded
    ) {
      await loadOverview();
    }

    if (
      tab === "feasibility"
    ) {
      if (
        activeFeasibilityTab ===
          "assessments" &&
        !assessmentsLoaded
      ) {
        await loadAssessments();
      }

      if (
        activeFeasibilityTab ===
          "reviews" &&
        !reviewsLoaded
      ) {
        await loadReviews();
      }
    }

    if (
      tab === "feedback" &&
      !feedbackLoaded
    ) {
      await loadFeedback();
    }
  }


  /* ==========================================================
     Feasibility sub-tabs
     ========================================================== */

  function wireFeasibilityTabs() {
    els.feasibilityTabs.forEach(
      (button) => {
        button.addEventListener(
          "click",
          async () => {
            const tab =
              button.dataset
                .feasibilityTab;

            await setFeasibilityTab(
              tab
            );
          }
        );
      }
    );
  }


  async function setFeasibilityTab(
    tab
  ) {
    activeFeasibilityTab =
      tab;

    els.feasibilityTabs.forEach(
      (button) => {
        const selected =
          button.dataset
            .feasibilityTab ===
          tab;

        button.classList.toggle(
          "is-active",
          selected
        );

        button.setAttribute(
          "aria-selected",
          String(selected)
        );
      }
    );

    els.feasibilityPanels.forEach(
      (panel) => {
        panel.hidden =
          panel.dataset
            .feasibilityPanel !==
          tab;
      }
    );

    if (
      tab === "assessments" &&
      !assessmentsLoaded
    ) {
      await loadAssessments();
    }

    if (
      tab === "reviews" &&
      !reviewsLoaded
    ) {
      await loadReviews();
    }
  }


  /* ==========================================================
     Overview
     ========================================================== */

  function wireOverviewEvents() {
    els.overviewRefreshBtn
      ?.addEventListener(
        "click",
        loadOverview
      );

    els.overviewRetryBtn
      ?.addEventListener(
        "click",
        loadOverview
      );
  }


  async function loadOverview() {
    showOverviewState(
      "loading"
    );

    try {
      const data =
        await Api.getFeasibilityAdminOverview();

      renderOverview(
        data
      );

      overviewLoaded =
        true;

      showOverviewState(
        "ready"
      );

    } catch (err) {
      showOverviewState(
        "error",
        formatError(err)
      );
    }
  }


  function renderOverview(data) {
    setText(
      els.kpiTotalAssessments,
      formatCount(
        data.total_assessments
      )
    );

    setText(
      els.kpiUniqueSessions,
      formatCount(
        data.unique_sessions
      )
    );

    setText(
      els.kpiReviewRequests,
      formatCount(
        data.detailed_review_requests
      )
    );

    setText(
      els.kpiConversion,
      data.review_conversion_percent ===
        null ||
      data.review_conversion_percent ===
        undefined
        ? "–"
        : `${formatNumber(
            data.review_conversion_percent,
            1
          )}%`
    );

    setText(
      els.kpiToday,
      formatCount(
        data.assessments_today
      )
    );

    setText(
      els.kpiSevenDays,
      formatCount(
        data.assessments_last_7_days
      )
    );

    setText(
      els.kpiThirtyDays,
      formatCount(
        data.assessments_last_30_days
      )
    );

    setText(
      els.kpiNewReviews,
      formatCount(
        data.new_review_requests
      )
    );

    setText(
      els.statCompleted,
      formatCount(
        data.completed_assessments
      )
    );

    setText(
      els.statInsufficient,
      formatCount(
        data.insufficient_data_assessments
      )
    );

    setText(
      els.statConfidence,
      data.average_confidence_score ===
        null ||
      data.average_confidence_score ===
        undefined
        ? "–"
        : formatNumber(
            data.average_confidence_score,
            1
          )
    );


    renderDistribution(
      els.projectTypeDistribution,
      data.project_type_distribution,
      PROJECT_TYPE_LABELS
    );

    renderDistribution(
      els.verdictDistribution,
      data.verdict_distribution,
      VERDICT_LABELS
    );

    renderDistribution(
      els.confidenceDistribution,
      data.confidence_distribution,
      CONFIDENCE_LABELS
    );


    updateNewReviewBadge(
      data.new_review_requests
    );
  }


  function renderDistribution(
    container,
    distribution,
    labels
  ) {
    if (!container) {
      return;
    }

    const entries =
      Object.entries(
        distribution || {}
      );

    if (!entries.length) {
      container.innerHTML = `
        <p class="admin-empty-inline">
          No data yet.
        </p>
      `;

      return;
    }

    const total =
      entries.reduce(
        (sum, [, value]) =>
          sum + Number(value || 0),
        0
      );

    container.innerHTML =
      entries
        .sort(
          (a, b) =>
            Number(b[1]) -
            Number(a[1])
        )
        .map(
          ([key, value]) => {
            const count =
              Number(value || 0);

            const percent =
              total > 0
                ? (
                    count /
                    total
                  ) * 100
                : 0;

            return `
              <div class="admin-distribution-row">

                <div class="admin-distribution-header">
                  <span>
                    ${
                      escapeHtml(
                        labels[key] ||
                        prettifyKey(key)
                      )
                    }
                  </span>

                  <strong>
                    ${formatCount(count)}
                  </strong>
                </div>

                <div class="admin-distribution-track">
                  <span
                    class="admin-distribution-fill"
                    style="width:${Math.max(
                      0,
                      Math.min(
                        100,
                        percent
                      )
                    )}%"
                  ></span>
                </div>

              </div>
            `;
          }
        )
        .join("");
  }


  function showOverviewState(
    state,
    message = ""
  ) {
    if (els.overviewLoading) {
      els.overviewLoading.hidden =
        state !== "loading";
    }

    if (els.overviewError) {
      els.overviewError.hidden =
        state !== "error";
    }

    if (els.overviewContent) {
      els.overviewContent.hidden =
        state !== "ready";
    }

    if (
      state === "error" &&
      els.overviewErrorMessage
    ) {
      els.overviewErrorMessage
        .textContent =
        message;
    }
  }


  function updateNewReviewBadge(
    count
  ) {
    if (!els.reviewNewCount) {
      return;
    }

    const value =
      Number(count || 0);

    els.reviewNewCount.textContent =
      String(value);

    els.reviewNewCount.hidden =
      value <= 0;
  }


  /* ==========================================================
     Assessment Logs
     ========================================================== */

  function wireAssessmentEvents() {
    [
      els.assessmentFilterType,
      els.assessmentFilterStatus,
      els.assessmentFilterVerdict,
      els.assessmentFilterConfidence
    ].forEach(
      (control) => {
        control?.addEventListener(
          "change",
          () => {
            assessmentPage =
              1;

            loadAssessments();
          }
        );
      }
    );


    els.assessmentClearFiltersBtn
      ?.addEventListener(
        "click",
        () => {
          els.assessmentFilterType.value =
            "";

          els.assessmentFilterStatus.value =
            "";

          els.assessmentFilterVerdict.value =
            "";

          els.assessmentFilterConfidence.value =
            "";

          assessmentPage =
            1;

          loadAssessments();
        }
      );


    els.assessmentRefreshBtn
      ?.addEventListener(
        "click",
        loadAssessments
      );


    els.assessmentRetryBtn
      ?.addEventListener(
        "click",
        loadAssessments
      );


    els.assessmentPageSize
      ?.addEventListener(
        "change",
        () => {
          assessmentPageSize =
            Number(
              els.assessmentPageSize.value
            ) || 25;

          assessmentPage =
            1;

          loadAssessments();
        }
      );


    els.assessmentPrevBtn
      ?.addEventListener(
        "click",
        () => {
          if (
            assessmentPage >
            1
          ) {
            assessmentPage -=
              1;

            loadAssessments();
          }
        }
      );


    els.assessmentNextBtn
      ?.addEventListener(
        "click",
        () => {
          if (
            assessmentPage <
            assessmentTotalPages
          ) {
            assessmentPage +=
              1;

            loadAssessments();
          }
        }
      );


    els.assessmentTableBody
      ?.addEventListener(
        "click",
        (event) => {
          const button =
            event.target.closest(
              "[data-assessment-id]"
            );

          if (!button) {
            return;
          }

          openAssessmentDetail(
            button.dataset
              .assessmentId
          );
        }
      );
  }


  async function loadAssessments() {
    showAssessmentState(
      "loading"
    );

    try {
      const data =
        await Api.getFeasibilityAdminAssessments({
          project_type:
            els.assessmentFilterType
              ?.value || "",

          assessment_status:
            els.assessmentFilterStatus
              ?.value || "",

          verdict:
            els.assessmentFilterVerdict
              ?.value || "",

          confidence:
            els.assessmentFilterConfidence
              ?.value || "",

          page:
            assessmentPage,

          page_size:
            assessmentPageSize
        });


      assessmentTotalPages =
        Number(
          data.total_pages || 0
        );


      if (
        assessmentTotalPages > 0 &&
        assessmentPage >
          assessmentTotalPages
      ) {
        assessmentPage =
          assessmentTotalPages;

        return loadAssessments();
      }


      renderAssessmentRows(
        data.items || []
      );


      renderAssessmentPagination(
        data
      );


      assessmentsLoaded =
        true;


      showAssessmentState(
        (data.items || []).length
          ? "ready"
          : "empty"
      );

    } catch (err) {
      showAssessmentState(
        "error",
        formatError(err)
      );
    }
  }


  function renderAssessmentRows(
    items
  ) {
    if (!els.assessmentTableBody) {
      return;
    }

    els.assessmentTableBody.innerHTML =
      items
        .map(
          (item) => {
            const area =
              item.affected_area ??
              item.floor_area;

            const verdict =
              item.verdict
                ? `
                  <span class="status-badge admin-verdict-${escapeAttribute(
                    item.verdict
                  )}">
                    ${
                      escapeHtml(
                        VERDICT_LABELS[
                          item.verdict
                        ] ||
                        prettifyKey(
                          item.verdict
                        )
                      )
                    }
                  </span>
                `
                : "–";

            const confidence =
              item.confidence
                ? `
                  <span class="status-badge admin-confidence-${escapeAttribute(
                    item.confidence
                  )}">
                    ${
                      escapeHtml(
                        CONFIDENCE_LABELS[
                          item.confidence
                        ] ||
                        prettifyKey(
                          item.confidence
                        )
                      )
                    }
                  </span>
                `
                : "–";

            return `
              <tr>

                <td>
                  ${formatDateTime(
                    item.created_at
                  )}
                </td>

                <td>
                  ${
                    escapeHtml(
                      PROJECT_TYPE_LABELS[
                        item.project_type
                      ] ||
                      prettifyKey(
                        item.project_type
                      )
                    )
                  }
                </td>

                <td class="col-numeric">
                  ${
                    area === null ||
                    area === undefined
                      ? "–"
                      : `${formatNumber(
                          area,
                          0
                        )} m²`
                  }
                </td>

                <td class="col-numeric">
                  ${formatCurrency(
                    item.budget
                  )}
                </td>

                <td class="col-numeric">
                  ${formatCurrency(
                    item.estimate_typical
                  )}
                </td>

                <td>
                  ${verdict}
                </td>

                <td>
                  ${confidence}
                </td>

                <td class="col-numeric">
                  ${formatCount(
                    item.comparable_count
                  )}
                </td>

                <td>
                  ${
                    item.has_review_request
                      ? `
                        <span class="status-badge admin-review-linked">
                          Requested
                        </span>
                      `
                      : "–"
                  }
                </td>

                <td>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-assessment-id="${escapeAttribute(
                      item.id
                    )}"
                  >
                    View
                  </button>
                </td>

              </tr>
            `;
          }
        )
        .join("");
  }


  function renderAssessmentPagination(
    data
  ) {
    const totalItems =
      Number(
        data.total_items || 0
      );

    const page =
      Number(
        data.page || 1
      );

    const pageSize =
      Number(
        data.page_size ||
        assessmentPageSize
      );

    const totalPages =
      Number(
        data.total_pages || 0
      );


    const start =
      totalItems === 0
        ? 0
        : (
            page - 1
          ) *
            pageSize +
          1;

    const end =
      Math.min(
        page * pageSize,
        totalItems
      );


    setText(
      els.assessmentPaginationSummary,
      totalItems
        ? `${start}–${end} of ${formatCount(
            totalItems
          )}`
        : "0 results"
    );


    setText(
      els.assessmentPageIndicator,
      totalPages
        ? `Page ${page} of ${totalPages}`
        : "Page 0 of 0"
    );


    if (els.assessmentPrevBtn) {
      els.assessmentPrevBtn.disabled =
        page <= 1;
    }


    if (els.assessmentNextBtn) {
      els.assessmentNextBtn.disabled =
        totalPages === 0 ||
        page >= totalPages;
    }
  }


  function showAssessmentState(
    state,
    message = ""
  ) {
    if (els.assessmentLoading) {
      els.assessmentLoading.hidden =
        state !== "loading";
    }

    if (els.assessmentError) {
      els.assessmentError.hidden =
        state !== "error";
    }

    if (els.assessmentEmpty) {
      els.assessmentEmpty.hidden =
        state !== "empty";
    }

    if (els.assessmentTableRegion) {
      els.assessmentTableRegion.hidden =
        state !== "ready";
    }

    if (
      state === "error" &&
      els.assessmentErrorMessage
    ) {
      els.assessmentErrorMessage
        .textContent =
        message;
    }
  }


  async function openAssessmentDetail(
    assessmentId
  ) {
    openDrawer({
      eyebrow:
        "Feasibility Assessment",

      title:
        "Assessment Details",

      body:
        renderDrawerLoading(
          "Loading assessment…"
        )
    });

    try {
      const data =
        await Api.getFeasibilityAdminAssessment(
          assessmentId
        );

      els.drawerBody.innerHTML =
        renderAssessmentDetail(
          data
        );

      const reviewButton =
        els.drawerBody.querySelector(
          "[data-open-review-id]"
        );

      reviewButton
        ?.addEventListener(
          "click",
          () => {
            openReviewDetail(
              reviewButton.dataset
                .openReviewId
            );
          }
        );

    } catch (err) {
      els.drawerBody.innerHTML =
        renderDrawerError(
          formatError(err)
        );
    }
  }


  function renderAssessmentDetail(
    item
  ) {
    const area =
      item.affected_area ??
      item.floor_area;

    return `
      <div class="admin-detail-stack">

        <section class="admin-detail-section">

          <h3>
            Assessment
          </h3>

          <div class="admin-detail-grid">

            ${detailItem(
              "Assessment ID",
              item.id
            )}

            ${detailItem(
              "Created",
              formatDateTime(
                item.created_at
              )
            )}

            ${detailItem(
              "Session",
              item.session_id
            )}

            ${detailItem(
              "Project type",
              PROJECT_TYPE_LABELS[
                item.project_type
              ] ||
                prettifyKey(
                  item.project_type
                )
            )}

            ${detailItem(
              "Area",
              area === null ||
              area === undefined
                ? "–"
                : `${formatNumber(
                    area,
                    0
                  )} m²`
            )}

            ${detailItem(
              "Levels",
              item.levels
            )}

            ${detailItem(
              "Bathrooms",
              item.bathrooms
            )}

            ${detailItem(
              "Kitchens",
              item.kitchens
            )}

          </div>

        </section>


        <section class="admin-detail-section">

          <h3>
            Financial Result
          </h3>

          <div class="admin-detail-grid">

            ${detailItem(
              "Budget",
              formatCurrency(
                item.budget
              )
            )}

            ${detailItem(
              "Estimate low",
              formatCurrency(
                item.estimate_low
              )
            )}

            ${detailItem(
              "Typical",
              formatCurrency(
                item.estimate_typical
              )
            )}

            ${detailItem(
              "Estimate high",
              formatCurrency(
                item.estimate_high
              )
            )}

            ${detailItem(
              "Typical / m²",
              formatCurrency(
                item.typical_per_sqm
              )
            )}

            ${detailItem(
              "Verdict",
              item.verdict
                ? (
                    VERDICT_LABELS[
                      item.verdict
                    ] ||
                    prettifyKey(
                      item.verdict
                    )
                  )
                : "–"
            )}

          </div>

        </section>


        <section class="admin-detail-section">

          <h3>
            Evidence
          </h3>

          <div class="admin-detail-grid">

            ${detailItem(
              "Status",
              prettifyKey(
                item.assessment_status
              )
            )}

            ${detailItem(
              "Confidence",
              CONFIDENCE_LABELS[
                item.confidence
              ] ||
                prettifyKey(
                  item.confidence
                )
            )}

            ${detailItem(
              "Confidence score",
              item.confidence_score
            )}

            ${detailItem(
              "Comparables",
              item.comparable_count
            )}

            ${detailItem(
              "Average similarity",
              item.average_similarity ===
                null ||
              item.average_similarity ===
                undefined
                ? "–"
                : formatNumber(
                    item.average_similarity,
                    3
                  )
            )}

          </div>

        </section>


        ${
          item.review_request_id
            ? `
              <section class="admin-detail-section">

                <h3>
                  Detailed Review
                </h3>

                <button
                  type="button"
                  class="btn btn-primary"
                  data-open-review-id="${escapeAttribute(
                    item.review_request_id
                  )}"
                >
                  Open linked review request
                </button>

              </section>
            `
            : ""
        }


        ${jsonSection(
          "Scope",
          item.scope_json
        )}

        ${jsonSection(
          "Original Request",
          item.request_json
        )}

        ${jsonSection(
          "Response Snapshot",
          item.response_json
        )}

      </div>
    `;
  }


  /* ==========================================================
     Detailed Review Requests
     ========================================================== */

  function wireReviewEvents() {
    let searchTimer = null;

    els.reviewSearch
      ?.addEventListener(
        "input",
        () => {
          clearTimeout(
            searchTimer
          );

          searchTimer =
            setTimeout(
              () => {
                reviewPage =
                  1;

                loadReviews();
              },
              350
            );
        }
      );


    [
      els.reviewFilterStatus,
      els.reviewFilterType
    ].forEach(
      (control) => {
        control?.addEventListener(
          "change",
          () => {
            reviewPage =
              1;

            loadReviews();
          }
        );
      }
    );


    els.reviewClearFiltersBtn
      ?.addEventListener(
        "click",
        () => {
          els.reviewSearch.value =
            "";

          els.reviewFilterStatus.value =
            "";

          els.reviewFilterType.value =
            "";

          reviewPage =
            1;

          loadReviews();
        }
      );


    els.reviewRefreshBtn
      ?.addEventListener(
        "click",
        loadReviews
      );


    els.reviewRetryBtn
      ?.addEventListener(
        "click",
        loadReviews
      );


    els.reviewPageSize
      ?.addEventListener(
        "change",
        () => {
          reviewPageSize =
            Number(
              els.reviewPageSize.value
            ) || 25;

          reviewPage =
            1;

          loadReviews();
        }
      );


    els.reviewPrevBtn
      ?.addEventListener(
        "click",
        () => {
          if (
            reviewPage >
            1
          ) {
            reviewPage -=
              1;

            loadReviews();
          }
        }
      );


    els.reviewNextBtn
      ?.addEventListener(
        "click",
        () => {
          if (
            reviewPage <
            reviewTotalPages
          ) {
            reviewPage +=
              1;

            loadReviews();
          }
        }
      );


    els.reviewTableBody
      ?.addEventListener(
        "click",
        (event) => {
          const button =
            event.target.closest(
              "[data-review-id]"
            );

          if (!button) {
            return;
          }

          openReviewDetail(
            button.dataset
              .reviewId
          );
        }
      );
  }


  async function loadReviews() {
    showReviewState(
      "loading"
    );

    try {
      const data =
        await Api.getFeasibilityAdminReviewRequests({
          search:
            els.reviewSearch
              ?.value
              .trim() || "",

          status:
            els.reviewFilterStatus
              ?.value || "",

          project_type:
            els.reviewFilterType
              ?.value || "",

          page:
            reviewPage,

          page_size:
            reviewPageSize
        });


      reviewTotalPages =
        Number(
          data.total_pages || 0
        );


      if (
        reviewTotalPages > 0 &&
        reviewPage >
          reviewTotalPages
      ) {
        reviewPage =
          reviewTotalPages;

        return loadReviews();
      }


      renderReviewRows(
        data.items || []
      );


      renderReviewPagination(
        data
      );


      reviewsLoaded =
        true;


      showReviewState(
        (data.items || []).length
          ? "ready"
          : "empty"
      );

    } catch (err) {
      showReviewState(
        "error",
        formatError(err)
      );
    }
  }


  function renderReviewRows(
    items
  ) {
    if (!els.reviewTableBody) {
      return;
    }

    els.reviewTableBody.innerHTML =
      items
        .map(
          (item) => {
            const status =
              REVIEW_STATUS_INFO[
                item.status
              ] || {
                label:
                  prettifyKey(
                    item.status
                  ),

                tone:
                  "admin-status-closed"
              };

            return `
              <tr>

                <td>
                  ${formatDateTime(
                    item.created_at
                  )}
                </td>

                <td>
                  <div class="admin-customer-name">
                    ${
                      escapeHtml(
                        `${item.first_name} ${item.last_name}`
                      )
                    }
                  </div>
                </td>

                <td>
                  <div>
                    ${escapeHtml(
                      item.email
                    )}
                  </div>

                  ${
                    item.phone
                      ? `
                        <div class="admin-table-sub">
                          ${escapeHtml(
                            item.phone
                          )}
                        </div>
                      `
                      : ""
                  }
                </td>

                <td>
                  ${
                    escapeHtml(
                      item.location ||
                      "–"
                    )
                  }
                </td>

                <td>
                  ${
                    escapeHtml(
                      PROJECT_TYPE_LABELS[
                        item.project_type
                      ] ||
                      prettifyKey(
                        item.project_type
                      )
                    )
                  }
                </td>

                <td class="col-numeric">
                  ${formatCurrency(
                    item.budget
                  )}
                </td>

                <td>
                  <span
                    class="status-badge ${status.tone}"
                  >
                    ${escapeHtml(
                      status.label
                    )}
                  </span>
                </td>

                <td class="col-numeric">
                  ${formatCount(
                    item.file_count
                  )}
                </td>

                <td>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-review-id="${escapeAttribute(
                      item.id
                    )}"
                  >
                    View
                  </button>
                </td>

              </tr>
            `;
          }
        )
        .join("");
  }


  function renderReviewPagination(
    data
  ) {
    const totalItems =
      Number(
        data.total_items || 0
      );

    const page =
      Number(
        data.page || 1
      );

    const pageSize =
      Number(
        data.page_size ||
        reviewPageSize
      );

    const totalPages =
      Number(
        data.total_pages || 0
      );


    const start =
      totalItems === 0
        ? 0
        : (
            page - 1
          ) *
            pageSize +
          1;

    const end =
      Math.min(
        page * pageSize,
        totalItems
      );


    setText(
      els.reviewPaginationSummary,
      totalItems
        ? `${start}–${end} of ${formatCount(
            totalItems
          )}`
        : "0 results"
    );


    setText(
      els.reviewPageIndicator,
      totalPages
        ? `Page ${page} of ${totalPages}`
        : "Page 0 of 0"
    );


    if (els.reviewPrevBtn) {
      els.reviewPrevBtn.disabled =
        page <= 1;
    }


    if (els.reviewNextBtn) {
      els.reviewNextBtn.disabled =
        totalPages === 0 ||
        page >= totalPages;
    }
  }


  function showReviewState(
    state,
    message = ""
  ) {
    if (els.reviewLoading) {
      els.reviewLoading.hidden =
        state !== "loading";
    }

    if (els.reviewError) {
      els.reviewError.hidden =
        state !== "error";
    }

    if (els.reviewEmpty) {
      els.reviewEmpty.hidden =
        state !== "empty";
    }

    if (els.reviewTableRegion) {
      els.reviewTableRegion.hidden =
        state !== "ready";
    }

    if (
      state === "error" &&
      els.reviewErrorMessage
    ) {
      els.reviewErrorMessage
        .textContent =
        message;
    }
  }


  async function openReviewDetail(
    reviewId
  ) {
    openDrawer({
      eyebrow:
        "Detailed Review",

      title:
        "Review Request",

      body:
        renderDrawerLoading(
          "Loading review request…"
        )
    });

    try {
      const data =
        await Api.getFeasibilityAdminReviewRequest(
          reviewId
        );

      renderReviewDetail(
        data
      );

    } catch (err) {
      els.drawerBody.innerHTML =
        renderDrawerError(
          formatError(err)
        );
    }
  }


  function renderReviewDetail(
    item
  ) {
    els.drawerEyebrow.textContent =
      "Detailed Review";

    els.drawerTitle.textContent =
      `${item.first_name} ${item.last_name}`;

    els.drawerBody.innerHTML = `
      <div class="admin-detail-stack">


        <section class="admin-detail-section">

          <div class="admin-review-status-header">

            <div>
              <h3>
                Request Status
              </h3>

              <p class="admin-detail-muted">
                Update progress as the YourQS team handles this request.
              </p>
            </div>


            <div class="admin-status-control">

              <select
                id="admin-review-status-select"
              >
                ${reviewStatusOptions(
                  item.status
                )}
              </select>

              <button
                type="button"
                class="btn btn-primary btn-sm"
                id="admin-review-status-save"
              >
                Save
              </button>

            </div>

          </div>


          <p
            class="auth-alert"
            id="admin-review-status-message"
            hidden
          ></p>

        </section>


        <section class="admin-detail-section">

          <h3>
            Customer
          </h3>

          <div class="admin-detail-grid">

            ${detailItem(
              "Name",
              `${item.first_name} ${item.last_name}`
            )}

            ${detailItem(
              "Email",
              item.email
            )}

            ${detailItem(
              "Phone",
              item.phone ||
              "–"
            )}

            ${detailItem(
              "Location",
              item.location ||
              "–"
            )}

            ${detailItem(
              "Postcode",
              item.postcode ||
              "–"
            )}

            ${detailItem(
              "Submitted",
              formatDateTime(
                item.created_at
              )
            )}

            ${detailItem(
              "Updated",
              formatDateTime(
                item.updated_at
              )
            )}

            ${detailItem(
              "Consent",
              item.consent_to_contact
                ? "Yes"
                : "No"
            )}

          </div>

        </section>


        <section class="admin-detail-section">

          <h3>
            Project
          </h3>

          <div class="admin-detail-grid">

            ${detailItem(
              "Project type",
              PROJECT_TYPE_LABELS[
                item.project_type
              ] ||
                prettifyKey(
                  item.project_type
                )
            )}

            ${detailItem(
              "Floor area",
              item.floor_area ===
                null ||
              item.floor_area ===
                undefined
                ? "–"
                : `${formatNumber(
                    item.floor_area,
                    0
                  )} m²`
            )}

            ${detailItem(
              "Affected area",
              item.affected_area ===
                null ||
              item.affected_area ===
                undefined
                ? "–"
                : `${formatNumber(
                    item.affected_area,
                    0
                  )} m²`
            )}

            ${detailItem(
              "Levels",
              item.levels
            )}

            ${detailItem(
              "Bathrooms",
              item.bathrooms
            )}

            ${detailItem(
              "Kitchens",
              item.kitchens
            )}

            ${detailItem(
              "Budget",
              formatCurrency(
                item.budget
              )
            )}

            ${detailItem(
              "Timeframe",
              item.timeframe
                ? prettifyKey(
                    item.timeframe
                  )
                : "–"
            )}

          </div>

        </section>


        <section class="admin-detail-section">

          <h3>
            Project Description
          </h3>

          <p class="admin-detail-text">
            ${
              escapeHtml(
                item.project_description
              )
            }
          </p>

        </section>


        ${
          item.additional_comments
            ? `
              <section class="admin-detail-section">

                <h3>
                  Additional Comments
                </h3>

                <p class="admin-detail-text">
                  ${
                    escapeHtml(
                      item.additional_comments
                    )
                  }
                </p>

              </section>
            `
            : ""
        }


        <section class="admin-detail-section">

          <h3>
            Documents
          </h3>

          ${
            renderReviewFiles(
              item.files || []
            )
          }

        </section>


        ${jsonSection(
          "Scope",
          item.scope_json
        )}


        <section class="admin-detail-section">

          <h3>
            Internal References
          </h3>

          <div class="admin-detail-grid">

            ${detailItem(
              "Review ID",
              item.id
            )}

            ${detailItem(
              "Assessment ID",
              item.assessment_id ||
              "–"
            )}

            ${detailItem(
              "Session ID",
              item.session_id
            )}

          </div>

          ${
            item.assessment_id
              ? `
                <button
                  type="button"
                  class="btn btn-secondary"
                  id="admin-open-linked-assessment"
                >
                  Open linked assessment
                </button>
              `
              : ""
          }

        </section>

      </div>
    `;


    wireReviewDetailEvents(
      item
    );
  }


  function reviewStatusOptions(
    currentStatus
  ) {
    return Object.entries(
      REVIEW_STATUS_INFO
    )
      .map(
        ([value, info]) => `
          <option
            value="${value}"
            ${
              value ===
              currentStatus
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              info.label
            )}
          </option>
        `
      )
      .join("");
  }


  function renderReviewFiles(
    files
  ) {
    if (!files.length) {
      return `
        <p class="admin-detail-muted">
          No documents attached.
        </p>
      `;
    }

    return `
      <div class="admin-file-list">

        ${
          files
            .map(
              (file) => `
                <div class="admin-file-item">

                  <div class="admin-file-info">

                    <div class="admin-file-name">
                      ${
                        escapeHtml(
                          file.file_name
                        )
                      }
                    </div>

                    <div class="admin-file-meta">
                      ${
                        escapeHtml(
                          file.mime_type
                        )
                      }
                      ·
                      ${
                        formatFileSize(
                          file.file_size
                        )
                      }
                    </div>

                  </div>

                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    data-download-file-id="${escapeAttribute(
                      file.id
                    )}"
                    data-file-name="${escapeAttribute(
                      file.file_name
                    )}"
                  >
                    Download
                  </button>

                </div>
              `
            )
            .join("")
        }

      </div>
    `;
  }


  function wireReviewDetailEvents(
    item
  ) {
    const statusSelect =
      document.getElementById(
        "admin-review-status-select"
      );

    const statusSave =
      document.getElementById(
        "admin-review-status-save"
      );

    const statusMessage =
      document.getElementById(
        "admin-review-status-message"
      );


    statusSave
      ?.addEventListener(
        "click",
        async () => {
          const newStatus =
            statusSelect.value;

          statusSave.disabled =
            true;

          statusSave.textContent =
            "Saving…";

          hideAlert(
            statusMessage
          );

          try {
            const result =
              await Api.updateFeasibilityAdminReviewStatus(
                item.id,
                newStatus
              );

            item.status =
              result.status;

            showAlert(
              statusMessage,
              "Status updated.",
              true
            );

            reviewsLoaded =
              false;

            overviewLoaded =
              false;

            await Promise.all([
              loadReviews(),
              loadOverview()
            ]);

          } catch (err) {
            showAlert(
              statusMessage,
              formatError(err),
              false
            );

          } finally {
            statusSave.disabled =
              false;

            statusSave.textContent =
              "Save";
          }
        }
      );


    els.drawerBody
      .querySelectorAll(
        "[data-download-file-id]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            async () => {
              await downloadReviewFile(
                button
              );
            }
          );
        }
      );


    document
      .getElementById(
        "admin-open-linked-assessment"
      )
      ?.addEventListener(
        "click",
        () => {
          if (
            item.assessment_id
          ) {
            openAssessmentDetail(
              item.assessment_id
            );
          }
        }
      );
  }


  async function downloadReviewFile(
    button
  ) {
    const fileId =
      button.dataset
        .downloadFileId;

    const fileName =
      button.dataset
        .fileName ||
      "document";

    button.disabled =
      true;

    const oldText =
      button.textContent;

    button.textContent =
      "Downloading…";

    try {
      await Api.downloadFeasibilityReviewFile(
        fileId,
        fileName
      );

    } catch (err) {
      window.alert(
        formatError(err)
      );

    } finally {
      button.disabled =
        false;

      button.textContent =
        oldText;
    }
  }


  /* ==========================================================
     Drawer
     ========================================================== */

  function wireDrawerEvents() {
    els.drawerCloseBtn
      ?.addEventListener(
        "click",
        closeDrawer
      );

    els.drawerBackdrop
      ?.addEventListener(
        "click",
        closeDrawer
      );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          els.drawer &&
          !els.drawer.hidden
        ) {
          closeDrawer();
        }
      }
    );
  }


  function openDrawer({
    eyebrow,
    title,
    body
  }) {
    els.drawerEyebrow.textContent =
      eyebrow;

    els.drawerTitle.textContent =
      title;

    els.drawerBody.innerHTML =
      body;

    els.drawerBackdrop.hidden =
      false;

    els.drawer.hidden =
      false;

    els.drawer.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "admin-drawer-open"
    );
  }


  function closeDrawer() {
    if (!els.drawer) {
      return;
    }

    els.drawerBackdrop.hidden =
      true;

    els.drawer.hidden =
      true;

    els.drawer.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "admin-drawer-open"
    );
  }


  function renderDrawerLoading(
    message
  ) {
    return `
      <div class="ui-state">

        <div
          class="spinner"
          aria-hidden="true"
        ></div>

        <div class="ui-state-title">
          ${escapeHtml(message)}
        </div>

      </div>
    `;
  }


  function renderDrawerError(
    message
  ) {
    return `
      <div class="ui-state">

        <div class="ui-state-title">
          Couldn't load details
        </div>

        <p class="ui-state-body">
          ${escapeHtml(message)}
        </p>

      </div>
    `;
  }


  /* ==========================================================
     Feedback
     ========================================================== */

  function wireFeedbackEvents() {
    els.feedbackForm
      ?.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();

          submitFeedback();
        }
      );


    els.feedbackMessage
      ?.addEventListener(
        "input",
        () => {
          updateFeedbackCharCount();

          setFieldError(
            els.feedbackMessageError,
            ""
          );
        }
      );


    els.feedbackCategory
      ?.addEventListener(
        "change",
        () => {
          setFieldError(
            els.feedbackCategoryError,
            ""
          );
        }
      );


    els.feedbackListRetryBtn
      ?.addEventListener(
        "click",
        loadFeedback
      );


    els.feedbackFilterTabs
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              setFeedbackFilter(
                button.dataset
                  .feedbackFilter
              );
            }
          );
        }
      );
  }


  async function loadFeedback() {
    showFeedbackListState(
      "loading"
    );

    try {
      const data =
        await Api.getAllFeedback({
          headers:
            Auth.getAuthorizationHeaders()
        });


      allFeedback =
        Array.isArray(
          data.items
        )
          ? data.items.slice()
          : [];


      feedbackLoaded =
        true;


      renderVisibleFeedback();

    } catch (err) {
      showFeedbackListState(
        "error",
        formatError(err)
      );
    }
  }


  function setFeedbackFilter(
    filter
  ) {
    if (
      filter !== "all" &&
      filter !== "mine"
    ) {
      return;
    }

    activeFeedbackFilter =
      filter;


    els.feedbackFilterTabs
      .forEach(
        (button) => {
          const selected =
            button.dataset
              .feedbackFilter ===
            filter;

          button.classList.toggle(
            "is-active",
            selected
          );

          button.setAttribute(
            "aria-selected",
            String(selected)
          );
        }
      );


    renderVisibleFeedback();
  }


  function getVisibleFeedback() {
    if (
      activeFeedbackFilter ===
      "mine"
    ) {
      const userId =
        String(
          currentUser?.id ||
          ""
        );

      return allFeedback.filter(
        (item) =>
          String(
            item.authorId ||
            ""
          ) === userId
      );
    }

    return allFeedback;
  }


  function renderVisibleFeedback() {
    const items =
      getVisibleFeedback()
        .slice()
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );


    if (!items.length) {
      if (
        activeFeedbackFilter ===
        "mine"
      ) {
        setText(
          els.feedbackEmptyTitle,
          "No submissions from you yet"
        );

        setText(
          els.feedbackEmptyMessage,
          "You haven't submitted any feedback yet."
        );

      } else {
        setText(
          els.feedbackEmptyTitle,
          "No submissions yet"
        );

        setText(
          els.feedbackEmptyMessage,
          "No feedback has been submitted yet."
        );
      }

      els.feedbackList.innerHTML =
        "";

      showFeedbackListState(
        "empty"
      );

      return;
    }


    els.feedbackList.innerHTML =
      items
        .map(
          renderFeedbackItem
        )
        .join("");


    showFeedbackListState(
      "ready"
    );
  }


  function renderFeedbackItem(
    item
  ) {
    const categoryLabel =
      CATEGORY_LABELS[
        item.category
      ] ||
      item.category ||
      "Other";


    const statusInfo =
      FEEDBACK_STATUS_INFO[
        item.status
      ] || {
        label:
          item.status ||
          "New",

        tone:
          "status-feedback-new"
      };


    const feature =
      item.feature
        ? escapeHtml(
            item.feature
          )
        : "General";


    const date =
      Formatters.date(
        item.createdAt
      );


    const isMine =
      String(
        item.authorId ||
        ""
      ) ===
      String(
        currentUser?.id ||
        ""
      );


    const authorName =
      item.authorName ||
      (
        isMine
          ? currentUser?.name
          : null
      ) ||
      "Unknown user";


    const authorCompany =
      item.authorCompany ||
      (
        isMine
          ? currentUser?.company
          : null
      ) ||
      "";


    return `
      <li class="feedback-item">

        <div class="feedback-author">

          <div
            class="feedback-author-avatar"
            aria-hidden="true"
          >
            ${
              escapeHtml(
                getInitials(
                  authorName
                )
              )
            }
          </div>


          <div class="feedback-author-text">

            <div class="feedback-author-name-row">

              <span class="feedback-author-name">
                ${escapeHtml(
                  authorName
                )}
              </span>

              ${
                isMine
                  ? `
                    <span class="feedback-you-badge">
                      You
                    </span>
                  `
                  : ""
              }

            </div>


            ${
              authorCompany
                ? `
                  <span class="feedback-author-company">
                    ${escapeHtml(
                      authorCompany
                    )}
                  </span>
                `
                : ""
            }

          </div>

        </div>


        <div class="feedback-item-top">

          <span class="feedback-item-category">
            ${escapeHtml(
              categoryLabel
            )}
          </span>


          <span
            class="status-badge ${statusInfo.tone}"
          >
            ${escapeHtml(
              statusInfo.label
            )}
          </span>

        </div>


        <p class="feedback-item-message">
          ${escapeHtml(
            item.message
          )}
        </p>


        <div class="feedback-item-meta">

          <span>
            ${feature}
          </span>

          <span>
            ·
          </span>

          <span>
            ${escapeHtml(
              date
            )}
          </span>

        </div>

      </li>
    `;
  }


  async function submitFeedback() {
    if (feedbackSubmitting) {
      return;
    }


    const category =
      els.feedbackCategory.value;


    const feature =
      els.feedbackFeature.value;


    const message =
      els.feedbackMessage
        .value
        .trim();


    let valid =
      true;


    if (!category) {
      setFieldError(
        els.feedbackCategoryError,
        "Select a category."
      );

      valid =
        false;
    }


    if (!message) {
      setFieldError(
        els.feedbackMessageError,
        "Message is required."
      );

      valid =
        false;
    }


    if (!valid) {
      return;
    }


    hideFeedbackAlert();


    feedbackSubmitting =
      true;


    setButtonLoading(
      els.feedbackSubmitBtn,
      true,
      "Submitting…"
    );


    const payload = {
      category,
      message
    };


    if (feature) {
      payload.feature =
        feature;
    }


    try {
      const created =
        await Api.createFeedback(
          payload,
          {
            headers:
              Auth.getAuthorizationHeaders()
          }
        );


      const enriched = {
        ...created,

        authorId:
          currentUser.id,

        authorName:
          currentUser.name,

        authorCompany:
          currentUser.company ||
          null
      };


      allFeedback.unshift(
        enriched
      );


      showFeedbackAlert(
        "Thanks - your feedback has been submitted.",
        true
      );


      els.feedbackForm.reset();


      updateFeedbackCharCount();


      renderVisibleFeedback();

    } catch (err) {
      showFeedbackAlert(
        formatError(err),
        false
      );

    } finally {
      feedbackSubmitting =
        false;


      setButtonLoading(
        els.feedbackSubmitBtn,
        false,
        "Submit feedback"
      );
    }
  }


  function updateFeedbackCharCount() {
    if (
      !els.feedbackCharCount ||
      !els.feedbackMessage
    ) {
      return;
    }

    els.feedbackCharCount.textContent =
      `${els.feedbackMessage.value.length} / ${MAX_MESSAGE_LENGTH}`;
  }


  function showFeedbackListState(
    state,
    message = ""
  ) {
    els.feedbackListLoading.hidden =
      state !== "loading";

    els.feedbackListError.hidden =
      state !== "error";

    els.feedbackListEmpty.hidden =
      state !== "empty";

    els.feedbackList.hidden =
      state !== "ready";


    if (
      state === "error"
    ) {
      els.feedbackListErrorMessage
        .textContent =
        message;
    }
  }


  function showFeedbackAlert(
    message,
    success
  ) {
    if (!els.feedbackAlert) {
      return;
    }

    els.feedbackAlert.textContent =
      message;

    els.feedbackAlert.hidden =
      false;

    els.feedbackAlert
      .classList
      .toggle(
        "is-success",
        success
      );
  }


  function hideFeedbackAlert() {
    if (!els.feedbackAlert) {
      return;
    }

    els.feedbackAlert.hidden =
      true;

    els.feedbackAlert.textContent =
      "";

    els.feedbackAlert
      .classList
      .remove(
        "is-success"
      );
  }


  /* ==========================================================
     Platform
     ========================================================== */

  function wirePlatformEvents() {
    els.suggestRequirementsBtn
      ?.addEventListener(
        "click",
        async () => {
          await setAdminTab(
            "feedback"
          );

          els.feedbackCategory.value =
            "future_project";

          els.feedbackFeature.value =
            "Future Project Creation";

          els.feedbackFormPanel
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "start"
            });


          els.feedbackMessage
            ?.focus();
        }
      );
  }


  /* ==========================================================
     Generic UI helpers
     ========================================================== */

  function detailItem(
    label,
    value
  ) {
    const finalValue =
      value === null ||
      value === undefined ||
      value === ""
        ? "–"
        : value;

    return `
      <div class="admin-detail-item">

        <div class="admin-detail-label">
          ${escapeHtml(label)}
        </div>

        <div class="admin-detail-value">
          ${escapeHtml(
            String(
              finalValue
            )
          )}
        </div>

      </div>
    `;
  }


  function jsonSection(
    title,
    value
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    let json;

    try {
      json =
        JSON.stringify(
          value,
          null,
          2
        );

    } catch (_) {
      json =
        String(value);
    }

    return `
      <section class="admin-detail-section">

        <h3>
          ${escapeHtml(title)}
        </h3>

        <pre class="admin-json-block">${
          escapeHtml(
            json
          )
        }</pre>

      </section>
    `;
  }


  function setText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      value;
  }


  function setFieldError(
    element,
    message
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      message || "";

    element.hidden =
      !message;
  }


  function setButtonLoading(
    button,
    loading,
    label
  ) {
    if (!button) {
      return;
    }

    button.disabled =
      loading;

    button.textContent =
      label;
  }


  function showAlert(
    element,
    message,
    success
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      message;

    element.hidden =
      false;

    element.classList.toggle(
      "is-success",
      success
    );
  }


  function hideAlert(
    element
  ) {
    if (!element) {
      return;
    }

    element.hidden =
      true;

    element.textContent =
      "";

    element.classList.remove(
      "is-success"
    );
  }


  function formatCount(
    value
  ) {
    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number
      .toLocaleString(
        "en-NZ"
      );
  }


  function formatNumber(
    value,
    decimals = 0
  ) {
    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "–";
    }

    return number
      .toLocaleString(
        "en-NZ",
        {
          minimumFractionDigits:
            decimals,

          maximumFractionDigits:
            decimals
        }
      );
  }


  function formatCurrency(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "–";
    }

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "–";
    }

    return new Intl.NumberFormat(
      "en-NZ",
      {
        style:
          "currency",

        currency:
          "NZD",

        maximumFractionDigits:
          0
      }
    ).format(number);
  }


  function formatDateTime(
    value
  ) {
    if (!value) {
      return "–";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date
      .toLocaleString(
        "en-NZ",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit"
        }
      );
  }


  function formatFileSize(
    bytes
  ) {
    const size =
      Number(bytes);

    if (
      !Number.isFinite(size)
    ) {
      return "–";
    }

    if (
      size <
      1024
    ) {
      return `${size} B`;
    }

    if (
      size <
      1024 * 1024
    ) {
      return `${(
        size /
        1024
      ).toFixed(0)} KB`;
    }

    return `${(
      size /
      (
        1024 *
        1024
      )
    ).toFixed(1)} MB`;
  }


  function prettifyKey(
    value
  ) {
    if (!value) {
      return "–";
    }

    return String(value)
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );
  }


  function formatError(
    err
  ) {
    if (
      window.Auth &&
      typeof Auth
        .formatErrorMessage ===
        "function"
    ) {
      return Auth.formatErrorMessage(
        err
      );
    }

    return (
      err?.message ||
      "Something went wrong."
    );
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

    return String(value)
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


  function escapeAttribute(
    value
  ) {
    return escapeHtml(
      value
    );
  }


  function handleLogout() {
    Auth.logout();

    window.location.href =
      "auth.html";
  }


  return {
    init
  };
})();


window.DevPage =
  DevPage;