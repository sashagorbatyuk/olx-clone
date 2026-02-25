using System;
using System.Collections.Generic;

namespace OlxClone.Domain.Entities;

public class Ad
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = default!;

    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "UAH";
    public string City { get; set; } = default!;

    public AdCondition Condition { get; set; }
    public AdStatus Status { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ✅ ВАЖЛИВО: колекція фото всередині класу
    public ICollection<AdPhoto> Photos { get; set; } = new List<AdPhoto>();
}

public enum AdCondition
{
    New = 0,
    Used = 1
}

public enum AdStatus
{
    Active = 0,
    Archived = 1
}