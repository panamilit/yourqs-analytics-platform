namespace YourQS.API.Models
{
    /// <summary>
    /// Maps to PROJ_MODEL_ATTRIBUTES - measurements and quantities per model element.
    /// </summary>
    public class ModelAttributes
    {
        public string REC_ID { get; set; } = string.Empty;
        public string PROJ_MASTER_REC_ID { get; set; } = string.Empty;
        public string MODEL_NAME { get; set; } = string.Empty;
        public string CODE { get; set; } = string.Empty;
        public DateTime MODEL_DT { get; set; }
        public double AFFECTED_AREA { get; set; }
        public double FLOOR_AREA { get; set; }
        public double EXT_WALL_AREA { get; set; }
        public double INT_WALL_AREA { get; set; }
        public double ROOF_AREA { get; set; }
        public double CEILING_AREA { get; set; }
        public int BATHROOM_COUNT { get; set; }
        public int KITCHEN_COUNT { get; set; }
        public int NO_LEVELS { get; set; }
        public int NO_HOUSING_UNITS { get; set; }
        public double LABOUR_HOURS { get; set; }
    }
}
