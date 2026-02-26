using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlxClone.Application.Ads;
using OlxClone.Domain.Entities;
using OlxClone.Infrastructure;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;


namespace OlxClone.Api.Controllers;

[ApiController]
[Route("ads")]
public class AdsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public AdsController(AppDbContext db, IWebHostEnvironment env)
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

    // GET /ads?search=&categoryId=&city=&minPrice=&maxPrice=&condition=&sort=&page=&pageSize=
    [HttpGet]
    public async Task<ActionResult<AdsListResponseDto>> Get([FromQuery] AdQuery q)
    {
        var query = _db.Ads
            .AsNoTracking()
            .Where(x => x.Status == AdStatus.Active);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Title, $"%{s}%") ||
                EF.Functions.ILike(x.Description, $"%{s}%"));
        }

        if (q.CategoryId.HasValue)
            query = query.Where(x => x.CategoryId == q.CategoryId.Value);

        if (!string.IsNullOrWhiteSpace(q.City))
            query = query.Where(x => x.City == q.City.Trim());

        if (q.MinPrice.HasValue)
            query = query.Where(x => x.Price >= q.MinPrice.Value);

        if (q.MaxPrice.HasValue)
            query = query.Where(x => x.Price <= q.MaxPrice.Value);

        if (q.Condition.HasValue)
            query = query.Where(x => x.Condition == q.Condition.Value);

        query = (q.Sort ?? "createdAt_desc") switch
        {
            "price_asc" => query.OrderBy(x => x.Price),
            "price_desc" => query.OrderByDescending(x => x.Price),
            _ => query.OrderByDescending(x => x.CreatedAt)
        };

        var total = await query.CountAsync();

        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 50);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AdsListItemDto
            {
                Id = x.Id,
                Title = x.Title,
                Price = x.Price,
                Currency = x.Currency,
                City = x.City,
                Condition = x.Condition,
                CreatedAt = x.CreatedAt,
                CategoryName = x.Category.Name,
                MainPhotoUrl = _db.AdPhotos
                .Where(p => p.AdId == x.Id)
                .OrderBy(p => p.SortOrder)
                .Select(p => p.Url)
                .FirstOrDefault()
                })
            .ToListAsync();

        return Ok(new AdsListResponseDto
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        });
    }

    // GET /ads/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdDetailsDto>> GetById(Guid id)
    {
        var ad = await _db.Ads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (ad is null) return NotFound();

        var photos = await _db.AdPhotos.AsNoTracking()
            .Where(p => p.AdId == id)
            .OrderBy(p => p.SortOrder)
            .Select(p => new AdPhotoDto
            {
                Id = p.Id,
                Url = p.Url,
                SortOrder = p.SortOrder
            })
            .ToListAsync();

        return Ok(new AdDetailsDto
        {
            Id = ad.Id,
            CategoryId = ad.CategoryId,
            Title = ad.Title,
            Description = ad.Description,
            Price = ad.Price,
            Currency = ad.Currency,
            City = ad.City,
            Condition = ad.Condition,
            CreatedAt = ad.CreatedAt,
            Photos = photos
        });
    }

    // POST /ads (auth required)
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertAdRequest r)
    {
        var categoryExists = await _db.Categories.AnyAsync(x => x.Id == r.CategoryId);
        if (!categoryExists) return BadRequest("Invalid categoryId (category not found).");

        var userId = CurrentUserId();

        var ad = new Ad
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CategoryId = r.CategoryId,
            Title = r.Title.Trim(),
            Description = r.Description.Trim(),
            Price = r.Price,
            Currency = string.IsNullOrWhiteSpace(r.Currency) ? "UAH" : r.Currency.Trim(),
            City = r.City.Trim(),
            Condition = r.Condition,
            Status = AdStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Ads.Add(ad);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = ad.Id }, new { ad.Id });
    }

    // PUT /ads/{id} (owner only)
    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertAdRequest r)
    {
        var ad = await _db.Ads.FirstOrDefaultAsync(x => x.Id == id);
        if (ad is null) return NotFound();

        if (ad.UserId != CurrentUserId()) return Forbid();

        var categoryExists = await _db.Categories.AnyAsync(x => x.Id == r.CategoryId);
        if (!categoryExists) return BadRequest("Invalid categoryId (category not found).");

        ad.CategoryId = r.CategoryId;
        ad.Title = r.Title.Trim();
        ad.Description = r.Description.Trim();
        ad.Price = r.Price;
        ad.Currency = string.IsNullOrWhiteSpace(r.Currency) ? "UAH" : r.Currency.Trim();
        ad.City = r.City.Trim();
        ad.Condition = r.Condition;
        ad.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /ads/{id} (owner only, archive)
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ad = await _db.Ads.FirstOrDefaultAsync(x => x.Id == id);
        if (ad is null) return NotFound();

        if (ad.UserId != CurrentUserId()) return Forbid();

        ad.Status = AdStatus.Archived;
        ad.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /ads/{id}/photos (owner only, multipart/form-data)
    [Authorize]
    [HttpPost("{id:guid}/photos")]
    [RequestSizeLimit(10_000_000)] // 10MB
    public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
    {
        var webRoot = _env.WebRootPath;
Directory.CreateDirectory(webRoot);

var uploadsDir = Path.Combine(webRoot, "uploads");
Directory.CreateDirectory(uploadsDir);
        var ad = await _db.Ads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (ad is null) return NotFound();

        if (ad.UserId != CurrentUserId()) return Forbid();

        if (file is null || file.Length == 0)
            return BadRequest("Empty file.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(ext))
            return BadRequest("Unsupported file type.");

// якщо WebRootPath порожній (часто так у dev), робимо wwwroot в папці API-проєкту
if (string.IsNullOrWhiteSpace(webRoot))
{
    webRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
}


        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        var url = $"/uploads/{fileName}";

        var lastSort = await _db.AdPhotos
            .Where(p => p.AdId == id)
            .MaxAsync(p => (int?)p.SortOrder) ?? -1;

        _db.AdPhotos.Add(new AdPhoto
        {
            Id = Guid.NewGuid(),
            AdId = id,
            Url = url,
            SortOrder = lastSort + 1
        });

        await _db.SaveChangesAsync();

        return Ok(new { url });
    }

    // DELETE /ads/{id}/photos/{photoId} (owner only)
    [Authorize]
    [HttpDelete("{id:guid}/photos/{photoId:guid}")]
    public async Task<IActionResult> DeletePhoto(Guid id, Guid photoId)
    {
        var ad = await _db.Ads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (ad is null) return NotFound();

        if (ad.UserId != CurrentUserId()) return Forbid();

        var photo = await _db.AdPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.AdId == id);
        if (photo is null) return NotFound();

        // delete file from disk (best-effort)
        try
        {
            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
                webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            // photo.Url like "/uploads/xxx.jpg"
            var rel = photo.Url.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString());
            var full = Path.Combine(webRoot, rel);
            if (System.IO.File.Exists(full))
                System.IO.File.Delete(full);
        }
        catch
        {
            // ignore
        }

        _db.AdPhotos.Remove(photo);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // PUT /ads/{id}/photos/{photoId}/main (owner only)
    [Authorize]
    [HttpPut("{id:guid}/photos/{photoId:guid}/main")]
    public async Task<IActionResult> SetMainPhoto(Guid id, Guid photoId)
    {
        var ad = await _db.Ads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (ad is null) return NotFound();

        if (ad.UserId != CurrentUserId()) return Forbid();

        // IMPORTANT: must be tracked entities to update SortOrder
        var photos = await _db.AdPhotos
            .Where(p => p.AdId == id)
            .OrderBy(p => p.SortOrder)
            .ToListAsync();

        if (photos.Count == 0) return BadRequest("No photos.");

        var target = photos.FirstOrDefault(p => p.Id == photoId);
        if (target is null) return NotFound();

        photos.Remove(target);
        photos.Insert(0, target);

        for (int i = 0; i < photos.Count; i++)
            photos[i].SortOrder = i;

        await _db.SaveChangesAsync();
        return NoContent();
    }
    // GET /ads/{id}/subscription
[Authorize]
[HttpGet("{id:guid}/subscription")]
public async Task<IActionResult> GetSubscriptionStatus(Guid id)
{
    var me = CurrentUserId();

    var exists = await _db.AdSubscriptions.AsNoTracking()
        .AnyAsync(x => x.AdId == id && x.UserId == me);

    return Ok(new { subscribed = exists });
}

// POST /ads/{id}/subscribe
[Authorize]
[HttpPost("{id:guid}/subscribe")]
public async Task<IActionResult> Subscribe(Guid id)
{
    var me = CurrentUserId();

    var ad = await _db.Ads.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
    if (ad is null) return NotFound("Ad not found.");
    if (ad.UserId == me) return BadRequest("You cannot subscribe to your own ad.");

    var exists = await _db.AdSubscriptions.AnyAsync(x => x.AdId == id && x.UserId == me);
    if (exists) return NoContent();

    _db.AdSubscriptions.Add(new Domain.Entities.AdSubscription
    {
        Id = Guid.NewGuid(),
        AdId = id,
        UserId = me,
        CreatedAt = DateTime.UtcNow,
        LastSeenAt = DateTime.UtcNow
    });

    await _db.SaveChangesAsync();
    return NoContent();
}

// DELETE /ads/{id}/subscribe
[Authorize]
[HttpDelete("{id:guid}/subscribe")]
public async Task<IActionResult> Unsubscribe(Guid id)
{
    var me = CurrentUserId();

    var s = await _db.AdSubscriptions.FirstOrDefaultAsync(x => x.AdId == id && x.UserId == me);
    if (s is null) return NoContent();

    _db.AdSubscriptions.Remove(s);
    await _db.SaveChangesAsync();
    return NoContent();
}
}