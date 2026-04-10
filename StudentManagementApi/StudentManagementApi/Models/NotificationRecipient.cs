using System;
using System.Collections.Generic;

namespace StudentManagementApi.Models;

public partial class NotificationRecipient
{
    public int RecipientId { get; set; }

    public int NotificationId { get; set; }

    public string AccountId { get; set; } = null!;

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public bool IsEmailSent { get; set; }

    public DateTime? EmailSentAt { get; set; }

    public string? EmailError { get; set; }

    public virtual Notification Notification { get; set; } = null!;
}
