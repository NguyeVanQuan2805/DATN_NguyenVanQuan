using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

[Table("Account")]
[Index("Username", Name = "IDX_Account_Username")]
[Index("Username", Name = "UQ__Account__536C85E4F6150CF6", IsUnique = true)]
[Index("Email", Name = "UQ__Account__A9D1053435979395", IsUnique = true)]
public partial class Account
{
    [Key]
    [Column("AccountID")]
    [StringLength(20)]
    [Unicode(false)]
    public string AccountId { get; set; } = null!;

    [StringLength(50)]
    [Unicode(false)]
    public string Username { get; set; } = null!;

    [StringLength(255)]
    [Unicode(false)]
    public string PasswordHash { get; set; } = null!;

    [StringLength(100)]
    public string FullName { get; set; } = null!;

    [StringLength(100)]
    [Unicode(false)]
    public string? Email { get; set; }

    [StringLength(10)]
    [Unicode(false)]
    public string? Phone { get; set; }

    [StringLength(1)]
    [Unicode(false)]
    public string? Gender { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [StringLength(20)]
    [Unicode(false)]
    public string Role { get; set; } = null!;

    public bool? IsActive { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [InverseProperty("Account")]
    public virtual Advisor? Advisor { get; set; }

    [InverseProperty("Account")]
    public virtual Student? Student { get; set; }

    [InverseProperty("Account")]
    public virtual Teacher? Teacher { get; set; }
}
