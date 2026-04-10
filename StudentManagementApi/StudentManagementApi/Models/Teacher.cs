using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Teacher")]
[Index("AccountId", Name = "UQ__Teacher__349DA58773146516", IsUnique = true)]
public partial class Teacher
{
    [Key]
    [Column("TeacherID")]
    [StringLength(20)]
    [Unicode(false)]
    public string TeacherId { get; set; } = null!;

    [Column("AccountID")]
    [StringLength(20)]
    [Unicode(false)]
    public string AccountId { get; set; } = null!;

    [Column("DepartmentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string? DepartmentId { get; set; }

    [StringLength(100)]
    public string? Position { get; set; }

    [ForeignKey("AccountId")]
    [InverseProperty("Teacher")]
    public virtual Account Account { get; set; } = null!;

    [InverseProperty("Teacher")]
    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    [ForeignKey("DepartmentId")]
    [InverseProperty("Teachers")]
    public virtual Department? Department { get; set; }
}
