using Microsoft.AspNetCore.Mvc;

namespace YourQS.API.DTOs;

public sealed class ProjectOverviewQuery
{
    [FromQuery(Name = "search")]
    public string? Search { get; set; }

    [FromQuery(Name = "min_floor_area")]
    public decimal? MinFloorArea { get; set; }

    [FromQuery(Name = "max_floor_area")]
    public decimal? MaxFloorArea { get; set; }

    [FromQuery(Name = "levels")]
    public int? Levels { get; set; }

    [FromQuery(Name = "has_cost_data")]
    public bool? HasCostData { get; set; }

    [FromQuery(Name = "analytics_ready")]
    public bool? AnalyticsReady { get; set; }

    [FromQuery(Name = "page")]
    public int Page { get; set; } = 1;

    [FromQuery(Name = "page_size")]
    public int PageSize { get; set; } = 25;

    [FromQuery(Name = "sort_by")]
    public string SortBy { get; set; } = "project_name";

    [FromQuery(Name = "sort_order")]
    public string SortOrder { get; set; } = "asc";
}