namespace YourQS.API.Models
{
    public class CostItem
    {
        public string ScopeName { get; set; } = string.Empty;
        public decimal TotalCost { get; set; }
        public decimal TotalSellingPrice { get; set; }
        public int ItemCount { get; set; }
    }
}
