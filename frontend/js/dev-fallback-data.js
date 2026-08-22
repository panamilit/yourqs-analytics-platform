/**
 * dev-fallback-data.js
 *
 * OPTIONAL local development aid ONLY.
 * - Disabled by default (see APP_CONFIG.USE_DEV_FALLBACK below).
 * - Never used to silently replace a failed API request — projects.js only
 *   reads this when the flag is explicitly true, and always shows the real
 *   error state when the flag is false.
 * - Contains no business calculations: every derived figure (margin,
 *   selling price per m², status flags) is a fixed sample value, not
 *   something computed here.
 *
 * To use locally without a running backend, set:
 *   window.APP_CONFIG.USE_DEV_FALLBACK = true;
 * in config.js. Leave it false/absent for normal operation.
 */

window.DEV_FALLBACK = {
  summary: {
    totalProjects: 6,
    projectsWithCostData: 4,
    analyticsReadyProjects: 3
  },
  projects: [
    {
      projectId: "dev-0001",
      projectName: "1 Carrie St, Sandringham (V2)",
      floorArea: 38.54,
      totalBathroomCount: 2,
      numberOfLevels: 1,
      modelCount: 1,
      totalCost: 76237.51,
      totalSellingPrice: 103683.01,
      costItemCount: 508,
      hasModelAttributes: true,
      hasCostData: true,
      hasValidFloorArea: true,
      isAnalyticsReady: true,
      grossMargin: 27445.5,
      marginPercent: 26.47,
      sellingPricePerSqm: 2690.27
    },
    {
      projectId: "dev-0002",
      projectName: "14 Beach Rd, Devonport",
      floorArea: 212.1,
      totalBathroomCount: 3,
      numberOfLevels: 2,
      modelCount: 1,
      totalCost: 412300,
      totalSellingPrice: 548900,
      costItemCount: 1204,
      hasModelAttributes: true,
      hasCostData: true,
      hasValidFloorArea: true,
      isAnalyticsReady: true,
      grossMargin: 136600,
      marginPercent: 24.89,
      sellingPricePerSqm: 2588.4
    },
    {
      projectId: "dev-0003",
      projectName: "22B Church Rd, Ellerslie",
      floorArea: null,
      totalBathroomCount: 1,
      numberOfLevels: 1,
      modelCount: 1,
      totalCost: 98650,
      totalSellingPrice: 128500,
      costItemCount: 340,
      hasModelAttributes: false,
      hasCostData: true,
      hasValidFloorArea: false,
      isAnalyticsReady: false,
      grossMargin: null,
      marginPercent: null,
      sellingPricePerSqm: null
    },
    {
      projectId: "dev-0004",
      projectName: "5 Marina Way, Half Moon Bay",
      floorArea: 165.8,
      totalBathroomCount: 2,
      numberOfLevels: 2,
      modelCount: 1,
      totalCost: null,
      totalSellingPrice: null,
      costItemCount: 0,
      hasModelAttributes: true,
      hasCostData: false,
      hasValidFloorArea: true,
      isAnalyticsReady: false,
      grossMargin: null,
      marginPercent: null,
      sellingPricePerSqm: null
    },
    {
      projectId: "dev-0005",
      projectName: "88 Totara Ave, Papatoetoe",
      floorArea: null,
      totalBathroomCount: null,
      numberOfLevels: null,
      modelCount: 0,
      totalCost: null,
      totalSellingPrice: null,
      costItemCount: 0,
      hasModelAttributes: false,
      hasCostData: false,
      hasValidFloorArea: false,
      isAnalyticsReady: false,
      grossMargin: null,
      marginPercent: null,
      sellingPricePerSqm: null
    },
    {
      projectId: "dev-0006",
      projectName: "3 Riverbend Tce, Hamilton",
      floorArea: 301.2,
      totalBathroomCount: 4,
      numberOfLevels: 2,
      modelCount: 2,
      totalCost: 590200,
      totalSellingPrice: 742000,
      costItemCount: 1560,
      hasModelAttributes: true,
      hasCostData: true,
      hasValidFloorArea: true,
      isAnalyticsReady: true,
      grossMargin: 151800,
      marginPercent: 25.72,
      sellingPricePerSqm: 2463.48
    }
  ]
};
