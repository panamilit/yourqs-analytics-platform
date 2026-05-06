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
}
