/**
 * dev.js
 * Developer Preview page:
 * - verifies the authenticated session;
 * - renders the signed-in user;
 * - submits feedback;
 * - shows all submissions from every user;
 * - supports All / Mine filtering;
 * - displays author identity on shared submissions;
 * - keeps future-project requirements as a prototype concept only.
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

  const STATUS_INFO = {
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

  let els = {};

  let currentUser = null;

  let allFeedback = [];

  let activeFilter = "all";

  let isSubmitting = false;


  async function init() {
    cacheElements();

    const sessionOk =
      await verifySession();

    if (!sessionOk) {
      return;
    }

    wireEvents();

    updateCharCount();

    await loadFeedback();
  }


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

      categorySelect:
        document.getElementById(
          "feedback-category"
        ),

      categoryError:
        document.getElementById(
          "feedback-category-error"
        ),

      featureSelect:
        document.getElementById(
          "feedback-feature"
        ),

      messageInput:
        document.getElementById(
          "feedback-message"
        ),

      messageError:
        document.getElementById(
          "feedback-message-error"
        ),

      charCount:
        document.getElementById(
          "feedback-char-count"
        ),

      submitBtn:
        document.getElementById(
          "feedback-submit-btn"
        ),


      listLoading:
        document.getElementById(
          "feedback-list-loading"
        ),

      listError:
        document.getElementById(
          "feedback-list-error"
        ),

      listErrorMessage:
        document.getElementById(
          "feedback-list-error-message"
        ),

      listRetryBtn:
        document.getElementById(
          "feedback-list-retry-btn"
        ),

      listEmpty:
        document.getElementById(
          "feedback-list-empty"
        ),

      emptyTitle:
        document.getElementById(
          "feedback-empty-title"
        ),

      emptyMessage:
        document.getElementById(
          "feedback-empty-message"
        ),

      feedbackList:
        document.getElementById(
          "feedback-list"
        ),

      filterTabs:
        Array.from(
          document.querySelectorAll(
            "[data-feedback-filter]"
          )
        ),

      suggestBtn:
        document.getElementById(
          "suggest-requirements-btn"
        )
    };
  }


  /* ================================================================
     Session
     ================================================================ */

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
      (user && user.name) ||
      "Signed in";

    if (els.headerAvatar) {
      els.headerAvatar.textContent =
        getInitials(
          user && user.name
        );
    }

    if (els.headerName) {
      els.headerName.textContent =
        name;
    }

    if (els.headerSub) {
      els.headerSub.textContent =
        (user && user.company) ||
        "Signed in";
    }
  }


  function getInitials(name) {
    if (!name) {
      return "?";
    }

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
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
    ).toUpperCase() || "?";
  }


  /* ================================================================
     Events
     ================================================================ */

  function wireEvents() {
    if (els.feedbackForm) {
      els.feedbackForm.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();

          handleSubmit();
        }
      );
    }


    if (els.messageInput) {
      els.messageInput.addEventListener(
        "input",
        () => {
          updateCharCount();

          setFieldError(
            els.messageError,
            ""
          );
        }
      );
    }


    if (els.categorySelect) {
      els.categorySelect.addEventListener(
        "change",
        () => {
          setFieldError(
            els.categoryError,
            ""
          );
        }
      );
    }


    if (els.listRetryBtn) {
      els.listRetryBtn.addEventListener(
        "click",
        loadFeedback
      );
    }


    if (els.suggestBtn) {
      els.suggestBtn.addEventListener(
        "click",
        handleSuggestRequirements
      );
    }


    if (els.logoutBtn) {
      els.logoutBtn.addEventListener(
        "click",
        handleLogout
      );
    }


    els.filterTabs.forEach(
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


  function updateCharCount() {
    if (
      !els.charCount ||
      !els.messageInput
    ) {
      return;
    }

    els.charCount.textContent =
      `${els.messageInput.value.length} / ${MAX_MESSAGE_LENGTH}`;
  }


  /* ================================================================
     Shared feedback list
     ================================================================ */

  async function loadFeedback() {
    showListState(
      "loading"
    );

    try {
      const data =
        await Api.getAllFeedback(
          {
            headers:
              Auth.getAuthorizationHeaders()
          }
        );

      allFeedback =
        Array.isArray(
          data.items
        )
          ? data.items.slice()
          : [];

      renderActiveFeedback();

    } catch (err) {
      showListState(
        "error",
        Auth.formatErrorMessage(
          err
        )
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

    activeFilter =
      filter;


    els.filterTabs.forEach(
      (button) => {
        const isActive =
          button.dataset
            .feedbackFilter ===
          filter;

        button.classList.toggle(
          "is-active",
          isActive
        );

        button.setAttribute(
          "aria-selected",
          String(
            isActive
          )
        );
      }
    );


    renderActiveFeedback();
  }


  function getVisibleFeedback() {
    if (
      activeFilter === "mine"
    ) {
      const currentUserId =
        String(
          currentUser?.id || ""
        );

      return allFeedback.filter(
        (item) =>
          String(
            item.authorId || ""
          ) === currentUserId
      );
    }

    return allFeedback;
  }


  function renderActiveFeedback() {
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


    if (
      items.length === 0
    ) {
      if (
        activeFilter ===
        "mine"
      ) {
        if (
          els.emptyTitle
        ) {
          els.emptyTitle.textContent =
            "No submissions from you yet";
        }

        if (
          els.emptyMessage
        ) {
          els.emptyMessage.textContent =
            "You haven't submitted any feedback yet.";
        }

      } else {
        if (
          els.emptyTitle
        ) {
          els.emptyTitle.textContent =
            "No submissions yet";
        }

        if (
          els.emptyMessage
        ) {
          els.emptyMessage.textContent =
            "No feedback has been submitted yet.";
        }
      }


      if (
        els.feedbackList
      ) {
        els.feedbackList.innerHTML =
          "";
      }

      showListState(
        "empty"
      );

      return;
    }


    if (
      els.feedbackList
    ) {
      els.feedbackList.innerHTML =
        items
          .map(
            renderFeedbackItem
          )
          .join("");
    }


    showListState(
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
      STATUS_INFO[
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
        item.authorId || ""
      ) ===
      String(
        currentUser?.id || ""
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


    const companyMarkup =
      authorCompany
        ? `
          <span class="feedback-author-company">
            ${escapeHtml(authorCompany)}
          </span>
        `
        : "";


    const youMarkup =
      isMine
        ? `
          <span class="feedback-you-badge">
            You
          </span>
        `
        : "";


    return `
      <li class="feedback-item">

        <div class="feedback-author">

          <div
            class="feedback-author-avatar"
            aria-hidden="true"
          >
            ${escapeHtml(
              getInitials(
                authorName
              )
            )}
          </div>

          <div class="feedback-author-text">

            <div class="feedback-author-name-row">

              <span class="feedback-author-name">
                ${escapeHtml(
                  authorName
                )}
              </span>

              ${youMarkup}

            </div>

            ${companyMarkup}

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

          <span aria-hidden="true">
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


  /* ================================================================
     Feedback form
     ================================================================ */

  async function handleSubmit() {
    if (
      isSubmitting
    ) {
      return;
    }


    const category =
      els.categorySelect.value;


    const feature =
      els.featureSelect.value;


    const message =
      els.messageInput
        .value
        .trim();


    let valid =
      true;


    if (!category) {
      setFieldError(
        els.categoryError,
        "Select a category."
      );

      valid = false;
    }


    if (!message) {
      setFieldError(
        els.messageError,
        "Message is required."
      );

      valid = false;
    }


    if (!valid) {
      return;
    }


    hideFormAlert();


    isSubmitting =
      true;


    setLoading(
      els.submitBtn,
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


      /*
       * POST /api/feedback currently returns the
       * created item without author details.
       *
       * Enrich it locally so it can appear in
       * All submissions immediately without
       * requiring another GET request.
       */
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


      showFormAlert(
        "Thanks — your feedback has been submitted.",
        "success"
      );


      els.feedbackForm.reset();

      updateCharCount();

      renderActiveFeedback();

    } catch (err) {
      showFormAlert(
        Auth.formatErrorMessage(
          err
        ),
        "error"
      );

    } finally {
      isSubmitting =
        false;


      setLoading(
        els.submitBtn,
        false,
        "Submit feedback"
      );
    }
  }


  function handleSuggestRequirements() {
    els.categorySelect.value =
      "future_project";


    els.featureSelect.value =
      "Future Project Creation";


    setFieldError(
      els.categoryError,
      ""
    );


    if (
      typeof
        els.feedbackFormPanel
          .scrollIntoView ===
      "function"
    ) {
      els.feedbackFormPanel
        .scrollIntoView({
          behavior:
            "smooth",

          block:
            "start"
        });
    }


    els.messageInput.focus();
  }


  function handleLogout() {
    Auth.logout();

    window.location.href =
      "auth.html";
  }


  /* ================================================================
     UI helpers
     ================================================================ */

  function showListState(
    state,
    message = ""
  ) {
    const isLoading =
      state === "loading";


    const isError =
      state === "error";


    const isEmpty =
      state === "empty";


    const isReady =
      state === "ready";


    if (
      els.listLoading
    ) {
      els.listLoading.hidden =
        !isLoading;
    }


    if (
      els.listError
    ) {
      els.listError.hidden =
        !isError;
    }


    if (
      els.listEmpty
    ) {
      els.listEmpty.hidden =
        !isEmpty;
    }


    if (
      els.feedbackList
    ) {
      els.feedbackList.hidden =
        !isReady;
    }


    if (
      isError &&
      els.listErrorMessage
    ) {
      els.listErrorMessage
        .textContent =
        message ||
        "Something went wrong while loading submissions.";
    }
  }


  function setFieldError(
    errorEl,
    message
  ) {
    if (
      !errorEl
    ) {
      return;
    }

    errorEl.textContent =
      message;

    errorEl.hidden =
      !message;
  }


  function showFormAlert(
    message,
    tone = "error"
  ) {
    if (
      !els.feedbackAlert
    ) {
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
        tone === "success"
      );
  }


  function hideFormAlert() {
    if (
      !els.feedbackAlert
    ) {
      return;
    }

    els.feedbackAlert.hidden =
      true;


    els.feedbackAlert
      .classList
      .remove(
        "is-success"
      );


    els.feedbackAlert.textContent =
      "";
  }


  function setLoading(
    button,
    isLoading,
    label
  ) {
    if (
      !button
    ) {
      return;
    }

    button.disabled =
      isLoading;


    button.textContent =
      label;
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


window.DevPage =
  DevPage;