/**
 * api.js
 * All HTTP communication with the FastAPI backend.
 * No rendering, no state, no business calculations —
 * just requests, responses, and error shaping.
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
    super(
      message
    );

    this.name =
      "ApiError";

    this.status =
      status;

    this.cause =
      cause;

    this.detail =
      detail;
  }
}


const Api = {

  /**
   * Build the full URL for a given API path
   * using the configured backend base URL.
   */
  buildUrl(
    path,
    params = {}
  ) {
    const base =
      window.APP_CONFIG
        .API_BASE_URL
        .replace(
          /\/+$/,
          ""
        );


    const url =
      new URL(
        `${base}${path}`
      );


    Object.entries(
      params
    ).forEach(
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


  /* ================================================================
     Projects
     ================================================================ */

  /**
   * GET /api/projects/summary
   */
  async getProjectsSummary(
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        "/api/projects/summary"
      );


    return this._request(
      url,
      {
        signal
      }
    );
  },


  /**
   * GET /api/projects
   *
   * filters:
   * - search
   * - min_floor_area
   * - max_floor_area
   * - levels
   * - has_cost_data
   * - analytics_ready
   * - page
   * - page_size
   * - sort_by
   * - sort_order
   */
  async getProjects(
    filters = {},
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        "/api/projects",
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
   * GET /api/projects/{project_id}/details
   */
  async getProjectDetails(
    projectId,
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        `/api/projects/${encodeURIComponent(
          projectId
        )}/details`
      );


    return this._request(
      url,
      {
        signal
      }
    );
  },


  /* ================================================================
     Benchmarking
     ================================================================ */

  /**
   * GET /api/benchmarking/projects/{project_id}
   */
  async getProjectBenchmark(
    projectId,
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        `/api/benchmarking/projects/${encodeURIComponent(
          projectId
        )}`
      );


    return this._request(
      url,
      {
        signal
      }
    );
  },


  /* ================================================================
     Comparison
     ================================================================ */

  /**
   * POST /api/comparison/projects
   *
   * body:
   * {
   *   projectIds: [...]
   * }
   */
  async compareProjects(
    projectIds,
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        "/api/comparison/projects"
      );


    return this._request(
      url,
      {
        method:
          "POST",

        body: {
          projectIds
        },

        signal
      }
    );
  },


  /* ================================================================
     What-if Analysis
     ================================================================ */

  /**
   * POST /api/what-if/projects/{project_id}
   *
   * body:
   * {
   *   adjustments: [...]
   * }
   */
  async runWhatIfScenario(
    projectId,
    adjustments,
    {
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
        `/api/what-if/projects/${encodeURIComponent(
          projectId
        )}`
      );


    return this._request(
      url,
      {
        method:
          "POST",

        body: {
          adjustments
        },

        signal
      }
    );
  },


  /* ================================================================
     Generic API request
     ================================================================ */

  /**
   * Generic request for endpoints outside the
   * analytics-specific helpers.
   *
   * Used by:
   * - authentication
   * - feedback
   * - future application-layer endpoints
   */
  async request(
    path,
    {
      method = "GET",
      body = null,
      headers = {},
      signal
    } = {}
  ) {
    const url =
      this.buildUrl(
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


  /* ================================================================
     Feedback
     ================================================================ */

  /**
   * POST /api/feedback
   *
   * Requires Authorization header supplied by caller:
   *
   * Auth.getAuthorizationHeaders()
   */
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
        method:
          "POST",

        body:
          payload,

        headers,

        signal
      }
    );
  },


  /**
   * GET /api/feedback
   *
   * Returns all submissions,
   * including author information.
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
   * GET /api/feedback/me
   *
   * Returns feedback belonging only
   * to the current user.
   *
   * Kept because it may still be useful elsewhere.
   */
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


  /* ================================================================
     Shared fetch wrapper
     ================================================================ */

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
      response =
        await fetch(
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

              ...(window.Auth?.getAuthorizationHeaders?.() || {}),

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
          cause:
            err
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
        /*
         * Response had no JSON body.
         */
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
          cause:
            err
        }
      );
    }
  }
};


/**
 * FastAPI error responses can be:
 *
 * {
 *   "detail": "Invalid email or password."
 * }
 *
 * or validation arrays:
 *
 * {
 *   "detail": [
 *     {
 *       "loc": [...],
 *       "msg": "...",
 *       "type": "..."
 *     }
 *   ]
 * }
 *
 * Convert either shape into one readable message.
 */
function extractErrorMessage(
  detail
) {
  if (
    !detail
  ) {
    return "";
  }


  if (
    typeof detail ===
    "string"
  ) {
    return detail;
  }


  if (
    Array.isArray(
      detail
    ) &&
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