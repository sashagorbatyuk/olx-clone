using Microsoft.EntityFrameworkCore;
using OlxClone.Domain.Entities;

namespace OlxClone.Infrastructure.Seed;

public static class DbSeeder
{
    public static void SeedCategories(AppDbContext db)
{
    var names = new[]
{
    "Help",
    "Kids",
    "Real Estate",
    "Auto",
    "Spare Parts",
    "Jobs",
    "Animals",
    "Home & Garden",
    "Electronics",
    "Business & Services",
    "Short-term Rentals",
    "Rentals",
    "Fashion & Style",
    "Hobbies, Leisure & Sports",
    "Free Stuff",
    "Exchange",
};

    var existing = db.Categories.AsNoTracking()
        .Select(c => c.Name.ToLower())
        .ToHashSet();

    var toAdd = names
        .Where(n => !existing.Contains(n.ToLower()))
        .Select(n => new Category
        {
            Id = Guid.NewGuid(),
            Name = n,
            ParentId = null
        })
        .ToList();

    if (toAdd.Count == 0) return;

    db.Categories.AddRange(toAdd);
    db.SaveChanges();
}

    // Опційно (якщо захочеш потім): додавати тільки відсутні, не виходячи з методу
    // public static void SeedCategories(AppDbContext db)
    // {
    //     var names = ...
    //     var existing = db.Categories.AsNoTracking()
    //         .Select(c => c.Name.ToLower())
    //         .ToHashSet();
    //
    //     var toAdd = names
    //         .Where(n => !existing.Contains(n.ToLower()))
    //         .Select(n => new Category { Id = Guid.NewGuid(), Name = n, ParentId = null })
    //         .ToList();
    //
    //     if (toAdd.Count == 0) return;
    //     db.Categories.AddRange(toAdd);
    //     db.SaveChanges();
    // }
}