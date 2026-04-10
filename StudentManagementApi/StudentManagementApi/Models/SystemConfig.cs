using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("SystemConfig")]
public partial class SystemConfig
{
    [Key]
    [StringLength(50)]
    [Unicode(false)]
    public string ConfigKey { get; set; } = null!;

    [StringLength(255)]
    [Unicode(false)]
    public string ConfigValue { get; set; } = null!;

    [StringLength(500)]
    public string? Description { get; set; }
}
