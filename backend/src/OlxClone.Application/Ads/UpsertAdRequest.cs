using OlxClone.Domain.Entities;

namespace OlxClone.Application.Ads;

public class UpsertAdRequest
{
    public Guid CategoryId { get; set; }
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "UAH";
    public string City { get; set; } = default!;
    public AdCondition Condition { get; set; }
}