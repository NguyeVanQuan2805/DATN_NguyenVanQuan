using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("ClassSchedule")]
public partial class ClassSchedule
{
    [Key]
    [Column("ScheduleID")]
    public int ScheduleId { get; set; }

    public int DayOfWeek { get; set; }

    public int PeriodStart { get; set; }

    public int PeriodEnd { get; set; }

    [Column("Room")]
    [StringLength(50)]
    public string? Room { get; set; }

    [Column("RoomID")]
    public int? RoomId { get; set; }

    [InverseProperty("Schedule")]
    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
}
