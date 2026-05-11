using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class ClassesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClassesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Classes
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetClasses()
    {
        var classes = await _context.Classes
            .Include(c => c.Subject)
            .Include(c => c.Teacher)!
                .ThenInclude(t => t!.Account)   
            .Include(c => c.Semester)
            .Include(c => c.Schedule)
            .Select(c => new
            {
                c.ClassId,
                c.ClassCode,
                Subject = new
                {
                    c.Subject.SubjectId,
                    c.Subject.SubjectCode,
                    c.Subject.SubjectName,
                    c.Subject.Credits,
                    c.Subject.Type
                },
                Teacher = c.Teacher != null ? new
                {
                    c.Teacher.TeacherId,
                    FullName = c.Teacher.Account.FullName,
                    Position = c.Teacher.Position ?? "Chưa xác định"
                } : null,
                Semester = new
                {
                    c.Semester.SemesterId,
                    c.Semester.SemesterName,
                    c.Semester.AcademicYear,
                    c.Semester.SemesterNumber
                },
                Schedule = c.Schedule != null ? new
                {
                    c.Schedule.ScheduleId,
                    c.Schedule.DayOfWeek,
                    PeriodStart = c.Schedule.PeriodStart,
                    PeriodEnd = c.Schedule.PeriodEnd,
                    Room = c.Schedule.Room ?? "Chưa có"
                } : null,
                c.MaxStudents,
                c.CurrentStudents,
                c.Status
            })
            .OrderBy(c => c.ClassCode)
            .ToListAsync();

        return Ok(classes);
    }

    // GET: api/Classes/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetClass(string id)
    {
        var cls = await _context.Classes
            .Include(c => c.Subject)
            .Include(c => c.Teacher)!
                .ThenInclude(t => t!.Account)
            .Include(c => c.Semester)
            .Include(c => c.Schedule)
            .Where(c => c.ClassId == id)
            .Select(c => new
            {
                c.ClassId,
                c.ClassCode,
                Subject = new
                {
                    c.Subject.SubjectId,
                    c.Subject.SubjectCode,
                    c.Subject.SubjectName,
                    c.Subject.Credits,
                    c.Subject.Type
                },
                Teacher = c.Teacher != null ? new
                {
                    c.Teacher.TeacherId,
                    FullName = c.Teacher.Account.FullName,
                    Position = c.Teacher.Position
                } : null,
                Semester = new
                {
                    c.Semester.SemesterId,
                    c.Semester.SemesterName
                },
                Schedule = c.Schedule != null ? new
                {
                    c.Schedule.DayOfWeek,
                    PeriodStart = c.Schedule.PeriodStart,
                    PeriodEnd = c.Schedule.PeriodEnd,
                    c.Schedule.Room
                } : null,
                c.MaxStudents,
                c.CurrentStudents,
                c.Status
            })
            .FirstOrDefaultAsync();

        if (cls == null) return NotFound("Không tìm thấy lớp học phần");

        return Ok(cls);
    }

    // POST: api/Classes - TỰ ĐỘNG SINH ClassId
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<object>> PostClass([FromBody] ClassCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Kiểm tra trùng ClassCode + SemesterId
        if (await _context.Classes.AnyAsync(c =>
            c.ClassCode == dto.ClassCode && c.SemesterId == dto.SemesterId))
        {
            return BadRequest("Mã lớp đã tồn tại trong học kỳ này!");
        }

        // Kiểm tra trùng lịch (ScheduleId) trong cùng học kỳ
        if (await _context.Classes.AnyAsync(c =>
            c.ScheduleId == dto.ScheduleId && c.SemesterId == dto.SemesterId))
        {
            return BadRequest("Trùng lịch học hoặc phòng học trong học kỳ này!");
        }

        // TỰ ĐỘNG SINH ClassId
        string classId = $"C-{Guid.NewGuid().ToString("N").Substring(0, 8)}"; 

        var cls = new Class
        {
            ClassId = classId,
            ClassCode = dto.ClassCode,
            SubjectId = dto.SubjectId,
            TeacherId = dto.TeacherId,
            SemesterId = dto.SemesterId,
            ScheduleId = dto.ScheduleId,
            MaxStudents = dto.MaxStudents,
            CurrentStudents = 0,
            Status = "OPEN"
        };

        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClass), new { id = cls.ClassId }, cls);
    }

    // PUT: api/Classes/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutClass(string id, [FromBody] ClassUpdateDto dto)
    {
        var cls = await _context.Classes.FindAsync(id);
        if (cls == null) return NotFound();

        if (id != dto.ClassId) return BadRequest("ClassId không khớp");

        cls.ClassCode = dto.ClassCode ?? cls.ClassCode;
        cls.SubjectId = dto.SubjectId ?? cls.SubjectId;
        cls.TeacherId = dto.TeacherId ?? cls.TeacherId;
        cls.SemesterId = dto.SemesterId ?? cls.SemesterId;
        cls.ScheduleId = dto.ScheduleId ?? cls.ScheduleId;
        cls.MaxStudents = dto.MaxStudents ?? cls.MaxStudents;
        cls.Status = dto.Status ?? cls.Status;

        _context.Entry(cls).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteClass(string id)
    {
        var cls = await _context.Classes
            .Include(c => c.CourseRegistrations)
            .FirstOrDefaultAsync(c => c.ClassId == id);

        if (cls == null) return NotFound();

        // Chỉ không cho xóa nếu lớp ĐANG MỞ và có sinh viên đã đăng ký ĐƯỢC DUYỆT
        if (cls.Status == "OPEN" && cls.CurrentStudents > 0)
        {
            return BadRequest(new
            {
                message = $"Không thể xóa lớp đang mở đăng ký và có {cls.CurrentStudents} sinh viên. Vui lòng hủy lớp trước."
            });
        }

        // Cho phép xóa lớp CANCELLED (đã hủy) - không cần kiểm tra CourseRegistrations 
        // hoặc lớp CLOSED không có sinh viên
        if (cls.Status != "CANCELLED" && cls.CurrentStudents > 0)
        {
            return BadRequest(new
            {
                message = "Không thể xóa lớp đã có sinh viên đăng ký được duyệt. Vui lòng hủy lớp trước."
            });
        }

        // Nếu là lớp CANCELLED, có thể xóa tất cả các đăng ký liên quan trước
        if (cls.Status == "CANCELLED")
        {
            // Xóa tất cả đăng ký của lớp này (tùy chọn)
            _context.CourseRegistrations.RemoveRange(cls.CourseRegistrations);
        }

        _context.Classes.Remove(cls);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã xóa lớp {cls.ClassCode} thành công" });
    }

    [HttpGet("available-for-student/{studentId}")]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<IEnumerable<object>>> GetAvailableClassesForStudent(
string studentId,
[FromQuery] string? semesterId = null,
[FromQuery] string? search = null)  // tìm theo tên môn hoặc mã môn
    {
        semesterId ??= await _context.SystemConfigs
        .Where(c => c.ConfigKey == "CurrentSemester")
        .Select(c => c.ConfigValue)
        .FirstOrDefaultAsync() ?? "HK2024_2";
        var student = await _context.Students.FindAsync(studentId);
        if (student == null) return NotFound("Sinh viên không tồn tại");
        var query = _context.Classes
        .Include(c => c.Subject)
        .Include(c => c.Teacher).ThenInclude(t => t.Account)
        .Include(c => c.Schedule)
        .Where(c => c.SemesterId == semesterId
        && c.Status == "OPEN"
        && c.CurrentStudents < c.MaxStudents);
        // Loại bỏ các lớp đã đăng ký (PENDING hoặc APPROVED)
        var registeredClassIds = await _context.CourseRegistrations
.Where(r => r.StudentId == studentId)
.Select(r => r.ClassId)
.ToListAsync();
        query = query.Where(c => !registeredClassIds.Contains(c.ClassId));
        // Tìm kiếm (tùy chọn)
        if (!string.IsNullOrEmpty(search))
        {
            search = search.ToLower();
            query = query.Where(c => c.Subject.SubjectName.ToLower().Contains(search)
            || c.Subject.SubjectCode.ToLower().Contains(search)
            || c.ClassCode.ToLower().Contains(search));
        }
        var availableClasses = await query
        .Select(c => new
        {
            c.ClassId,
            c.ClassCode,
            SubjectName = c.Subject.SubjectName,
            Credits = c.Subject.Credits,
            TeacherName = c.Teacher.Account.FullName,
            CurrentStudents = c.CurrentStudents,
            MaxStudents = c.MaxStudents,
            DayOfWeek = c.Schedule.DayOfWeek,
            PeriodStart = c.Schedule.PeriodStart,
            PeriodEnd = c.Schedule.PeriodEnd,
            Room = c.Schedule.Room
        })
        .OrderBy(c => c.SubjectName)
        .ToListAsync();
        return Ok(availableClasses);
    }

    // ClassesController.cs
    [HttpGet("my-classes")]
    [Authorize(Roles = "TEACHER")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyClasses()
    {
        var teacherIdClaim = User.FindFirst("teacherId")?.Value;

        Console.WriteLine($"=== DEBUG ===");
        Console.WriteLine($"TeacherId from claim: {teacherIdClaim}");

        if (string.IsNullOrEmpty(teacherIdClaim))
        {
            Console.WriteLine("ERROR: teacherId claim not found!");
            // Thử lấy từ Account nếu không có trong claim
            var accountId = User.FindFirst("accountId")?.Value;
            if (!string.IsNullOrEmpty(accountId))
            {
                var teacher = await _context.Teachers
                    .FirstOrDefaultAsync(t => t.AccountId == accountId);
                if (teacher != null)
                {
                    teacherIdClaim = teacher.TeacherId;
                    Console.WriteLine($"Found TeacherId from Account: {teacherIdClaim}");
                }
            }

            if (string.IsNullOrEmpty(teacherIdClaim))
                return Unauthorized(new { message = "Không tìm thấy thông tin giảng viên", teacherId = teacherIdClaim });
        }

        // LẤY TẤT CẢ LỚP, KHÔNG FILTER HỌC KỲ
        var classes = await _context.Classes
            .Include(c => c.Subject)
            .Include(c => c.Teacher)!
                .ThenInclude(t => t!.Account)
            .Include(c => c.Semester)
            .Include(c => c.Schedule)
            .Where(c => c.TeacherId == teacherIdClaim)
            // .Where(c => c.SemesterId == "HK2024_2")
            .Select(c => new
            {
                c.ClassId,
                c.ClassCode,
                Subject = new
                {
                    c.Subject.SubjectId,
                    c.Subject.SubjectCode,
                    c.Subject.SubjectName,
                    c.Subject.Credits
                },
                Semester = new
                {
                    c.Semester.SemesterId,
                    c.Semester.SemesterName,
                    c.Semester.AcademicYear
                },
                Schedule = c.Schedule != null ? new
                {
                    c.Schedule.DayOfWeek,
                    c.Schedule.PeriodStart,
                    c.Schedule.PeriodEnd,
                    c.Schedule.Room
                } : null,
                c.MaxStudents,
                c.CurrentStudents,
                c.Status
            })
            .OrderByDescending(c => c.Semester.AcademicYear)
            .ThenByDescending(c => c.ClassCode)
            .ToListAsync();

        Console.WriteLine($"Found {classes.Count} classes for teacher {teacherIdClaim}");

        // Log chi tiết từng lớp để debug
        foreach (var cls in classes)
        {
            Console.WriteLine($"Class: {cls.ClassCode}, Semester: {cls.Semester.SemesterName}, Status: {cls.Status}");
        }

        return Ok(classes);
    }

    [HttpGet("my-classes/semester/{semesterId}")]
    [Authorize(Roles = "TEACHER")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyClassesBySemester(string semesterId)
    {
        var teacherIdClaim = User.FindFirst("teacherId")?.Value;

        if (string.IsNullOrEmpty(teacherIdClaim))
            return Unauthorized("Không tìm thấy thông tin giảng viên");

        var classes = await _context.Classes
            .Include(c => c.Subject)
            .Include(c => c.Teacher)!.ThenInclude(t => t!.Account)
            .Include(c => c.Semester)
            .Include(c => c.Schedule)
            .Where(c => c.TeacherId == teacherIdClaim && c.SemesterId == semesterId)
            .Select(c => new
            {
                c.ClassId,
                c.ClassCode,
                Subject = new
                {
                    c.Subject.SubjectId,
                    c.Subject.SubjectCode,
                    c.Subject.SubjectName,
                    c.Subject.Credits
                },
                Semester = new
                {
                    c.Semester.SemesterId,
                    c.Semester.SemesterName
                },
                Schedule = c.Schedule != null ? new
                {
                    c.Schedule.DayOfWeek,
                    c.Schedule.PeriodStart,
                    c.Schedule.PeriodEnd,
                    c.Schedule.Room
                } : null,
                c.MaxStudents,
                c.CurrentStudents,
                c.Status
            })
            .OrderBy(c => c.ClassCode)
            .ToListAsync();

        return Ok(classes);
    }

    [HttpGet("{classId}/students")]
    [Authorize(Roles = "TEACHER,ADMIN")]
    public async Task<ActionResult> GetStudentsInMyClass(string classId)
    {
        var isAdmin = User.IsInRole("ADMIN");
        var teacherId = User.FindFirst("teacherId")?.Value;

        // Admin không cần check teacherId
        if (!isAdmin && string.IsNullOrEmpty(teacherId))
            return Unauthorized("Không tìm thấy thông tin giảng viên");

        var cls = await _context.Classes
            .Include(c => c.CourseRegistrations)
                .ThenInclude(r => r.Student)
                .ThenInclude(s => s.Account)
            .Include(c => c.Subject)
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (cls == null)
            return NotFound($"Không tìm thấy lớp học phần với ID: {classId}");

        // Chỉ check quyền sở hữu nếu KHÔNG phải Admin
        if (!isAdmin && cls.TeacherId != teacherId)
            return Forbid("Bạn không được dạy lớp này");

        var students = cls.CourseRegistrations
            .Where(r => r.Status == "APPROVED")
            .Select(r => new
            {
                StudentId = r.Student?.StudentId ?? "",
                StudentCode = r.Student?.StudentCode ?? "N/A",
                FullName = r.Student?.Account?.FullName ?? "Chưa có tên",
                Email = r.Student?.Account?.Email ?? "Chưa cập nhật",
                Phone = r.Student?.Account?.Phone ?? "Chưa cập nhật",
                Gender = r.Student?.Account?.Gender,
            })
            .OrderBy(s => s.FullName)
            .ToList();

        return Ok(new
        {
            classInfo = new
            {
                cls.ClassCode,
                SubjectName = cls.Subject?.SubjectName ?? "N/A",
                cls.CurrentStudents,
                cls.MaxStudents
            },
            students
        });
    }

    // ClassesController.cs, 

    [HttpGet("class-registrations/{classId}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<IEnumerable<object>>> GetClassRegistrations(string classId)
    {
        var registrations = await _context.CourseRegistrations
            .Include(r => r.Student)
                .ThenInclude(s => s.Account)
            .Where(r => r.ClassId == classId)
            .Select(r => new
            {
                r.RegistrationId,
                r.StudentId,
                r.ClassId,
                r.RegisteredAt,
                r.Status,
                Student = new
                {
                    r.Student.StudentCode,
                    FullName = r.Student.Account.FullName,
                    Email = r.Student.Account.Email,
                    Phone = r.Student.Account.Phone
                }
            })
            .OrderByDescending(r => r.RegisteredAt)
            .ToListAsync();

        return Ok(registrations);
    }

    public class ClassCreateDto
    {
        public string ClassCode { get; set; } = null!;
        public string SubjectId { get; set; } = null!;
        public string? TeacherId { get; set; }
        public string SemesterId { get; set; } = null!;
        public int ScheduleId { get; set; }
        public int MaxStudents { get; set; }
    }

    // DTO cho PUT
    public class ClassUpdateDto
    {
        public string ClassId { get; set; } = null!;
        public string? ClassCode { get; set; }
        public string? SubjectId { get; set; }
        public string? TeacherId { get; set; }
        public string? SemesterId { get; set; }
        public int? ScheduleId { get; set; }
        public int? MaxStudents { get; set; }
        public string? Status { get; set; }
    }
}
