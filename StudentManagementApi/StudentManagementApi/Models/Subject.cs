using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Subject")]
[Index("SubjectCode", Name = "UQ__Subject__9F7CE1A9C4C50C97", IsUnique = true)]
public partial class Subject
{
    [Key]
    [Column("SubjectID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SubjectId { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string SubjectCode { get; set; } = null!;

    [StringLength(150)]
    public string SubjectName { get; set; } = null!;

    public int Credits { get; set; }

    [StringLength(50)]
    public string? Type { get; set; }

    [Column("DepartmentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string? DepartmentId { get; set; }

    public string? Description { get; set; }

    [InverseProperty("Subject")]
    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    [ForeignKey("DepartmentId")]
    [InverseProperty("Subjects")]
    public virtual Department? Department { get; set; }

    [InverseProperty("RequiredSubject")]
    public virtual ICollection<Prerequisite> PrerequisiteRequiredSubjects { get; set; } = new List<Prerequisite>();

    [InverseProperty("Subject")]
    public virtual ICollection<Prerequisite> PrerequisiteSubjects { get; set; } = new List<Prerequisite>();
}
