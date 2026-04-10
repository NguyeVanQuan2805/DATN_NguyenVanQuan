using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Class")]
[Index("ClassCode", "SemesterId", Name = "UQ_Class_Code_Semester", IsUnique = true)]
public partial class Class
{
    [Key]
    [Column("ClassID")]
    [StringLength(20)]
    [Unicode(false)]
    public string ClassId { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string ClassCode { get; set; } = null!;

    [Column("SubjectID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SubjectId { get; set; } = null!;

    [Column("TeacherID")]
    [StringLength(20)]
    [Unicode(false)]
    public string TeacherId { get; set; } = null!;

    [Column("SemesterID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SemesterId { get; set; } = null!;

    [Column("ScheduleID")]
    public int ScheduleId { get; set; }

    public int MaxStudents { get; set; }

    public int? CurrentStudents { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string Status { get; set; } = null!;

    [InverseProperty("Class")]
    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    [InverseProperty("Class")]
    public virtual ICollection<CourseRegistration> CourseRegistrations { get; set; } = new List<CourseRegistration>();

    [InverseProperty("Class")]
    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    [ForeignKey("ScheduleId")]
    [InverseProperty("Classes")]
    public virtual ClassSchedule Schedule { get; set; } = null!;

    [ForeignKey("SemesterId")]
    [InverseProperty("Classes")]
    public virtual Semester Semester { get; set; } = null!;

    [ForeignKey("SubjectId")]
    [InverseProperty("Classes")]
    public virtual Subject Subject { get; set; } = null!;

    [ForeignKey("TeacherId")]
    [InverseProperty("Classes")]
    public virtual Teacher Teacher { get; set; } = null!;
}
