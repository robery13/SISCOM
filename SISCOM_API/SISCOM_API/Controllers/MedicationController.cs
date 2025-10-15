using Microsoft.AspNetCore.Mvc;
using SISCOM_API.Data;
using SISCOM_API.Models;

namespace SISCOM_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MedicationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MedicationController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public IActionResult AddMedication([FromBody] Medication medication)
        {
            if (medication == null)
                return BadRequest("El medicamento no puede estar vacío.");

            _context.Medications.Add(medication);
            _context.SaveChanges();
            return Ok(medication);
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var list = _context.Medications.ToList();
            return Ok(list);
        }
    }
}
