namespace OlxClone.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string PasswordSalt { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? About { get; set; }
    

    public List<Ad> Ads { get; set; } = new();
}