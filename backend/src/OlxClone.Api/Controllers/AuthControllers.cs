using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlxClone.Domain.Entities;
using OlxClone.Infrastructure;
using OlxClone.Infrastructure.Security;
using OlxClone.Api.Services;
using System.Security.Cryptography;
using System.Text;

namespace OlxClone.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly JwtService _jwt;

    public AuthController(AppDbContext db, IConfiguration cfg, JwtService jwt)
    {
        _db = db;
        _cfg = cfg;
        _jwt = jwt;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Name { get; set; } = null!;
    }

    public class LoginRequest
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class GoogleLoginRequest
    {
        public string IdToken { get; set; } = null!;
    }

    // ===== Password reset =====

public class ForgotPasswordRequest
{
    public string Email { get; set; } = null!;
}

public class ResetPasswordRequest
{
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}

// URL-safe token
private static string NewToken()
{
    var bytes = RandomNumberGenerator.GetBytes(32);
    return Convert.ToBase64String(bytes)
        .Replace("+", "-")
        .Replace("/", "_")
        .Replace("=", "");
}

private static string Sha256(string input)
{
    var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
    return Convert.ToBase64String(hash);
}

// POST /auth/forgot-password
// Always returns 200 OK (do not reveal whether email exists)
[HttpPost("forgot-password")]
public async Task<IActionResult> ForgotPassword(
    [FromBody] ForgotPasswordRequest r,
    [FromServices] IEmailSender emailSender)
{
    // ✅ Always OK (avoid user enumeration)
    if (r == null || string.IsNullOrWhiteSpace(r.Email))
        return Ok();

    var email = r.Email.Trim().ToLowerInvariant();
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

    if (user == null)
        return Ok();

    var now = DateTime.UtcNow;

    // Optional: invalidate previous active tokens
    var prev = await _db.PasswordResetTokens
        .Where(t => t.UserId == user.Id && t.UsedAt == null && t.ExpiresAt > now)
        .ToListAsync();
    foreach (var t in prev) t.UsedAt = now;

    var raw = NewToken();
    var tokenHash = Sha256(raw);

    _db.PasswordResetTokens.Add(new PasswordResetToken
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        TokenHash = tokenHash,
        CreatedAt = now,
        ExpiresAt = now.AddMinutes(30),
        UsedAt = null
    });

    await _db.SaveChangesAsync();

    var fe = _cfg["App:FrontendBaseUrl"] ?? "http://localhost:5173";
    var link =
        $"{fe}/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(raw)}";

    // ✅ DEV: якщо пошта не працює — повернемо лінк (і виведемо в консоль)
    // Можеш залишити назавжди тільки в Development
    if (_cfg.GetValue<bool>("App:ReturnDevResetLink"))
    {
        Console.WriteLine("RESET LINK: " + link);
        return Ok(new { devResetLink = link });
    }

    // ✅ PROD-like: send email, але не падаємо, якщо SMTP зламався
    try
    {
        await emailSender.SendAsync(
            user.Email,
            "Password reset",
            $"<p>Click to reset your password:</p><p><a href=\"{link}\">{link}</a></p><p>Expires in 30 minutes.</p>"
        );
    }
    catch (Exception ex)
    {
        // лог — щоб ти бачив причину, але клієнту OK
        Console.WriteLine("SMTP SEND FAILED: " + ex.Message);
        // навмисно НЕ кидаємо помилку
    }

    return Ok();
}

// POST /auth/reset-password
[HttpPost("reset-password")]
public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest r)
{
    if (r == null) return BadRequest("Invalid payload.");
    if (string.IsNullOrWhiteSpace(r.Email) ||
        string.IsNullOrWhiteSpace(r.Token) ||
        string.IsNullOrWhiteSpace(r.NewPassword))
        return BadRequest("Email, token and newPassword are required.");

    if (r.NewPassword.Length < 6)
        return BadRequest("Password too short.");

    var email = r.Email.Trim().ToLowerInvariant();
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

    // Don't reveal whether user exists
    if (user == null) return BadRequest("Invalid token.");

    var now = DateTime.UtcNow;
    var tokenHash = Sha256(r.Token);

    var prt = await _db.PasswordResetTokens
        .Where(t =>
            t.UserId == user.Id &&
            t.TokenHash == tokenHash &&
            t.UsedAt == null &&
            t.ExpiresAt > now)
        .OrderByDescending(t => t.CreatedAt)
        .FirstOrDefaultAsync();

    if (prt == null) return BadRequest("Invalid token.");

    // Set password (works for Google-only accounts too)
    var salt = PasswordHasher.NewSalt();
    var hash = PasswordHasher.Hash(r.NewPassword, salt);

    user.PasswordSalt = salt;
    user.PasswordHash = hash;

    prt.UsedAt = now;

    await _db.SaveChangesAsync();
    return NoContent();
}

    // POST /auth/register -> { token }
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest r)
    {
        if (r == null) return BadRequest("Invalid payload.");
        if (string.IsNullOrWhiteSpace(r.Email) || string.IsNullOrWhiteSpace(r.Password))
            return BadRequest("Email and password are required.");

        var email = r.Email.Trim().ToLowerInvariant();

        var exists = await _db.Users.AnyAsync(u => u.Email.ToLower() == email);
        if (exists) return BadRequest("Email already exists.");

        var salt = PasswordHasher.NewSalt();
        var hash = PasswordHasher.Hash(r.Password, salt);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = string.IsNullOrWhiteSpace(r.Name) ? "User" : r.Name.Trim(),
            Phone = null,
            About = null,
            AvatarUrl = null,
            CreatedAt = DateTime.UtcNow,
            PasswordHash = hash,
            PasswordSalt = salt
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwt.CreateToken(user);
        return Ok(new { token });
    }

    // POST /auth/login -> { token }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest r)
    {
        if (r == null) return BadRequest("Invalid payload.");
        if (string.IsNullOrWhiteSpace(r.Email) || string.IsNullOrWhiteSpace(r.Password))
            return BadRequest("Email and password are required.");

        var email = r.Email.Trim().ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user == null) return Unauthorized("Invalid credentials.");

        // verify: hash(input + storedSalt) == storedHash
        var computed = PasswordHasher.Hash(r.Password, user.PasswordSalt);
        if (!string.Equals(computed, user.PasswordHash, StringComparison.Ordinal))
            return Unauthorized("Invalid credentials.");

        var token = _jwt.CreateToken(user);
        return Ok(new { token });
    }

    // POST /auth/google -> { token }
    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleLoginRequest req)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.IdToken))
            return BadRequest("IdToken is required.");

        var googleClientId = _cfg["GoogleAuth:ClientId"];
        if (string.IsNullOrWhiteSpace(googleClientId))
            return StatusCode(500, "GoogleAuth:ClientId is not configured.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                req.IdToken,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { googleClientId }
                });
        }
        catch
        {
            return Unauthorized("Invalid Google token.");
        }

        var email = payload.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized("Google account has no email.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user == null)
        {
            // Для Google-акаунта пароль не потрібен, але якщо поля NOT NULL — збережемо порожні.
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = string.IsNullOrWhiteSpace(payload.Name) ? "Google User" : payload.Name,
                Phone = null,
                About = null,
                AvatarUrl = null, // не ставимо payload.Picture, щоб не ламати /avatars
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "",
                PasswordSalt = ""
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(payload.Name))
            {
                user.Name = payload.Name;
                await _db.SaveChangesAsync();
            }
        }

        var token = _jwt.CreateToken(user);
        return Ok(new { token });
    }
}