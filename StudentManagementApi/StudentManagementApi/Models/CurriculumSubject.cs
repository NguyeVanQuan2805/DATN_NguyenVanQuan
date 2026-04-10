using System;
using System.Collections.Generic;

namespace StudentManagementApi.Models;

public partial class CurriculumSubject
{
    public int CurriculumSubjectId { get; set; }

    public int CurriculumId { get; set; }

    public string SubjectId { get; set; } = null!;

    public string SubjectType { get; set; } = null!;

    public int RecommendedSemester { get; set; }

    public bool IsRequired { get; set; }

    public virtual Curriculum Curriculum { get; set; } = null!;
}
