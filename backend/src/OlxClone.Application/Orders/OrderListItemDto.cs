namespace OlxClone.Application.Orders;

public class OrderListItemDto
{
    public Guid Id { get; set; }
    public Guid AdId { get; set; }
    public string AdTitle { get; set; } = "";
    public Guid BuyerId { get; set; }
    public Guid SellerId { get; set; }
    public int Status { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "UAH";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}