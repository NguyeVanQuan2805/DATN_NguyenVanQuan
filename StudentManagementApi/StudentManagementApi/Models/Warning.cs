using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Warning")]
[Index("StudentId", "SemesterId", Name = "IDX_Warning_Student_Semester")]
public partial class Warning
{
    [Key]
    [Column("WarningID")]
    public int WarningId { get; set; }

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [Column("SemesterID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SemesterId { get; set; } = null!;

    public int WarningLevel { get; set; }

    [StringLength(500)]
    public string WarningReason { get; set; } = null!;

    [StringLength(20)]
    [Unicode(false)]
    public string? IssuedBy { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? IssuedDate { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    public string? ResolutionNotes { get; set; }

    [ForeignKey("IssuedBy")]
    [InverseProperty("Warnings")]
    public virtual Advisor? IssuedByNavigation { get; set; }

    [ForeignKey("SemesterId")]
    [InverseProperty("Warnings")]
    public virtual Semester Semester { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("Warnings")]
    public virtual Student Student { get; set; } = null!;
}
