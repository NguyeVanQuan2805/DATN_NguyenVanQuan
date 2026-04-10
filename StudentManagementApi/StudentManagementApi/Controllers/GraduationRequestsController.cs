using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class GraduationRequestsController : ControllerBase
{
    private readonly AppDbContext _context;

    public GraduationRequestsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/GraduationRequests
    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetGraduationRequests(
        [FromQuery] string? status = null)
    {
        var query = _context.GraduationRequests
            .Include(r => r.Student)
                .ThenInclude(s => s.Account)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        var requests = await query
            .Select(r => new
            {
                r.RequestId,
                r.StudentId,
                StudentCode = r.Student != null ? r.Student.StudentCode : "",
                StudentName = r.Student != null && r.Student.Account != null
                    ? r.Student.Account.FullName
                    : "N/A",
                r.SemesterId,
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
            .OrderByDescending(r => r.SubmittedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // GET: api/GraduationRequests/my
    [HttpGet("my")]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyGraduationRequests()
    {
        var studentId = User.FindFirst("studentId")?.Value;
        if (string.IsNullOrEmpty(studentId))
            return Unauthorized();

        var requests = await _context.GraduationRequests
            .Where(r => r.StudentId == studentId)
            .Select(r => new
            {
                r.RequestId,
                r.SemesterId,
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
            .OrderByDescending(r => r.SubmittedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // GET: api/GraduationRequests/{id}
    [HttpGet("{id}")]
    [Authorize(Roles = "ADMIN,STUDENT")]
    public async Task<ActionResult<object>> GetGraduationRequest(int id)
    {
        var request = await _context.GraduationRequests
            .Include(r => r.Student)
                .ThenInclude(s => s.Account)
            .Where(r => r.RequestId == id)
            .Select(r => new
            {
                r.RequestId,
                r.StudentId,
                StudentCode = r.Student != null ? r.Student.StudentCode : "",
                StudentName = r.Student != null && r.Student.Account != null
                    ? r.Student.Account.FullName
                    : "N/A",
                r.SemesterId,
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
            return NotFound();

        // Kiểm tra quyền: Student chỉ xem được request của mình
        var studentId = User.FindFirst("studentId")?.Value;
        var isAdmin = User.IsInRole("ADMIN");

        if (!isAdmin && request.StudentId != studentId)
            return Forbid();

        return Ok(request);
    }

    // POST: api/GraduationRequests
    [HttpPost]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<object>> PostGraduationRequest([FromBody] GraduationRequestDto dto)
    {
        var studentId = User.FindFirst("studentId")?.Value;
        if (string.IsNullOrEmpty(studentId))
            return Unauthorized();

        // Kiểm tra đã có yêu cầu đang chờ duyệt chưa
        var existing = await _context.GraduationRequests
            .AnyAsync(r => r.StudentId == studentId && r.Status == "PENDING");

        if (existing)
            return BadRequest("Bạn đã có yêu cầu xét tốt nghiệp đang chờ duyệt");

        // Tính toán tổng tín chỉ và GPA
        var gpa = await _context.Gpas
            .Where(g => g.StudentId == studentId)
            .OrderByDescending(g => g.Semester.AcademicYear)
            .ThenByDescending(g => g.Semester.SemesterNumber)
            .Select(g => g.CumulativeGpa)
            .FirstOrDefaultAsync();

        // Sửa lỗi: decimal không thể dùng ?? với int, dùng ternary hoặc kiểm tra
        decimal cumulativeGpa = gpa > 0 ? gpa : 0;

        var totalCredits = await _context.Grades
            .Where(g => g.StudentId == studentId && g.TotalScore >= 5.0m && g.IsApproved == true)
            .SumAsync(g => g.Class.Subject.Credits);

        // Kiểm tra semester tồn tại
        var semester = await _context.Semesters.FindAsync(dto.SemesterId);
        if (semester == null)
            return BadRequest("Học kỳ không tồn tại");

        // Kiểm tra điều kiện tốt nghiệp
        var mandatoryCompleted = await CheckMandatorySubjectsCompleted(studentId);

        var request = new GraduationRequest
        {
            StudentId = studentId,
            SemesterId = dto.SemesterId,
            SubmittedAt = DateTime.UtcNow,
            TotalCreditsEarned = totalCredits,
            CumulativeGpa = cumulativeGpa,
            TuitionDebt = await CalculateTuitionDebt(studentId),
            MandatoryDone = mandatoryCompleted,
            Status = "PENDING"
        };

        _context.GraduationRequests.Add(request);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã gửi yêu cầu xét tốt nghiệp thành công",
            requestId = request.RequestId,
            status = request.Status
        });
    }

    // PUT: api/GraduationRequests/{id}/review
    [HttpPut("{id}/review")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ReviewGraduationRequest(int id, [FromBody] ReviewDto dto)
    {
        var request = await _context.GraduationRequests
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound();

        if (request.Status != "PENDING")
            return BadRequest("Yêu cầu này đã được xử lý");

        request.Status = dto.Approved ? "APPROVED" : "REJECTED";
        request.ReviewedBy = User.FindFirst("accountId")?.Value;
        request.ReviewedAt = DateTime.UtcNow;
        request.ReviewNote = dto.ReviewNote;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = dto.Approved ? "Đã duyệt yêu cầu tốt nghiệp" : "Đã từ chối yêu cầu tốt nghiệp",
            requestId = request.RequestId,
            status = request.Status
        });
    }

    // DELETE: api/GraduationRequests/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteGraduationRequest(int id)
    {
        var request = await _context.GraduationRequests.FindAsync(id);
        if (request == null)
            return NotFound();

        if (request.Status == "APPROVED")
            return BadRequest("Không thể xóa yêu cầu đã được duyệt");

        _context.GraduationRequests.Remove(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa yêu cầu thành công" });
    }

    private async Task<bool> CheckMandatorySubjectsCompleted(string studentId)
    {
        // Lấy danh sách môn bắt buộc từ CurriculumSubject
        var mandatorySubjects = await _context.CurriculumSubjects
            .Where(cs => cs.IsRequired)
            .Select(cs => cs.SubjectId)
            .ToListAsync();

        if (!mandatorySubjects.Any())
            return true;

        // Kiểm tra đã học và đạt chưa
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

    private async Task<decimal> CalculateTuitionDebt(string studentId)
    {
        var unpaidTuitions = await _context.Tuitions
            .Where(t => t.StudentId == studentId && t.Status != "PAID")
            .SumAsync(t => t.Amount - t.AmountPaid);

        return unpaidTuitions;
    }
}

// DTOs
public class GraduationRequestDto
{
    public string SemesterId { get; set; } = null!;
}

public class ReviewDto
{
    public bool Approved { get; set; }
    public string? ReviewNote { get; set; }
}