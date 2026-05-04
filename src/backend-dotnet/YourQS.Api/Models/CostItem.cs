namespace YourQS.API.Models
{
    /// <summary>
    /// Maps to JOB_COST_ELEMENT — cost line items linked to model elements.
    /// </summary>
    public class CostItem
    {
        public string REC_ID { get; set; } = string.Empty;
        public string NAME { get; set; } = string.Empty;
        public string CODE { get; set; } = string.Empty;
        public string SCOPE_ID { get; set; } = string.Empty;
        public string FAMILY { get; set; } = string.Empty;
        public string FAMILYCODE { get; set; } = string.Empty;
        public string ITEM_MASTER_CODE { get; set; } = string.Empty;
        public string MODEL_HEADER_REC_ID { get; set; } = string.Empty;
        public string MODEL_ELEMENT_REC_ID { get; set; } = string.Empty;
        public string NOTES { get; set; } = string.Empty;
        public bool IS_DELETED { get; set; }
        public bool IS_INACTIVE { get; set; }
        public DateTime INS_DT { get; set; }
    }
}
