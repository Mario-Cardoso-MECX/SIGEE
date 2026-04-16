using System;

namespace GestorInventarioPrimaria.DTOs
{
    public class SolicitudAulaDto
    {
        public string Matricula { get; set; } = "";
        public DateTime Fecha { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFin { get; set; }
        public string Motivo { get; set; } = "";
    }
}