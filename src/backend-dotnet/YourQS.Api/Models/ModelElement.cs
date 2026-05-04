namespace YourQS.Api.Models
{
    public class ModelElement
    {
        public string Id { get; set; } = string.Empty;
        public string ModelHeaderId { get; set; } = string.Empty;
        public string ModelElementId { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string ItemMasterCode { get; set; } = string.Empty;
        public double Area { get; set; }
        public double Volume { get; set; }
        public double ElementLength { get; set; }
        public double Height { get; set; }
        public int MemberCount { get; set; }
        public DateTime InsertedDate { get; set; }
    }
}
