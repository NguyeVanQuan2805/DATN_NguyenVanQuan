using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "ADMIN")]
    public class SemesterManagementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SemesterManagementController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/SemesterManagement/semesters
        [HttpGet("semesters")]
        public async Task<IActionResult> GetAllSemesters()
        {
            try
            {
                var semesters = await _context.Semesters
                    .OrderByDescending(s => s.AcademicYear)
                    .ThenByDescending(s => s.SemesterNumber)
                    .Select(s => new
                    {
                        s.SemesterId,
                        s.SemesterName,
                        s.AcademicYear,
                        s.SemesterNumber,
                        s.StartDate,
                        s.EndDate,
                        s.IsRegistrationOpen,
                        // Thêm thông tin thống kê
                        TotalClasses = _context.Classes.Count(c => c.SemesterId == s.SemesterId),
                        TotalRegistrations = _context.CourseRegistrations
                            .Count(r => r.Class.SemesterId == s.SemesterId),
                        ApprovedRegistrations = _context.CourseRegistrations
                            .Count(r => r.Class.SemesterId == s.SemesterId && r.Status == "APPROVED")
                    })
                    .ToListAsync();

                return Ok(semesters);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/SemesterManagement/semesters/{id}
        [HttpGet("semesters/{id}")]
        public async Task<IActionResult> GetSemesterById(string id)
        {
            try
            {
                var semester = await _context.Semesters
                    .Where(s => s.SemesterId == id)
                    .Select(s => new
                    {
                        s.SemesterId,
                        s.SemesterName,
                        s.AcademicYear,
                        s.SemesterNumber,
                        s.StartDate,
                        s.EndDate,
                        s.IsRegistrationOpen,
                        TotalClasses = _context.Classes.Count(c => c.SemesterId == s.SemesterId),
                        TotalStudents = _context.CourseRegistrations
                            .Where(r => r.Class.SemesterId == s.SemesterId)
                            .Select(r => r.StudentId)
                            .Distinct()
                            .Count()
                    })
                    .FirstOrDefaultAsync();

                if (semester == null)
                    return NotFound(new { message = "Không tìm thấy học kỳ" });

                return Ok(semester);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/SemesterManagement/semesters
        [HttpPost("semesters")]
        public async Task<IActionResult> CreateSemester([FromBody] CreateSemesterDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Kiểm tra trùng mã
                if (await _context.Semesters.AnyAsync(s => s.SemesterId == dto.SemesterId))
                    return BadRequest(new { message = "Mã học kỳ đã tồn tại" });

                // Kiểm tra ngày hợp lệ
                if (dto.StartDate >= dto.EndDate)
                    return BadRequest(new { message = "Ngày bắt đầu phải nhỏ hơn ngày kết thúc" });

                var semester = new Semester
                {
                    SemesterId = dto.SemesterId,
                    SemesterName = dto.SemesterName,
                    AcademicYear = dto.AcademicYear,
                    SemesterNumber = dto.SemesterNumber,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    IsRegistrationOpen = dto.IsRegistrationOpen ?? false
                };

                _context.Semesters.Add(semester);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Thêm học kỳ thành công",
                    semesterId = semester.SemesterId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/SemesterManagement/semesters/{id}
        [HttpPut("semesters/{id}")]
        public async Task<IActionResult> UpdateSemester(string id, [FromBody] UpdateSemesterDto dto)
        {
            try
            {
                var semester = await _context.Semesters.FindAsync(id);
                if (semester == null)
                    return NotFound(new { message = "Không tìm thấy học kỳ" });

                semester.SemesterName = dto.SemesterName ?? semester.SemesterName;
                semester.StartDate = dto.StartDate ?? semester.StartDate;
                semester.EndDate = dto.EndDate ?? semester.EndDate;
                semester.IsRegistrationOpen = dto.IsRegistrationOpen ?? semester.IsRegistrationOpen;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật học kỳ thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/SemesterManagement/semesters/{id}
        [HttpDelete("semesters/{id}")]
        public async Task<IActionResult> DeleteSemester(string id)
        {
            try
            {
                var semester = await _context.Semesters
                    .Include(s => s.Classes)
                    .FirstOrDefaultAsync(s => s.SemesterId == id);

                if (semester == null)
                    return NotFound(new { message = "Không tìm thấy học kỳ" });

                if (semester.Classes.Any())
                    return BadRequest(new { message = "Không thể xóa học kỳ đã có lớp học phần" });

                _context.Semesters.Remove(semester);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa học kỳ thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/SemesterManagement/toggle-registration/{id}
        [HttpPut("toggle-registration/{id}")]
        public async Task<IActionResult> ToggleRegistration(string id, [FromBody] ToggleRegistrationDto dto)
        {
            try
            {
                var semester = await _context.Semesters.FindAsync(id);
                if (semester == null)
                    return NotFound(new { message = "Không tìm thấy học kỳ" });

                // Cập nhật trạng thái đăng ký
                semester.IsRegistrationOpen = dto.IsOpen;

                // Cập nhật SystemConfig nếu cần
                if (dto.IsOpen == true)
                {
                    var currentSemester = await _context.SystemConfigs
                        .FirstOrDefaultAsync(c => c.ConfigKey == "CurrentSemester");

                    if (currentSemester == null)
                    {
                        _context.SystemConfigs.Add(new SystemConfig
                        {
                            ConfigKey = "CurrentSemester",
                            ConfigValue = semester.SemesterId,
                            Description = "Học kỳ hiện tại đang mở đăng ký"
                        });
                    }
                    else
                    {
                        currentSemester.ConfigValue = semester.SemesterId;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = dto.IsOpen == true ? "Đã mở đăng ký cho học kỳ" : "Đã đóng đăng ký",
                    isOpen = semester.IsRegistrationOpen
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/SemesterManagement/current
        [HttpGet("current")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCurrentSemester()
        {
            try
            {
                var currentSemesterId = await _context.SystemConfigs
                    .Where(c => c.ConfigKey == "CurrentSemester")
                    .Select(c => c.ConfigValue)
                    .FirstOrDefaultAsync();

                if (string.IsNullOrEmpty(currentSemesterId))
                {
                    var latestSemester = await _context.Semesters
                        .OrderByDescending(s => s.AcademicYear)
                        .ThenByDescending(s => s.SemesterNumber)
                        .FirstOrDefaultAsync();

                    return Ok(latestSemester);
                }

                var semester = await _context.Semesters
                    .FirstOrDefaultAsync(s => s.SemesterId == currentSemesterId);

                return Ok(semester);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/SemesterManagement/registration-stats/{semesterId}
        [HttpGet("registration-stats/{semesterId}")]
        public async Task<IActionResult> GetRegistrationStats(string semesterId)
        {
            try
            {
                var stats = new
                {
                    TotalStudents = await _context.CourseRegistrations
                        .Where(r => r.Class.SemesterId == semesterId)
                        .Select(r => r.StudentId)
                        .Distinct()
                        .CountAsync(),
                    TotalRegistrations = await _context.CourseRegistrations
                        .CountAsync(r => r.Class.SemesterId == semesterId),
                    PendingRegistrations = await _context.CourseRegistrations
                        .CountAsync(r => r.Class.SemesterId == semesterId && r.Status == "PENDING"),
                    ApprovedRegistrations = await _context.CourseRegistrations
                        .CountAsync(r => r.Class.SemesterId == semesterId && r.Status == "APPROVED"),
                    RejectedRegistrations = await _context.CourseRegistrations
                        .CountAsync(r => r.Class.SemesterId == semesterId && r.Status == "REJECTED"),
                    TotalClasses = await _context.Classes
                        .CountAsync(c => c.SemesterId == semesterId),
                    TotalCreditsRegistered = await _context.CourseRegistrations
                        .Where(r => r.Class.SemesterId == semesterId && r.Status == "APPROVED")
                        .SumAsync(r => (int?)r.Class.Subject.Credits) ?? 0
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class CreateSemesterDto
    {
        public string SemesterId { get; set; } = null!;
        public string SemesterName { get; set; } = null!;
        public int AcademicYear { get; set; }
        public int SemesterNumber { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public bool? IsRegistrationOpen { get; set; }
    }

    public class UpdateSemesterDto
    {
        public string? SemesterName { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public bool? IsRegistrationOpen { get; set; }
    }

    public class ToggleRegistrationDto
    {
        public bool IsOpen { get; set; }
    }
}