using OlxClone.Domain.Entities;

namespace OlxClone.Application.Ads;

public class AdQuery
{
    public string? Search { get; set; }
    public Guid? CategoryId { get; set; }
    public string? City { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public AdCondition? Condition { get; set; }

    // createdAt_desc | price_asc | price_desc
    public string? Sort { get; set; } = "createdAt_desc";

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}