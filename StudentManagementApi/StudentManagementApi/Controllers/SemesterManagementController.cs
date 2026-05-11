using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;
using System.ComponentModel.DataAnnotations;

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
                        s.IsRegistrationOpen
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

                // Kiểm tra mã học kỳ đã tồn tại
                if (await _context.Semesters.AnyAsync(s => s.SemesterId == dto.SemesterId))
                    return BadRequest(new { message = "Mã học kỳ đã tồn tại" });

                // Kiểm tra ngày hợp lệ
                if (dto.StartDate >= dto.EndDate)
                    return BadRequest(new { message = "Ngày bắt đầu phải nhỏ hơn ngày kết thúc" });

                // Tạo entity Semester - KHÔNG set Room và RoomId
                var semester = new Semester
                {
                    SemesterId = dto.SemesterId,
                    SemesterName = dto.SemesterName,
                    AcademicYear = dto.AcademicYear,
                    SemesterNumber = dto.SemesterNumber,
                    StartDate = DateOnly.FromDateTime(dto.StartDate),
                    EndDate = DateOnly.FromDateTime(dto.EndDate),
                    IsRegistrationOpen = dto.IsRegistrationOpen ?? false,
                    // KHÔNG set Room và RoomId - để NULL
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
                // Log chi tiết lỗi
                Console.WriteLine($"Error in CreateSemester: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new
                {
                    message = ex.Message,
                    innerError = ex.InnerException?.Message
                });
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

                if (!string.IsNullOrEmpty(dto.SemesterName))
                    semester.SemesterName = dto.SemesterName;

                if (dto.StartDate.HasValue)
                    semester.StartDate = DateOnly.FromDateTime(dto.StartDate.Value);

                if (dto.EndDate.HasValue)
                    semester.EndDate = DateOnly.FromDateTime(dto.EndDate.Value);

                if (dto.IsRegistrationOpen.HasValue)
                    semester.IsRegistrationOpen = dto.IsRegistrationOpen.Value;

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
                // Chỉ select các cột cần thiết
                var semester = await _context.Semesters
                    .Where(s => s.SemesterId == id)
                    .Select(s => new { s.SemesterId, s.IsRegistrationOpen })
                    .FirstOrDefaultAsync();

                if (semester == null)
                    return NotFound(new { message = "Không tìm thấy học kỳ" });

                // Cập nhật trực tiếp không qua tracking
                var semesterToUpdate = new Semester { SemesterId = id, IsRegistrationOpen = dto.IsOpen };
                _context.Semesters.Attach(semesterToUpdate);
                _context.Entry(semesterToUpdate).Property(x => x.IsRegistrationOpen).IsModified = true;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = dto.IsOpen ? "Đã mở đăng ký cho học kỳ" : "Đã đóng đăng ký",
                    isOpen = dto.IsOpen
                });
            }
            catch (Exception ex)
            {
                // Log chi tiết lỗi
                Console.WriteLine($"Error in ToggleRegistration: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");

                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new
                {
                    message = ex.Message,
                    innerError = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
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

        // GET: api/SemesterManagement/check-low-enrollment/{semesterId}
        [HttpGet("check-low-enrollment/{semesterId}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetLowEnrollmentClasses(string semesterId)
        {
            try
            {
                var classes = await _context.Classes
                    .Include(c => c.Subject)
                    .Where(c => c.SemesterId == semesterId
                        && c.Status == "OPEN"
                        && c.CurrentStudents.HasValue
                        && c.MaxStudents > 0)
                    .Select(c => new
                    {
                        c.ClassId,
                        c.ClassCode,
                        SubjectName = c.Subject.SubjectName,
                        c.CurrentStudents,
                        c.MaxStudents,
                        Percentage = (c.CurrentStudents ?? 0) * 100.0 / c.MaxStudents
                    })
                    .Where(c => c.Percentage < 10) // Sĩ số dưới 10%
                    .ToListAsync();

                return Ok(classes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/SemesterManagement/cancel-low-enrollment/{semesterId}
        [HttpPost("cancel-low-enrollment/{semesterId}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CancelLowEnrollmentClasses(string semesterId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Lấy danh sách lớp cần hủy
                var classesToCancel = await _context.Classes
                    .Include(c => c.CourseRegistrations)
                    .Where(c => c.SemesterId == semesterId
                        && c.Status == "OPEN"
                        && c.CurrentStudents.HasValue
                        && c.MaxStudents > 0
                        && (c.CurrentStudents.Value * 100.0 / c.MaxStudents) < 10)
                    .ToListAsync();

                if (!classesToCancel.Any())
                {
                    return Ok(new { message = "Không có lớp nào cần hủy", cancelledCount = 0 });
                }

                int cancelledCount = 0;
                int affectedRegistrations = 0;

                foreach (var cls in classesToCancel)
                {
                    // Đếm số lượng đăng ký bị ảnh hưởng
                    affectedRegistrations += cls.CourseRegistrations.Count;

                    // Hủy tất cả đăng ký của lớp này
                    foreach (var registration in cls.CourseRegistrations)
                    {
                        registration.Status = "REJECTED";
                    }

                    // Cập nhật trạng thái lớp thành CANCELLED
                    cls.Status = "CANCELLED";
                    cancelledCount++;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = $"Đã hủy {cancelledCount} lớp có sĩ số thấp",
                    cancelledCount,
                    affectedRegistrations
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    // DTOs
    public class CreateSemesterDto
    {
        [Required(ErrorMessage = "Mã học kỳ không được để trống")]
        [RegularExpression(@"^HK\d{4}_[1-3]$", ErrorMessage = "Mã học kỳ không đúng định dạng (VD: HK2024_1)")]
        public string SemesterId { get; set; } = null!;

        [Required(ErrorMessage = "Tên học kỳ không được để trống")]
        public string SemesterName { get; set; } = null!;

        [Required(ErrorMessage = "Năm học không được để trống")]
        [Range(2000, 2030, ErrorMessage = "Năm học từ 2000-2030")]
        public int AcademicYear { get; set; }

        [Required(ErrorMessage = "Số học kỳ không được để trống")]
        [Range(1, 3, ErrorMessage = "Học kỳ phải từ 1-3")]
        public int SemesterNumber { get; set; }

        [Required(ErrorMessage = "Ngày bắt đầu không được để trống")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "Ngày kết thúc không được để trống")]
        public DateTime EndDate { get; set; }

        public bool? IsRegistrationOpen { get; set; }
    }

    public class UpdateSemesterDto
    {
        public string? SemesterName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public bool? IsRegistrationOpen { get; set; }
    }

    public class ToggleRegistrationDto
    {
        public bool IsOpen { get; set; }
    }
}