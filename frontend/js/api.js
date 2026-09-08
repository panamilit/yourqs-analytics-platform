/**
 * api.js
 * All HTTP communication with the FastAPI backend.
 */

class ApiError extends Error {
  constructor(
    message,
    {
      status = null,
      cause = null,
      detail = null
    } = {}
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.cause = cause;
    this.detail = detail;
  }
}


const Api = {
  buildUrl(path, params = {}) {
    const base =
      window.APP_CONFIG.API_BASE_URL.replace(
        /\/+$/,
        ""
      );

    const url = new URL(
      `${base}${path}`
    );

    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }

        url.searchParams.set(
          key,
          value
        );
      }
    );

    return url.toString();
  },


  async getProjectsSummary(
    { signal } = {}
  ) {
    const url = this.buildUrl(
      "/api/projects/summary"
    );

    return this._request(
      url,
      { signal }
    );
  },


  async getProjects(
    filters = {},
    { signal } = {}
  ) {
    const url = this.buildUrl(
      "/api/projects",
      filters
    );

    return this._request(
      url,
      { signal }
    );
  },


  async getProjectDetails(
    projectId,
    { signal } = {}
  ) {
    const url = this.buildUrl(
      `/api/projects/${
        encodeURIComponent(projectId)
      }/details`
    );

    return this._request(
      url,
      { signal }
    );
  },


  async getProjectBenchmark(
    projectId,
    { signal } = {}
  ) {
    const url = this.buildUrl(
      `/api/benchmarking/projects/${
        encodeURIComponent(projectId)
      }`
    );

    return this._request(
      url,
      { signal }
    );
  },


  async compareProjects(
    projectIds,
    { signal } = {}
  ) {
    const url = this.buildUrl(
      "/api/comparison/projects"
    );

    return this._request(
      url,
      {
        method: "POST",

        body: {
          projectIds
        },

        signal
      }
    );
  },


  async runWhatIfScenario(
    projectId,
    adjustments,
    { signal } = {}
  ) {
    const url = this.buildUrl(
      `/api/what-if/projects/${
        encodeURIComponent(projectId)
      }`
    );

    return this._request(
      url,
      {
        method: "POST",

        body: {
          adjustments
        },

        signal
      }
    );
  },


  async request(
    path,
    {
      method = "GET",
      body = null,
      headers = {},
      signal
    } = {}
  ) {
    const url = this.buildUrl(
      path
    );

    return this._request(
      url,
      {
        method,
        body,
        headers,
        signal
      }
    );
  },


  async createFeedback(
    payload,
    {
      headers = {},
      signal
    } = {}
  ) {
    return this.request(
      "/api/feedback",
      {
        method: "POST",
        body: payload,
        headers,
        signal
      }
    );
  },


  async getMyFeedback(
    {
      headers = {},
      signal
    } = {}
  ) {
    return this.request(
      "/api/feedback/me",
      {
        headers,
        signal
      }
    );
  },




  /**
   * Get all feedback submissions.
   *
   * Used by the Admin Panel.
   */
  async getAllFeedback(
    {
      headers = {},
      signal
    } = {}
  ) {
    return this.request(
      "/api/feedback",
      {
        headers,
        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Overview metrics.
   */
  async getFeasibilityAdminOverview(
    {
      signal
    } = {}
  ) {
    return this.request(
      "/api/feasibility/admin/overview",
      {
        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Paginated assessment logs.
   */
  async getFeasibilityAdminAssessments(
    filters = {},
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        "/api/feasibility/admin/assessments",
        filters
      );

    return this._request(
      url,
      {
        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Single assessment details.
   */
  async getFeasibilityAdminAssessment(
    assessmentId,
    {
      signal
    } = {}
  ) {
    return this.request(
      `/api/feasibility/admin/assessments/${
        encodeURIComponent(
          assessmentId
        )
      }`,
      {
        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Paginated detailed review requests.
   */
  async getFeasibilityAdminReviewRequests(
    filters = {},
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        "/api/feasibility/admin/review-requests",
        filters
      );

    return this._request(
      url,
      {
        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Single detailed review request.
   */
  async getFeasibilityAdminReviewRequest(
    reviewRequestId,
    {
      signal
    } = {}
  ) {
    return this.request(
      `/api/feasibility/admin/review-requests/${
        encodeURIComponent(
          reviewRequestId
        )
      }`,
      {
        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Update detailed review request status.
   */
  async updateFeasibilityAdminReviewStatus(
    reviewRequestId,
    status,
    {
      signal
    } = {}
  ) {
    return this.request(
      `/api/feasibility/admin/review-requests/${
        encodeURIComponent(
          reviewRequestId
        )
      }/status`,
      {
        method: "PATCH",

        body: {
          status
        },

        signal
      }
    );
  },


  /**
   * Feasibility Admin:
   * Download a file stored in the private
   * feasibility-review-files bucket.
   *
   * The backend performs the authenticated
   * Storage request and returns the binary file.
   */
  async downloadFeasibilityReviewFile(
    fileId,
    fallbackFileName = "document",
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        `/api/feasibility/admin/files/${
          encodeURIComponent(
            fileId
          )
        }/download`
      );

    let response;

    try {
      response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "*/*",

              ...(
                window.Auth
                  ?.getAuthorizationHeaders
                  ?.() || {}
              )
            },

            signal
          }
        );

    } catch (err) {
      if (
        err.name ===
        "AbortError"
      ) {
        throw err;
      }

      throw new ApiError(
        "Unable to reach the server. Check your connection and try again.",
        {
          cause: err
        }
      );
    }


    if (
      !response.ok
    ) {
      let detail =
        null;

      try {
        const errorBody =
          await response.json();

        detail =
          errorBody?.message ??
          errorBody?.detail ??
          null;

      } catch (_) {
        // Response was not JSON.
      }


      throw new ApiError(
        extractErrorMessage(
          detail
        ) ||
          `Request failed with status ${response.status}.`,
        {
          status:
            response.status,

          detail
        }
      );
    }


    const blob =
      await response.blob();


    const fileName =
      getDownloadFileName(
        response,
        fallbackFileName
      );


    const objectUrl =
      URL.createObjectURL(
        blob
      );


    try {
      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;

      anchor.download =
        fileName;

      anchor.style.display =
        "none";


      document.body.appendChild(
        anchor
      );


      anchor.click();


      anchor.remove();

    } finally {
      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );
    }
  },


  /**
   * Multipart/FormData request.
   *
   * IMPORTANT:
   * Do not manually set Content-Type here.
   * The browser must create the multipart boundary.
   */
  async submitFormData(
    path,
    formData,
    {
      signal,
      headers = {}
    } = {}
  ) {
    const url = this.buildUrl(
      path
    );

    let response;

    try {
      response = await fetch(
        url,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            ...(
              window.Auth
                ?.getAuthorizationHeaders
                ?.() || {}
            ),

            ...headers
          },

          body: formData,

          signal
        }
      );
    } catch (err) {
      if (
        err.name ===
        "AbortError"
      ) {
        throw err;
      }

      throw new ApiError(
        "Unable to reach the server. Check your connection and try again.",
        {
          cause: err
        }
      );
    }

    return this._handleResponse(
      response
    );
  },


  async _request(
    url,
    {
      signal,
      method = "GET",
      body = null,
      headers = {}
    } = {}
  ) {
    let response;

    try {
      response = await fetch(
        url,
        {
          method,

          headers: {
            Accept:
              "application/json",

            ...(
              body !== null
                ? {
                    "Content-Type":
                      "application/json"
                  }
                : {}
            ),

            ...(
              window.Auth
                ?.getAuthorizationHeaders
                ?.() || {}
            ),

            ...headers
          },

          body:
            body !== null
              ? JSON.stringify(
                  body
                )
              : undefined,

          signal
        }
      );
    } catch (err) {
      if (
        err.name ===
        "AbortError"
      ) {
        throw err;
      }

      throw new ApiError(
        "Unable to reach the server. Check your connection and try again.",
        {
          cause: err
        }
      );
    }

    return this._handleResponse(
      response
    );
  },


  async _handleResponse(
    response
  ) {
    if (!response.ok) {
      let detail = null;

      try {
        const errorBody =
          await response.json();

        detail =
          errorBody?.message ??
          errorBody?.detail ??
          null;
      } catch (_) {
        // No JSON body.
      }

      throw new ApiError(
        extractErrorMessage(
          detail
        ) ||
          `Request failed with status ${response.status}.`,
        {
          status:
            response.status,

          detail
        }
      );
    }

    try {
      return await response.json();
    } catch (err) {
      throw new ApiError(
        "The server returned an unexpected response.",
        {
          cause: err
        }
      );
    }
  }
};


function extractErrorMessage(
  detail
) {
  if (!detail) {
    return "";
  }

  if (
    typeof detail ===
    "string"
  ) {
    return detail;
  }

  if (
    Array.isArray(detail) &&
    detail.length > 0
  ) {
    const first =
      detail[0];

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

  return "";
}


function getDownloadFileName(
  response,
  fallbackFileName
) {
  const disposition =
    response.headers.get(
      "Content-Disposition"
    );


  if (
    !disposition
  ) {
    return (
      fallbackFileName ||
      "document"
    );
  }


  /*
   * RFC 5987:
   * filename*=UTF-8''example.pdf
   */
  const encodedMatch =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );


  if (
    encodedMatch &&
    encodedMatch[1]
  ) {
    try {
      return decodeURIComponent(
        encodedMatch[1]
      );

    } catch (_) {
      return encodedMatch[1];
    }
  }


  /*
   * Standard:
   * filename="example.pdf"
   */
  const quotedMatch =
    disposition.match(
      /filename="([^"]+)"/i
    );


  if (
    quotedMatch &&
    quotedMatch[1]
  ) {
    return quotedMatch[1];
  }


  /*
   * Standard without quotes:
   * filename=example.pdf
   */
  const plainMatch =
    disposition.match(
      /filename=([^;]+)/i
    );


  if (
    plainMatch &&
    plainMatch[1]
  ) {
    return plainMatch[1]
      .trim();
  }


  return (
    fallbackFileName ||
    "document"
  );
}