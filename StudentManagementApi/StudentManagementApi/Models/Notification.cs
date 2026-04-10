using System;
using System.Collections.Generic;

namespace StudentManagementApi.Models;

public partial class Notification
{
    public int NotificationId { get; set; }

    public string Title { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string? SenderId { get; set; }

    public string NotificationType { get; set; } = null!;

    public string TargetScope { get; set; } = null!;

    public int? TargetClassId { get; set; }

    public bool SendEmail { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? SentAt { get; set; }

    public virtual ICollection<NotificationRecipient> NotificationRecipients { get; set; } = new List<NotificationRecipient>();
}
