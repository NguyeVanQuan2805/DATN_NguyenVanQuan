using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Prerequisite")]
[Index("SubjectId", "RequiredSubjectId", Name = "UQ_Prerequisite", IsUnique = true)]
public partial class Prerequisite
{
    [Key]
    [Column("PrerequisiteID")]
    public int PrerequisiteId { get; set; }

    [Column("SubjectID")]
    [StringLength(20)]
    [Unicode(false)]
    public string SubjectId { get; set; } = null!;

    [Column("RequiredSubjectID")]
    [StringLength(20)]
    [Unicode(false)]
    public string RequiredSubjectId { get; set; } = null!;

    [ForeignKey("RequiredSubjectId")]
    [InverseProperty("PrerequisiteRequiredSubjects")]
    public virtual Subject RequiredSubject { get; set; } = null!;

    [ForeignKey("SubjectId")]
    [InverseProperty("PrerequisiteSubjects")]
    public virtual Subject Subject { get; set; } = null!;
}
