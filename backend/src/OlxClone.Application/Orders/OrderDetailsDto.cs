namespace OlxClone.Application.Orders;

public class OrderDetailsDto : OrderListItemDto
{
    public string BuyerName { get; set; } = "";
    public string SellerName { get; set; } = "";
}