using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.DTOs;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestorInventarioPrimaria.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrestamosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PrestamosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> RegistrarPrestamo([FromBody] PrestamoDto datos)
        {
            //  VALIDAR USUARIO
            var usuario = await _context.Usuarios
                                .FirstOrDefaultAsync(u => u.Matricula == datos.MatriculaAlumno);

            if (usuario == null)
            {
                return BadRequest("❌ No existe ningún usuario con esa matrícula.");
            }

            // --- NUEVO: BLOQUEO ESTRICTO A EGRESADOS (A prueba de espacios) ---
            if (!string.IsNullOrEmpty(usuario.Grupo) && usuario.Grupo.ToUpper().Contains("EGRESADO"))
            {
                return BadRequest($"❌ {usuario.Nombre} es un alumno Egresado. Ya no se le puede prestar material.");
            }

            //  VALIDAR MATERIAL (Libro, Balón o Salón)
            var material = await _context.Materiales.FindAsync(datos.MaterialId);

            if (material == null)
            {
                return NotFound("❌ El material no existe.");
            }

            if (material.Categoria == "Salón")
            {
                // Si es salón y el usuario NO es Docente ni Admin, lo rebotamos
                if (usuario.Rol != "Docente" && usuario.Rol != "Admin")
                {
                    return BadRequest($"❌ Acceso denegado: Los salones solo pueden ser reservados por Docentes. El rol de {usuario.Nombre} es {usuario.Rol}.");
                }
            }

            //  VALIDAR SI YA TIENE ESE MATERIAL PRESTADO
            var prestamosActivos = await _context.Reservas
                .CountAsync(r => r.UsuarioId == usuario.Id && r.Estatus == "Activo");

            if (prestamosActivos >= 2)
            {
                return BadRequest($"❌ {usuario.Nombre} ya tiene {prestamosActivos} préstamos activos. Debe devolver alguno primero.");
            }

            // Validamos Stock
            if (material.StockDisponible <= 0)
            {
                return BadRequest($"❌ No hay disponibilidad de '{material.Titulo}'.");
            }

            // CREAR LA RESERVA
            var nuevaReserva = new Reserva
            {
                UsuarioId = usuario.Id,
                MaterialId = material.Id,
                FechaInicio = DateTime.Now,

                FechaFinEsperada = material.Categoria == "Libro"
                                   ? DateTime.Now.AddDays(7)
                                   : DateTime.Now.AddHours(datos.HorasDuracion ?? 2),

                Motivo = "Préstamo escolar",
                Estatus = "Activo"
            };

            // ACTUALIZAR STOCK
            material.StockDisponible -= 1;

            // GUARDAR
            _context.Reservas.Add(nuevaReserva);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "✅ Préstamo exitoso",
                alumno = usuario.Nombre,
                material = material.Titulo,
                fechaTermino = nuevaReserva.FechaFinEsperada.ToString("g")
            });
        }

        // Get: api/prestamos/pendientes/2023001
        [HttpGet("pendientes/{matricula}")]
        public async Task<ActionResult<IEnumerable<object>>> GetPendientes(string matricula)
        {
            var alumno = await _context.Usuarios
                                .FirstOrDefaultAsync(u => u.Matricula == matricula);

            if (alumno == null) return NotFound("Alumno no encontrado");

            var prestamos = await _context.Reservas
                                  .Include(r => r.Material) 
                                  .Where(r => r.UsuarioId == alumno.Id && r.Estatus == "Activo")
                                  .Select(r => new
                                  {
                                      IdReserva = r.Id,
                                      Material = r.Material.Titulo,
                                      FechaInicio = r.FechaInicio.ToShortDateString(),
                                      FechaFin = r.FechaFinEsperada.ToShortDateString(),
                                      FechaFinRaw = r.FechaFinEsperada
                                  })
                                  .ToListAsync();

            return Ok(prestamos);
        }

        // PUT: api/prestamos/devolver/5
        [HttpPut("devolver/{idReserva}")]
        public async Task<IActionResult> DevolverMaterial(int idReserva)
        {
            // Buscamos la reserva (y cargamos el material relacionado)
            var reserva = await _context.Reservas
                                .Include(r => r.Material)
                                .FirstOrDefaultAsync(r => r.Id == idReserva);

            if (reserva == null) return NotFound("Reserva no encontrada");

            if (reserva.Estatus == "Devuelto") return BadRequest("Este material ya fue devuelto.");

            // Actualizamos la Reserva
            reserva.Estatus = "Devuelto";
            reserva.FechaDevolucionReal = DateTime.Now;

            // Actualizamos el Stock (Sumamos 1)
            if (reserva.Material != null)
            {
                reserva.Material.StockDisponible += 1;
            }

            // Guardamos cambios
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "✅ Devolución exitosa. Stock actualizado." });
        }

        // PUT: api/Prestamos/renovar/5
        [HttpPut("renovar/{id}")]
        public async Task<IActionResult> RenovarPrestamo(int id)
        {
            var reserva = await _context.Reservas.FindAsync(id);

            if (reserva == null) return NotFound("Préstamo no encontrado.");
            if (reserva.Estatus != "Activo") return BadRequest("Solo se pueden renovar préstamos activos.");

            // Extendemos 7 días más a partir de la fecha límite que ya tenía
            reserva.FechaFinEsperada = reserva.FechaFinEsperada.AddDays(7);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "✅ Préstamo renovado por 7 días más",
                nuevaFecha = reserva.FechaFinEsperada.ToString("dd/MM/yyyy")
            });
        }

        // NUEVO: GET api/prestamos/historial-alumno/5 (Para el historial individual)
        [HttpGet("historial-alumno/{usuarioId}")]
        public async Task<IActionResult> GetHistorialPorAlumno(int usuarioId)
        {
            var historial = await _context.Reservas
                .Include(r => r.Material)
                .Where(r => r.UsuarioId == usuarioId)
                .OrderByDescending(r => r.FechaInicio)
                .Select(r => new {
                    Material = r.Material.Titulo,
                    Categoria = r.Material.Categoria,
                    FechaPrestamo = r.FechaInicio.ToString("dd/MM/yyyy"),
                    Estado = r.Estatus
                })
                .ToListAsync();

            return Ok(historial);
        }

        // GET: api/prestamos/historial?pagina=1&cantidad=10
        [HttpGet("historial")]
        public async Task<ActionResult<IEnumerable<object>>> GetHistorial(int pagina = 1, int cantidad = 10)
        {
            if (pagina <= 0) pagina = 1;
            if (cantidad <= 0) cantidad = 10;

            return await _context.Reservas
                .Include(r => r.Usuario)
                .Include(r => r.Material)
                .OrderByDescending(r => r.FechaInicio) 
                .Skip((pagina - 1) * cantidad)       
                .Take(cantidad)
                .Select(r => new {
                    IdReserva = r.Id,
                    Alumno = r.Usuario.Nombre,
                    Material = r.Material.Titulo,
                    FechaInicioRaw = r.FechaInicio,
                    FechaVencimiento = r.FechaFinEsperada,
                    Estado = r.Estatus
                })
                .ToListAsync();
        }
    }
}