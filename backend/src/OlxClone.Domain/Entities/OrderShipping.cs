namespace OlxClone.Domain.Entities;

public class OrderShipping
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public DeliveryMethod Method { get; set; }
    public ShippingStatus Status { get; set; }

    public string RecipientName { get; set; } = "";
    public string RecipientPhone { get; set; } = "";

    public string City { get; set; } = "";

    // Для Post: адреса/відділення
    public string AddressLine { get; set; } = "";

    // Для Post/Courier (необов’язково)
    public string? Carrier { get; set; }           // "NovaPoshta", "UkrPoshta", "Other"
    public string? TrackingNumber { get; set; }    // трек-номер

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}