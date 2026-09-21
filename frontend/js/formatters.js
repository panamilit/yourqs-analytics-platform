/**
 * formatters.js
 * Pure display-formatting helpers. No business calculations live here —
 * every numeric value has already been computed by the API.
 */

const NZD_FORMATTER = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0
});

const NZD_FORMATTER_PRECISE = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 2
});

const NZD_FORMATTER_COMPACT = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  notation: "compact",
  maximumFractionDigits: 1
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-NZ");

const DATE_FORMATTER = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

/** Standard English ordinal suffix (1st, 2nd, 3rd, 4th, 11th, 21st, ...). */
function ordinalSuffix(n) {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (abs % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

const Formatters = {
  /** Format a value as NZD currency. Returns "N/A" for null/undefined/NaN. */
  currency(value, { precise = false } = {}) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    return precise
      ? NZD_FORMATTER_PRECISE.format(value)
      : NZD_FORMATTER.format(value);
  },

  /** Compact NZD currency for tight chart labels, e.g. 45126.99 -> "$45.1K". */
  currencyCompact(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    return NZD_FORMATTER_COMPACT.format(value);
  },

  /** Format a value as a percentage string, e.g. 26.47 -> "26.47%". */
  percent(value, fractionDigits = 1) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    return `${Number(value).toFixed(fractionDigits)}%`;
  },

  /** Signed NZD currency, e.g. 3276.2 -> "+$3,276.20", -478.4 -> "-$478.40". */
  currencySigned(value, { precise = false } = {}) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    const formatted = this.currency(Math.abs(value), { precise });
    return Number(value) < 0 ? `-${formatted}` : `+${formatted}`;
  },

  /** Signed percentage, e.g. 1.35 -> "+1.35%", -5 -> "-5.00%". */
  percentSigned(value, fractionDigits = 2) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    const num = Number(value);
    const formatted = `${Math.abs(num).toFixed(fractionDigits)}%`;
    return num < 0 ? `-${formatted}` : `+${formatted}`;
  },

  /** Signed percentage-point difference, e.g. -1.128 -> "-1.13 percentage points". */
  percentagePoints(value, fractionDigits = 2) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    const num = Number(value);
    const formatted = `${Math.abs(num).toFixed(fractionDigits)} percentage points`;
    return num < 0 ? `-${formatted}` : `+${formatted}`;
  },

  /** Format a percentile with its ordinal suffix, e.g. 37.617 -> "37.6th percentile". */
  percentile(value, fractionDigits = 1) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    const num = Number(value);
    const rounded = num.toFixed(fractionDigits);
    return `${rounded}${ordinalSuffix(Math.trunc(num))} percentile`;
  },

  /** Format a floor area in square metres. */
  area(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    return `${NUMBER_FORMATTER.format(value)} m\u00B2`;
  },

  /** Format a plain integer count (levels, bathrooms). */
  count(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "N/A";
    }
    return NUMBER_FORMATTER.format(value);
  },

  /** Generic fallback for any value that might be missing. */
  orNA(value) {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }
    return String(value);
  },

  /** Format an ISO date/timestamp string as a short readable date, e.g.
   *  "2026-01-12T04:00:00Z" -> "12 Jan 2026". */
  date(value) {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    return DATE_FORMATTER.format(parsed);
  },

  /**
   * Map the API-supplied readiness flags to a status label + status key.
   * The API decides what "ready" means; this only chooses copy/styling.
   */
  status({ isAnalyticsReady, hasCostData, hasValidFloorArea }) {
    if (isAnalyticsReady) {
      return { key: "ready", label: "Analytics ready" };
    }
    if (!hasCostData && !hasValidFloorArea) {
      return { key: "limited", label: "Limited data" };
    }
    if (!hasCostData) {
      return { key: "missing-cost", label: "Missing cost data" };
    }
    if (!hasValidFloorArea) {
      return { key: "missing-area", label: "Missing floor area" };
    }
    return { key: "limited", label: "Limited data" };
  }
};
