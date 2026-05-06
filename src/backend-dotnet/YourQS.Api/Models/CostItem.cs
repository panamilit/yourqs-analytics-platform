namespace YourQS.API.Models
{
    /// <summary>
    /// Maps to JOB_COST_ELEMENT joined with JOB_COST_ELEMENT - cost breakdown by scope.
    /// </summary>
    public class CostItem
    {
        public string ScopeName { get; set; } = string.Empty;
        public decimal TotalCost { get; set; }
        public decimal TotalSellingPrice { get; set; }
        public int ItemCount { get; set; }
    }
}
