namespace YourQS.API.Models
{
    /// <summary>
    /// Maps to PROJ_MODEL_HEADER — the BIM model linked to a project.
    /// </summary>
    public class ProjectModel
    {
        public string REC_ID { get; set; } = string.Empty;
        public string PROJ_REC_ID { get; set; } = string.Empty;
        public string NAME { get; set; } = string.Empty;
        public DateTime INS_DT { get; set; }
    }
}
