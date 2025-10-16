using Microsoft.AspNetCore.Mvc;
using SISCOM_API.Data;
using SISCOM_API.Models;

namespace SISCOM_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MedicationLogController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MedicationLogController(AppDbContext context)
        {
            _context = context;
        }

        // 🔹 POST: api/MedicationLog → registrar que el paciente tomó su dosis
        [HttpPost]
        public IActionResult LogMedication([FromBody] MedicationLog log)
        {
            if (!_context.Medications.Any(m => m.Id == log.MedicationId))
                return NotFound("El medicamento no existe.");

            log.TakenAt = DateTime.Now;
            _context.MedicationLogs.Add(log);
            _context.SaveChanges();

            return Ok(log);
        }

        // 🔹 GET: api/MedicationLog → ver todos los registros
        [HttpGet]
        public IActionResult GetAll()
        {
            var logs = _context.MedicationLogs.ToList();
            return Ok(logs);
        }
    }
}
