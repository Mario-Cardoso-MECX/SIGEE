using System.ComponentModel.DataAnnotations;

namespace GestorInventarioPrimaria.Models
{
    public class Usuario
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string? Nombre { get; set; } = string.Empty;

        [Required] 
        [MaxLength(100)]
        public string Apellidos { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Matricula { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Username { get; set; } // Solo para Directores/Maestros  

        public string? PasswordHash { get; set; } // Solo para Directores/Maestros

        [MaxLength(20)]
        public string Rol { get; set; } = "Alumno"; // // "Admin", "Secretaria", "Inventario", "Docente" o "Alumno"

        [MaxLength(10)]
        public string? Grupo { get; set; } = string.Empty; // Ej: "6° A"

        // --- NUEVO CAMPO PARA CREDENCIALES ---
        [MaxLength(500)]
        public string? FotoUrl { get; set; } // Guardará la ruta física o web de la foto del alumno

        // --- NUEVO CAMPO PARA SESIÓN ÚNICA ---
        [MaxLength(100)]
        public string? TokenSesion { get; set; }
    }
}