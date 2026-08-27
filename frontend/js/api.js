/**
 * api.js
 * All HTTP communication with the FastAPI backend. No rendering, no state,
 * no business calculations — just requests, responses, and error shaping.
 */

class ApiError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.cause = cause;
  }
}

const Api = {
  /** Build the full URL for a given path using the configured base URL. */
  buildUrl(path, params = {}) {
    const base = window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, "");
    const url = new URL(`${base}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      url.searchParams.set(key, value);
    });
    return url.toString();
  },

  /** GET /api/projects/summary */
  async getProjectsSummary({ signal } = {}) {
    const url = this.buildUrl("/api/projects/summary");
    return this._request(url, { signal });
  },

  /**
   * GET /api/projects
   * filters: search, min_floor_area, max_floor_area, levels, has_cost_data,
   *          analytics_ready, page, page_size, sort_by, sort_order
   */
  async getProjects(filters = {}, { signal } = {}) {
    const url = this.buildUrl("/api/projects", filters);
    return this._request(url, { signal });
  },

  /** GET /api/projects/{project_id}/details */
  async getProjectDetails(projectId, { signal } = {}) {
    const url = this.buildUrl(`/api/projects/${encodeURIComponent(projectId)}/details`);
    return this._request(url, { signal });
  },

  /** GET /api/benchmarking/projects/{project_id} */
  async getProjectBenchmark(projectId, { signal } = {}) {
    const url = this.buildUrl(`/api/benchmarking/projects/${encodeURIComponent(projectId)}`);
    return this._request(url, { signal });
  },

  /** POST /api/comparison/projects — body: { projectIds } */
  async compareProjects(projectIds, { signal } = {}) {
    const url = this.buildUrl("/api/comparison/projects");
    return this._request(url, {
      method: "POST",
      body: { projectIds },
      signal
    });
  },

  /** POST /api/what-if/projects/{project_id} — body: { adjustments } */
  async runWhatIfScenario(projectId, adjustments, { signal } = {}) {
    const url = this.buildUrl(`/api/what-if/projects/${encodeURIComponent(projectId)}`);
    return this._request(url, {
      method: "POST",
      body: { adjustments },
      signal
    });
  },

  /** Shared fetch wrapper with consistent error handling. */
  async _request(url, { signal, method = "GET", body = null } = {}) {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body !== null ? { "Content-Type": "application/json" } : {})
        },
        body: body !== null ? JSON.stringify(body) : undefined,
        signal
      });
    } catch (err) {
      if (err.name === "AbortError") {
        throw err; // let callers detect cancellation explicitly
      }
      throw new ApiError("Unable to reach the server. Check your connection and try again.", {
        cause: err
      });
    }

    if (!response.ok) {
      let detail = "";
      try {
        const errorBody = await response.json();
        detail = errorBody?.message || errorBody?.detail || "";
      } catch (_) {
        /* response had no JSON body */
      }
      throw new ApiError(
        detail || `Request failed with status ${response.status}.`,
        { status: response.status }
      );
    }

    try {
      return await response.json();
    } catch (err) {
      throw new ApiError("The server returned an unexpected response.", { cause: err });
    }
  }
};
