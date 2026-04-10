using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("CourseRegistration")]
[Index("ClassId", Name = "IDX_CourseRegistration_Class")]
[Index("StudentId", Name = "IDX_CourseRegistration_Student")]
[Index("StudentId", "ClassId", Name = "UQ_Registration_Student_Class", IsUnique = true)]
public partial class CourseRegistration
{
    [Key]
    [Column("RegistrationID")]
    public int RegistrationId { get; set; }

    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [Column("ClassID")]
    [StringLength(20)]
    [Unicode(false)]
    public string ClassId { get; set; } = null!;

    [Column(TypeName = "datetime")]
    public DateTime? RegisteredAt { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    [ForeignKey("ClassId")]
    [InverseProperty("CourseRegistrations")]
    public virtual Class Class { get; set; } = null!;

    [ForeignKey("StudentId")]
    [InverseProperty("CourseRegistrations")]
    public virtual Student Student { get; set; } = null!;
}
