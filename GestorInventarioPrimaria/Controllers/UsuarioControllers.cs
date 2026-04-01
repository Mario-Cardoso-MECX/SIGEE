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
        // NUEVO: Necesario para saber dónde guardar físicamente las fotos
        private readonly IWebHostEnvironment _env;

        // NUEVO: Se agregó IWebHostEnvironment al constructor
        public UsuariosController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
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
                return BadRequest(new { mensaje = "❌ Los apellidos son obligatorios." });

            bool existe = await _context.Usuarios
                .AnyAsync(u => u.Nombre.ToLower() == nuevoAlumno.Nombre.ToLower()
                          && u.Apellidos.ToLower() == nuevoAlumno.Apellidos.ToLower());

            if (existe) return BadRequest(new { mensaje = "❌ Ya existe un alumno con ese nombre y apellidos." });

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

        // --- NUEVO: ENDPOINT PARA SUBIR LA FOTO DE CREDENCIAL ---
        [HttpPost("subir-foto/{matricula}")]
        public async Task<IActionResult> SubirFotoAlumno(string matricula, IFormFile foto)
        {
            if (foto == null || foto.Length == 0)
                return BadRequest(new { mensaje = "No se recibió ninguna imagen." });

            var alumno = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == matricula);
            if (alumno == null) return NotFound(new { mensaje = "Alumno no encontrado." });

            // 1. Validar que sea una imagen
            var ext = Path.GetExtension(foto.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return BadRequest(new { mensaje = "Solo se permiten imágenes JPG o PNG." });

            // 2. Determinar la carpeta base (front en dev, wwwroot en prod)
            string carpetaBase = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "front");
            string carpetaDestino = Path.Combine(carpetaBase, "fotos_alumnos");

            // Si no existe la carpeta "fotos_alumnos", se crea automáticamente
            if (!Directory.Exists(carpetaDestino))
                Directory.CreateDirectory(carpetaDestino);

            // 3. Crear el nombre del archivo usando la matrícula (ej. 2026-001.jpg)
            string nombreArchivo = $"{matricula}{ext}";
            string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);

            // 4. Guardar físicamente la imagen
            using (var stream = new FileStream(rutaCompleta, FileMode.Create))
            {
                await foto.CopyToAsync(stream);
            }

            // 5. Guardar la ruta relativa en la Base de Datos
            alumno.FotoUrl = $"/fotos_alumnos/{nombreArchivo}";
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Foto subida y guardada correctamente.", fotoUrl = alumno.FotoUrl });
        }
        // --------------------------------------------------------

        [HttpPut("editar-alumno/{id:int}")]
        public async Task<IActionResult> EditarAlumno(int id, [FromBody] Usuario datosActualizados)
        {
            var alumnoDb = await _context.Usuarios.FindAsync(id);
            if (alumnoDb == null || alumnoDb.Rol != "Alumno") return NotFound(new { mensaje = "El alumno no existe." });

            alumnoDb.Nombre = datosActualizados.Nombre;
            alumnoDb.Apellidos = datosActualizados.Apellidos;
            alumnoDb.Grupo = datosActualizados.Grupo;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Datos del alumno actualizados correctamente." });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(new { mensaje = "El alumno no existe." });

            var tienePrestamosPendientes = await _context.Reservas.AnyAsync(r => r.UsuarioId == id && r.Estatus == "Activo");
            if (tienePrestamosPendientes) return BadRequest(new { mensaje = "No se puede eliminar al alumno porque tiene préstamos activos pendientes." });

            var historialAnterior = await _context.Reservas.Where(r => r.UsuarioId == id).ToListAsync();
            if (historialAnterior.Any())
            {
                _context.Reservas.RemoveRange(historialAnterior);
            }

            _context.Usuarios.Remove(usuario);
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Alumno eliminado correctamente." });
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
                return BadRequest(new { mensaje = "❌ Todos los campos son obligatorios." });
            }

            bool usernameExiste = await _context.Usuarios.AnyAsync(u => u.Username.ToLower() == nuevoPersonal.Username.ToLower());
            if (usernameExiste) return BadRequest(new { mensaje = "❌ El nombre de usuario ya está en uso." });

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

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(new { mensaje = "Usuario no encontrado." });
            return usuario;
        }

        [HttpPut("editar-personal/{id:int}")]
        public async Task<IActionResult> EditarPersonal(int id, [FromBody] Usuario datosActualizados)
        {
            var usuarioDb = await _context.Usuarios.FindAsync(id);
            if (usuarioDb == null) return NotFound(new { mensaje = "El usuario no existe." });

            usuarioDb.Nombre = datosActualizados.Nombre;
            usuarioDb.Apellidos = datosActualizados.Apellidos;
            usuarioDb.Username = datosActualizados.Username;
            usuarioDb.Rol = datosActualizados.Rol;

            if (!string.IsNullOrWhiteSpace(datosActualizados.PasswordHash)) usuarioDb.PasswordHash = datosActualizados.PasswordHash;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "✅ Datos actualizados correctamente." });
        }

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
                string[] partes = alumno.Grupo.Trim().Split(' ');
                
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

        [HttpDelete("eliminar-egresados")]
        public async Task<IActionResult> EliminarEgresadosMasivo()
        {
            var egresados = await _context.Usuarios
                .Where(u => u.Rol == "Alumno" && u.Grupo != null && u.Grupo.Contains("Egresado"))
                .ToListAsync();
            
            if (egresados.Count == 0) 
                return BadRequest(new { mensaje = "No hay alumnos egresados en el sistema o ya fueron limpiados." });

            int borrados = 0;
            int conDeuda = 0;

            foreach (var eg in egresados)
            {
                var debeMaterial = await _context.Reservas.AnyAsync(r => r.UsuarioId == eg.Id && r.Estatus == "Activo");
                
                if (debeMaterial) {
                    conDeuda++; 
                } else {
                    var historialAnterior = await _context.Reservas.Where(r => r.UsuarioId == eg.Id).ToListAsync();
                    if (historialAnterior.Any())
                    {
                        _context.Reservas.RemoveRange(historialAnterior);
                    }

                    _context.Usuarios.Remove(eg);
                    borrados++;
                }
            }

            await _context.SaveChangesAsync();

            string warning = conDeuda > 0 ? $" ⚠️ IMPORTANTE: {conDeuda} alumnos se mantuvieron en el sistema porque aún deben material." : "";
            return Ok(new { mensaje = $"Limpieza completada. Se eliminaron {borrados} egresados sin deudas." + warning });
        }
    }
}