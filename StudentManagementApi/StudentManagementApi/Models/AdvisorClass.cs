using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("AdvisorClass")]
[Index("ClassCode", Name = "UQ__AdvisorC__2ECD4A55C5294043", IsUnique = true)]
public partial class AdvisorClass
{
    [Key]
    [Column("AdvisorClassID")]
    public int AdvisorClassId { get; set; }

    [StringLength(50)]
    [Unicode(false)]
    public string ClassCode { get; set; } = null!;

    [StringLength(100)]
    public string ClassName { get; set; } = null!;

    public int AcademicYear { get; set; }

    [Column("AdvisorID")]
    [StringLength(20)]
    [Unicode(false)]
    public string AdvisorId { get; set; } = null!;

    [ForeignKey("AdvisorId")]
    [InverseProperty("AdvisorClasses")]
    public virtual Advisor Advisor { get; set; } = null!;

    [InverseProperty("AdvisorClass")]
    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
}
