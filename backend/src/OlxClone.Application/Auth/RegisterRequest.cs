namespace OlxClone.Application.Auth;

public class RegisterRequest
{
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
    public string Name { get; set; } = default!;
}