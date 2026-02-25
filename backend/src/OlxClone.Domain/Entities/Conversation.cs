namespace OlxClone.Domain.Entities;

public class Conversation
{
    public Guid Id { get; set; }

    public Guid AdId { get; set; }
    public Ad Ad { get; set; } = default!;

    public Guid BuyerId { get; set; }
    public User Buyer { get; set; } = default!;

    public Guid SellerId { get; set; }
    public User Seller { get; set; } = default!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    public List<Message> Messages { get; set; } = new();
}