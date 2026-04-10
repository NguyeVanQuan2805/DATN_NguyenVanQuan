using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StudentManagementApi.Models;

public partial class TuitionPayment
{
    [Key]
    public int PaymentId { get; set; }

    public int TuitionId { get; set; }

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal AmountSubmitted { get; set; }

    public DateTime PaymentDate { get; set; }

    public string? EvidenceFile { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    [Column("ReviewedBy")]
    [StringLength(20)]
    [Unicode(false)]
    public string? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewNote { get; set; }

    // Navigation properties
    [ForeignKey("TuitionId")]
    public virtual Tuition Tuition { get; set; } = null!;

    [ForeignKey("StudentId")]
    public virtual Student? Student { get; set; }
}