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