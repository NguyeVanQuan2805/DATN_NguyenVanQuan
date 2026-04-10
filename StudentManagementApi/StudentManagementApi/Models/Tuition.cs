using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StudentManagementApi.Models;

public partial class Tuition
{
    [Key]
    public int TuitionId { get; set; }

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [Column("SemesterID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SemesterId { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string FeeType { get; set; } = null!;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal Amount { get; set; }

    [Column(TypeName = "decimal(18, 2)")]
    public decimal AmountPaid { get; set; }

    public DateOnly? DueDate { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties - KHÔNG dùng [InverseProperty] ở đây
    [ForeignKey("StudentId")]
    public virtual Student? Student { get; set; }

    [ForeignKey("SemesterId")]
    public virtual Semester? Semester { get; set; }

    public virtual ICollection<TuitionPayment> TuitionPayments { get; set; } = new List<TuitionPayment>();
}