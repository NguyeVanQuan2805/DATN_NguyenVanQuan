using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Account> Accounts { get; set; }
    public virtual DbSet<Advisor> Advisors { get; set; }
    public virtual DbSet<AdvisorClass> AdvisorClasses { get; set; }
    public virtual DbSet<Attendance> Attendances { get; set; }
    public virtual DbSet<Class> Classes { get; set; }
    public virtual DbSet<ClassSchedule> ClassSchedules { get; set; }
    public virtual DbSet<CourseRegistration> CourseRegistrations { get; set; }
    public virtual DbSet<Department> Departments { get; set; }
    public virtual DbSet<Gpa> Gpas { get; set; }
    public virtual DbSet<Grade> Grades { get; set; }
    public virtual DbSet<Prerequisite> Prerequisites { get; set; }
    public virtual DbSet<Semester> Semesters { get; set; }
    public virtual DbSet<Student> Students { get; set; }
    public virtual DbSet<Subject> Subjects { get; set; }  
    public virtual DbSet<SystemConfig> SystemConfigs { get; set; }
    public virtual DbSet<Teacher> Teachers { get; set; }
    public virtual DbSet<Warning> Warnings { get; set; }
    public virtual DbSet<Curriculum> Curricula { get; set; }

    public virtual DbSet<CurriculumSubject> CurriculumSubjects { get; set; }

    public virtual DbSet<GraduationRequest> GraduationRequests { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<NotificationRecipient> NotificationRecipients { get; set; }

    public virtual DbSet<Room> Rooms { get; set; }

    public virtual DbSet<Tuition> Tuitions { get; set; }

    public virtual DbSet<TuitionPayment> TuitionPayments { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Server=ADMIN;Database=StudentManagementSystem;Trusted_Connection=True;TrustServerCertificate=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Curriculum>(entity =>
        {
            entity.ToTable("Curriculum");

            entity.HasIndex(e => e.CurriculumCode, "UQ_Curriculum_Code").IsUnique();

            entity.Property(e => e.CurriculumId).HasColumnName("CurriculumID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.CreatedBy)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.CurriculumCode)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.CurriculumName).HasMaxLength(200);
            entity.Property(e => e.DepartmentId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DepartmentID");
            entity.Property(e => e.Major).HasMaxLength(150);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Active");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
        });

        modelBuilder.Entity<CurriculumSubject>(entity =>
        {
            entity.ToTable("CurriculumSubject");

            entity.HasIndex(e => new { e.CurriculumId, e.SubjectId }, "UQ_CurriculumSubject").IsUnique();

            entity.Property(e => e.CurriculumSubjectId).HasColumnName("CurriculumSubjectID");
            entity.Property(e => e.CurriculumId).HasColumnName("CurriculumID");
            entity.Property(e => e.IsRequired).HasDefaultValue(true);
            entity.Property(e => e.SubjectId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SubjectID");
            entity.Property(e => e.SubjectType)
                .HasMaxLength(50)
                .HasDefaultValue("Bắt buộc");

            entity.HasOne(d => d.Curriculum).WithMany(p => p.CurriculumSubjects)
                .HasForeignKey(d => d.CurriculumId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CurrSub_Curriculum");
        });

        modelBuilder.Entity<GraduationRequest>(entity =>
        {
            entity.HasKey(e => e.RequestId).HasName("PK_GradRequest");

            entity.ToTable("GraduationRequest");

            entity.HasIndex(e => new { e.StudentId, e.SemesterId }, "UQ_GradRequest").IsUnique();

            entity.Property(e => e.RequestId).HasColumnName("RequestID");
            entity.Property(e => e.CumulativeGpa)
                .HasColumnType("decimal(4, 2)")
                .HasColumnName("CumulativeGPA");
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.ReviewedBy)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SemesterId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SemesterID");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasDefaultValue("Chờ xét duyệt");
            entity.Property(e => e.StudentId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("StudentID");
            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.TuitionDebt).HasColumnType("decimal(18, 0)");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notification");

            entity.HasIndex(e => new { e.NotificationType, e.CreatedAt }, "IX_Notif_Type");

            entity.Property(e => e.NotificationId).HasColumnName("NotificationID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NotificationType)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasDefaultValue("Manual");
            entity.Property(e => e.SenderId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SenderID");
            entity.Property(e => e.SentAt).HasColumnType("datetime");
            entity.Property(e => e.TargetClassId).HasColumnName("TargetClassID");
            entity.Property(e => e.TargetScope)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasDefaultValue("Individual");
            entity.Property(e => e.Title).HasMaxLength(300);
        });

        modelBuilder.Entity<NotificationRecipient>(entity =>
        {
            entity.HasKey(e => e.RecipientId).HasName("PK_NotifRecipient");

            entity.ToTable("NotificationRecipient");

            entity.HasIndex(e => new { e.AccountId, e.IsRead }, "IX_NotifRecip_AccountID");

            entity.HasIndex(e => new { e.NotificationId, e.AccountId }, "UQ_NotifRecipient").IsUnique();

            entity.Property(e => e.RecipientId).HasColumnName("RecipientID");
            entity.Property(e => e.AccountId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("AccountID");
            entity.Property(e => e.EmailError).HasMaxLength(500);
            entity.Property(e => e.EmailSentAt).HasColumnType("datetime");
            entity.Property(e => e.NotificationId).HasColumnName("NotificationID");
            entity.Property(e => e.ReadAt).HasColumnType("datetime");

            entity.HasOne(d => d.Notification).WithMany(p => p.NotificationRecipients)
                .HasForeignKey(d => d.NotificationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NotifRecip_Notification");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.ToTable("Room");

            entity.HasIndex(e => e.RoomCode, "UQ_Room_Code").IsUnique();

            entity.Property(e => e.RoomId).HasColumnName("RoomID");
            entity.Property(e => e.Building).HasMaxLength(50);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.IsAvailable).HasDefaultValue(true);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.RoomCode)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.RoomName).HasMaxLength(100);
            entity.Property(e => e.RoomType)
                .HasMaxLength(50)
                .HasDefaultValue("Lý thuyết");
        });

        modelBuilder.Entity<Tuition>(entity =>
        {
            entity.ToTable("Tuition");

            entity.HasIndex(e => e.SemesterId, "IX_Tuition_SemesterID");

            entity.HasIndex(e => new { e.StudentId, e.Status }, "IX_Tuition_StudentID");

            entity.Property(e => e.TuitionId).HasColumnName("TuitionID");
            entity.Property(e => e.Amount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.AmountPaid).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.FeeType).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.SemesterId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SemesterID");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasDefaultValue("Chưa đóng");
            entity.Property(e => e.StudentId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("StudentID");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
        });

        modelBuilder.Entity<TuitionPayment>(entity =>
        {
            entity.HasKey(e => e.PaymentId);

            entity.ToTable("TuitionPayment");

            entity.Property(e => e.PaymentId).HasColumnName("PaymentID");
            entity.Property(e => e.AmountSubmitted).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.EvidenceFile).HasMaxLength(500);
            entity.Property(e => e.PaymentDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.ReviewNote).HasMaxLength(500);
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.ReviewedBy)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasDefaultValue("Chờ duyệt");
            entity.Property(e => e.StudentId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("StudentID");
            entity.Property(e => e.TuitionId).HasColumnName("TuitionID");

            entity.HasOne(d => d.Tuition).WithMany(p => p.TuitionPayments)
                .HasForeignKey(d => d.TuitionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TuitionPay_Tuition");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
