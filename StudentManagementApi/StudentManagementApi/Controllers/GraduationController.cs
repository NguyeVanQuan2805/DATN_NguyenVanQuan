using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GraduationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GraduationController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Graduation/requests
        [HttpGet("requests")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetAllGraduationRequests(
            [FromQuery] string? status = null,
            [FromQuery] string? studentId = null,
            [FromQuery] string? semesterId = null)
        {
            try
            {
                var query = _context.GraduationRequests
                    .Include(r => r.Student)
                        .ThenInclude(s => s.Account)
                    .Include(r => r.Semester)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(r => r.Status == status);

                if (!string.IsNullOrEmpty(studentId))
                    query = query.Where(r => r.StudentId == studentId);

                if (!string.IsNullOrEmpty(semesterId))
                    query = query.Where(r => r.SemesterId == semesterId);

                var requests = await query
                    .OrderByDescending(r => r.SubmittedAt)
                    .Select(r => new
                    {
                        r.RequestId,
                        r.StudentId,
                        StudentCode = r.Student != null ? r.Student.StudentCode : "",
                        StudentName = r.Student != null && r.Student.Account != null
                            ? r.Student.Account.FullName
                            : "N/A",
                        r.SemesterId,
                        SemesterName = r.Semester != null ? r.Semester.SemesterName : "N/A",
                        r.SubmittedAt,
                        r.TotalCreditsEarned,
                        r.CumulativeGpa,
                        r.TuitionDebt,
                        r.MandatoryDone,
                        r.Status,
                        r.ReviewedBy,
                        r.ReviewedAt,
                        r.ReviewNote
                    })
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Graduation/requests/{id}
        [HttpGet("requests/{id}")]
        [Authorize(Roles = "ADMIN,STUDENT")]
        public async Task<IActionResult> GetGraduationRequest(int id)
        {
            try
            {
                var request = await _context.GraduationRequests
                    .Include(r => r.Student)
                        .ThenInclude(s => s.Account)
                    .Include(r => r.Semester)
                    .Where(r => r.RequestId == id)
                    .Select(r => new
                    {
                        r.RequestId,
                        r.StudentId,
                        StudentCode = r.Student != null ? r.Student.StudentCode : "",
                        StudentName = r.Student != null && r.Student.Account != null
                            ? r.Student.Account.FullName
                            : "N/A",
                        StudentEmail = r.Student != null && r.Student.Account != null
                            ? r.Student.Account.Email
                            : "",
                        StudentPhone = r.Student != null && r.Student.Account != null
                            ? r.Student.Account.Phone
                            : "",
                        r.SemesterId,
                        SemesterName = r.Semester != null ? r.Semester.SemesterName : "N/A",
                        r.SubmittedAt,
                        r.TotalCreditsEarned,
                        r.CumulativeGpa,
                        r.TuitionDebt,
                        r.MandatoryDone,
                        r.Status,
                        r.ReviewedBy,
                        r.ReviewedAt,
                        r.ReviewNote
                    })
                    .FirstOrDefaultAsync();

                if (request == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu tốt nghiệp" });

                // Kiểm tra quyền
                var currentUserId = User.FindFirst("accountId")?.Value;
                var isAdmin = User.IsInRole("ADMIN");
                var isStudent = User.IsInRole("STUDENT");
                var studentId = User.FindFirst("studentId")?.Value;

                if (isStudent && request.StudentId != studentId)
                    return Forbid("Bạn chỉ được xem yêu cầu của chính mình");

                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Graduation/my-requests
        [HttpGet("my-requests")]
        [Authorize(Roles = "STUDENT")]
        public async Task<IActionResult> GetMyGraduationRequests()
        {
            try
            {
                var studentId = User.FindFirst("studentId")?.Value;
                if (string.IsNullOrEmpty(studentId))
                    return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });

                var requests = await _context.GraduationRequests
                    .Where(r => r.StudentId == studentId)
                    .Include(r => r.Semester)
                    .OrderByDescending(r => r.SubmittedAt)
                    .Select(r => new
                    {
                        r.RequestId,
                        r.SemesterId,
                        SemesterName = r.Semester != null ? r.Semester.SemesterName : "N/A",
                        r.SubmittedAt,
                        r.TotalCreditsEarned,
                        r.CumulativeGpa,
                        r.TuitionDebt,
                        r.MandatoryDone,
                        r.Status,
                        r.ReviewedBy,
                        r.ReviewedAt,
                        r.ReviewNote
                    })
                    .ToListAsync();

                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/Graduation/requests
        [HttpPost("requests")]
        [Authorize(Roles = "STUDENT")]
        public async Task<IActionResult> CreateGraduationRequest([FromBody] CreateGraduationRequestDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var studentId = User.FindFirst("studentId")?.Value;
                if (string.IsNullOrEmpty(studentId))
                    return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });

                // Kiểm tra sinh viên tồn tại
                var student = await _context.Students
                    .Include(s => s.Account)
                    .FirstOrDefaultAsync(s => s.StudentId == studentId);

                if (student == null)
                    return NotFound(new { message = "Không tìm thấy thông tin sinh viên" });

                // Kiểm tra đã có yêu cầu đang chờ duyệt
                var existingRequest = await _context.GraduationRequests
                    .AnyAsync(r => r.StudentId == studentId && r.Status == "PENDING");

                if (existingRequest)
                    return BadRequest(new { message = "Bạn đã có yêu cầu xét tốt nghiệp đang chờ duyệt" });

                // Kiểm tra học kỳ tồn tại
                var semester = await _context.Semesters
                    .FirstOrDefaultAsync(s => s.SemesterId == dto.SemesterId);

                if (semester == null)
                    return BadRequest(new { message = "Học kỳ không tồn tại" });

                // Tính toán tổng tín chỉ đã tích lũy
                var totalCredits = await _context.Grades
                    .Where(g => g.StudentId == studentId
                        && g.TotalScore >= 5.0m
                        && g.IsApproved == true)
                    .SumAsync(g => g.Class.Subject.Credits);

                // Tính GPA tích lũy
                var gpa = await _context.Gpas
                    .Where(g => g.StudentId == studentId)
                    .OrderByDescending(g => g.Semester.AcademicYear)
                    .ThenByDescending(g => g.Semester.SemesterNumber)
                    .Select(g => g.CumulativeGpa)
                    .FirstOrDefaultAsync();

                // Kiểm tra công nợ học phí
                var tuitionDebt = await _context.Tuitions
                    .Where(t => t.StudentId == studentId && t.Status != "PAID")
                    .SumAsync(t => t.Amount - t.AmountPaid);

                // Kiểm tra hoàn thành môn bắt buộc
                var mandatoryCompleted = await CheckMandatorySubjectsCompleted(studentId);

                // Kiểm tra điều kiện tốt nghiệp
                var requirements = await CheckGraduationRequirements(studentId);
                if (!requirements.IsEligible)
                {
                    return BadRequest(new
                    {
                        message = "Bạn chưa đủ điều kiện tốt nghiệp",
                        requirements
                    });
                }

                var request = new GraduationRequest
                {
                    StudentId = studentId,
                    SemesterId = dto.SemesterId,
                    SubmittedAt = DateTime.UtcNow,
                    TotalCreditsEarned = totalCredits,
                    CumulativeGpa = gpa > 0 ? gpa : 0,
                    TuitionDebt = tuitionDebt,
                    MandatoryDone = mandatoryCompleted,
                    Status = "PENDING"
                };

                _context.GraduationRequests.Add(request);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Đã gửi yêu cầu xét tốt nghiệp thành công",
                    requestId = request.RequestId,
                    status = request.Status
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/Graduation/requests/{id}/review
        [HttpPut("requests/{id}/review")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> ReviewGraduationRequest(int id, [FromBody] ReviewGraduationDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var request = await _context.GraduationRequests
                    .Include(r => r.Student)
                    .FirstOrDefaultAsync(r => r.RequestId == id);

                if (request == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu" });

                if (request.Status != "PENDING")
                    return BadRequest(new { message = "Yêu cầu này đã được xử lý" });

                request.Status = dto.Approved ? "APPROVED" : "REJECTED";
                request.ReviewedBy = User.FindFirst("accountId")?.Value;
                request.ReviewedAt = DateTime.UtcNow;
                request.ReviewNote = dto.ReviewNote;

                // Nếu được duyệt, cập nhật trạng thái sinh viên
                if (dto.Approved && request.Student != null)
                {
                    // Có thể thêm trường Graduated vào bảng Student nếu cần
                    // request.Student.Status = "GRADUATED";
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = dto.Approved ? "Đã duyệt yêu cầu tốt nghiệp" : "Đã từ chối yêu cầu tốt nghiệp",
                    requestId = request.RequestId,
                    status = request.Status
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Graduation/check-eligibility
        [HttpGet("check-eligibility")]
        [Authorize(Roles = "STUDENT")]
        public async Task<IActionResult> CheckGraduationEligibility()
        {
            try
            {
                var studentId = User.FindFirst("studentId")?.Value;
                if (string.IsNullOrEmpty(studentId))
                    return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });

                var requirements = await CheckGraduationRequirements(studentId);
                return Ok(requirements);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Graduation/statistics
        [HttpGet("statistics")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetGraduationStatistics()
        {
            try
            {
                var stats = new
                {
                    TotalRequests = await _context.GraduationRequests.CountAsync(),
                    PendingRequests = await _context.GraduationRequests.CountAsync(r => r.Status == "PENDING"),
                    ApprovedRequests = await _context.GraduationRequests.CountAsync(r => r.Status == "APPROVED"),
                    RejectedRequests = await _context.GraduationRequests.CountAsync(r => r.Status == "REJECTED"),
                    BySemester = await _context.GraduationRequests
                        .GroupBy(r => r.SemesterId)
                        .Select(g => new
                        {
                            SemesterId = g.Key,
                            Total = g.Count(),
                            Approved = g.Count(r => r.Status == "APPROVED")
                        })
                        .ToListAsync(),
                    AverageGpa = await _context.GraduationRequests
                        .Where(r => r.Status == "APPROVED")
                        .AverageAsync(r => (double?)r.CumulativeGpa) ?? 0
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // Helper methods
        private async Task<bool> CheckMandatorySubjectsCompleted(string studentId)
        {
            var mandatorySubjects = await _context.CurriculumSubjects
                .Where(cs => cs.IsRequired)
                .Select(cs => cs.SubjectId)
                .ToListAsync();

            if (!mandatorySubjects.Any())
                return true;

            var completedCount = await _context.Grades
                .Where(g => g.StudentId == studentId
                         && mandatorySubjects.Contains(g.Class.SubjectId)
                         && g.TotalScore >= 5.0m
                         && g.IsApproved == true)
                .Select(g => g.Class.SubjectId)
                .Distinct()
                .CountAsync();

            return completedCount == mandatorySubjects.Count;
        }

        private async Task<GraduationRequirementDto> CheckGraduationRequirements(string studentId)
        {
            // Lấy thông tin chương trình đào tạo của sinh viên
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            var curriculum = await _context.Set<Curriculum>()
                .Where(c => c.Major == student.Major && c.CohortYear <= student.AdmissionYear)
                .OrderByDescending(c => c.CohortYear)
                .FirstOrDefaultAsync();

            // Tính tổng tín chỉ đã tích lũy
            var totalCreditsEarned = await _context.Grades
                .Where(g => g.StudentId == studentId
                    && g.TotalScore >= 5.0m
                    && g.IsApproved == true)
                .SumAsync(g => g.Class.Subject.Credits);

            // Tính GPA tích lũy
            var cumulativeGpa = await _context.Gpas
                .Where(g => g.StudentId == studentId)
                .OrderByDescending(g => g.Semester.AcademicYear)
                .ThenByDescending(g => g.Semester.SemesterNumber)
                .Select(g => g.CumulativeGpa)
                .FirstOrDefaultAsync();

            // Kiểm tra công nợ
            var tuitionDebt = await _context.Tuitions
                .Where(t => t.StudentId == studentId && t.Status != "PAID")
                .SumAsync(t => t.Amount - t.AmountPaid);

            // Kiểm tra hoàn thành môn bắt buộc
            var mandatoryCompleted = await CheckMandatorySubjectsCompleted(studentId);

            // Kiểm tra điều kiện
            var requiredCredits = curriculum?.TotalCredits ?? 120;
            var isEligible = totalCreditsEarned >= requiredCredits
                && cumulativeGpa >= 2.0m
                && tuitionDebt == 0
                && mandatoryCompleted;

            var issues = new List<string>();
            if (totalCreditsEarned < requiredCredits)
                issues.Add($"Chưa đủ tín chỉ (Đã tích lũy: {totalCreditsEarned}/{requiredCredits})");
            if (cumulativeGpa < 2.0m)
                issues.Add($"GPA tích lũy chưa đạt yêu cầu (GPA: {cumulativeGpa:F2})");
            if (tuitionDebt > 0)
                issues.Add($"Còn công nợ học phí ({tuitionDebt:N0} VNĐ)");
            if (!mandatoryCompleted)
                issues.Add("Chưa hoàn thành các môn bắt buộc");

            return new GraduationRequirementDto
            {
                IsEligible = isEligible,
                TotalCreditsEarned = totalCreditsEarned,
                RequiredCredits = requiredCredits,
                CumulativeGpa = cumulativeGpa,
                RequiredGpa = 2.0,
                TuitionDebt = tuitionDebt,
                MandatoryCompleted = mandatoryCompleted,
                Issues = issues
            };
        }
    }

    public class CreateGraduationRequestDto
    {
        public string SemesterId { get; set; } = null!;
    }

    public class ReviewGraduationDto
    {
        public bool Approved { get; set; }
        public string? ReviewNote { get; set; }
    }


}
public class GraduationRequirementDto
{
    public bool IsEligible { get; set; }
    public int TotalCreditsEarned { get; set; }
    public int RequiredCredits { get; set; }
    public decimal CumulativeGpa { get; set; }
    public double RequiredGpa { get; set; }
    public decimal TuitionDebt { get; set; }
    public bool MandatoryCompleted { get; set; }
    public List<string> Issues { get; set; } = new();
}