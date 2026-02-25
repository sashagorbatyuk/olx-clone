namespace OlxClone.Domain.Entities;

public class Message
{
    public Guid Id { get; set; }

    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = default!;

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = default!;

    public string Text { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}