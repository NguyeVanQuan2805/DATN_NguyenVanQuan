using System;
using System.Collections.Generic;

namespace StudentManagementApi.Models;

public partial class Room
{
    public int RoomId { get; set; }

    public string RoomCode { get; set; } = null!;

    public string RoomName { get; set; } = null!;

    public string? Building { get; set; }

    public int Capacity { get; set; }

    public string RoomType { get; set; } = null!;

    public bool IsAvailable { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ClassSchedule> ClassSchedules { get; set; } = new List<ClassSchedule>();
}
