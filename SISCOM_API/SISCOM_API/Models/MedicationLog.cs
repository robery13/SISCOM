using System;

namespace SISCOM_API.Models
{
    public class MedicationLog
    {
        public int Id { get; set; }

        // Relación con medicamento
        public int MedicationId { get; set; }
        public Medication? Medication { get; set; }

        // Fecha y hora en que se tomó
        public DateTime TakenAt { get; set; }

        // Indica si fue tomada o no
        public bool WasTaken { get; set; }
    }
}
