namespace YourQS.API.Models
{
    /// <summary>
    /// Maps to PROJ_MODEL_ATTRIBUTES — measurements and quantities per model element.
    /// </summary>
    public class ModelAttributes
    {
        public string REC_ID { get; set; } = string.Empty;
        public string MODEL_HEADER_REC_ID { get; set; } = string.Empty;
        public string MODEL_ELEMENT_REC_ID { get; set; } = string.Empty;
        public string FAMILY { get; set; } = string.Empty;
        public string ITEM_MASTER_CODE { get; set; } = string.Empty;
        public string SCOPE_ID { get; set; } = string.Empty;
        public double AREA { get; set; }
        public double VOLUME { get; set; }
        public double ELEMENTLENGTH { get; set; }
        public double HEIGHT { get; set; }
        public int MEMBER_COUNT { get; set; }
        public DateTime INS_DT { get; set; }
    }
}
