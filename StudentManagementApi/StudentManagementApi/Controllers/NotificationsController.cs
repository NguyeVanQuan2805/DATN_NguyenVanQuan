using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public NotificationsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Notifications
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<object>>> GetMyNotifications(
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var accountId = User.FindFirst("accountId")?.Value
                     ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(accountId))
            return Unauthorized();

        var query = _context.Set<NotificationRecipient>()
            .Include(nr => nr.Notification)
            .Where(nr => nr.AccountId == accountId);

        if (unreadOnly == true)
            query = query.Where(nr => nr.IsRead == false);

        var total = await query.CountAsync();

        var notifications = await query
            .OrderByDescending(nr => nr.Notification.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(nr => new
            {
                nr.RecipientId,
                nr.NotificationId,
                nr.Notification.Title,
                nr.Notification.Content,
                nr.Notification.NotificationType,
                nr.Notification.CreatedAt,
                nr.IsRead,
                nr.ReadAt
            })
            .ToListAsync();

        return Ok(new
        {
            total,
            page,
            pageSize,
            notifications
        });
    }

    // GET: api/Notifications/unread-count
    [HttpGet("unread-count")]
    [Authorize]
    public async Task<ActionResult<object>> GetUnreadCount()
    {
        var accountId = User.FindFirst("accountId")?.Value
                     ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(accountId))
            return Unauthorized();

        var count = await _context.Set<NotificationRecipient>()
            .Where(nr => nr.AccountId == accountId && nr.IsRead == false)
            .CountAsync();

        return Ok(new { unreadCount = count });
    }

    // POST: api/Notifications
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<object>> PostNotification([FromBody] NotificationCreateDto dto)
    {
        var senderId = User.FindFirst("accountId")?.Value;

        var notification = new Notification
        {
            Title = dto.Title,
            Content = dto.Content,
            SenderId = senderId,
            NotificationType = dto.NotificationType,
            TargetScope = dto.TargetScope,
            TargetClassId = dto.TargetClassId,
            SendEmail = dto.SendEmail,
            CreatedAt = DateTime.UtcNow,
            SentAt = DateTime.UtcNow
        };

        _context.Set<Notification>().Add(notification);
        await _context.SaveChangesAsync();

        // Tạo recipients dựa trên target scope
        await CreateRecipients(notification.NotificationId, dto.TargetScope, dto.TargetClassId);

        return Ok(new
        {
            message = "Đã gửi thông báo thành công",
            notificationId = notification.NotificationId,
            recipientCount = await _context.Set<NotificationRecipient>()
                .CountAsync(nr => nr.NotificationId == notification.NotificationId)
        });
    }

    // PUT: api/Notifications/{id}/mark-read
    [HttpPut("{id}/mark-read")]
    [Authorize]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var accountId = User.FindFirst("accountId")?.Value
                     ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(accountId))
            return Unauthorized();

        var recipient = await _context.Set<NotificationRecipient>()
            .FirstOrDefaultAsync(nr => nr.NotificationId == id && nr.AccountId == accountId);

        if (recipient == null)
            return NotFound();

        if (!recipient.IsRead)
        {
            recipient.IsRead = true;
            recipient.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Đã đánh dấu đã đọc" });
    }

    // PUT: api/Notifications/mark-all-read
    [HttpPut("mark-all-read")]
    [Authorize]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var accountId = User.FindFirst("accountId")?.Value
                     ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(accountId))
            return Unauthorized();

        var unreadRecipients = await _context.Set<NotificationRecipient>()
            .Where(nr => nr.AccountId == accountId && nr.IsRead == false)
            .ToListAsync();

        foreach (var recipient in unreadRecipients)
        {
            recipient.IsRead = true;
            recipient.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã đánh dấu {unreadRecipients.Count} thông báo là đã đọc" });
    }

    private async Task CreateRecipients(int notificationId, string targetScope, int? targetClassId)
    {
        List<string> accountIds = new();

        switch (targetScope)
        {
            case "ALL":
                accountIds = await _context.Accounts
                    .Where(a => a.IsActive == true)
                    .Select(a => a.AccountId)
                    .ToListAsync();
                break;

            case "STUDENTS":
                accountIds = await _context.Accounts
                    .Where(a => a.Role == "STUDENT" && a.IsActive == true)
                    .Select(a => a.AccountId)
                    .ToListAsync();
                break;

            case "TEACHERS":
                accountIds = await _context.Accounts
                    .Where(a => a.Role == "TEACHER" && a.IsActive == true)
                    .Select(a => a.AccountId)
                    .ToListAsync();
                break;

            case "ADVISORS":
                accountIds = await _context.Accounts
                    .Where(a => a.Role == "ADVISOR" && a.IsActive == true)
                    .Select(a => a.AccountId)
                    .ToListAsync();
                break;

            case "CLASS":
                if (targetClassId.HasValue)
                {
                    accountIds = await _context.Students
                        .Where(s => s.AdvisorClassId == targetClassId && s.Account.IsActive == true)
                        .Select(s => s.AccountId)
                        .ToListAsync();
                }
                break;
        }

        foreach (var accountId in accountIds)
        {
            _context.Set<NotificationRecipient>().Add(new NotificationRecipient
            {
                NotificationId = notificationId,
                AccountId = accountId,
                IsRead = false,
                IsEmailSent = false
            });
        }

        await _context.SaveChangesAsync();
    }
}

public class NotificationCreateDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string NotificationType { get; set; } = "SYSTEM";
    public string TargetScope { get; set; } = "ALL";
    public int? TargetClassId { get; set; }
    public bool SendEmail { get; set; } = false;
}