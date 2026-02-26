namespace OlxClone.Domain.Entities;

public class AdSubscription
{
    public Guid Id { get; set; }

    public Guid AdId { get; set; }
    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; }

    // для "побачив оновлення"
    public DateTime LastSeenAt { get; set; }

    public Ad Ad { get; set; } = null!;
    public User User { get; set; } = null!;
}