using MailKit.Net.Smtp;
using MimeKit;

namespace OlxClone.Api.Services;

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string html);
}

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _cfg;
    public SmtpEmailSender(IConfiguration cfg) => _cfg = cfg;

    public async Task SendAsync(string to, string subject, string html)
    {
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(_cfg["Smtp:From"]!));
        msg.To.Add(MailboxAddress.Parse(to));
        msg.Subject = subject;

        msg.Body = new BodyBuilder { HtmlBody = html }.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(
            _cfg["Smtp:Host"]!,
            int.Parse(_cfg["Smtp:Port"]!),
            MailKit.Security.SecureSocketOptions.StartTls
        );

        await client.AuthenticateAsync(_cfg["Smtp:User"]!, _cfg["Smtp:Pass"]!);
        await client.SendAsync(msg);
        await client.DisconnectAsync(true);
    }
}