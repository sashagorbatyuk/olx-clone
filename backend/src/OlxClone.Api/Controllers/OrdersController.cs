using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlxClone.Domain.Entities;
using OlxClone.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace OlxClone.Api.Controllers;

[ApiController]
[Route("orders")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db) => _db = db;

    private Guid CurrentUserId()
    {
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("User id claim not found.");

        return Guid.Parse(idStr);
    }

    // POST /orders/by-ad/{adId}
    [Authorize]
    [HttpPost("by-ad/{adId:guid}")]
    public async Task<IActionResult> CreateByAd(Guid adId)
    {
        var me = CurrentUserId();

        var ad = await _db.Ads.FirstOrDefaultAsync(a => a.Id == adId && a.Status == AdStatus.Active);
        if (ad is null) return NotFound("Ad not found.");

        var sellerId = ad.UserId;
        if (sellerId == me) return BadRequest("You cannot buy your own ad.");

        // active order exists?
        var existing = await _db.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.AdId == adId && (o.Status == OrderStatus.Created || o.Status == OrderStatus.Accepted));

        if (existing != null)
        {
            // якщо це твій ордер — повернемо його id
            if (existing.BuyerId == me) return Ok(new { id = existing.Id });

            // якщо чужий — ad зайняте
            return Conflict("This ad is already in purchase process.");
        }

        var now = DateTime.UtcNow;

        var order = new Order
        {
            Id = Guid.NewGuid(),
            AdId = ad.Id,
            BuyerId = me,
            SellerId = sellerId,
            Status = OrderStatus.Created,
            Price = ad.Price,
            Currency = ad.Currency,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Orders.Add(order);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // на випадок гонки — partial index відловить
            return Conflict("This ad is already in purchase process.");
        }

        // можна одразу поставити Reserved/Sold у Ad.Status (опційно)
        // ad.Status = AdStatus.Reserved; await _db.SaveChangesAsync();

        return Ok(new { id = order.Id });
    }

    // GET /orders (mine)
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> MyOrders()
    {
        var me = CurrentUserId();

        var items = await _db.Orders
            .AsNoTracking()
            .Where(o => o.BuyerId == me || o.SellerId == me)
            .OrderByDescending(o => o.UpdatedAt)
            .Select(o => new
            {
                id = o.Id,
                adId = o.AdId,
                adTitle = o.Ad.Title,
                buyerId = o.BuyerId,
                sellerId = o.SellerId,
                status = (int)o.Status,
                price = o.Price,
                currency = o.Currency,
                createdAt = o.CreatedAt,
                updatedAt = o.UpdatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // GET /orders/{id}
    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var me = CurrentUserId();

        var o = await _db.Orders
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                id = x.Id,
                adId = x.AdId,
                adTitle = x.Ad.Title,
                buyerId = x.BuyerId,
                buyerName = x.Buyer.Name,
                sellerId = x.SellerId,
                sellerName = x.Seller.Name,
                status = (int)x.Status,
                price = x.Price,
                currency = x.Currency,
                createdAt = x.CreatedAt,
                updatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (o is null) return NotFound();
        if (o.buyerId != me && o.sellerId != me) return Forbid();

        return Ok(o);
    }

    // POST /orders/{id}/accept (seller)
[Authorize]
[HttpPost("{id:guid}/accept")]
public async Task<IActionResult> Accept(Guid id)
{
    var me = CurrentUserId();

    var o = await _db.Orders.FirstOrDefaultAsync(x => x.Id == id);
    if (o is null) return NotFound("Order not found.");
    if (o.SellerId != me) return Forbid();

    // ✅ Accept можна тільки для Created
    if (o.Status != OrderStatus.Created)
        return BadRequest("Only Created order can be accepted.");

    o.Status = OrderStatus.Accepted;
    o.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();
    return NoContent();
}

    // POST /orders/{id}/reject (seller)
    [Authorize]
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var me = CurrentUserId();

        var o = await _db.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();
        if (o.SellerId != me) return Forbid();

        if (o.Status != OrderStatus.Created)
            return BadRequest("Only Created order can be rejected.");

        o.Status = OrderStatus.Rejected;
        o.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /orders/{id}/cancel (buyer)
    [Authorize]
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var me = CurrentUserId();

        var o = await _db.Orders.FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return NotFound();
        if (o.BuyerId != me) return Forbid();

        if (o.Status != OrderStatus.Created && o.Status != OrderStatus.Accepted)
            return BadRequest("Only Created/Accepted order can be cancelled.");

        o.Status = OrderStatus.Cancelled;
        o.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /orders/{id}/complete (seller)
[Authorize]
[HttpPost("{id:guid}/complete")]
public async Task<IActionResult> Complete(Guid id)
{
    var me = CurrentUserId();

    var o = await _db.Orders.FirstOrDefaultAsync(x => x.Id == id);
    if (o is null) return NotFound("Order not found.");
    if (o.SellerId != me) return Forbid();

    // ✅ Complete тільки для Accepted
    if (o.Status != OrderStatus.Accepted)
        return BadRequest("Only Accepted order can be completed.");

    // ✅ якщо в тебе є доставка — завершуємо тільки після Delivered
    var ship = await _db.OrderShippings.AsNoTracking().FirstOrDefaultAsync(x => x.OrderId == id);
    if (ship != null && ship.Status != ShippingStatus.Delivered)
        return BadRequest("Order can be completed only after Delivered.");

    o.Status = OrderStatus.Completed;
    o.UpdatedAt = DateTime.UtcNow;

    // опційно: закрити оголошення
    var ad = await _db.Ads.FirstOrDefaultAsync(a => a.Id == o.AdId);
    if (ad != null) ad.Status = AdStatus.Archived; // або Sold якщо додаси
    await _db.SaveChangesAsync();

    return NoContent();
}
    [Authorize]
[HttpGet("{id:guid}/shipping")]
public async Task<IActionResult> GetShipping(Guid id)
{
    var me = CurrentUserId();

    var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return NotFound();
    if (order.BuyerId != me && order.SellerId != me) return Forbid();

    var s = await _db.OrderShippings.AsNoTracking()
        .Where(x => x.OrderId == id)
        .Select(x => new
        {
            id = x.Id,
            orderId = x.OrderId,
            method = (int)x.Method,
            status = (int)x.Status,
            recipientName = x.RecipientName,
            recipientPhone = x.RecipientPhone,
            city = x.City,
            addressLine = x.AddressLine,
            carrier = x.Carrier,
            trackingNumber = x.TrackingNumber,
            createdAt = x.CreatedAt,
            updatedAt = x.UpdatedAt
        })
        .FirstOrDefaultAsync();

    // якщо ще не створено — повернемо “порожній”
    if (s == null)
    {
        return Ok(new
        {
            id = (Guid?)null,
            orderId = id,
            method = 0,
            status = 0,
            recipientName = "",
            recipientPhone = "",
            city = "",
            addressLine = "",
            carrier = (string?)null,
            trackingNumber = (string?)null
        });
    }

    return Ok(s);
}

[Authorize]
[HttpPost("{id:guid}/shipping")]
public async Task<IActionResult> UpsertShipping(Guid id, [FromBody] UpsertShippingRequest r)
{
    var me = CurrentUserId();

    var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return NotFound();
    if (order.BuyerId != me) return Forbid();

    // Доставку має сенс заповнювати коли seller прийняв (або хоча б Created)
    if (order.Status != OrderStatus.Accepted && order.Status != OrderStatus.Created)
        return BadRequest("Order must be Created or Accepted.");

    var method = (DeliveryMethod)r.Method;

    if (string.IsNullOrWhiteSpace(r.RecipientName)) return BadRequest("RecipientName is required.");
    if (string.IsNullOrWhiteSpace(r.RecipientPhone)) return BadRequest("RecipientPhone is required.");
    if (string.IsNullOrWhiteSpace(r.City)) return BadRequest("City is required.");

    // Meetup: AddressLine можна як “Meet at метро ...”, але не обов’язково
    if ((method == DeliveryMethod.Post || method == DeliveryMethod.Courier) && string.IsNullOrWhiteSpace(r.AddressLine))
        return BadRequest("AddressLine is required for Post/Courier.");

    var now = DateTime.UtcNow;

    var s = await _db.OrderShippings.FirstOrDefaultAsync(x => x.OrderId == id);
    if (s == null)
    {
        s = new OrderShipping
        {
            Id = Guid.NewGuid(),
            OrderId = id,
            CreatedAt = now
        };
        _db.OrderShippings.Add(s);
    }

    s.Method = method;
    s.RecipientName = r.RecipientName.Trim();
    s.RecipientPhone = r.RecipientPhone.Trim();
    s.City = r.City.Trim();
    s.AddressLine = (r.AddressLine ?? "").Trim();
    s.Carrier = string.IsNullOrWhiteSpace(r.Carrier) ? null : r.Carrier.Trim();
    s.Status = ShippingStatus.Ready; // ✅ buyer заповнив
    s.UpdatedAt = now;

    await _db.SaveChangesAsync();
    return NoContent();
}

[Authorize]
[HttpPost("{id:guid}/shipping/mark-shipped")]
public async Task<IActionResult> MarkShipped(Guid id, [FromBody] MarkShippedRequest r)
{
    var me = CurrentUserId();

    var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return NotFound();
    if (order.SellerId != me) return Forbid();
    if (order.Status != OrderStatus.Accepted) return BadRequest("Order must be Accepted.");

    var s = await _db.OrderShippings.FirstOrDefaultAsync(x => x.OrderId == id);
    if (s == null || s.Status == ShippingStatus.Draft)
        return BadRequest("Buyer has not provided shipping details yet.");

    var now = DateTime.UtcNow;

    if (!string.IsNullOrWhiteSpace(r.Carrier)) s.Carrier = r.Carrier.Trim();
    if (!string.IsNullOrWhiteSpace(r.TrackingNumber)) s.TrackingNumber = r.TrackingNumber.Trim();

    s.Status = ShippingStatus.Shipped;
    s.UpdatedAt = now;

    await _db.SaveChangesAsync();
    return NoContent();
}

[Authorize]
[HttpPost("{id:guid}/shipping/mark-delivered")]
public async Task<IActionResult> MarkDelivered(Guid id)
{
    var me = CurrentUserId();

    var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
    if (order is null) return NotFound();
    if (order.BuyerId != me && order.SellerId != me) return Forbid();

    var s = await _db.OrderShippings.FirstOrDefaultAsync(x => x.OrderId == id);
    if (s == null) return BadRequest("Shipping not found.");
    if (s.Status != ShippingStatus.Shipped) return BadRequest("Shipping must be Shipped.");

    s.Status = ShippingStatus.Delivered;
    s.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();
    return NoContent();
}

}

public class UpsertShippingRequest
{
    public int Method { get; set; } // DeliveryMethod
    public string RecipientName { get; set; } = "";
    public string RecipientPhone { get; set; } = "";
    public string City { get; set; } = "";
    public string AddressLine { get; set; } = ""; // для Post/Courier. Для Meetup можна "Meet at ..."
    public string? Carrier { get; set; }          // optional
}

public class MarkShippedRequest
{
    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
}