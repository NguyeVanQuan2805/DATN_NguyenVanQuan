using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Student")]
[Index("StudentCode", Name = "IDX_Student_StudentCode")]
[Index("StudentCode", Name = "UQ__Student__1FC88604A2B4E75B", IsUnique = true)]
[Index("AccountId", Name = "UQ__Student__349DA5870B73DB3B", IsUnique = true)]
public partial class Student
{
    [Key]
    [Column("StudentID")]
    [StringLength(20)]
    [Unicode(false)]
    public string StudentId { get; set; } = null!;

    [StringLength(20)]
    [Unicode(false)]
    public string StudentCode { get; set; } = null!;

    [Column("AccountID")]
    [StringLength(20)]
    [Unicode(false)]
    public string AccountId { get; set; } = null!;

    [Column("AdvisorClassID")]
    public int AdvisorClassId { get; set; }

    [StringLength(100)]
    public string? Major { get; set; }

    public int AdmissionYear { get; set; }

    [ForeignKey("AccountId")]
    [InverseProperty("Student")]
    public virtual Account Account { get; set; } = null!;

    [ForeignKey("AdvisorClassId")]
    [InverseProperty("Students")]
    public virtual AdvisorClass AdvisorClass { get; set; } = null!;

    [InverseProperty("Student")]
    public virtual ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();

    [InverseProperty("Student")]
    public virtual ICollection<CourseRegistration> CourseRegistrations { get; set; } = new List<CourseRegistration>();

    [InverseProperty("Student")]
    public virtual ICollection<Gpa> Gpas { get; set; } = new List<Gpa>();

    [InverseProperty("Student")]
    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    [InverseProperty("Student")]
    public virtual ICollection<Warning> Warnings { get; set; } = new List<Warning>();

    [InverseProperty("Student")]
    public virtual ICollection<GraduationRequest> GraduationRequests { get; set; } = new List<GraduationRequest>();

    [InverseProperty("Student")]
    public virtual ICollection<Tuition> Tuitions { get; set; } = new List<Tuition>();
    [InverseProperty("Student")]
    public virtual ICollection<TuitionPayment> TuitionPayments { get; set; } = new List<TuitionPayment>();
}
