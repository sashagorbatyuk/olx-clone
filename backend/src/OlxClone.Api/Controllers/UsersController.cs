using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlxClone.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace OlxClone.Api.Controllers;

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public UsersController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private Guid CurrentUserId()
    {
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("User id claim not found.");

        return Guid.Parse(idStr);
    }

    // GET /users/me
[Authorize]
[HttpGet("me")]
public async Task<IActionResult> Me()
{
    var me = CurrentUserId();

    var u = await _db.Users
        .AsNoTracking()
        .Where(x => x.Id == me)
        .Select(x => new
        {
            id = x.Id,
            email = x.Email,
            name = x.Name,
            phone = x.Phone,
            avatarUrl = x.AvatarUrl,
            createdAt = x.CreatedAt,
            about = x.About
        })
        .FirstOrDefaultAsync();

    if (u is null) return NotFound();

    // aggregates
    var ratingAvg = await _db.Reviews
        .AsNoTracking()
        .Where(r => r.RateeId == me)
        .Select(r => (double?)r.Rating)
        .AverageAsync();

    var ratingCount = await _db.Reviews
        .AsNoTracking()
        .CountAsync(r => r.RateeId == me);

    var recentReviews = await _db.Reviews
        .AsNoTracking()
        .Where(r => r.RateeId == me)
        .OrderByDescending(r => r.CreatedAt)
        .Take(10)
        .Select(r => new
        {
            id = r.Id,
            rating = r.Rating,
            comment = r.Comment,
            createdAt = r.CreatedAt,
            raterName = r.Rater.Name
        })
        .ToListAsync();

    return Ok(new
    {
        u.id,
        u.email,
        u.name,
        u.phone,
        u.avatarUrl,
        u.createdAt,
        u.about,

        ratingAvg,
        ratingCount,
        recentReviews
    });
}

    // PUT /users/me
    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateMeRequest r)
    {
        var me = CurrentUserId();
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == me);
        if (u is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(r.Name))
            u.Name = r.Name.Trim();

        u.Phone = string.IsNullOrWhiteSpace(r.Phone) ? null : r.Phone.Trim();
        u.About = string.IsNullOrWhiteSpace(r.About) ? null : r.About.Trim();

        if (r.About != null && r.About.Length > 1000)
        return BadRequest("About is too long (max 1000).");

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /users/me/avatar (multipart/form-data file)
    [Authorize]
    [HttpPost("me/avatar")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var me = CurrentUserId();
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == me);
        if (u is null) return NotFound();

        if (file is null || file.Length == 0)
            return BadRequest("Empty file.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(ext))
            return BadRequest("Unsupported file type.");

        var webRoot = _env.WebRootPath;
if (string.IsNullOrWhiteSpace(webRoot))
{
    webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
}

// гарантуємо що wwwroot існує як директорія
Directory.CreateDirectory(webRoot);

var avatarsDir = Path.Combine(webRoot, "avatars");

// якщо раптом існує файл "avatars" — це і є твій кейс
if (System.IO.File.Exists(avatarsDir))
    System.IO.File.Delete(avatarsDir);

Directory.CreateDirectory(avatarsDir);
        Directory.CreateDirectory(avatarsDir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(avatarsDir, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        u.AvatarUrl = $"/avatars/{fileName}";
        await _db.SaveChangesAsync();

        return Ok(new { avatarUrl = u.AvatarUrl });
    }

    // GET /users/{id} (only if chatted with me)
    [Authorize]
[HttpGet("{id:guid}")]
public async Task<IActionResult> GetPublicUser(Guid id)
{
    var me = CurrentUserId();

    // 1) дозволяємо дивитись профіль тільки якщо є чат (як ти хотів)
    var allowed = await _db.Conversations.AsNoTracking()
        .AnyAsync(c =>
            (c.BuyerId == me && c.SellerId == id) ||
            (c.SellerId == me && c.BuyerId == id));

    if (!allowed) return Forbid();

    // 2) сам профіль
    var u = await _db.Users.AsNoTracking()
        .Where(x => x.Id == id)
        .Select(x => new
        {
            id = x.Id,
            name = x.Name,
            phone = x.Phone,
            about = x.About,
            avatarUrl = x.AvatarUrl,
            createdAt = x.CreatedAt
        })
        .FirstOrDefaultAsync();

    if (u is null) return NotFound("User not found.");

    // 3) rating summary
    var summary = await _db.Reviews.AsNoTracking()
        .Where(r => r.RateeId == id) // seller
        .GroupBy(r => r.RateeId)
        .Select(g => new
        {
            avg = g.Average(x => x.Rating),
            count = g.Count()
        })
        .FirstOrDefaultAsync();

    // 4) recent reviews
    var recent = await _db.Reviews.AsNoTracking()
        .Where(r => r.RateeId == id)
        .OrderByDescending(r => r.CreatedAt)
        .Take(10)
        .Select(r => new
        {
            id = r.Id,
            rating = r.Rating,
            comment = r.Comment,
            createdAt = r.CreatedAt,
            raterName = r.Rater.Name
        })
        .ToListAsync();

    // ✅ 5) один-єдиний return
    return Ok(new
    {
        id = u.id,
        name = u.name,
        phone = u.phone,
        about = u.about,
        avatarUrl = u.avatarUrl,
        createdAt = u.createdAt,

        ratingAvg = summary == null ? (double?)null : summary.avg,
        ratingCount = summary == null ? 0 : summary.count,
        recentReviews = recent
    });
}

    [Authorize]
    [HttpGet("me/ads")]
    public async Task<IActionResult> GetMyAds([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 50;
    if (pageSize > 100) pageSize = 100;

    var me = CurrentUserId();

    var query = _db.Ads
        .AsNoTracking()
        .Where(a => a.UserId == me)
        .OrderByDescending(a => a.CreatedAt);

    var total = await query.CountAsync();

    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(a => new
        {
            id = a.Id,
            title = a.Title,
            price = a.Price,
            currency = a.Currency,
            city = a.City,
            condition = a.Condition,
            createdAt = a.CreatedAt,
            mainPhotoUrl = a.Photos
                .OrderBy(p => p.SortOrder)
                .Select(p => p.Url)
                .FirstOrDefault()
        })
        .ToListAsync();

    return Ok(new
    {
        items,
        page,
        pageSize,
        totalCount = total
    });
    }

    // GET /users/me/ads?page=&pageSize=


    public class UpdateMeRequest
    {
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? About { get; set; }
    }

    // UsersController.cs
}