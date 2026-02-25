using Microsoft.EntityFrameworkCore;
using OlxClone.Domain.Entities;

namespace OlxClone.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Ad> Ads => Set<Ad>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<AdPhoto> AdPhotos => Set<AdPhoto>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderShipping> OrderShippings => Set<OrderShipping>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(320);
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.About).HasMaxLength(1000);
        });

        modelBuilder.Entity<Ad>(e =>
        {
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => x.City);
            e.HasIndex(x => x.Price);
            e.HasIndex(x => x.CreatedAt);

            e.Property(x => x.Title).HasMaxLength(120);
            e.Property(x => x.City).HasMaxLength(80);
            e.Property(x => x.Currency).HasMaxLength(8);

            e.HasMany(x => x.Photos)
             .WithOne(p => p.Ad)
             .HasForeignKey(p => p.AdId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.HasIndex(x => x.Name);
            e.Property(x => x.Name).HasMaxLength(80);

            e.HasOne(x => x.Parent)
             .WithMany(x => x.Children)
             .HasForeignKey(x => x.ParentId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Conversation>(e =>
        {
            e.HasIndex(x => new { x.AdId, x.BuyerId, x.SellerId }).IsUnique();

            e.HasOne(x => x.Ad)
                .WithMany()
                .HasForeignKey(x => x.AdId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Buyer)
                .WithMany()
                .HasForeignKey(x => x.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Seller)
                .WithMany()
                .HasForeignKey(x => x.SellerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.Property(x => x.Text).HasMaxLength(2000);

            e.HasOne(x => x.Conversation)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Sender)
                .WithMany()
                .HasForeignKey(x => x.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(x => new { x.ConversationId, x.CreatedAt });
        });

        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasIndex(x => x.TokenHash);
            e.HasIndex(x => new { x.UserId, x.ExpiresAt });
            e.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
            });

        modelBuilder.Entity<Order>(b =>
{
    b.HasKey(x => x.Id);

    b.HasOne(x => x.Ad)
        .WithMany()
        .HasForeignKey(x => x.AdId)
        .OnDelete(DeleteBehavior.Restrict);

    b.HasOne(x => x.Buyer)
        .WithMany()
        .HasForeignKey(x => x.BuyerId)
        .OnDelete(DeleteBehavior.Restrict);

    b.HasOne(x => x.Seller)
        .WithMany()
        .HasForeignKey(x => x.SellerId)
        .OnDelete(DeleteBehavior.Restrict);

    b.Property(x => x.Currency).HasMaxLength(10);

    b.HasIndex(x => x.AdId);

    // ✅ 1 активний order на 1 ad (Created або Accepted)
    // У PostgreSQL зробимо частковий індекс через raw SQL у міграції (нижче).
});
modelBuilder.Entity<OrderShipping>(b =>
{
    b.HasKey(x => x.Id);

    b.HasOne(x => x.Order)
        .WithOne()
        .HasForeignKey<OrderShipping>(x => x.OrderId)
        .OnDelete(DeleteBehavior.Cascade);

    b.Property(x => x.RecipientName).HasMaxLength(200);
    b.Property(x => x.RecipientPhone).HasMaxLength(50);
    b.Property(x => x.City).HasMaxLength(120);
    b.Property(x => x.AddressLine).HasMaxLength(300);
    b.Property(x => x.Carrier).HasMaxLength(80);
    b.Property(x => x.TrackingNumber).HasMaxLength(80);

    b.HasIndex(x => x.OrderId).IsUnique();
});
    }
}