namespace OlxClone.Domain.Entities;

public class Order
{
    public Guid Id { get; set; }

    public Guid AdId { get; set; }
    public Ad Ad { get; set; } = null!;

    public Guid BuyerId { get; set; }
    public User Buyer { get; set; } = null!;

    public Guid SellerId { get; set; }
    public User Seller { get; set; } = null!;

    public OrderStatus Status { get; set; }

    // snapshot (щоб після редагування ad не зламало історію)
    public decimal Price { get; set; }
    public string Currency { get; set; } = "UAH";

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}