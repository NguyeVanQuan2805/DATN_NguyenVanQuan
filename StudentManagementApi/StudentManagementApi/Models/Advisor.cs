using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Advisor")]
[Index("AccountId", Name = "UQ__Advisor__349DA5878CDC9EF1", IsUnique = true)]
public partial class Advisor
{
    [Key]
    [Column("AdvisorID")]
    [StringLength(20)]
    [Unicode(false)]
    public string AdvisorId { get; set; } = null!;

    [Column("AccountID")]
    [StringLength(20)]
    [Unicode(false)]
    public string AccountId { get; set; } = null!;

    [Column("DepartmentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string? DepartmentId { get; set; }

    [ForeignKey("AccountId")]
    [InverseProperty("Advisor")]
    public virtual Account Account { get; set; } = null!;

    [InverseProperty("Advisor")]
    public virtual ICollection<AdvisorClass> AdvisorClasses { get; set; } = new List<AdvisorClass>();

    [ForeignKey("DepartmentId")]
    [InverseProperty("Advisors")]
    public virtual Department? Department { get; set; }

    [InverseProperty("IssuedByNavigation")]
    public virtual ICollection<Warning> Warnings { get; set; } = new List<Warning>();
}
