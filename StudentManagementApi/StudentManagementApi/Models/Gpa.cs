using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("GPA")]
[Index("StudentId", "SemesterId", Name = "UQ_GPA_Student_Semester", IsUnique = true)]
public partial class Gpa
{
    [Key]
    [Column("GPAID")]
    public int Gpaid { get; set; }

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [Column("SemesterID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SemesterId { get; set; } = null!;

    [Column("GPA", TypeName = "decimal(4, 2)")]
    public decimal Gpa1 { get; set; }

    [Column("CumulativeGPA", TypeName = "decimal(4, 2)")]
    public decimal CumulativeGpa { get; set; }

    public int TotalCreditsEarned { get; set; }

    public int TotalCreditsRegistered { get; set; }

    [ForeignKey("SemesterId")]
    [InverseProperty("Gpas")]
    public virtual Semester Semester { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("Gpas")]
    public virtual Student Student { get; set; } = null!;
}
