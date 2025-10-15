namespace SISCOM_API.Models
{
    public class Medication
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Dosage { get; set; }
        public string Frequency { get; set; }
        public TimeSpan ScheduleTime { get; set; }
    }
}
