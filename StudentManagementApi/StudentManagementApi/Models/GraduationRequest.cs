using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace StudentManagementApi.Models;

public partial class GraduationRequest
{
    public int RequestId { get; set; }

    public string StudentId { get; set; } = null!;

    public string SemesterId { get; set; } = null!;

    public DateTime SubmittedAt { get; set; }

    public int TotalCreditsEarned { get; set; }

    public decimal CumulativeGpa { get; set; }

    public decimal TuitionDebt { get; set; }

    public bool MandatoryDone { get; set; }

    public string Status { get; set; } = null!;

    public string? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewNote { get; set; }

    [ForeignKey("StudentId")]
    public virtual Student? Student { get; set; }

    [ForeignKey("SemesterId")]
    public virtual Semester? Semester { get; set; }
}
