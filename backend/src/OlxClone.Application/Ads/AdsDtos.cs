using OlxClone.Domain.Entities;

namespace OlxClone.Application.Ads;

public class AdsListItemDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = default!;
    public decimal Price { get; set; }
    public string Currency { get; set; } = default!;
    public string City { get; set; } = default!;
    public AdCondition Condition { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? MainPhotoUrl { get; set; }
    public string? CategoryName { get; set; }
}

public class AdsListResponseDto
{
    public List<AdsListItemDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
}

public class AdDetailsDto
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal Price { get; set; }
    public string Currency { get; set; } = default!;
    public string City { get; set; } = default!;
    public AdCondition Condition { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<AdPhotoDto> Photos { get; set; } = new();
}

public class AdPhotoDto
{
    public Guid Id { get; set; }
    public string Url { get; set; } = "";
    public int SortOrder { get; set; }
}