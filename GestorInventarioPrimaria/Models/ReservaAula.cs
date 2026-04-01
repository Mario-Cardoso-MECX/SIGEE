using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GestorInventarioPrimaria.Models
{
    public class ReservaAula
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [Required]
        public DateTime Fecha { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }

        [Required]
        [MaxLength(20)]
        public string Estatus { get; set; } = "Pendiente";

        [MaxLength(200)]
        public string? Motivo { get; set; }

        // Relación con el profesor que la pide
        [ForeignKey("UsuarioId")]
        [JsonIgnore] 
        public virtual Usuario? Usuario { get; set; }

        // Campo extra virtual para poder mandarle el nombre al frontend sin hacer consultas pesadas
        [NotMapped]
        public string? NombreProfesor { get; set; }
    }
}