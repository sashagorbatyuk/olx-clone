namespace OlxClone.Domain.Entities;

public class Review
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public Guid RaterId { get; set; }   // хто ставить
    public Guid RateeId { get; set; }   // кому ставить

    public int Rating { get; set; }     // 1..5
    public string Comment { get; set; } = "";

    public DateTime CreatedAt { get; set; }

    public Order Order { get; set; } = null!;
    public User Rater { get; set; } = null!;
    public User Ratee { get; set; } = null!;
}