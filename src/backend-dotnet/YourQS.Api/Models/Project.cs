namespace YourQS.API.Models
{
    public class Project
    {
        public string REC_ID { get; set; } = string.Empty;
        public string NAME { get; set; } = string.Empty;
        public int LAST_KEY_NOTE_NO { get; set; }
        public DateTime INS_DT { get; set; }
    }
}
