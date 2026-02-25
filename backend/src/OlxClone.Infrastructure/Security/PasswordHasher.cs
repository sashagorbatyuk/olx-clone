using System.Security.Cryptography;
using System.Text;

namespace OlxClone.Infrastructure.Security;

// MVP: SHA256 + salt. (Для прод — краще BCrypt/Argon2)
public static class PasswordHasher
{
    public static string Hash(string password, string salt)
    {
        var bytes = Encoding.UTF8.GetBytes(password + salt);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }

    public static string NewSalt()
    {
        var b = RandomNumberGenerator.GetBytes(16);
        return Convert.ToBase64String(b);
    }
}