using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Semester")]
public partial class Semester
{
    [Key]
    [Column("SemesterID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SemesterId { get; set; } = null!;

    [StringLength(100)]
    public string SemesterName { get; set; } = null!;

    public int AcademicYear { get; set; }

    public int SemesterNumber { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool? IsRegistrationOpen { get; set; }

    [InverseProperty("Semester")]
    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    [InverseProperty("Semester")]
    public virtual ICollection<Gpa> Gpas { get; set; } = new List<Gpa>();

    [InverseProperty("Semester")]
    public virtual ICollection<Warning> Warnings { get; set; } = new List<Warning>();

    // Thêm vào class Semester
    [InverseProperty("Semester")]
    public virtual ICollection<Tuition> Tuitions { get; set; } = new List<Tuition>();

    // Thêm vào class Semester
    [InverseProperty("Semester")]
    public virtual ICollection<GraduationRequest> GraduationRequests { get; set; } = new List<GraduationRequest>();
}
