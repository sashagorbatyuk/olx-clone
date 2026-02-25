using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlxClone.Domain.Entities;
using OlxClone.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace OlxClone.Api.Controllers;

[ApiController]
[Route("chats")]
public class ChatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ChatsController(AppDbContext db) => _db = db;

    private Guid CurrentUserId()
    {
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("User id claim not found.");

        return Guid.Parse(idStr);
    }

    // POST /chats/by-ad/{adId}
    // Creates chat between current user (buyer) and ad owner (seller), or returns existing.
    [Authorize]
    [HttpPost("by-ad/{adId:guid}")]
    public async Task<IActionResult> CreateOrGetByAd(Guid adId)
    {
        var me = CurrentUserId();

        var ad = await _db.Ads
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == adId && a.Status == AdStatus.Active);

        if (ad is null) return NotFound("Ad not found.");

        var sellerId = ad.UserId;
        var buyerId = me;

        if (sellerId == buyerId)
            return BadRequest("You cannot create chat with yourself.");

        var existing = await _db.Conversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.AdId == adId && c.BuyerId == buyerId && c.SellerId == sellerId);

        if (existing is not null)
            return Ok(new { id = existing.Id });

        var conv = new Conversation
        {
            Id = Guid.NewGuid(),
            AdId = adId,
            BuyerId = buyerId,
            SellerId = sellerId,
            CreatedAt = DateTime.UtcNow,
            LastMessageAt = null
        };

        _db.Conversations.Add(conv);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // if unique index hit concurrently
            var again = await _db.Conversations
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.AdId == adId && c.BuyerId == buyerId && c.SellerId == sellerId);

            if (again is not null)
                return Ok(new { id = again.Id });

            throw;
        }

        return Ok(new { id = conv.Id });
    }

    // GET /chats?includeEmpty=false
    // Only my conversations (buyer/seller), rich preview.
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetMyChats([FromQuery] bool includeEmpty = false)
    {
        var me = CurrentUserId();

        var q = _db.Conversations
            .AsNoTracking()
            .Where(c => c.BuyerId == me || c.SellerId == me);

        // If you store LastMessageAt, it's cheaper than checking messages
        if (!includeEmpty)
            q = q.Where(c => c.LastMessageAt != null);

        var chats = await q
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Select(c => new
            {
                id = c.Id,
                adId = c.AdId,
                adTitle = c.Ad.Title,

                otherUserId = c.BuyerId == me ? c.SellerId : c.BuyerId,
                otherUserName = c.BuyerId == me ? c.Seller.Name : c.Buyer.Name,
                otherUserAvatarUrl = c.BuyerId == me ? c.Seller.AvatarUrl : c.Buyer.AvatarUrl,

                lastMessageText = _db.Messages
                    .Where(m => m.ConversationId == c.Id)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => m.Text)
                    .FirstOrDefault(),

                lastMessageAt = c.LastMessageAt
            })
            .ToListAsync();

        return Ok(chats);
    }

    // GET /chats/{id} (header + messages)
    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetChat(Guid id)
    {
        var me = CurrentUserId();

        var chat = await _db.Conversations
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                id = c.Id,
                adId = c.AdId,
                adTitle = c.Ad.Title,
                buyerId = c.BuyerId,
                sellerId = c.SellerId,

                otherUserId = c.BuyerId == me ? c.SellerId : c.BuyerId,
                otherUserName = c.BuyerId == me ? c.Seller.Name : c.Buyer.Name,
                otherUserAvatarUrl = c.BuyerId == me ? c.Seller.AvatarUrl : c.Buyer.AvatarUrl
            })
            .FirstOrDefaultAsync();

        if (chat is null) return NotFound();

        if (chat.buyerId != me && chat.sellerId != me)
            return Forbid();

        var messages = await _db.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == id)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                id = m.Id,
                senderId = m.SenderId,
                text = m.Text,
                createdAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            id = chat.id,
            adId = chat.adId,
            adTitle = chat.adTitle,
            otherUserId = chat.otherUserId,
            otherUserName = chat.otherUserName,
            otherUserAvatarUrl = chat.otherUserAvatarUrl,
            messages
        });
    }

    // POST /chats/{id}/messages
    [Authorize]
    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> Send(Guid id, [FromBody] SendMessageRequest r)
    {
        var me = CurrentUserId();

        if (r is null || string.IsNullOrWhiteSpace(r.Text))
            return BadRequest("Text is required.");

        var chat = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == id);
        if (chat is null) return NotFound();

        if (chat.BuyerId != me && chat.SellerId != me)
            return Forbid();

        var msg = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = id,
            SenderId = me,
            Text = r.Text.Trim(),
            CreatedAt = DateTime.UtcNow,
            ReadAt = null
        };

        _db.Messages.Add(msg);
        chat.LastMessageAt = msg.CreatedAt;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = msg.Id,
            senderId = msg.SenderId,
            text = msg.Text,
            createdAt = msg.CreatedAt
        });
    }

    public class SendMessageRequest
    {
        public string Text { get; set; } = null!;
    }
}