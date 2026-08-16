namespace YourQS.API.DTOs;

public sealed class ProjectsSummaryDto
{
    public int TotalProjects { get; set; }
    public int ProjectsWithCostData { get; set; }
    public int AnalyticsReadyProjects { get; set; }
}

public sealed class ProjectOverviewDto
{
    public string ProjectId { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;

    public decimal? FloorArea { get; set; }
    public int? TotalBathroomCount { get; set; }
    public int? NumberOfLevels { get; set; }
    public int? ModelCount { get; set; }

    public decimal? TotalCost { get; set; }
    public decimal? TotalSellingPrice { get; set; }
    public int? CostItemCount { get; set; }

    public bool HasModelAttributes { get; set; }
    public bool HasCostData { get; set; }
    public bool HasValidFloorArea { get; set; }
    public bool IsAnalyticsReady { get; set; }

    public decimal? GrossMargin { get; set; }
    public decimal? MarginPercent { get; set; }
    public decimal? SellingPricePerSqm { get; set; }
}

public sealed class ProjectsPageDto
{
    public IReadOnlyList<ProjectOverviewDto> Items { get; set; }
        = Array.Empty<ProjectOverviewDto>();

    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}