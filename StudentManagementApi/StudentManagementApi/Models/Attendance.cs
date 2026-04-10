using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Attendance")]
[Index("ClassId", "AttendanceDate", Name = "IDX_Attendance_Class_Date")]
[Index("StudentId", "ClassId", "AttendanceDate", Name = "UQ_Attendance_Student_Class_Date", IsUnique = true)]
public partial class Attendance
{
    [Key]
    [Column("AttendanceID")]
    public int AttendanceId { get; set; }

    [Column("ClassID")]
    [StringLength(20)]
    [Unicode(false)]
    public string ClassId { get; set; } = null!;

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    public DateOnly AttendanceDate { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    [StringLength(255)]
    public string? Notes { get; set; }

    [ForeignKey("ClassId")]
    [InverseProperty("Attendances")]
    public virtual Class Class { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("Attendances")]
    public virtual Student Student { get; set; } = null!;
}
