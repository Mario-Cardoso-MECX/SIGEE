using GestorInventarioPrimaria.Interfaces;
using GestorInventarioPrimaria.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GestorInventarioPrimaria.DTOs;

namespace GestorInventarioPrimaria.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;
        private readonly IWebHostEnvironment _env;

        // Inyectamos el Servicio en lugar de la Base de Datos directamente
        public UsuariosController(IUsuarioService usuarioService, IWebHostEnvironment env)
        {
            _usuarioService = usuarioService;
            _env = env; // Mantenemos _env aquí para pasarle la ruta raíz al servicio
        }

        [HttpGet("alumnos")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetAlumnos()
        {
            var alumnos = await _usuarioService.GetAlumnosAsync();
            return Ok(alumnos);
        }

        [HttpGet("buscar")]
        public async Task<ActionResult<IEnumerable<Usuario>>> BuscarUsuarios([FromQuery] string termino)
        {
            var usuarios = await _usuarioService.BuscarUsuariosAsync(termino);
            return Ok(usuarios);
        }

        [HttpPost("crear")]
        public async Task<IActionResult> CrearAlumno([FromBody] Usuario nuevoAlumno)
        {
            var (statusCode, data) = await _usuarioService.CrearAlumnoAsync(nuevoAlumno);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpPost("subir-foto/{matricula}")]
        public async Task<IActionResult> SubirFotoAlumno(string matricula, IFormFile foto)
        {
            var (statusCode, data) = await _usuarioService.SubirFotoAlumnoAsync(matricula, foto, _env.ContentRootPath);
            if (statusCode == 400) return BadRequest(data);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpPut("editar-alumno/{id:int}")]
        public async Task<IActionResult> EditarAlumno(int id, [FromBody] Usuario datosActualizados)
        {
            var (statusCode, data) = await _usuarioService.EditarAlumnoAsync(id, datosActualizados);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteUsuario(int id)
        {
            var (statusCode, data) = await _usuarioService.DeleteUsuarioAsync(id);
            if (statusCode == 404) return NotFound(data);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpGet("personal")]
        public async Task<ActionResult<IEnumerable<Usuario>>> GetPersonalAdministrativo()
        {
            var personal = await _usuarioService.GetPersonalAdministrativoAsync();
            return Ok(personal);
        }

        [HttpPost("crear-personal")]
        public async Task<IActionResult> CrearPersonal([FromBody] Usuario nuevoPersonal)
        {
            var (statusCode, data) = await _usuarioService.CrearPersonalAsync(nuevoPersonal);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Usuario>> GetUsuario(int id)
        {
            var (statusCode, data) = await _usuarioService.GetUsuarioAsync(id);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpPut("editar-personal/{id:int}")]
        public async Task<IActionResult> EditarPersonal(int id, [FromBody] Usuario datosActualizados)
        {
            var (statusCode, data) = await _usuarioService.EditarPersonalAsync(id, datosActualizados);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpDelete("eliminar-personal/{id:int}")]
        public async Task<IActionResult> EliminarPersonal(int id)
        {
            var (statusCode, data) = await _usuarioService.EliminarPersonalAsync(id);
            if (statusCode == 404) return NotFound(data);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpPost("promocion-masiva")]
        public async Task<IActionResult> PromocionMasiva()
        {
            var (statusCode, data) = await _usuarioService.PromocionMasivaAsync();
            return Ok(data);
        }

        [HttpDelete("eliminar-egresados")]
        public async Task<IActionResult> EliminarEgresadosMasivo()
        {
            var (statusCode, data) = await _usuarioService.EliminarEgresadosMasivoAsync();
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpPost("sincronizar-fotos")]
        public async Task<IActionResult> SincronizarFotos()
        {
            var (statusCode, data) = await _usuarioService.SincronizarFotosAsync(_env.ContentRootPath);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [HttpPost("subir-foto-personal/{username}")]
        public async Task<IActionResult> SubirFotoPersonal(string username, IFormFile foto)
        {
            var (statusCode, data) = await _usuarioService.SubirFotoPersonalAsync(username, foto, _env.ContentRootPath);
            if (statusCode == 400) return BadRequest(data);
            if (statusCode == 404) return NotFound(data);
            return Ok(data);
        }

        [HttpPut("cambiar-password")]
        public async Task<IActionResult> CambiarPassword([FromBody] CambioPasswordDto datos)
        {
            var (statusCode, data) = await _usuarioService.CambiarPasswordAsync(datos);
            if (statusCode == 404) return NotFound(data);
            if (statusCode == 400) return BadRequest(data);
            return Ok(data);
        }

        [AllowAnonymous]
        [HttpGet("foto/{tipo}/{nombreArchivo}")]
        public async Task<IActionResult> ObtenerFotoProtegida(string tipo, string nombreArchivo, [FromQuery] string t)
        {
            var (statusCode, mimeType, rutaCompleta, errorMessage) = await _usuarioService.ObtenerFotoProtegidaAsync(tipo, nombreArchivo, t, _env.ContentRootPath);
            
            if (statusCode == 401) return Unauthorized(errorMessage);
            if (statusCode == 404) return NotFound(errorMessage);
            
            return PhysicalFile(rutaCompleta, mimeType);
        }
    }
}