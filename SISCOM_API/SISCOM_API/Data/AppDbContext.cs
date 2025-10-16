using Microsoft.EntityFrameworkCore;
using SISCOM_API.Models;

namespace SISCOM_API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Medication> Medications { get; set; }
        public DbSet<MedicationLog> MedicationLogs { get; set; }

    }
}
