using Microsoft.EntityFrameworkCore;
using OlxClone.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using OlxClone.Infrastructure.Security;
using Microsoft.OpenApi.Models;
using OlxClone.Api.Services;

var builder = WebApplication.CreateBuilder(args);



var cs = builder.Configuration.GetConnectionString("Default");
Console.WriteLine(">> ConnectionString(Default): " + cs);

builder.Services.AddScoped<OlxClone.Infrastructure.Security.JwtService>();

var jwt = builder.Configuration.GetSection("Jwt");
var key = jwt["Key"]!;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.MapInboundClaims = false;

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "OlxClone API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer <your JWT token>"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// DbContext
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default");
    opt.UseNpgsql(cs);
});

// CORS for React
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("cors", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod()
    );
});

builder.WebHost.UseWebRoot("wwwroot");

builder.Environment.WebRootPath ??= Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
Directory.CreateDirectory(builder.Environment.WebRootPath);
Directory.CreateDirectory(Path.Combine(builder.Environment.WebRootPath, "uploads"));

builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<OlxClone.Infrastructure.AppDbContext>();
        OlxClone.Infrastructure.Seed.DbSeeder.SeedCategories(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine("Seed failed: " + ex.Message);
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("cors");

// Static files (uploads)
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();