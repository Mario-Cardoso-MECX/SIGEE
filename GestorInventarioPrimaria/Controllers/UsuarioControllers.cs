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

        // GET: api/usuarios/buscar?termino=juan
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

            // Evitar duplicados exactos (Nombre + Apellido)
            bool existe = await _context.Usuarios
                .AnyAsync(u => u.Nombre.ToLower() == nuevoAlumno.Nombre.ToLower()
                          && u.Apellidos.ToLower() == nuevoAlumno.Apellidos.ToLower());

            if (existe) return BadRequest("❌ Ya existe un alumno con ese nombre y apellidos."); ;

            // Generar Matrícula Automática (Ej: 2026-001)
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

            // Asignar datos al modelo
            nuevoAlumno.Matricula = $"{anioActual}-{consecutivo:D3}";
            nuevoAlumno.Rol = "Alumno";
            nuevoAlumno.PasswordHash = "1234";

            _context.Usuarios.Add(nuevoAlumno);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "✅ Alumno registrado con éxito",
                matricula = nuevoAlumno.Matricula
            });
        }

        // PUT: api/Usuarios/editar-alumno/5
        [HttpPut("editar-alumno/{id}")]
        public async Task<IActionResult> EditarAlumno(int id, [FromBody] Usuario datosActualizados)
        {
            var alumnoDb = await _context.Usuarios.FindAsync(id);

            // Verificamos que exista y que realmente sea un alumno
            if (alumnoDb == null || alumnoDb.Rol != "Alumno")
                return NotFound("El alumno no existe.");

            // Actualizamos solo los datos permitidos
            alumnoDb.Nombre = datosActualizados.Nombre;
            alumnoDb.Apellidos = datosActualizados.Apellidos;
            alumnoDb.Grupo = datosActualizados.Grupo;

            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Datos del alumno actualizados correctamente." });
        }

        // DELETE: api/Usuarios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null)
            {
                return NotFound("El alumno no existe.");
            }

            // Validación extra: No borrar si debe materiales
            var tienePrestamosPendientes = await _context.Reservas
                .AnyAsync(r => r.UsuarioId == id && r.Estatus == "Activo");

            if (tienePrestamosPendientes)
            {
                return BadRequest("No se puede eliminar al alumno porque tiene préstamos activos pendientes.");
            }

            _context.Usuarios.Remove(usuario);
            await _context.SaveChangesAsync();

            return Ok("Alumno eliminado correctamente.");
        }

        // GET: api/Usuarios/personal
        [HttpGet("personal")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetPersonalAdministrativo()
        {
            // Traemos a todos los que NO sean Alumnos
            return await _context.Usuarios
                .Where(u => u.Rol != "Alumno")
                .OrderBy(u => u.Rol)
                .ThenBy(u => u.Nombre)
                .ToListAsync();
        }

        // POST: api/Usuarios/crear-personal
        [HttpPost("crear-personal")]
        public async Task<IActionResult> CrearPersonal([FromBody] Usuario nuevoPersonal)
        {
            // 1. Validaciones básicas (Código defensivo)
            if (string.IsNullOrWhiteSpace(nuevoPersonal.Nombre) ||
                string.IsNullOrWhiteSpace(nuevoPersonal.Apellidos) ||
                string.IsNullOrWhiteSpace(nuevoPersonal.Username) ||
                string.IsNullOrWhiteSpace(nuevoPersonal.PasswordHash) ||
                string.IsNullOrWhiteSpace(nuevoPersonal.Rol))
            {
                return BadRequest("❌ Todos los campos son obligatorios.");
            }

            // 2. Verificar que el Nombre de Usuario (Login) no esté repetido
            bool usernameExiste = await _context.Usuarios
                .AnyAsync(u => u.Username.ToLower() == nuevoPersonal.Username.ToLower());

            if (usernameExiste)
            {
                return BadRequest("❌ El nombre de usuario ya está en uso. Por favor elige otro.");
            }

            // 3. Generar Matrícula Automática para Personal (Ej: PER-2026-001)
            string anioActual = DateTime.Now.Year.ToString();

            // Buscamos al último empleado registrado este año
            var ultimoPersonal = await _context.Usuarios
                .Where(u => u.Matricula.StartsWith("PER-" + anioActual))
                .OrderByDescending(u => u.Id)
                .FirstOrDefaultAsync();

            int consecutivo = 1;
            if (ultimoPersonal != null && ultimoPersonal.Matricula.Contains("-"))
            {
                // Rompemos el string "PER-2026-001" en pedazos y sacamos el "001"
                string[] partes = ultimoPersonal.Matricula.Split('-');
                if (partes.Length > 2 && int.TryParse(partes[2], out int num))
                {
                    consecutivo = num + 1;
                }
            }

            // Asignamos la matrícula generada
            nuevoPersonal.Matricula = $"PER-{anioActual}-{consecutivo:D3}";

            // Aseguramos que el grupo vaya vacío porque es personal, no alumno
            nuevoPersonal.Grupo = string.Empty;

            // 4. Guardar en la Base de Datos
            _context.Usuarios.Add(nuevoPersonal);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensaje = "Usuario registrado con éxito",
                matricula = nuevoPersonal.Matricula
            });
        }

        // GET: api/Usuarios/5 (Sirve para llenar el modal antes de editar)
        [HttpGet("{id}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound("Usuario no encontrado.");
            return usuario;
        }

        // PUT: api/Usuarios/editar-personal/5
        [HttpPut("editar-personal/{id}")]
        public async Task<IActionResult> EditarPersonal(int id, [FromBody] Usuario datosActualizados)
        {
            var usuarioDb = await _context.Usuarios.FindAsync(id);
            if (usuarioDb == null) return NotFound("El usuario no existe.");

            // Actualizamos los campos
            usuarioDb.Nombre = datosActualizados.Nombre;
            usuarioDb.Apellidos = datosActualizados.Apellidos;
            usuarioDb.Username = datosActualizados.Username;
            usuarioDb.Rol = datosActualizados.Rol;

            // Truco profesional: Solo cambiamos la contraseña si el admin escribió una nueva en el input
            if (!string.IsNullOrWhiteSpace(datosActualizados.PasswordHash))
            {
                usuarioDb.PasswordHash = datosActualizados.PasswordHash;
            }

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "✅ Datos actualizados correctamente." });
        }

        // DELETE: api/Usuarios/eliminar-personal/5
        [HttpDelete("eliminar-personal/{id}")]
        public async Task<IActionResult> EliminarPersonal(int id)
        {
            var personalDb = await _context.Usuarios.FindAsync(id);

            if (personalDb == null)
                return NotFound(new { mensaje = "El usuario no existe." });

            if (personalDb.Rol == "Alumno")
                return BadRequest(new { mensaje = "Los alumnos se deben eliminar desde el módulo de Alumnos." });

            _context.Usuarios.Remove(personalDb);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "✅ Personal eliminado correctamente." });
        }

        // POST: api/Usuarios/promocion-masiva
        [HttpPost("promocion-masiva")]
        public async Task<IActionResult> PromocionMasiva()
        {
            // Solo traemos a los alumnos
            var alumnos = await _context.Usuarios
                                        .Where(u => u.Rol == "Alumno")
                                        .ToListAsync();

            int promovidos = 0;
            int egresados = 0;

            foreach (var alumno in alumnos)
            {
                if (string.IsNullOrWhiteSpace(alumno.Grupo)) continue;

                // El formato de tu grupo es "1° A", lo separamos por el espacio
                string[] partes = alumno.Grupo.Split(' ');
                
                if (partes.Length >= 2)
                {
                    string grado = partes[0]; // Extrae "1°"
                    string letra = partes[1]; // Extrae "A"

                    switch (grado)
                    {
                        case "1°": alumno.Grupo = $"2° {letra}"; promovidos++; break;
                        case "2°": alumno.Grupo = $"3° {letra}"; promovidos++; break;
                        case "3°": alumno.Grupo = $"4° {letra}"; promovidos++; break;
                        case "4°": alumno.Grupo = $"5° {letra}"; promovidos++; break;
                        case "5°": alumno.Grupo = $"6° {letra}"; promovidos++; break;
                        case "6°": alumno.Grupo = "Egresado"; egresados++; break;
                        // Si ya dice "Egresado", el sistema lo ignora y no hace nada
                    }
                }
            }

            // Guardamos todos los cambios de golpe
            await _context.SaveChangesAsync();

            return Ok(new { 
                mensaje = $"¡Promoción exitosa! {promovidos} alumnos subieron de grado y {egresados} niños se marcaron como Egresados." 
            });
        }
    }
}