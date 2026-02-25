namespace OlxClone.Domain.Entities;

public class AdPhoto
{
    public Guid Id { get; set; }

    public Guid AdId { get; set; }
    public Ad Ad { get; set; } = default!;

    public string Url { get; set; } = default!;
    public int SortOrder { get; set; }
}