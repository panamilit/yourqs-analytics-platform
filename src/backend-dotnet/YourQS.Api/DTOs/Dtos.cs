using System.ComponentModel.DataAnnotations;

namespace YourQS.API.DTOs
{
    public class ProjectDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }

    public class ProjectModelDto
    {
        public string Id { get; set; } = string.Empty;
        public string ProjectId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }

    public class ModelAttributesDto
    {
        public string Id { get; set; } = string.Empty;
        public string ModelHeaderId { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string ScopeId { get; set; } = string.Empty;
        public string ItemMasterCode { get; set; } = string.Empty;
        public double Area { get; set; }
        public double Volume { get; set; }
        public double ElementLength { get; set; }
        public double Height { get; set; }
        public int MemberCount { get; set; }
    }

    public class CostItemDto
    {
        public string ScopeName { get; set; } = string.Empty;
        public decimal TotalCost { get; set; }
        public decimal TotalSellingPrice { get; set; }
        public int ItemCount { get; set; }
    }

        public class CostPerSqmDto
    {
        public string ProjectId { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public double FloorArea { get; set; }
        public decimal TotalSellingPrice { get; set; }
        public decimal CostPerSqm { get; set; }
    }

    public class ProjectSummaryDto
    {
        public int TotalProjects { get; set; }
        public double AvgFloorArea { get; set; }
        public decimal AvgCostPerSqm { get; set; }
        public decimal MinCostPerSqm { get; set; }
        public decimal MaxCostPerSqm { get; set; }
    }

    public class BenchmarkDto
    {
        public string ProjectId { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public decimal FloorArea { get; set; }
        public int? NumberOfLevels { get; set; }
        public decimal ProjectCostPerSqm { get; set; }
        public int PeerCount { get; set; }
        public decimal FloorAreaTolerancePercent { get; set; }
        public decimal MinimumComparableFloorArea { get; set; }
        public decimal MaximumComparableFloorArea { get; set; }
        public bool MatchedNumberOfLevels { get; set; }
        public decimal AverageCostPerSqm { get; set; }
        public decimal MedianCostPerSqm { get; set; }
        public decimal MinimumCostPerSqm { get; set; }
        public decimal MaximumCostPerSqm { get; set; }
        public decimal VariancePercent { get; set; }
        public decimal AlertThresholdPercent { get; set; }
        public bool IsFlagged { get; set; }
        public string FlagDirection { get; set; } = string.Empty;
        public string FlagReason { get; set; } = string.Empty;
    }

    public class BenchmarkQueryDto
    {
        [Range(typeof(decimal), "1", "100")]
        public decimal FloorAreaTolerancePercent { get; set; } = 20;

        [Range(typeof(decimal), "1", "100")]
        public decimal AlertThresholdPercent { get; set; } = 20;

        [Range(1, 100)]
        public int MinimumPeers { get; set; } = 3;

        public bool MatchNumberOfLevels { get; set; } = true;
    }

    public class BenchmarkCandidateDto
    {
        public string ProjectId { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public decimal FloorArea { get; set; }
        public int? NumberOfLevels { get; set; }
        public decimal CostPerSqm { get; set; }
        public bool IsTarget { get; set; }
    }

    public class BenchmarkCalculationOutcome
    {
        public BenchmarkDto? Result { get; init; }
        public string? ErrorCode { get; init; }
        public string? ErrorMessage { get; init; }
        public int AvailablePeerCount { get; init; }
        public bool IsSuccess => Result is not null;

        public static BenchmarkCalculationOutcome Success(BenchmarkDto result) =>
            new() { Result = result };

        public static BenchmarkCalculationOutcome Failure(
            string code,
            string message,
            int availablePeerCount = 0) =>
            new()
            {
                ErrorCode = code,
                ErrorMessage = message,
                AvailablePeerCount = availablePeerCount
            };
    }

    public class WhatIfDto
    {
        public string ScopeName { get; set; } = string.Empty;
        public decimal OriginalCost { get; set; }
        public decimal ModifiedCost { get; set; }
        public decimal CostDifference { get; set; }
        public double ChangePercent { get; set; }
    }

    public class MaterialWhatIfRequestDto
    {
        [Required]
        public string ProjectId { get; set; } = string.Empty;

        [Required]
        public string ModelId { get; set; } = string.Empty;

        [Required]
        public string ScenarioType { get; set; } = string.Empty;

        [Required]
        public string ScopeName { get; set; } = string.Empty;

        [Required]
        public string OriginalMaterial { get; set; } = string.Empty;

        [Required]
        public string ReplacementMaterial { get; set; } = string.Empty;

        [Range(typeof(decimal), "0", "1000000")]
        public decimal ReplacementUnitRate { get; set; }
    }

    public class MaterialWhatIfDto
    {
        public string ProjectId { get; set; } = string.Empty;
        public string ModelId { get; set; } = string.Empty;
        public string ModelName { get; set; } = string.Empty;
        public string ScenarioType { get; set; } = string.Empty;
        public string ScopeName { get; set; } = string.Empty;
        public string OriginalMaterial { get; set; } = string.Empty;
        public string ReplacementMaterial { get; set; } = string.Empty;
        public string MeasureUnit { get; set; } = "m2";
        public decimal AffectedQuantity { get; set; }
        public decimal OriginalUnitRate { get; set; }
        public decimal ReplacementUnitRate { get; set; }
        public decimal OriginalAffectedCost { get; set; }
        public decimal ModifiedAffectedCost { get; set; }
        public decimal OriginalProjectTotal { get; set; }
        public decimal ModifiedProjectTotal { get; set; }
        public decimal CostDifference { get; set; }
        public decimal ChangePercent { get; set; }
    }

    public class WhatIfCostInputsDto
    {
        public string ProjectId { get; set; } = string.Empty;
        public string ModelId { get; set; } = string.Empty;
        public string ModelName { get; set; } = string.Empty;
        public decimal? AffectedQuantity { get; set; }
        public decimal OriginalAffectedCost { get; set; }
        public decimal OriginalProjectTotal { get; set; }
        public int ScopeItemCount { get; set; }
    }

    public class WhatIfCalculationOutcome
    {
        public MaterialWhatIfDto? Result { get; init; }
        public string? ErrorCode { get; init; }
        public string? ErrorMessage { get; init; }
        public bool IsSuccess => Result is not null;

        public static WhatIfCalculationOutcome Success(MaterialWhatIfDto result) =>
            new() { Result = result };

        public static WhatIfCalculationOutcome Failure(string code, string message) =>
            new() { ErrorCode = code, ErrorMessage = message };
    }
}
