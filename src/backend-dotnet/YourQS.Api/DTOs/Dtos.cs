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
        public decimal ProjectCostPerSqm { get; set; }
        public decimal AverageCostPerSqm { get; set; }
        public decimal VariancePercent { get; set; }
        public bool IsFlagged { get; set; }
        public string FlagReason { get; set; } = string.Empty;
    }

    public class WhatIfDto
    {
        public string ScopeName { get; set; } = string.Empty;
        public decimal OriginalCost { get; set; }
        public decimal ModifiedCost { get; set; }
        public decimal CostDifference { get; set; }
        public double ChangePercent { get; set; }
    }
}
