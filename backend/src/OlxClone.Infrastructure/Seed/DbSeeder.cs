using Microsoft.EntityFrameworkCore;
using OlxClone.Domain.Entities;

namespace OlxClone.Infrastructure.Seed;

public static class DbSeeder
{
    public static async Task SeedCategories(AppDbContext db)
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

        var map = new Dictionary<string, string>
        {
            ["Animals"] = "/category-icons/animals.png",
            ["Auto"] = "/category-icons/auto.png",
            ["Business & Services"] = "/category-icons/business-services.png",
            ["Electronics"] = "/category-icons/electronics.png",
            ["Exchange"] = "/category-icons/exchange.png",
            ["Fashion & Style"] = "/category-icons/fashion-style.png",
            ["Free Stuff"] = "/category-icons/free-stuff.png",
            ["Help"] = "/category-icons/help.png",
            ["Hobbies, Leisure & Sports"] = "/category-icons/hobbies-leisure-sports.png",
            ["Home & Garden"] = "/category-icons/home-garden.png",
            ["Jobs"] = "/category-icons/jobs.png",
            ["Kids"] = "/category-icons/kids.png",
            ["Real Estate"] = "/category-icons/real-estate.png",
            ["Rentals"] = "/category-icons/rentals.png",
            ["Short-term Rentals"] = "/category-icons/short-term-rentals.png",
            ["Spare Parts"] = "/category-icons/spare-parts.png",
        };

        // Existing category names (case-insensitive)
        var existingNames = await db.Categories
            .AsNoTracking()
            .Select(c => c.Name)
            .ToListAsync();

        var existingSet = existingNames
            .Select(x => x.Trim().ToLowerInvariant())
            .ToHashSet();

        // Add missing categories (IconUrl set immediately)
        var toAdd = names
            .Where(n => !existingSet.Contains(n.Trim().ToLowerInvariant()))
            .Select(n => new Category
            {
                Id = Guid.NewGuid(),
                Name = n,
                ParentId = null,
                IconUrl = map.TryGetValue(n, out var icon) ? icon : null
            })
            .ToList();

        if (toAdd.Count > 0)
        {
            db.Categories.AddRange(toAdd);
            await db.SaveChangesAsync();
        }

        // Update IconUrl for categories that already exist but have no icon yet
        var cats = await db.Categories.ToListAsync();
        var changed = false;

        foreach (var c in cats)
        {
            if (string.IsNullOrWhiteSpace(c.IconUrl) && map.TryGetValue(c.Name, out var icon))
            {
                c.IconUrl = icon;
                changed = true;
            }
        }

        if (changed)
            await db.SaveChangesAsync();
    }
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
