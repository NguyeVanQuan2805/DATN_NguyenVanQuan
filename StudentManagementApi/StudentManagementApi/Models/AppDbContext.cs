using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace StudentManagementApi.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext() { }

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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

    public DbSet<Curriculum> Curriculums { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ===================== ENTITY CŨ =====================

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.AccountId).HasName("PK__Account__349DA586BA255435");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Gender).IsFixedLength();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Advisor>(entity =>
        {
            entity.HasKey(e => e.AdvisorId).HasName("PK__Advisor__9DE0B607CC65F88B");
            entity.HasOne(d => d.Account).WithOne(p => p.Advisor)
                .HasConstraintName("FK__Advisor__Account__44FF419A");
            entity.HasOne(d => d.Department).WithMany(p => p.Advisors)
                .HasConstraintName("FK__Advisor__Departm__45F365D3");
        });

        modelBuilder.Entity<AdvisorClass>(entity =>
        {
            entity.HasKey(e => e.AdvisorClassId).HasName("PK__AdvisorC__97AE70D77B03A4AA");
            entity.HasOne(d => d.Advisor).WithMany(p => p.AdvisorClasses)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__AdvisorCl__Advis__49C3F6B7");
        });

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.AttendanceId).HasName("PK__Attendan__8B69263CD3AA0686");
            entity.HasOne(d => d.Class).WithMany(p => p.Attendances)
                .HasConstraintName("FK__Attendanc__Class__7B5B524B");
            entity.HasOne(d => d.Student).WithMany(p => p.Attendances)
                .HasConstraintName("FK__Attendanc__Stude__7C4F7684");
        });

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(e => e.ClassId).HasName("PK__Class__CB1927A085263822");
            entity.Property(e => e.CurrentStudents).HasDefaultValue(0);
            entity.Property(e => e.Status).HasDefaultValue("OPEN");
            entity.HasOne(d => d.Schedule).WithMany(p => p.Classes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Class__ScheduleI__6C190EBB");
            entity.HasOne(d => d.Semester).WithMany(p => p.Classes)
                .HasConstraintName("FK__Class__SemesterI__6B24EA82");
            entity.HasOne(d => d.Subject).WithMany(p => p.Classes)
                .HasConstraintName("FK__Class__SubjectID__693CA210");
            entity.HasOne(d => d.Teacher).WithMany(p => p.Classes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Class__TeacherID__6A30C649");
        });

        // *** KEY FIX: Map đúng tên cột Room và RoomID ***
        modelBuilder.Entity<ClassSchedule>(entity =>
        {
            entity.HasKey(e => e.ScheduleId).HasName("PK__ClassSch__9C8A5B69A92D038D");
            entity.ToTable("ClassSchedule");
            entity.Property(e => e.ScheduleId).HasColumnName("ScheduleID");
            entity.Property(e => e.Room)
                  .HasColumnName("Room")
                  .HasMaxLength(50);
            entity.Property(e => e.RoomId)
                  .HasColumnName("RoomID");

            entity.HasOne<Room>()
          .WithMany()
          .HasForeignKey(e => e.RoomId)
          .HasPrincipalKey(r => r.RoomId)
          .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CourseRegistration>(entity =>
        {
            entity.HasKey(e => e.RegistrationId).HasName("PK__CourseRe__6EF58830D6374BD1");
            entity.Property(e => e.RegisteredAt).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Status).HasDefaultValue("PENDING");
            entity.HasOne(d => d.Class).WithMany(p => p.CourseRegistrations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CourseReg__Class__74AE54BC");
            entity.HasOne(d => d.Student).WithMany(p => p.CourseRegistrations)
                .HasConstraintName("FK__CourseReg__Stude__73BA3083");
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.DepartmentId).HasName("PK__Departme__B2079BCD0CA48ACF");
        });

        modelBuilder.Entity<Gpa>(entity =>
        {
            entity.HasKey(e => e.Gpaid).HasName("PK__GPA__890CBEC478A60D8E");
            entity.HasOne(d => d.Semester).WithMany(p => p.Gpas)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__GPA__SemesterID__0B91BA14");
            entity.HasOne(d => d.Student).WithMany(p => p.Gpas)
                .HasConstraintName("FK__GPA__StudentID__0A9D95DB");
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.GradeId).HasName("PK__Grade__54F87A37571BC46D");
            entity.Property(e => e.IsApproved).HasDefaultValue(false);
            entity.Property(e => e.LetterGrade).IsFixedLength();
            entity.HasOne(d => d.Class).WithMany(p => p.Grades)
                .HasConstraintName("FK__Grade__ClassID__02084FDA");
            entity.HasOne(d => d.Student).WithMany(p => p.Grades)
                .HasConstraintName("FK__Grade__StudentID__01142BA1");
        });

        modelBuilder.Entity<Prerequisite>(entity =>
        {
            entity.HasKey(e => e.PrerequisiteId).HasName("PK__Prerequi__25A953F931AA033D");
            entity.HasOne(d => d.RequiredSubject).WithMany(p => p.PrerequisiteRequiredSubjects)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Prerequis__Requi__5DCAEF64");
            entity.HasOne(d => d.Subject).WithMany(p => p.PrerequisiteSubjects)
                .HasConstraintName("FK__Prerequis__Subje__5CD6CB2B");
        });

        modelBuilder.Entity<Semester>(entity =>
        {
            entity.HasKey(e => e.SemesterId).HasName("PK__Semester__043301BD6880DC52");
            entity.Property(e => e.IsRegistrationOpen).HasDefaultValue(false);

        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.StudentId).HasName("PK__Student__32C52A792E213A55");
            entity.HasOne(d => d.Account).WithOne(p => p.Student)
                .HasConstraintName("FK__Student__Account__4E88ABD4");
            entity.HasOne(d => d.AdvisorClass).WithMany(p => p.Students)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Student__Advisor__4F7CD00D");
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.SubjectId).HasName("PK__Subject__AC1BA388479791E9");
            entity.HasOne(d => d.Department).WithMany(p => p.Subjects)
                .HasConstraintName("FK__Subject__Departm__59063A47");
        });

        modelBuilder.Entity<SystemConfig>(entity =>
        {
            entity.HasKey(e => e.ConfigKey).HasName("PK__SystemCo__4A306785FE778B6A");
        });

        modelBuilder.Entity<Teacher>(entity =>
        {
            entity.HasKey(e => e.TeacherId).HasName("PK__Teacher__EDF25944607BD03F");
            entity.HasOne(d => d.Account).WithOne(p => p.Teacher)
                .HasConstraintName("FK__Teacher__Account__534D60F1");
            entity.HasOne(d => d.Department).WithMany(p => p.Teachers)
                .HasConstraintName("FK__Teacher__Departm__5441852A");
        });

        modelBuilder.Entity<Warning>(entity =>
        {
            entity.HasKey(e => e.WarningId).HasName("PK__Warning__214571B8F15D8838");
            entity.Property(e => e.IssuedDate).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Status).HasDefaultValue("ACTIVE");
            entity.HasOne(d => d.IssuedByNavigation).WithMany(p => p.Warnings)
                .HasConstraintName("FK__Warning__IssuedB__114A936A");
            entity.HasOne(d => d.Semester).WithMany(p => p.Warnings)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Warning__Semeste__0F624AF8");
            entity.HasOne(d => d.Student).WithMany(p => p.Warnings)
                .HasConstraintName("FK__Warning__Student__0E6E26BF");
        });

        // ===================== ENTITY MỚI =====================

        modelBuilder.Entity<Curriculum>(entity =>
        {
            entity.ToTable("Curriculum");
            entity.HasIndex(e => e.CurriculumCode, "UQ_Curriculum_Code").IsUnique();
            entity.Property(e => e.CurriculumId).HasColumnName("CurriculumID");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.CreatedBy).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.CurriculumCode).HasMaxLength(30).IsUnicode(false);
            entity.Property(e => e.CurriculumName).HasMaxLength(200);
            entity.Property(e => e.DepartmentId).HasMaxLength(20).IsUnicode(false).HasColumnName("DepartmentID");
            entity.Property(e => e.Major).HasMaxLength(150);
            entity.Property(e => e.Status).HasMaxLength(20).IsUnicode(false).HasDefaultValue("Active");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
        });

        modelBuilder.Entity<CurriculumSubject>(entity =>
        {
            entity.ToTable("CurriculumSubject");
            entity.HasIndex(e => new { e.CurriculumId, e.SubjectId }, "UQ_CurriculumSubject").IsUnique();
            entity.Property(e => e.CurriculumSubjectId).HasColumnName("CurriculumSubjectID");
            entity.Property(e => e.CurriculumId).HasColumnName("CurriculumID");
            entity.Property(e => e.IsRequired).HasDefaultValue(true);
            entity.Property(e => e.SubjectId).HasMaxLength(20).IsUnicode(false).HasColumnName("SubjectID");
            entity.Property(e => e.SubjectType).HasMaxLength(50).HasDefaultValue("Bắt buộc");
            entity.HasOne(d => d.Curriculum).WithMany(p => p.CurriculumSubjects)
                .HasForeignKey(d => d.CurriculumId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CurrSub_Curriculum");
        });

        modelBuilder.Entity<GraduationRequest>(entity =>
        {
            entity.HasKey(e => e.RequestId).HasName("PK_GradRequest");
            entity.ToTable("GraduationRequest");
            entity.Property(e => e.RequestId).HasColumnName("RequestID");
            entity.Property(e => e.CumulativeGpa).HasColumnType("decimal(4, 2)").HasColumnName("CumulativeGPA");
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.ReviewedBy).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.SemesterId).HasMaxLength(20).IsUnicode(false).HasColumnName("SemesterID");
            entity.Property(e => e.Status).HasMaxLength(30).IsUnicode(false).HasDefaultValue("Chờ xét duyệt");
            entity.Property(e => e.StudentId).HasMaxLength(20).IsUnicode(false).HasColumnName("StudentID");
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.TuitionDebt).HasColumnType("decimal(18, 0)");
            // Không map navigation để tránh conflict với Student model
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notification");
            entity.Property(e => e.NotificationId).HasColumnName("NotificationID");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.NotificationType).HasMaxLength(50).IsUnicode(false).HasDefaultValue("Manual");
            entity.Property(e => e.SenderId).HasMaxLength(20).IsUnicode(false).HasColumnName("SenderID");
            entity.Property(e => e.SentAt).HasColumnType("datetime");
            entity.Property(e => e.TargetClassId).HasColumnName("TargetClassID");
            entity.Property(e => e.TargetScope).HasMaxLength(30).IsUnicode(false).HasDefaultValue("Individual");
            entity.Property(e => e.Title).HasMaxLength(300);
        });

        modelBuilder.Entity<NotificationRecipient>(entity =>
        {
            entity.HasKey(e => e.RecipientId).HasName("PK_NotifRecipient");
            entity.ToTable("NotificationRecipient");
            entity.Property(e => e.RecipientId).HasColumnName("RecipientID");
            entity.Property(e => e.AccountId).HasMaxLength(20).IsUnicode(false).HasColumnName("AccountID");
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
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.IsAvailable).HasDefaultValue(true);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.RoomCode).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.RoomName).HasMaxLength(100);
            entity.Property(e => e.RoomType).HasMaxLength(50).HasDefaultValue("Lý thuyết");
        });

        modelBuilder.Entity<Tuition>(entity =>
        {
            entity.ToTable("Tuition");
            entity.Property(e => e.TuitionId).HasColumnName("TuitionID");
            entity.Property(e => e.Amount).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.AmountPaid).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.FeeType).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.SemesterId).HasMaxLength(20).IsUnicode(false).HasColumnName("SemesterID");
            entity.Property(e => e.Status).HasMaxLength(30).IsUnicode(false).HasDefaultValue("Chưa đóng");
            entity.Property(e => e.StudentId).HasMaxLength(20).IsUnicode(false).HasColumnName("StudentID");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime");
        });

        modelBuilder.Entity<TuitionPayment>(entity =>
        {
            entity.HasKey(e => e.PaymentId);
            entity.ToTable("TuitionPayment");
            entity.Property(e => e.PaymentId).HasColumnName("PaymentID");
            entity.Property(e => e.AmountSubmitted).HasColumnType("decimal(18, 0)");
            entity.Property(e => e.EvidenceFile).HasMaxLength(500);
            entity.Property(e => e.PaymentDate).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.ReviewNote).HasMaxLength(500);
            entity.Property(e => e.ReviewedAt).HasColumnType("datetime");
            entity.Property(e => e.ReviewedBy).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.Status).HasMaxLength(30).IsUnicode(false).HasDefaultValue("Chờ duyệt");
            entity.Property(e => e.StudentId).HasMaxLength(20).IsUnicode(false).HasColumnName("StudentID");
            entity.Property(e => e.TuitionId).HasColumnName("TuitionID");
            entity.HasOne(d => d.Tuition).WithMany(p => p.TuitionPayments)
                .HasForeignKey(d => d.TuitionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TuitionPay_Tuition");
        });
        
        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.RoomId);
            entity.Property(e => e.RoomCode).IsRequired().HasMaxLength(20);
            entity.Property(e => e.RoomName).IsRequired().HasMaxLength(100);
        });

        OnModelCreatingPartial(modelBuilder);
    }


    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}