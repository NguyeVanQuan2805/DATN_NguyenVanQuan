using System;
using System.Collections.Generic;

namespace StudentManagementApi.Models;

public partial class Curriculum
{
    public int CurriculumId { get; set; }

    public string CurriculumCode { get; set; } = null!;

    public string CurriculumName { get; set; } = null!;

    public string Major { get; set; } = null!;

    public int CohortYear { get; set; }

    public int TotalCredits { get; set; }

    public string? DepartmentId { get; set; }

    public string Status { get; set; } = null!;

    public string? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<CurriculumSubject> CurriculumSubjects { get; set; } = new List<CurriculumSubject>();
}
