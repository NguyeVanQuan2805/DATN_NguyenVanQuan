using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudentManagementApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomSupportToClassSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Account",
                columns: table => new
                {
                    AccountID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    Username = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "varchar(255)", unicode: false, maxLength: 255, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: true),
                    Gender = table.Column<string>(type: "char(1)", unicode: false, fixedLength: true, maxLength: 1, nullable: true),
                    DateOfBirth = table.Column<DateOnly>(type: "date", nullable: true),
                    Role = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Account__349DA586BA255435", x => x.AccountID);
                });

            migrationBuilder.CreateTable(
                name: "Curriculum",
                columns: table => new
                {
                    CurriculumID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CurriculumCode = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    CurriculumName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Major = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CohortYear = table.Column<int>(type: "int", nullable: false),
                    TotalCredits = table.Column<int>(type: "int", nullable: false),
                    DepartmentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    Status = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "Active"),
                    CreatedBy = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Curriculum", x => x.CurriculumID);
                });

            migrationBuilder.CreateTable(
                name: "Department",
                columns: table => new
                {
                    DepartmentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    DepartmentCode = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    DepartmentName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Departme__B2079BCD0CA48ACF", x => x.DepartmentID);
                });

            migrationBuilder.CreateTable(
                name: "Notification",
                columns: table => new
                {
                    NotificationID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SenderID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    NotificationType = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false, defaultValue: "Manual"),
                    TargetScope = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false, defaultValue: "Individual"),
                    TargetClassID = table.Column<int>(type: "int", nullable: true),
                    SendEmail = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    SentAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.NotificationID);
                });

            migrationBuilder.CreateTable(
                name: "Room",
                columns: table => new
                {
                    RoomID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoomCode = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    RoomName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Building = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    RoomType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Lý thuyết"),
                    IsAvailable = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Room", x => x.RoomID);
                });

            migrationBuilder.CreateTable(
                name: "Semester",
                columns: table => new
                {
                    SemesterID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SemesterName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AcademicYear = table.Column<int>(type: "int", nullable: false),
                    SemesterNumber = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsRegistrationOpen = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    Room = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RoomID = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Semester__043301BD6880DC52", x => x.SemesterID);
                });

            migrationBuilder.CreateTable(
                name: "SystemConfig",
                columns: table => new
                {
                    ConfigKey = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ConfigValue = table.Column<string>(type: "varchar(255)", unicode: false, maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__SystemCo__4A306785FE778B6A", x => x.ConfigKey);
                });

            migrationBuilder.CreateTable(
                name: "CurriculumSubject",
                columns: table => new
                {
                    CurriculumSubjectID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CurriculumID = table.Column<int>(type: "int", nullable: false),
                    SubjectID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SubjectType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Bắt buộc"),
                    RecommendedSemester = table.Column<int>(type: "int", nullable: false),
                    IsRequired = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurriculumSubject", x => x.CurriculumSubjectID);
                    table.ForeignKey(
                        name: "FK_CurrSub_Curriculum",
                        column: x => x.CurriculumID,
                        principalTable: "Curriculum",
                        principalColumn: "CurriculumID");
                });

            migrationBuilder.CreateTable(
                name: "Advisor",
                columns: table => new
                {
                    AdvisorID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AccountID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    DepartmentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Advisor__9DE0B607CC65F88B", x => x.AdvisorID);
                    table.ForeignKey(
                        name: "FK__Advisor__Account__44FF419A",
                        column: x => x.AccountID,
                        principalTable: "Account",
                        principalColumn: "AccountID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Advisor__Departm__45F365D3",
                        column: x => x.DepartmentID,
                        principalTable: "Department",
                        principalColumn: "DepartmentID");
                });

            migrationBuilder.CreateTable(
                name: "Subject",
                columns: table => new
                {
                    SubjectID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SubjectCode = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    SubjectName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Credits = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DepartmentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Subject__AC1BA388479791E9", x => x.SubjectID);
                    table.ForeignKey(
                        name: "FK__Subject__Departm__59063A47",
                        column: x => x.DepartmentID,
                        principalTable: "Department",
                        principalColumn: "DepartmentID");
                });

            migrationBuilder.CreateTable(
                name: "Teacher",
                columns: table => new
                {
                    TeacherID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AccountID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    DepartmentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    Position = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Teacher__EDF25944607BD03F", x => x.TeacherID);
                    table.ForeignKey(
                        name: "FK__Teacher__Account__534D60F1",
                        column: x => x.AccountID,
                        principalTable: "Account",
                        principalColumn: "AccountID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Teacher__Departm__5441852A",
                        column: x => x.DepartmentID,
                        principalTable: "Department",
                        principalColumn: "DepartmentID");
                });

            migrationBuilder.CreateTable(
                name: "NotificationRecipient",
                columns: table => new
                {
                    RecipientID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NotificationID = table.Column<int>(type: "int", nullable: false),
                    AccountID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    IsEmailSent = table.Column<bool>(type: "bit", nullable: false),
                    EmailSentAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    EmailError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotifRecipient", x => x.RecipientID);
                    table.ForeignKey(
                        name: "FK_NotifRecip_Notification",
                        column: x => x.NotificationID,
                        principalTable: "Notification",
                        principalColumn: "NotificationID");
                });

            migrationBuilder.CreateTable(
                name: "ClassSchedule",
                columns: table => new
                {
                    ScheduleID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DayOfWeek = table.Column<int>(type: "int", nullable: false),
                    PeriodStart = table.Column<int>(type: "int", nullable: false),
                    PeriodEnd = table.Column<int>(type: "int", nullable: false),
                    Room = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RoomID = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__ClassSch__9C8A5B69A92D038D", x => x.ScheduleID);
                    table.ForeignKey(
                        name: "FK_ClassSchedule_Room_RoomID",
                        column: x => x.RoomID,
                        principalTable: "Room",
                        principalColumn: "RoomID");
                });

            migrationBuilder.CreateTable(
                name: "AdvisorClass",
                columns: table => new
                {
                    AdvisorClassID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClassCode = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    ClassName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AcademicYear = table.Column<int>(type: "int", nullable: false),
                    AdvisorID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__AdvisorC__97AE70D77B03A4AA", x => x.AdvisorClassID);
                    table.ForeignKey(
                        name: "FK__AdvisorCl__Advis__49C3F6B7",
                        column: x => x.AdvisorID,
                        principalTable: "Advisor",
                        principalColumn: "AdvisorID");
                });

            migrationBuilder.CreateTable(
                name: "Prerequisite",
                columns: table => new
                {
                    PrerequisiteID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SubjectID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    RequiredSubjectID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Prerequi__25A953F931AA033D", x => x.PrerequisiteID);
                    table.ForeignKey(
                        name: "FK__Prerequis__Requi__5DCAEF64",
                        column: x => x.RequiredSubjectID,
                        principalTable: "Subject",
                        principalColumn: "SubjectID");
                    table.ForeignKey(
                        name: "FK__Prerequis__Subje__5CD6CB2B",
                        column: x => x.SubjectID,
                        principalTable: "Subject",
                        principalColumn: "SubjectID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Class",
                columns: table => new
                {
                    ClassID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ClassCode = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    SubjectID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    TeacherID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SemesterID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ScheduleID = table.Column<int>(type: "int", nullable: false),
                    MaxStudents = table.Column<int>(type: "int", nullable: false),
                    CurrentStudents = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    Status = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false, defaultValue: "OPEN")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Class__CB1927A085263822", x => x.ClassID);
                    table.ForeignKey(
                        name: "FK__Class__ScheduleI__6C190EBB",
                        column: x => x.ScheduleID,
                        principalTable: "ClassSchedule",
                        principalColumn: "ScheduleID");
                    table.ForeignKey(
                        name: "FK__Class__SemesterI__6B24EA82",
                        column: x => x.SemesterID,
                        principalTable: "Semester",
                        principalColumn: "SemesterID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Class__SubjectID__693CA210",
                        column: x => x.SubjectID,
                        principalTable: "Subject",
                        principalColumn: "SubjectID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Class__TeacherID__6A30C649",
                        column: x => x.TeacherID,
                        principalTable: "Teacher",
                        principalColumn: "TeacherID");
                });

            migrationBuilder.CreateTable(
                name: "Student",
                columns: table => new
                {
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    StudentCode = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AccountID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AdvisorClassID = table.Column<int>(type: "int", nullable: false),
                    Major = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AdmissionYear = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Student__32C52A792E213A55", x => x.StudentID);
                    table.ForeignKey(
                        name: "FK__Student__Account__4E88ABD4",
                        column: x => x.AccountID,
                        principalTable: "Account",
                        principalColumn: "AccountID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Student__Advisor__4F7CD00D",
                        column: x => x.AdvisorClassID,
                        principalTable: "AdvisorClass",
                        principalColumn: "AdvisorClassID");
                });

            migrationBuilder.CreateTable(
                name: "Attendance",
                columns: table => new
                {
                    AttendanceID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClassID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AttendanceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Attendan__8B69263CD3AA0686", x => x.AttendanceID);
                    table.ForeignKey(
                        name: "FK__Attendanc__Class__7B5B524B",
                        column: x => x.ClassID,
                        principalTable: "Class",
                        principalColumn: "ClassID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Attendanc__Stude__7C4F7684",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CourseRegistration",
                columns: table => new
                {
                    RegistrationID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ClassID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    RegisteredAt = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    Status = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false, defaultValue: "PENDING")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__CourseRe__6EF58830D6374BD1", x => x.RegistrationID);
                    table.ForeignKey(
                        name: "FK__CourseReg__Class__74AE54BC",
                        column: x => x.ClassID,
                        principalTable: "Class",
                        principalColumn: "ClassID");
                    table.ForeignKey(
                        name: "FK__CourseReg__Stude__73BA3083",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GPA",
                columns: table => new
                {
                    GPAID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SemesterID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    GPA = table.Column<decimal>(type: "decimal(4,2)", nullable: false),
                    CumulativeGPA = table.Column<decimal>(type: "decimal(4,2)", nullable: false),
                    TotalCreditsEarned = table.Column<int>(type: "int", nullable: false),
                    TotalCreditsRegistered = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__GPA__890CBEC478A60D8E", x => x.GPAID);
                    table.ForeignKey(
                        name: "FK__GPA__SemesterID__0B91BA14",
                        column: x => x.SemesterID,
                        principalTable: "Semester",
                        principalColumn: "SemesterID");
                    table.ForeignKey(
                        name: "FK__GPA__StudentID__0A9D95DB",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Grade",
                columns: table => new
                {
                    GradeID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ClassID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    ProcessScore = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    MidtermScore = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    FinalScore = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    TotalScore = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    LetterGrade = table.Column<string>(type: "char(2)", unicode: false, fixedLength: true, maxLength: 2, nullable: true),
                    IsApproved = table.Column<bool>(type: "bit", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Grade__54F87A37571BC46D", x => x.GradeID);
                    table.ForeignKey(
                        name: "FK__Grade__ClassID__02084FDA",
                        column: x => x.ClassID,
                        principalTable: "Class",
                        principalColumn: "ClassID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK__Grade__StudentID__01142BA1",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GraduationRequest",
                columns: table => new
                {
                    RequestID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SemesterID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    TotalCreditsEarned = table.Column<int>(type: "int", nullable: false),
                    CumulativeGPA = table.Column<decimal>(type: "decimal(4,2)", nullable: false),
                    TuitionDebt = table.Column<decimal>(type: "decimal(18,0)", nullable: false),
                    MandatoryDone = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false, defaultValue: "Chờ xét duyệt"),
                    ReviewedBy = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradRequest", x => x.RequestID);
                    table.ForeignKey(
                        name: "FK_GraduationRequest_Semester_SemesterID",
                        column: x => x.SemesterID,
                        principalTable: "Semester",
                        principalColumn: "SemesterID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GraduationRequest_Student_StudentID",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tuition",
                columns: table => new
                {
                    TuitionID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SemesterID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    FeeType = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,0)", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,0)", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false, defaultValue: "Chưa đóng"),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tuition", x => x.TuitionID);
                    table.ForeignKey(
                        name: "FK_Tuition_Semester_SemesterID",
                        column: x => x.SemesterID,
                        principalTable: "Semester",
                        principalColumn: "SemesterID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Tuition_Student_StudentID",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Warning",
                columns: table => new
                {
                    WarningID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    SemesterID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    WarningLevel = table.Column<int>(type: "int", nullable: false),
                    WarningReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IssuedBy = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    IssuedDate = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "(getdate())"),
                    Status = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false, defaultValue: "ACTIVE"),
                    ResolutionNotes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Warning__214571B8F15D8838", x => x.WarningID);
                    table.ForeignKey(
                        name: "FK__Warning__IssuedB__114A936A",
                        column: x => x.IssuedBy,
                        principalTable: "Advisor",
                        principalColumn: "AdvisorID");
                    table.ForeignKey(
                        name: "FK__Warning__Semeste__0F624AF8",
                        column: x => x.SemesterID,
                        principalTable: "Semester",
                        principalColumn: "SemesterID");
                    table.ForeignKey(
                        name: "FK__Warning__Student__0E6E26BF",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TuitionPayment",
                columns: table => new
                {
                    PaymentID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TuitionID = table.Column<int>(type: "int", nullable: false),
                    StudentID = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AmountSubmitted = table.Column<decimal>(type: "decimal(18,0)", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "(getdate())"),
                    EvidenceFile = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false, defaultValue: "Chờ duyệt"),
                    ReviewedBy = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TuitionPayment", x => x.PaymentID);
                    table.ForeignKey(
                        name: "FK_TuitionPay_Tuition",
                        column: x => x.TuitionID,
                        principalTable: "Tuition",
                        principalColumn: "TuitionID");
                    table.ForeignKey(
                        name: "FK_TuitionPayment_Student_StudentID",
                        column: x => x.StudentID,
                        principalTable: "Student",
                        principalColumn: "StudentID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IDX_Account_Username",
                table: "Account",
                column: "Username");

            migrationBuilder.CreateIndex(
                name: "UQ__Account__536C85E4F6150CF6",
                table: "Account",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Account__A9D1053435979395",
                table: "Account",
                column: "Email",
                unique: true,
                filter: "[Email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Advisor_DepartmentID",
                table: "Advisor",
                column: "DepartmentID");

            migrationBuilder.CreateIndex(
                name: "UQ__Advisor__349DA5878CDC9EF1",
                table: "Advisor",
                column: "AccountID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdvisorClass_AdvisorID",
                table: "AdvisorClass",
                column: "AdvisorID");

            migrationBuilder.CreateIndex(
                name: "UQ__AdvisorC__2ECD4A55C5294043",
                table: "AdvisorClass",
                column: "ClassCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IDX_Attendance_Class_Date",
                table: "Attendance",
                columns: new[] { "ClassID", "AttendanceDate" });

            migrationBuilder.CreateIndex(
                name: "UQ_Attendance_Student_Class_Date",
                table: "Attendance",
                columns: new[] { "StudentID", "ClassID", "AttendanceDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Class_ScheduleID",
                table: "Class",
                column: "ScheduleID");

            migrationBuilder.CreateIndex(
                name: "IX_Class_SemesterID",
                table: "Class",
                column: "SemesterID");

            migrationBuilder.CreateIndex(
                name: "IX_Class_SubjectID",
                table: "Class",
                column: "SubjectID");

            migrationBuilder.CreateIndex(
                name: "IX_Class_TeacherID",
                table: "Class",
                column: "TeacherID");

            migrationBuilder.CreateIndex(
                name: "UQ_Class_Code_Semester",
                table: "Class",
                columns: new[] { "ClassCode", "SemesterID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClassSchedule_RoomID",
                table: "ClassSchedule",
                column: "RoomID");

            migrationBuilder.CreateIndex(
                name: "IDX_CourseRegistration_Class",
                table: "CourseRegistration",
                column: "ClassID");

            migrationBuilder.CreateIndex(
                name: "IDX_CourseRegistration_Student",
                table: "CourseRegistration",
                column: "StudentID");

            migrationBuilder.CreateIndex(
                name: "UQ_Registration_Student_Class",
                table: "CourseRegistration",
                columns: new[] { "StudentID", "ClassID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_Curriculum_Code",
                table: "Curriculum",
                column: "CurriculumCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_CurriculumSubject",
                table: "CurriculumSubject",
                columns: new[] { "CurriculumID", "SubjectID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Departme__6EA8896D47F2DF59",
                table: "Department",
                column: "DepartmentCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GPA_SemesterID",
                table: "GPA",
                column: "SemesterID");

            migrationBuilder.CreateIndex(
                name: "UQ_GPA_Student_Semester",
                table: "GPA",
                columns: new[] { "StudentID", "SemesterID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IDX_Grade_Student",
                table: "Grade",
                column: "StudentID");

            migrationBuilder.CreateIndex(
                name: "IX_Grade_ClassID",
                table: "Grade",
                column: "ClassID");

            migrationBuilder.CreateIndex(
                name: "UQ_Grade_Student_Class",
                table: "Grade",
                columns: new[] { "StudentID", "ClassID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GraduationRequest_SemesterID",
                table: "GraduationRequest",
                column: "SemesterID");

            migrationBuilder.CreateIndex(
                name: "IX_GraduationRequest_StudentID",
                table: "GraduationRequest",
                column: "StudentID");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecipient_NotificationID",
                table: "NotificationRecipient",
                column: "NotificationID");

            migrationBuilder.CreateIndex(
                name: "IX_Prerequisite_RequiredSubjectID",
                table: "Prerequisite",
                column: "RequiredSubjectID");

            migrationBuilder.CreateIndex(
                name: "UQ_Prerequisite",
                table: "Prerequisite",
                columns: new[] { "SubjectID", "RequiredSubjectID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_Room_Code",
                table: "Room",
                column: "RoomCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IDX_Student_StudentCode",
                table: "Student",
                column: "StudentCode");

            migrationBuilder.CreateIndex(
                name: "IX_Student_AdvisorClassID",
                table: "Student",
                column: "AdvisorClassID");

            migrationBuilder.CreateIndex(
                name: "UQ__Student__1FC88604A2B4E75B",
                table: "Student",
                column: "StudentCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Student__349DA5870B73DB3B",
                table: "Student",
                column: "AccountID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subject_DepartmentID",
                table: "Subject",
                column: "DepartmentID");

            migrationBuilder.CreateIndex(
                name: "UQ__Subject__9F7CE1A9C4C50C97",
                table: "Subject",
                column: "SubjectCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Teacher_DepartmentID",
                table: "Teacher",
                column: "DepartmentID");

            migrationBuilder.CreateIndex(
                name: "UQ__Teacher__349DA58773146516",
                table: "Teacher",
                column: "AccountID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tuition_SemesterID",
                table: "Tuition",
                column: "SemesterID");

            migrationBuilder.CreateIndex(
                name: "IX_Tuition_StudentID",
                table: "Tuition",
                column: "StudentID");

            migrationBuilder.CreateIndex(
                name: "IX_TuitionPayment_StudentID",
                table: "TuitionPayment",
                column: "StudentID");

            migrationBuilder.CreateIndex(
                name: "IX_TuitionPayment_TuitionID",
                table: "TuitionPayment",
                column: "TuitionID");

            migrationBuilder.CreateIndex(
                name: "IDX_Warning_Student_Semester",
                table: "Warning",
                columns: new[] { "StudentID", "SemesterID" });

            migrationBuilder.CreateIndex(
                name: "IX_Warning_IssuedBy",
                table: "Warning",
                column: "IssuedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Warning_SemesterID",
                table: "Warning",
                column: "SemesterID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attendance");

            migrationBuilder.DropTable(
                name: "CourseRegistration");

            migrationBuilder.DropTable(
                name: "CurriculumSubject");

            migrationBuilder.DropTable(
                name: "GPA");

            migrationBuilder.DropTable(
                name: "Grade");

            migrationBuilder.DropTable(
                name: "GraduationRequest");

            migrationBuilder.DropTable(
                name: "NotificationRecipient");

            migrationBuilder.DropTable(
                name: "Prerequisite");

            migrationBuilder.DropTable(
                name: "SystemConfig");

            migrationBuilder.DropTable(
                name: "TuitionPayment");

            migrationBuilder.DropTable(
                name: "Warning");

            migrationBuilder.DropTable(
                name: "Curriculum");

            migrationBuilder.DropTable(
                name: "Class");

            migrationBuilder.DropTable(
                name: "Notification");

            migrationBuilder.DropTable(
                name: "Tuition");

            migrationBuilder.DropTable(
                name: "ClassSchedule");

            migrationBuilder.DropTable(
                name: "Subject");

            migrationBuilder.DropTable(
                name: "Teacher");

            migrationBuilder.DropTable(
                name: "Semester");

            migrationBuilder.DropTable(
                name: "Student");

            migrationBuilder.DropTable(
                name: "Room");

            migrationBuilder.DropTable(
                name: "AdvisorClass");

            migrationBuilder.DropTable(
                name: "Advisor");

            migrationBuilder.DropTable(
                name: "Account");

            migrationBuilder.DropTable(
                name: "Department");
        }
    }
}
