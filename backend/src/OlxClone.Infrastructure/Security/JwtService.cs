using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OlxClone.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace OlxClone.Infrastructure.Security;

public class JwtService
{
    private readonly IConfiguration _cfg;

    public JwtService(IConfiguration cfg) => _cfg = cfg;

    public string CreateToken(User user)
    {
        var jwt = _cfg.GetSection("Jwt");
        var key = jwt["Key"]!;
        var issuer = jwt["Issuer"]!;
        var audience = jwt["Audience"]!;
        var expiresMinutes = int.Parse(jwt["ExpiresMinutes"]!);

        var claims = new List<Claim>
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
    new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
    new Claim(JwtRegisteredClaimNames.Email, user.Email),
    new Claim("name", user.Name ?? "")
};

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}