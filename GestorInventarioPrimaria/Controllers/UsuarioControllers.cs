using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestorInventarioPrimaria.Data;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Authorization; // <-- NUEVO: SEGURIDAD
using System.IO;

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize] // <-- NUEVO: ESTE ES EL CANDADO PARA QUE NO ENTREN POR TERMUX NI POSTMAN
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public UsuariosController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet("alumnos")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetAlumnos()
        {
            var alumnos = await _context.Usuarios
                                 .Where(u => u.Rol == "Alumno")
                                 .OrderBy(u => u.Matricula)
                                 .ToListAsync();

            // --- MAGIA: OCULTAMOS LOS HASHES ANTES DE ENVIAR A POSTMAN/WEB ---
            foreach (var alumno in alumnos)
            {
                alumno.PasswordHash = null;
            }

            return alumnos;
        }

        [HttpGet("buscar")]
        public async Task<ActionResult<IEnumerable<Usuario>>> BuscarUsuarios([FromQuery] string termino)
        {
            if (string.IsNullOrWhiteSpace(termino)) return Ok(new List<Usuario>());

            var usuarios = await _context.Usuarios
                .Where(u => u.Nombre.Contains(termino) || u.Matricula.Contains(termino))
                .Take(5) 
                .ToListAsync();

            // --- MAGIA: OCULTAMOS LOS HASHES ANTES DE ENVIAR A POSTMAN/WEB ---
            foreach (var usuario in usuarios)
            {
                usuario.PasswordHash = null;
            }

            return usuarios;
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
            
            // --- NUEVO: HASHEAR LA CONTRASEÑA EN LUGAR DE TEXTO PLANO ---
            nuevoAlumno.PasswordHash = BCrypt.Net.BCrypt.HashPassword("1234");

            _context.Usuarios.Add(nuevoAlumno);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "✅ Alumno registrado con éxito", matricula = nuevoAlumno.Matricula });
        }

        // --- SUBIR FOTO ALUMNOS (FORZADO AL FRONTEND REAL - AHORA EN BÓVEDA PRIVADA) ---
        [HttpPost("subir-foto/{matricula}")]
        public async Task<IActionResult> SubirFotoAlumno(string matricula, IFormFile foto)
        {
            if (foto == null || foto.Length == 0)
                return BadRequest(new { mensaje = "No se recibió ninguna imagen." });

            var alumno = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == matricula);
            if (alumno == null) return NotFound(new { mensaje = "Alumno no encontrado." });

            var ext = Path.GetExtension(foto.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return BadRequest(new { mensaje = "Solo se permiten imágenes JPG o PNG." });

            // --- NUEVO: GUARDAMOS EN ALMACÉN PRIVADO ---
            string carpetaDestino = Path.Combine(_env.ContentRootPath, "AlmacenPrivado", "fotos_alumnos");

            // CREA LA CARPETA AUTOMÁTICAMENTE SI NO EXISTE
            if (!Directory.Exists(carpetaDestino))
                Directory.CreateDirectory(carpetaDestino);

            // Eliminar fotos viejas de esta misma matrícula
            var archivosExistentes = Directory.GetFiles(carpetaDestino, $"{matricula}.*");
            foreach (var archivoViejo in archivosExistentes)
            {
                System.IO.File.Delete(archivoViejo);
            }

            string nombreArchivo = $"{matricula}{ext}";
            string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);

            using (var stream = new FileStream(rutaCompleta, FileMode.Create))
            {
                await foto.CopyToAsync(stream);
            }

            // NUEVO: La URL apunta al endpoint seguro
            alumno.FotoUrl = $"/api/Usuarios/foto/alumnos/{nombreArchivo}";
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Foto subida y guardada correctamente.", fotoUrl = alumno.FotoUrl });
        }

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
            var personal = await _context.Usuarios.Where(u => u.Rol != "Alumno").OrderBy(u => u.Rol).ThenBy(u => u.Nombre).ToListAsync();

            // --- MAGIA: OCULTAMOS LOS HASHES ANTES DE ENVIAR A POSTMAN/WEB ---
            foreach (var p in personal)
            {
                p.PasswordHash = null;
            }

            return personal;
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

            // --- NUEVO: ENCRIPTAR LA CONTRASEÑA ---
            nuevoPersonal.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nuevoPersonal.PasswordHash);

            _context.Usuarios.Add(nuevoPersonal);
            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Usuario registrado con éxito", matricula = nuevoPersonal.Matricula });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(new { mensaje = "Usuario no encontrado." });

            // --- MAGIA: OCULTAMOS EL HASH ANTES DE ENVIARLO ---
            usuario.PasswordHash = null;

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

            // --- NUEVO: ENCRIPTAR LA CONTRASEÑA SI LA ACTUALIZARON ---
            if (!string.IsNullOrWhiteSpace(datosActualizados.PasswordHash))
            {
                usuarioDb.PasswordHash = BCrypt.Net.BCrypt.HashPassword(datosActualizados.PasswordHash);
            }

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

        // --- SINCRONIZAR FOTOS (FORZADO AL FRONTEND REAL - AHORA BÓVEDA) ---
        [HttpPost("sincronizar-fotos")]
        public async Task<IActionResult> SincronizarFotos()
        {
            string carpetaDestino = Path.Combine(_env.ContentRootPath, "AlmacenPrivado", "fotos_alumnos");

            if (!Directory.Exists(carpetaDestino))
                return BadRequest(new { mensaje = "No existe la carpeta 'fotos_alumnos' en la bóveda. Sube al menos una foto desde el sistema para que se cree automáticamente." });

            var archivos = Directory.GetFiles(carpetaDestino);
            int vinculadas = 0;
            int ignoradas = 0;

            foreach (var rutaFisica in archivos)
            {
                string nombreConExt = Path.GetFileName(rutaFisica);
                string matriculaExtraida = Path.GetFileNameWithoutExtension(rutaFisica);

                var alumno = await _context.Usuarios.FirstOrDefaultAsync(u => u.Matricula == matriculaExtraida);

                if (alumno != null)
                {
                    // NUEVO: La URL de API segura
                    string nuevaRuta = $"/api/Usuarios/foto/alumnos/{nombreConExt}";
                    if (alumno.FotoUrl != nuevaRuta)
                    {
                        alumno.FotoUrl = nuevaRuta;
                        vinculadas++;
                    }
                }
                else
                {
                    ignoradas++; 
                }
            }

            if (vinculadas > 0)
            {
                await _context.SaveChangesAsync();
            }

            return Ok(new { 
                mensaje = "Sincronización terminada con éxito.", 
                vinculadas = vinculadas, 
                ignoradas = ignoradas 
            });
        }

        // =======================================================
        // --- ENDPOINTS PARA EL PERFIL DEL PERSONAL ---
        // =======================================================

        // --- SUBIR FOTO PERSONAL (FORZADO AL FRONTEND REAL - AHORA BÓVEDA) ---
        [HttpPost("subir-foto-personal/{username}")]
        public async Task<IActionResult> SubirFotoPersonal(string username, IFormFile foto)
        {
            if (foto == null || foto.Length == 0)
                return BadRequest(new { mensaje = "No se recibió ninguna imagen." });

            var personal = await _context.Usuarios.FirstOrDefaultAsync(u => u.Username == username && u.Rol != "Alumno");
            if (personal == null) return NotFound(new { mensaje = "Usuario no encontrado." });

            var ext = Path.GetExtension(foto.FileName).ToLowerInvariant();
            if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
                return BadRequest(new { mensaje = "Solo se permiten imágenes JPG o PNG." });

            // CREA LA CARPETA AUTOMÁTICAMENTE SI NO EXISTE EN LA BÓVEDA
            string carpetaDestino = Path.Combine(_env.ContentRootPath, "AlmacenPrivado", "fotos_personal");
            if (!Directory.Exists(carpetaDestino)) Directory.CreateDirectory(carpetaDestino);

            // BORRA FOTOS VIEJAS PARA NO DUPLICAR
            var archivosExistentes = Directory.GetFiles(carpetaDestino, $"{username}.*");
            foreach (var archivoViejo in archivosExistentes)
            {
                System.IO.File.Delete(archivoViejo);
            }

            // NOMBRA EL ARCHIVO CON EL USERNAME DEL PROFESOR
            string nombreArchivo = $"{username}{ext}";
            string rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);

            using (var stream = new FileStream(rutaCompleta, FileMode.Create))
            {
                await foto.CopyToAsync(stream);
            }

            // NUEVO: La URL apunta al endpoint seguro de personal
            personal.FotoUrl = $"/api/Usuarios/foto/personal/{nombreArchivo}";
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Foto de perfil actualizada.", fotoUrl = personal.FotoUrl });
        }

        [HttpPut("cambiar-password")]
        public async Task<IActionResult> CambiarPassword([FromBody] CambioPasswordDto datos)
        {
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Username == datos.Username);
            if (usuario == null) return NotFound(new { mensaje = "Usuario no encontrado." });

            // --- NUEVO: VERIFICACIÓN HIBRIDA ---
            bool passwordCorrecta = false;
            if (usuario.PasswordHash.StartsWith("$2")) 
            {
                passwordCorrecta = BCrypt.Net.BCrypt.Verify(datos.PasswordActual, usuario.PasswordHash);
            }
            else 
            {
                passwordCorrecta = (usuario.PasswordHash == datos.PasswordActual);
            }

            if (!passwordCorrecta)
                return BadRequest(new { mensaje = "La contraseña actual es incorrecta." });

            // ENCRIPTAR LA NUEVA
            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(datos.PasswordNueva);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Contraseña actualizada correctamente." });
        }

        // =========================================================================
        // --- ENDPOINT ESTRELLA: EL GUARDIA DE LAS FOTOS SECRETA (VÍA QUERY JWT) ---
        // =========================================================================
        [AllowAnonymous] // Permitimos que las etiquetas <img> lo llamen, validamos adentro
        [HttpGet("foto/{tipo}/{nombreArchivo}")]
        public async Task<IActionResult> ObtenerFotoProtegida(string tipo, string nombreArchivo, [FromQuery] string t)
        {
            if (string.IsNullOrEmpty(t)) return Unauthorized("Acceso denegado. Falta token de seguridad.");

            // Validamos contra la BD que la sesión sea legítima
            bool accesoPermitido = await _context.Usuarios.AnyAsync(u => u.TokenSesion == t);
            if (!accesoPermitido) return Unauthorized("Sesión inválida o expirada.");

            // Validamos que 'tipo' sea solo 'alumnos' o 'personal' para evitar hackeos de rutas
            if (tipo != "alumnos" && tipo != "personal") return NotFound();

            string rutaCompleta = Path.Combine(_env.ContentRootPath, "AlmacenPrivado", $"fotos_{tipo}", nombreArchivo);
            
            if (!System.IO.File.Exists(rutaCompleta)) return NotFound();

            var ext = Path.GetExtension(rutaCompleta).ToLowerInvariant();
            string mimeType = ext == ".png" ? "image/png" : "image/jpeg";
            
            return PhysicalFile(rutaCompleta, mimeType);
        }
    }

    // DTO para atrapar los datos del frontend (Personal Administrativo)
    public class CambioPasswordDto {
        public required string Username { get; set; }
        public required string PasswordActual { get; set; }
        public required string PasswordNueva { get; set; }
    }
}