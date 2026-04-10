using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Grade")]
[Index("StudentId", Name = "IDX_Grade_Student")]
[Index("StudentId", "ClassId", Name = "UQ_Grade_Student_Class", IsUnique = true)]
public partial class Grade
{
    [Key]
    [Column("GradeID")]
    public int GradeId { get; set; }

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [Column("ClassID")]
    [StringLength(20)]
    [Unicode(false)]
    public string ClassId { get; set; } = null!;

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? ProcessScore { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? MidtermScore { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? FinalScore { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal? TotalScore { get; set; }

    [StringLength(2)]
    [Unicode(false)]
    public string? LetterGrade { get; set; }

    public bool? IsApproved { get; set; }

    [ForeignKey("ClassId")]
    [InverseProperty("Grades")]
    public virtual Class Class { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("Grades")]
    public virtual Student Student { get; set; } = null!;
}
