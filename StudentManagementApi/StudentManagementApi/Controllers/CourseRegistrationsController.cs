// Controllers/CourseRegistrationsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class CourseRegistrationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CourseRegistrationsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/CourseRegistrations - SỬA LỖI 500
    [HttpGet]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<IEnumerable<object>>> GetCourseRegistrations(
        [FromQuery] string? status = null,
        [FromQuery] string? studentId = null,
        [FromQuery] string? classId = null)
    {
        try
        {
            var query = _context.CourseRegistrations
                .Include(r => r.Student)
                    .ThenInclude(s => s != null ? s.Account : null)
                .Include(r => r.Class)
                    .ThenInclude(c => c != null ? c.Subject : null)
                .Include(r => r.Class)
                    .ThenInclude(c => c != null ? c.Semester : null)
                .AsQueryable();

            // Filter theo status
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(r => r.Status == status);
            }

            // Filter theo studentId
            if (!string.IsNullOrEmpty(studentId))
            {
                query = query.Where(r => r.StudentId == studentId);
            }

            // Filter theo classId
            if (!string.IsNullOrEmpty(classId))
            {
                query = query.Where(r => r.ClassId == classId);
            }

            var registrations = await query
                .Select(r => new
                {
                    r.RegistrationId,
                    r.StudentId,
                    r.ClassId,
                    r.RegisteredAt,
                    r.Status,

                    // Thông tin sinh viên - kiểm tra null cẩn thận
                    Student = r.Student == null ? null : new
                    {
                        r.Student.StudentId,
                        r.Student.StudentCode,
                        FullName = r.Student.Account != null ? r.Student.Account.FullName : "N/A",
                        Email = r.Student.Account != null ? r.Student.Account.Email : null,
                        Phone = r.Student.Account != null ? r.Student.Account.Phone : null,
                        Gender = r.Student.Account != null ? r.Student.Account.Gender : null
                    },

                    // Thông tin lớp học - kiểm tra null cẩn thận
                    Class = r.Class == null ? null : new
                    {
                        r.Class.ClassId,
                        r.Class.ClassCode,
                        r.Class.MaxStudents,
                        r.Class.CurrentStudents,
                        r.Class.Status,
                        Subject = r.Class.Subject == null ? null : new
                        {
                            r.Class.Subject.SubjectId,
                            r.Class.Subject.SubjectCode,
                            r.Class.Subject.SubjectName,
                            r.Class.Subject.Credits
                        },
                        Semester = r.Class.Semester == null ? null : new
                        {
                            r.Class.Semester.SemesterId,
                            r.Class.Semester.SemesterName,
                            r.Class.Semester.AcademicYear
                        }
                    }
                })
                .OrderByDescending(r => r.RegisteredAt)
                .ToListAsync();

            return Ok(registrations);
        }
        catch (Exception ex)
        {
            // Log lỗi chi tiết
            Console.WriteLine($"Lỗi GetCourseRegistrations: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");

            return StatusCode(500, new
            {
                message = "Đã xảy ra lỗi khi tải danh sách đăng ký",
                error = ex.Message,
                innerError = ex.InnerException?.Message
            });
        }
    }

    // GET: api/CourseRegistrations/5
    [HttpGet("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<object>> GetCourseRegistration(int id)
    {
        try
        {
            var registration = await _context.CourseRegistrations
                .Include(r => r.Student)
                    .ThenInclude(s => s != null ? s.Account : null)
                .Include(r => r.Class)
                    .ThenInclude(c => c != null ? c.Subject : null)
                .Include(r => r.Class)
                    .ThenInclude(c => c != null ? c.Semester : null)
                .Where(r => r.RegistrationId == id)
                .Select(r => new
                {
                    r.RegistrationId,
                    r.StudentId,
                    r.ClassId,
                    r.RegisteredAt,
                    r.Status,
                    Student = r.Student == null ? null : new
                    {
                        r.Student.StudentId,
                        r.Student.StudentCode,
                        FullName = r.Student.Account != null ? r.Student.Account.FullName : "N/A",
                        Email = r.Student.Account != null ? r.Student.Account.Email : null
                    },
                    Class = r.Class == null ? null : new
                    {
                        r.Class.ClassId,
                        r.Class.ClassCode,
                        SubjectName = r.Class.Subject != null ? r.Class.Subject.SubjectName : "N/A"
                    }
                })
                .FirstOrDefaultAsync();

            if (registration == null)
                return NotFound();

            return Ok(registration);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi khi tải chi tiết đăng ký", error = ex.Message });
        }
    }

    // GET: api/CourseRegistrations/student/STU001
    // Trong CourseRegistrationsController.cs
    [HttpGet("student/{studentId}")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<object>>> GetRegistrationsByStudent(string studentId)
    {
        try
        {
            var registrations = await _context.CourseRegistrations
                .Include(r => r.Class)
                    .ThenInclude(c => c.Subject)
                .Include(r => r.Class)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t.Account)
                .Include(r => r.Class)
                    .ThenInclude(c => c.Schedule)
                .Include(r => r.Class)
                    .ThenInclude(c => c.Semester)
                .Where(r => r.StudentId == studentId)
                .Select(r => new
                {
                    r.RegistrationId,
                    r.StudentId,
                    r.ClassId,
                    r.RegisteredAt,
                    r.Status,
                    Class = new
                    {
                        r.Class.ClassId,
                        r.Class.ClassCode,
                        SemesterId = r.Class.SemesterId,
                        Semester = new { r.Class.Semester.SemesterName },
                        Subject = new
                        {
                            r.Class.Subject.SubjectName,
                            r.Class.Subject.Credits
                        },
                        Teacher = new
                        {
                            FullName = r.Class.Teacher.Account.FullName
                        },
                        Schedule = new
                        {
                            r.Class.Schedule.DayOfWeek,
                            r.Class.Schedule.PeriodStart,
                            r.Class.Schedule.PeriodEnd,
                            r.Class.Schedule.Room
                        }
                    }
                })
                .OrderByDescending(r => r.RegisteredAt)
                .ToListAsync();

            return Ok(registrations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi khi tải đăng ký", error = ex.Message });
        }
    }

    // POST: api/CourseRegistrations
    [HttpPost]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<object>> PostCourseRegistration([FromBody] RegisterDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Kiểm tra sinh viên tồn tại
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentId == dto.StudentId);

            if (student == null)
                return BadRequest(new { message = "Sinh viên không tồn tại" });

            // Kiểm tra lớp tồn tại
            var cls = await _context.Classes
                .Include(c => c.Subject)
                .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId);

            if (cls == null)
                return BadRequest(new { message = "Lớp học phần không tồn tại" });

            // Kiểm tra lớp còn mở đăng ký
            if (cls.Status != "OPEN")
                return BadRequest(new { message = "Lớp học phần không ở trạng thái mở đăng ký" });

            // Kiểm tra lớp còn chỗ
            if (cls.CurrentStudents >= cls.MaxStudents)
                return BadRequest(new { message = "Lớp học phần đã đầy" });

            // Kiểm tra trùng đăng ký
            var existing = await _context.CourseRegistrations
                .AnyAsync(r => r.StudentId == dto.StudentId && r.ClassId == dto.ClassId);

            if (existing)
                return BadRequest(new { message = "Bạn đã đăng ký lớp học phần này rồi" });

            // Kiểm tra tiên quyết
            var prerequisites = await _context.Prerequisites
                .Where(p => p.SubjectId == cls.SubjectId)
                .Select(p => p.RequiredSubjectId)
                .ToListAsync();

            foreach (var reqId in prerequisites)
            {
                var hasPassed = await _context.Grades
                    .AnyAsync(g => g.StudentId == dto.StudentId
                                && g.Class.SubjectId == reqId
                                && g.TotalScore >= 5.0m);

                if (!hasPassed)
                {
                    var reqSubject = await _context.Subjects
                        .FirstOrDefaultAsync(s => s.SubjectId == reqId);
                    return BadRequest(new
                    {
                        message = $"Chưa hoàn thành môn tiên quyết: {reqSubject?.SubjectName ?? reqId}"
                    });
                }
            }

            // Kiểm tra trùng lịch
            var studentSchedules = await _context.CourseRegistrations
                .Where(r => r.StudentId == dto.StudentId
                         && r.Status == "APPROVED"
                         && r.Class.SemesterId == cls.SemesterId)
                .Select(r => r.Class.ScheduleId)
                .ToListAsync();

            if (studentSchedules.Contains(cls.ScheduleId))
            {
                var schedule = await _context.ClassSchedules
                    .FirstOrDefaultAsync(s => s.ScheduleId == cls.ScheduleId);
                return BadRequest(new
                {
                    message = $"Trùng lịch học: {GetScheduleText(schedule)}"
                });
            }

            // Kiểm tra giới hạn tín chỉ
            var maxCreditsStr = await _context.SystemConfigs
                .Where(c => c.ConfigKey == "MaxCreditsPerSemester")
                .Select(c => c.ConfigValue)
                .FirstOrDefaultAsync() ?? "22";

            var maxCredits = int.Parse(maxCreditsStr);

            var currentCredits = await _context.CourseRegistrations
                .Where(r => r.StudentId == dto.StudentId
                         && r.Status == "APPROVED"
                         && r.Class.SemesterId == cls.SemesterId)
                .SumAsync(r => r.Class.Subject.Credits);

            if (currentCredits + cls.Subject.Credits > maxCredits)
                return BadRequest(new
                {
                    message = $"Vượt quá số tín chỉ tối đa ({maxCredits} tín chỉ)"
                });

            // THÊM ĐĂNG KÝ - TRẠNG THÁI APPROVED NGAY LẬP TỨC
            var registration = new CourseRegistration
            {
                StudentId = dto.StudentId,
                ClassId = dto.ClassId,
                Status = "APPROVED", // APPROVED ngay, không cần chờ duyệt
                RegisteredAt = DateTime.UtcNow
            };

            _context.CourseRegistrations.Add(registration);

            // Cập nhật sĩ số lớp
            cls.CurrentStudents = (cls.CurrentStudents ?? 0) + 1;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Đăng ký thành công!",
                registrationId = registration.RegistrationId
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"Lỗi đăng ký: {ex.Message}");
            return StatusCode(500, new { message = "Lỗi server khi đăng ký", error = ex.Message });
        }
    }

    // Helper method để hiển thị lịch học
    private string GetScheduleText(ClassSchedule? schedule)
    {
        if (schedule == null) return "Không xác định";

        string[] days = { "Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7" };
        string day = schedule.DayOfWeek >= 2 && schedule.DayOfWeek <= 8
            ? days[schedule.DayOfWeek - 1]
            : $"Thứ {schedule.DayOfWeek}";

        return $"{day} tiết {schedule.PeriodStart}-{schedule.PeriodEnd} phòng {schedule.Room}";
    }

    // DTO cho đăng ký
    public class RegisterDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
    }

    // PUT: api/CourseRegistrations/approve/5
    // Sửa lại endpoint approve

    [HttpPut("approve/{id}")]
    [Authorize(Roles = "ADMIN,ADVISOR")]
    public async Task<IActionResult> ApproveRegistration(int id)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var registration = await _context.CourseRegistrations
                .Include(r => r.Class)
                .FirstOrDefaultAsync(r => r.RegistrationId == id);

            if (registration == null)
                return NotFound(new { message = "Không tìm thấy đăng ký" });

            if (registration.Status != "PENDING")
                return BadRequest(new { message = "Đăng ký không ở trạng thái chờ duyệt" });

            var cls = registration.Class;
            if (cls == null)
                return BadRequest(new { message = "Lớp học phần không tồn tại" });

            if (cls.CurrentStudents >= cls.MaxStudents)
                return BadRequest(new { message = "Lớp đã đầy" });

            // Cập nhật trạng thái
            registration.Status = "APPROVED";
            cls.CurrentStudents = (cls.CurrentStudents ?? 0) + 1;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Duyệt đăng ký thành công",
                registrationId = registration.RegistrationId,
                classId = cls.ClassId,
                currentStudents = cls.CurrentStudents
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"[ERROR] ApproveRegistration: {ex.Message}");
            return StatusCode(500, new { message = "Lỗi khi duyệt đăng ký", error = ex.Message });
        }
    }

    // Thêm endpoint riêng cho từ chối

    [HttpPut("reject/{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> RejectRegistration(int id)
    {
        var registration = await _context.CourseRegistrations
            .FirstOrDefaultAsync(r => r.RegistrationId == id);

        if (registration == null)
            return NotFound(new { message = "Không tìm thấy đăng ký" });

        if (registration.Status != "PENDING")
            return BadRequest(new { message = "Đăng ký không ở trạng thái chờ duyệt" });

        registration.Status = "REJECTED";
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã từ chối đăng ký thành công" });
    }

    // PUT: api/CourseRegistrations/5
    // Sửa endpoint PUT để xử lý cập nhật trạng thái

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> PutCourseRegistration(int id, [FromBody] UpdateRegistrationStatusDto dto)
    {
        // Validate
        if (id != dto.RegistrationId)
            return BadRequest(new { message = "ID không khớp" });

        var registration = await _context.CourseRegistrations
            .Include(r => r.Class)
            .FirstOrDefaultAsync(r => r.RegistrationId == id);

        if (registration == null)
            return NotFound(new { message = "Không tìm thấy đăng ký" });

        // Kiểm tra trạng thái hợp lệ
        var validStatuses = new[] { "PENDING", "APPROVED", "REJECTED", "DROPPED" };
        if (!validStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Trạng thái không hợp lệ" });

        // Nếu chuyển từ PENDING sang REJECTED, không cần cập nhật sĩ số
        if (registration.Status == "PENDING" && dto.Status == "REJECTED")
        {
            registration.Status = dto.Status;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã từ chối đăng ký thành công" });
        }

        // Nếu chuyển từ PENDING sang APPROVED, cần cập nhật sĩ số
        if (registration.Status == "PENDING" && dto.Status == "APPROVED")
        {
            var cls = registration.Class;
            if (cls == null)
                return BadRequest(new { message = "Lớp học phần không tồn tại" });

            if (cls.CurrentStudents >= cls.MaxStudents)
                return BadRequest(new { message = "Lớp đã đầy" });

            registration.Status = "APPROVED";
            cls.CurrentStudents = (cls.CurrentStudents ?? 0) + 1;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã duyệt đăng ký thành công" });
        }

        // Các trường hợp khác
        registration.Status = dto.Status;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật trạng thái thành công" });
    }

    // DTO cho cập nhật
    public class UpdateRegistrationStatusDto
    {
        public int RegistrationId { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // DELETE: api/CourseRegistrations/5
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteCourseRegistration(int id)
    {
        var registration = await _context.CourseRegistrations.FindAsync(id);
        if (registration == null)
            return NotFound();

        _context.CourseRegistrations.Remove(registration);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool CourseRegistrationExists(int id)
    {
        return _context.CourseRegistrations.Any(e => e.RegistrationId == id);
    }
}