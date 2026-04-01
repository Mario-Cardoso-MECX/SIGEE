using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Models;

namespace GestorInventarioPrimaria.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Material> Materiales { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Reserva> Reservas { get; set; }
        
        // NUEVO: Agregamos la tabla del Aula
        public DbSet<ReservaAula> ReservasAula { get; set; }
    }
}