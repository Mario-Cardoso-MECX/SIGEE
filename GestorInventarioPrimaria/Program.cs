using GestorInventarioPrimaria.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders; // <-- NECESARIO PARA LAS RUTAS DE ARCHIVOS
using Microsoft.AspNetCore.Authentication.JwtBearer; // <-- NUEVO: SEGURIDAD JWT
using Microsoft.IdentityModel.Tokens; // <-- NUEVO: SEGURIDAD JWT
using System.Text; // <-- NUEVO: SEGURIDAD JWT
using System.IO;
using GestorInventarioPrimaria.Interfaces;
using GestorInventarioPrimaria.Services;

var builder = WebApplication.CreateBuilder(args);

// Agregar servicios básicos
builder.Services.AddControllers();

// --- LÓGICA TODOTERRENO PARA LA BASE DE DATOS ---
// Por defecto lee la cadena normal (SmarterASP en prod, o LocalDB en dev)
string cadenaConexion = builder.Configuration.GetConnectionString("CadenaSQL") ?? "";

// TRUCO MAESTRO: Si detecta que está en la carpeta de la escuela (C:\SIGE), cambia a SQL Express automáticamente
if (Directory.Exists(@"C:\SIGE") && builder.Environment.EnvironmentName != "Development")
{
    var cadenaIIS = builder.Configuration.GetConnectionString("CadenaSQL_IIS");
    if (!string.IsNullOrEmpty(cadenaIIS))
    {
        cadenaConexion = cadenaIIS;
    }
}

// CONEXIÓN A BASE DE DATOS 
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(cadenaConexion));

// ------------------------------------------------

// --- NUEVO: CONFIGURACIÓN SEGURIDAD (JWT) ---
var secretKey = "SIGEE_Super_Secret_Key_Para_Primaria_2026_ExtremadamenteLarga"; 
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });
builder.Services.AddAuthorization();
// ---------------------------------------------

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirTodo", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()   
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// NUEVO: Registrar el patrón de servicios
builder.Services.AddScoped<IPrestamoService, PrestamoService>();
// NUEVO:
builder.Services.AddScoped<IMaterialService, MaterialService>();
// NUEVO:
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
// NUEVO:
builder.Services.AddScoped<IAulaService, AulaService>();
// NUEVO:
builder.Services.AddScoped<IDashboardService, DashboardService>();
// NUEVO:
builder.Services.AddScoped<IAuthService, AuthService>();

var app = builder.Build();

// 5. MIDDLEWARES
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// --- NUEVO: ACTIVAR LOS CANDADOS EN EL SERVIDOR ---
app.UseAuthentication(); 
// ---------------------------------------------------

// --- CONFIGURACIÓN PARA ARCHIVOS ESTÁTICOS (LAS FOTOS Y EL FRONTEND) ---

// CORRECCIÓN PARA EL ERROR 404: Le decimos explícitamente que arranque con login.html
DefaultFilesOptions options = new DefaultFilesOptions();
options.DefaultFileNames.Clear();
options.DefaultFileNames.Add("login.html");
app.UseDefaultFiles(options); 

// Le enseñamos a Program.cs a dar "un paso atrás" igual que el controlador
string rutaFront = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
string rutaHermano = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "wwwroot"));

if (Directory.Exists(rutaHermano))
{
    // Si encuentra la carpeta "wwwroot" afuera del backend (Entorno Visual Studio)
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(rutaHermano),
        RequestPath = "" 
    });
}
else if (Directory.Exists(rutaFront))
{
    // Si la encuentra adentro (Por si acaso)
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(rutaFront),
        RequestPath = "" 
    });
}
else
{
    // Si estamos en producción (IIS o SmarterASP), la carpeta se llamará "wwwroot" y usa la ruta por defecto
    app.UseStaticFiles(); 
}
// --------------------------------------------------

app.UseCors("PermitirTodo");
app.UseAuthorization();
app.MapControllers();
app.Run();