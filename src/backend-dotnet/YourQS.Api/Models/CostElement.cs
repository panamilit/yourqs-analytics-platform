namespace YourQS.Api.Models
{
    public class CostElement
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string ScopeId { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string FamilyCode { get; set; } = string.Empty;
        public string ItemMasterCode { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public bool IsDeleted { get; set; }
        public bool IsInactive { get; set; }
        public DateTime InsertedDate { get; set; }
    }
}
