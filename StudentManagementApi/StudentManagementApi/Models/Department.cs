using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Department")]
[Index("DepartmentCode", Name = "UQ__Departme__6EA8896D47F2DF59", IsUnique = true)]
public partial class Department
{
    [Key]
    [Column("DepartmentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string DepartmentId { get; set; } = null!;

    [StringLength(20)]
    [Unicode(false)]
    public string DepartmentCode { get; set; } = null!;

    [StringLength(150)]
    public string DepartmentName { get; set; } = null!;

    [InverseProperty("Department")]
    public virtual ICollection<Advisor> Advisors { get; set; } = new List<Advisor>();

    [InverseProperty("Department")]
    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();

    [InverseProperty("Department")]
    public virtual ICollection<Teacher> Teachers { get; set; } = new List<Teacher>();
}
