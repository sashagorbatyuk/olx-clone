using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlxClone.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace OlxClone.Api.Controllers;

[ApiController]
[Route("subscriptions")]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public SubscriptionsController(AppDbContext db) => _db = db;

    private Guid CurrentUserId()
    {
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("User id claim not found.");

        return Guid.Parse(idStr);
    }

    // GET /subscriptions/ads
    [Authorize]
    [HttpGet("ads")]
    public async Task<IActionResult> GetMyFollowedAds()
    {
        var me = CurrentUserId();

        var items = await _db.AdSubscriptions
            .AsNoTracking()
            .Where(s => s.UserId == me)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                adId = s.AdId,
                title = s.Ad.Title,
                price = s.Ad.Price,
                currency = s.Ad.Currency,
                city = s.Ad.City,
                mainPhotoUrl = s.Ad.Photos
                    .OrderBy(p => p.SortOrder)
                    .Select(p => p.Url)
                    .FirstOrDefault(),
                status = (int)s.Ad.Status,
                updatedAt = s.Ad.UpdatedAt,

                subscribedAt = s.CreatedAt,
                lastSeenAt = s.LastSeenAt,
                hasUpdates = s.Ad.UpdatedAt > s.LastSeenAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // POST /subscriptions/ads/{adId}/seen
    [Authorize]
    [HttpPost("ads/{adId:guid}/seen")]
    public async Task<IActionResult> MarkSeen(Guid adId)
    {
        var me = CurrentUserId();

        var s = await _db.AdSubscriptions.FirstOrDefaultAsync(x => x.AdId == adId && x.UserId == me);
        if (s is null) return NotFound("Subscription not found.");

        s.LastSeenAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}