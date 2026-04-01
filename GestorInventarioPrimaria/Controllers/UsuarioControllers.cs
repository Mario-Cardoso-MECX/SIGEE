using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;

namespace GestorInventarioPrimaria.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsuariosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("alumnos")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetAlumnos()
        {
            return await _context.Usuarios
                                 .Where(u => u.Rol == "Alumno")
                                 .OrderBy(u => u.Matricula)
                                 .ToListAsync();
        }

        [HttpGet("buscar")]
        public async Task<ActionResult<IEnumerable<Usuario>>> BuscarUsuarios([FromQuery] string termino)
        {
            if (string.IsNullOrWhiteSpace(termino)) return Ok(new List<Usuario>());

            return await _context.Usuarios
                .Where(u => u.Nombre.Contains(termino) || u.Matricula.Contains(termino))
                .Take(5) 
                .ToListAsync();
        }

        [HttpPost("crear")]
        public async Task<IActionResult> CrearAlumno([FromBody] Usuario nuevoAlumno)
        {
            if (string.IsNullOrWhiteSpace(nuevoAlumno.Apellidos))
                return BadRequest("❌ Los apellidos son obligatorios.");

            bool existe = await _context.Usuarios
                .AnyAsync(u => u.Nombre.ToLower() == nuevoAlumno.Nombre.ToLower()
                          && u.Apellidos.ToLower() == nuevoAlumno.Apellidos.ToLower());

            if (existe) return BadRequest("❌ Ya existe un alumno con ese nombre y apellidos.");

            string anioActual = DateTime.Now.Year.ToString();
            var ultimoUsuario = await _context.Usuarios
                .Where(u => u.Matricula.StartsWith(anioActual))
                .OrderByDescending(u => u.Id)
                .FirstOrDefaultAsync();

            int consecutivo = 1;
            if (ultimoUsuario != null && ultimoUsuario.Matricula.Contains("-"))
            {
                string[] partes = ultimoUsuario.Matricula.Split('-');
                if (partes.Length > 1 && int.TryParse(partes[1], out int num))
                {
                    consecutivo = num + 1;
                }
            }

            nuevoAlumno.Matricula = $"{anioActual}-{consecutivo:D3}";
            nuevoAlumno.Rol = "Alumno";
            nuevoAlumno.PasswordHash = "1234";

            _context.Usuarios.Add(nuevoAlumno);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "✅ Alumno registrado con éxito", matricula = nuevoAlumno.Matricula });
        }

        // --- CORRECCIÓN: Le agregamos :int ---
        [HttpPut("editar-alumno/{id:int}")]
        public async Task<IActionResult> EditarAlumno(int id, [FromBody] Usuario datosActualizados)
        {
            var alumnoDb = await _context.Usuarios.FindAsync(id);
            if (alumnoDb == null || alumnoDb.Rol != "Alumno") return NotFound("El alumno no existe.");

            alumnoDb.Nombre = datosActualizados.Nombre;
            alumnoDb.Apellidos = datosActualizados.Apellidos;
            alumnoDb.Grupo = datosActualizados.Grupo;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Datos del alumno actualizados correctamente." });
        }

        // --- CORRECCIÓN: Le agregamos :int ---
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound("El alumno no existe.");

            var tienePrestamosPendientes = await _context.Reservas.AnyAsync(r => r.UsuarioId == id && r.Estatus == "Activo");
            if (tienePrestamosPendientes) return BadRequest("No se puede eliminar al alumno porque tiene préstamos activos pendientes.");

            _context.Usuarios.Remove(usuario);
            await _context.SaveChangesAsync();
            return Ok("Alumno eliminado correctamente.");
        }

        [HttpGet("personal")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetPersonalAdministrativo()
        {
            return await _context.Usuarios.Where(u => u.Rol != "Alumno").OrderBy(u => u.Rol).ThenBy(u => u.Nombre).ToListAsync();
        }

        [HttpPost("crear-personal")]
        public async Task<IActionResult> CrearPersonal([FromBody] Usuario nuevoPersonal)
        {
            if (string.IsNullOrWhiteSpace(nuevoPersonal.Nombre) || string.IsNullOrWhiteSpace(nuevoPersonal.Apellidos) ||
                string.IsNullOrWhiteSpace(nuevoPersonal.Username) || string.IsNullOrWhiteSpace(nuevoPersonal.PasswordHash) ||
                string.IsNullOrWhiteSpace(nuevoPersonal.Rol))
            {
                return BadRequest("❌ Todos los campos son obligatorios.");
            }

            bool usernameExiste = await _context.Usuarios.AnyAsync(u => u.Username.ToLower() == nuevoPersonal.Username.ToLower());
            if (usernameExiste) return BadRequest("❌ El nombre de usuario ya está en uso.");

            string anioActual = DateTime.Now.Year.ToString();
            var ultimoPersonal = await _context.Usuarios.Where(u => u.Matricula.StartsWith("PER-" + anioActual)).OrderByDescending(u => u.Id).FirstOrDefaultAsync();

            int consecutivo = 1;
            if (ultimoPersonal != null && ultimoPersonal.Matricula.Contains("-"))
            {
                string[] partes = ultimoPersonal.Matricula.Split('-');
                if (partes.Length > 2 && int.TryParse(partes[2], out int num)) consecutivo = num + 1;
            }

            nuevoPersonal.Matricula = $"PER-{anioActual}-{consecutivo:D3}";
            nuevoPersonal.Grupo = string.Empty;

            _context.Usuarios.Add(nuevoPersonal);
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Usuario registrado con éxito", matricula = nuevoPersonal.Matricula });
        }

        // --- CORRECCIÓN: Le agregamos :int ---
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound("Usuario no encontrado.");
            return usuario;
        }

        // --- CORRECCIÓN: Le agregamos :int ---
        [HttpPut("editar-personal/{id:int}")]
        public async Task<IActionResult> EditarPersonal(int id, [FromBody] Usuario datosActualizados)
        {
            var usuarioDb = await _context.Usuarios.FindAsync(id);
            if (usuarioDb == null) return NotFound("El usuario no existe.");

            usuarioDb.Nombre = datosActualizados.Nombre;
            usuarioDb.Apellidos = datosActualizados.Apellidos;
            usuarioDb.Username = datosActualizados.Username;
            usuarioDb.Rol = datosActualizados.Rol;

            if (!string.IsNullOrWhiteSpace(datosActualizados.PasswordHash)) usuarioDb.PasswordHash = datosActualizados.PasswordHash;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "✅ Datos actualizados correctamente." });
        }

        // --- CORRECCIÓN: Le agregamos :int ---
        [HttpDelete("eliminar-personal/{id:int}")]
        public async Task<IActionResult> EliminarPersonal(int id)
        {
            var personalDb = await _context.Usuarios.FindAsync(id);
            if (personalDb == null) return NotFound(new { mensaje = "El usuario no existe." });
            if (personalDb.Rol == "Alumno") return BadRequest(new { mensaje = "Los alumnos se deben eliminar desde el módulo de Alumnos." });

            _context.Usuarios.Remove(personalDb);
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "✅ Personal eliminado correctamente." });
        }

        [HttpPost("promocion-masiva")]
        public async Task<IActionResult> PromocionMasiva()
        {
            var alumnos = await _context.Usuarios.Where(u => u.Rol == "Alumno").ToListAsync();
            int promovidos = 0; int egresados = 0;

            foreach (var alumno in alumnos)
            {
                if (string.IsNullOrWhiteSpace(alumno.Grupo)) continue;
                string[] partes = alumno.Grupo.Split(' ');
                
                if (partes.Length >= 2)
                {
                    string grado = partes[0]; string letra = partes[1];
                    switch (grado)
                    {
                        case "1°": alumno.Grupo = $"2° {letra}"; promovidos++; break;
                        case "2°": alumno.Grupo = $"3° {letra}"; promovidos++; break;
                        case "3°": alumno.Grupo = $"4° {letra}"; promovidos++; break;
                        case "4°": alumno.Grupo = $"5° {letra}"; promovidos++; break;
                        case "5°": alumno.Grupo = $"6° {letra}"; promovidos++; break;
                        case "6°": alumno.Grupo = "Egresado"; egresados++; break;
                    }
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = $"¡Cierre exitoso! {promovidos} alumnos subieron de grado y {egresados} niños se marcaron como Egresados." });
        }

        // --- NUEVO: LIMPIEZA MASIVA DE EGRESADOS (RESPETANDO DEUDORES) ---
        [HttpDelete("eliminar-egresados")]
        public async Task<IActionResult> EliminarEgresadosMasivo()
        {
            var egresados = await _context.Usuarios.Where(u => u.Rol == "Alumno" && u.Grupo == "Egresado").ToListAsync();
            
            if (egresados.Count == 0) 
                return BadRequest(new { mensaje = "No hay alumnos egresados en el sistema." });

            int borrados = 0;
            int conDeuda = 0;

            foreach (var eg in egresados)
            {
                // Verificamos si debe material
                var debeMaterial = await _context.Reservas.AnyAsync(r => r.UsuarioId == eg.Id && r.Estatus == "Activo");
                
                if (debeMaterial) {
                    conDeuda++; 
                } else {
                    _context.Usuarios.Remove(eg);
                    borrados++;
                }
            }

            await _context.SaveChangesAsync();

            string warning = conDeuda > 0 ? $" ⚠️ IMPORTANTE: {conDeuda} alumnos no se borraron porque aún deben material." : "";
            return Ok(new { mensaje = $"Limpieza completada. Se eliminaron {borrados} egresados del sistema." + warning });
        }
    }
}