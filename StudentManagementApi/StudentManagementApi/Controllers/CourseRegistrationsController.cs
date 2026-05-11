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
            // Kiểm tra dữ liệu đầu vào
            if (string.IsNullOrEmpty(dto.StudentId) || string.IsNullOrEmpty(dto.ClassId))
            {
                return BadRequest(new { message = "Thiếu thông tin đăng ký" });
            }

            // Kiểm tra sinh viên tồn tại
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentId == dto.StudentId);

            if (student == null)
                return BadRequest(new { message = "Sinh viên không tồn tại" });

            // Kiểm tra lớp tồn tại - Include đầy đủ thông tin cần thiết
            var cls = await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Schedule)
                .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId);

            if (cls == null)
                return BadRequest(new { message = "Lớp học phần không tồn tại" });

            // Kiểm tra Schedule có tồn tại không
            if (cls.Schedule == null)
            {
                return BadRequest(new { message = "Lớp học phần chưa có lịch học" });
            }

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

            // Lấy danh sách các lớp đã đăng ký APPROVED trong cùng học kỳ
            var registeredClasses = await _context.CourseRegistrations
                .Where(r => r.StudentId == dto.StudentId
                         && r.Status == "APPROVED"
                         && r.Class.SemesterId == cls.SemesterId)
                .Include(r => r.Class)
                    .ThenInclude(c => c.Schedule)
                .Include(r => r.Class)
                    .ThenInclude(c => c.Subject)
                .ToListAsync();

            // Kiểm tra trùng lịch chi tiết
            var conflictingClasses = new List<string>();

            foreach (var reg in registeredClasses)
            {
                var existingSchedule = reg.Class?.Schedule;
                var newSchedule = cls.Schedule;

                if (existingSchedule != null && newSchedule != null)
                {
                    // Kiểm tra cùng ngày trong tuần
                    if (existingSchedule.DayOfWeek == newSchedule.DayOfWeek)
                    {
                        // Kiểm tra khoảng thời gian trùng nhau
                        bool isOverlap = !(newSchedule.PeriodEnd < existingSchedule.PeriodStart
                                        || newSchedule.PeriodStart > existingSchedule.PeriodEnd);

                        if (isOverlap)
                        {
                            conflictingClasses.Add($"{reg.Class.ClassCode} - {reg.Class.Subject?.SubjectName ?? "N/A"}");
                        }
                    }
                }
            }

            // Nếu có xung đột lịch, trả về lỗi
            if (conflictingClasses.Any())
            {
                var conflictMessage = $"Lịch học bị trùng với các lớp sau:\n• " +
                                      string.Join("\n• ", conflictingClasses);
                return BadRequest(new
                {
                    message = conflictMessage,
                    conflict = true,
                    conflictingClasses = conflictingClasses
                });
            }

            // Lấy cấu hình giới hạn tín chỉ
            var minCreditsStr = await _context.SystemConfigs
                .Where(c => c.ConfigKey == "MinCreditsPerSemester")
                .Select(c => c.ConfigValue)
                .FirstOrDefaultAsync();

            var maxCreditsStr = await _context.SystemConfigs
                .Where(c => c.ConfigKey == "MaxCreditsPerSemester")
                .Select(c => c.ConfigValue)
                .FirstOrDefaultAsync();

            var minCredits = 15; 
            var maxCredits = 33; 

            if (!string.IsNullOrEmpty(maxCreditsStr))
                int.TryParse(maxCreditsStr, out maxCredits);
            if (!string.IsNullOrEmpty(minCreditsStr))
                int.TryParse(minCreditsStr, out minCredits);

            // Tính tín chỉ hiện tại
            var currentCredits = registeredClasses
                .Sum(r => r.Class?.Subject?.Credits ?? 0);

            // Kiểm tra tín chỉ tối đa
            if (currentCredits + (cls.Subject?.Credits ?? 0) > maxCredits)
            {
                return BadRequest(new
                {
                    message = $"Vượt quá số tín chỉ tối đa ({maxCredits} tín chỉ). Hiện tại: {currentCredits}, thêm: {cls.Subject?.Credits ?? 0}"
                });
            }

            // Tạo đăng ký mới
            var registration = new CourseRegistration
            {
                StudentId = dto.StudentId,
                ClassId = dto.ClassId,
                Status = "APPROVED",
                RegisteredAt = DateTime.UtcNow
            };

            _context.CourseRegistrations.Add(registration);

            // Cập nhật sĩ số lớp
            cls.CurrentStudents = (cls.CurrentStudents ?? 0) + 1;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Tính tổng tín chỉ mới
            var newTotalCredits = currentCredits + (cls.Subject?.Credits ?? 0);
            var warningMessage = newTotalCredits < minCredits
                ? $"Lưu ý: Bạn mới đăng ký {newTotalCredits}/{minCredits} tín chỉ. Hãy đăng ký thêm {minCredits - newTotalCredits} tín chỉ nữa!"
                : null;

            return Ok(new
            {
                message = warningMessage ?? "Đăng ký thành công!",
                registrationId = registration.RegistrationId,
                warning = warningMessage,
                currentCredits = newTotalCredits,
                minRequired = minCredits,
                maxAllowed = maxCredits
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($"LỖI ĐĂNG KÝ CHI TIẾT: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }

            return StatusCode(500, new
            {
                message = "Lỗi server khi đăng ký",
                error = ex.Message,
                innerError = ex.InnerException?.Message,
                stackTrace = ex.StackTrace
            });
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

    // Trong CourseRegistrationsController.cs, thêm method sau:

    [HttpGet("check-eligibility/{studentId}/{classId}")]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<EligibilityResultDto>> CheckEligibility(string studentId, string classId)
    {
        try
        {
            var result = new EligibilityResultDto
            {
                ClassAvailable = false,
                PrerequisitePassed = true,
                NoScheduleConflict = true,
                WithinCreditLimit = true,
                Message = "",
                IsEligible = false
            };

            // 1. Kiểm tra sinh viên tồn tại
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (student == null)
            {
                result.Message = "Sinh viên không tồn tại";
                return Ok(result);
            }

            // 2. Kiểm tra lớp tồn tại
            var cls = await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Schedule)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (cls == null)
            {
                result.Message = "Lớp học phần không tồn tại";
                return Ok(result);
            }

            // 3. Kiểm tra lớp còn chỗ và mở đăng ký
            result.ClassAvailable = cls.Status == "OPEN" && cls.CurrentStudents < cls.MaxStudents;
            if (!result.ClassAvailable)
            {
                result.Message = "Lớp đã đầy hoặc không mở đăng ký";
            }

            // 4. Kiểm tra điều kiện tiên quyết
            var prerequisites = await _context.Prerequisites
                .Where(p => p.SubjectId == cls.SubjectId)
                .Select(p => p.RequiredSubjectId)
                .ToListAsync();

            foreach (var reqId in prerequisites)
            {
                var hasPassed = await _context.Grades
                    .AnyAsync(g => g.StudentId == studentId
                                && g.Class.SubjectId == reqId
                                && g.TotalScore >= 5.0m
                                && g.IsApproved == true);

                if (!hasPassed)
                {
                    var reqSubject = await _context.Subjects
                        .FirstOrDefaultAsync(s => s.SubjectId == reqId);
                    result.PrerequisitePassed = false;
                    result.Message = $"Chưa hoàn thành môn tiên quyết: {reqSubject?.SubjectName ?? reqId}";
                    break;
                }
            }

            // 5. Kiểm tra trùng lịch (chỉ kiểm tra nếu có Schedule)
            if (result.PrerequisitePassed && cls.Schedule != null)
            {
                var registeredClasses = await _context.CourseRegistrations
                    .Where(r => r.StudentId == studentId
                             && r.Status == "APPROVED"
                             && r.Class.SemesterId == cls.SemesterId)
                    .Include(r => r.Class)
                        .ThenInclude(c => c.Schedule)
                    .ToListAsync();

                foreach (var reg in registeredClasses)
                {
                    var existingSchedule = reg.Class?.Schedule;
                    if (existingSchedule != null && existingSchedule.DayOfWeek == cls.Schedule.DayOfWeek)
                    {
                        bool isOverlap = !(cls.Schedule.PeriodEnd < existingSchedule.PeriodStart
                                        || cls.Schedule.PeriodStart > existingSchedule.PeriodEnd);

                        if (isOverlap)
                        {
                            result.NoScheduleConflict = false;
                            result.Message = $"Trùng lịch với môn {reg.Class?.Subject?.SubjectName ?? reg.Class?.ClassCode}";
                            break;
                        }
                    }
                }
            }

            // 6. Kiểm tra giới hạn tín chỉ
            if (result.PrerequisitePassed && result.NoScheduleConflict)
            {
                var maxCreditsStr = await _context.SystemConfigs
                    .Where(c => c.ConfigKey == "MaxCreditsPerSemester")
                    .Select(c => c.ConfigValue)
                    .FirstOrDefaultAsync() ?? "33";

                var maxCredits = int.Parse(maxCreditsStr);

                var currentCredits = await _context.CourseRegistrations
                    .Where(r => r.StudentId == studentId
                             && r.Status == "APPROVED"
                             && r.Class.SemesterId == cls.SemesterId)
                    .SumAsync(r => r.Class.Subject.Credits);

                result.WithinCreditLimit = currentCredits + (cls.Subject?.Credits ?? 0) <= maxCredits;

                if (!result.WithinCreditLimit)
                {
                    result.Message = $"Vượt quá giới hạn tín chỉ ({maxCredits} tín chỉ)";
                }
            }

            // 7. Kết luận
            result.IsEligible = result.ClassAvailable && result.PrerequisitePassed &&
                                result.NoScheduleConflict && result.WithinCreditLimit;

            if (result.IsEligible)
            {
                result.Message = "Đủ điều kiện đăng ký môn học này";
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Lỗi check eligibility: {ex.Message}");
            return StatusCode(500, new EligibilityResultDto
            {
                IsEligible = false,
                Message = $"Lỗi server: {ex.Message}"
            });
        }
    }

    // DTO cho kết quả kiểm tra
    public class EligibilityResultDto
    {
        public bool ClassAvailable { get; set; }
        public bool PrerequisitePassed { get; set; }
        public bool NoScheduleConflict { get; set; }
        public bool WithinCreditLimit { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsEligible { get; set; }
    }



    private bool CourseRegistrationExists(int id)
    {
        return _context.CourseRegistrations.Any(e => e.RegistrationId == id);
    }
}