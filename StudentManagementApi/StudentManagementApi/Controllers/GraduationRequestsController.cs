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
            .Include(r => r.Semester)
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
            return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });

        // ========== KIỂM TRA HỌC KỲ HỢP LỆ ==========
        var semester = await _context.Semesters.FindAsync(dto.SemesterId);
        if (semester == null)
            return BadRequest(new { message = "Học kỳ không tồn tại" });

        // 1. Kiểm tra học kỳ có đang mở đăng ký xét tốt nghiệp không
        if (!semester.IsRegistrationOpen.GetValueOrDefault(false))
        {
            return BadRequest(new
            {
                message = $"Học kỳ {semester.SemesterName} chưa mở đăng ký xét tốt nghiệp",
                semesterId = semester.SemesterId
            });
        }

        // 2. Kiểm tra học kỳ đã kết thúc chưa (không cho xét học kỳ quá khứ)
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (semester.EndDate < today)
        {
            return BadRequest(new
            {
                message = $"Không thể đăng ký xét tốt nghiệp cho học kỳ đã kết thúc ({semester.SemesterName})",
                semesterEndDate = semester.EndDate.ToString("dd/MM/yyyy")
            });
        }

        // 3. Kiểm tra học kỳ quá xa trong tương lai (tùy chọn, khuyến nghị)
        if (semester.StartDate > today.AddMonths(6))
        {
            return BadRequest(new
            {
                message = $"Học kỳ {semester.SemesterName} còn quá xa, vui lòng chọn học kỳ gần hơn"
            });
        }

        // ========== KIỂM TRA ĐÃ CÓ YÊU CẦU ĐANG CHỜ DUYỆT ==========
        var existing = await _context.GraduationRequests
            .AnyAsync(r => r.StudentId == studentId && r.Status == "PENDING");

        if (existing)
            return BadRequest(new { message = "Bạn đã có yêu cầu xét tốt nghiệp đang chờ duyệt" });

        // ========== TÍNH TOÁN DỮ LIỆU HỌC TẬP ==========

        // Tính tổng tín chỉ tích lũy (các môn đạt >= 5.0 và đã được duyệt)
        var totalCredits = await _context.Grades
            .Where(g => g.StudentId == studentId
                     && g.TotalScore >= 5.0m
                     && g.IsApproved == true)
            .SumAsync(g => g.Class.Subject.Credits);

        // Tính GPA tích lũy (lấy bản ghi GPA mới nhất)
        var latestGpa = await _context.Gpas
            .Where(g => g.StudentId == studentId)
            .OrderByDescending(g => g.Semester.AcademicYear)
            .ThenByDescending(g => g.Semester.SemesterNumber)
            .Select(g => g.CumulativeGpa)
            .FirstOrDefaultAsync();

        decimal cumulativeGpa = latestGpa > 0 ? latestGpa : 0;

        // Tính công nợ học phí
        var tuitionDebt = await _context.Tuitions
            .Where(t => t.StudentId == studentId && t.Status != "PAID")
            .SumAsync(t => t.Amount - t.AmountPaid);

        // Kiểm tra hoàn thành môn bắt buộc
        var mandatoryCompleted = await CheckMandatorySubjectsCompleted(studentId);

        // ========== KIỂM TRA ĐIỀU KIỆN ĐẦU VÀO ==========
        var issues = new List<string>();

        // Lấy thông tin chương trình đào tạo
        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.StudentId == studentId);

        var curriculum = await _context.Set<Curriculum>()
            .Where(c => c.Major == student.Major && c.CohortYear <= student.AdmissionYear)
            .OrderByDescending(c => c.CohortYear)
            .FirstOrDefaultAsync();

        var requiredCredits = curriculum?.TotalCredits ?? 120;

        if (totalCredits < requiredCredits)
            issues.Add($"Chưa đủ tín chỉ (Đã tích lũy: {totalCredits}/{requiredCredits})");

        if (cumulativeGpa < 2.0m)
            issues.Add($"GPA tích lũy chưa đạt yêu cầu (GPA: {cumulativeGpa:F2}, yêu cầu: ≥ 2.0)");

        if (tuitionDebt > 0)
            issues.Add($"Còn công nợ học phí ({tuitionDebt:N0} VNĐ)");

        if (!mandatoryCompleted)
            issues.Add("Chưa hoàn thành các môn bắt buộc");

        if (issues.Any())
        {
            return BadRequest(new
            {
                message = "Bạn chưa đủ điều kiện tốt nghiệp",
                issues = issues,
                totalCreditsEarned = totalCredits,
                requiredCredits = requiredCredits,
                cumulativeGpa = cumulativeGpa,
                tuitionDebt = tuitionDebt,
                mandatoryCompleted = mandatoryCompleted
            });
        }

        // ========== TẠO YÊU CẦU ==========
        var request = new GraduationRequest
        {
            StudentId = studentId,
            SemesterId = dto.SemesterId,
            SubmittedAt = DateTime.UtcNow,
            TotalCreditsEarned = totalCredits,
            CumulativeGpa = cumulativeGpa,
            TuitionDebt = tuitionDebt,
            MandatoryDone = mandatoryCompleted,
            Status = "PENDING"
        };

        _context.GraduationRequests.Add(request);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã gửi yêu cầu xét tốt nghiệp thành công",
            requestId = request.RequestId,
            status = request.Status,
            semesterName = semester.SemesterName
        });
    }

    [HttpPut("{id}/review")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ReviewGraduationRequest(int id, [FromBody] ReviewDto dto)
    {
        try
        {
            var request = await _context.GraduationRequests
                .FirstOrDefaultAsync(r => r.RequestId == id);

            if (request == null)
                return NotFound(new { message = "Không tìm thấy yêu cầu" });

            if (request.Status != "PENDING")
                return BadRequest(new { message = "Yêu cầu này đã được xử lý" });

            // Lấy thông tin admin
            var adminAccountId = User.FindFirst("accountId")?.Value
                              ?? User.FindFirst("sub")?.Value
                              ?? User.Identity?.Name
                              ?? "ADMIN";

            var reviewedBy = string.IsNullOrWhiteSpace(adminAccountId)
                ? "ADMIN"
                : adminAccountId.Trim().Length > 20
                    ? adminAccountId.Trim().Substring(0, 20)
                    : adminAccountId.Trim();

            // Cập nhật
            request.Status = dto.Approved ? "APPROVED" : "REJECTED";
            request.ReviewedBy = reviewedBy;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewNote = string.IsNullOrWhiteSpace(dto.ReviewNote)
                ? null
                : dto.ReviewNote.Trim();

            // Log trước khi save
            Console.WriteLine($"Reviewing request {id} | Status: {request.Status} | ReviewedBy: '{request.ReviewedBy}' | Note: {request.ReviewNote}");

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = dto.Approved ? "Đã duyệt thành công" : "Đã từ chối thành công" });
        }
        catch (DbUpdateException dbEx)
        {
            var inner = dbEx.InnerException?.Message ?? dbEx.Message;
            Console.WriteLine($"[DbUpdateException] RequestId={id} | Error: {inner}");

            return StatusCode(500, new
            {
                message = "Lỗi khi lưu vào database",
                details = inner,
                requestId = id
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Exception] {ex}");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // DELETE: api/GraduationRequests/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteGraduationRequest(int id)
    {
        var request = await _context.GraduationRequests.FindAsync(id);
        if (request == null)
            return NotFound(new { message = "Không tìm thấy yêu cầu" });

        if (request.Status == "APPROVED")
            return BadRequest(new { message = "Không thể xóa yêu cầu đã được duyệt" });

        _context.GraduationRequests.Remove(request);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa yêu cầu thành công" });
    }

    // GET: api/GraduationRequests/check-eligibility
    [HttpGet("check-eligibility")]
    [Authorize(Roles = "STUDENT")]
    public async Task<IActionResult> CheckEligibility()
    {
        var studentId = User.FindFirst("studentId")?.Value;
        if (string.IsNullOrEmpty(studentId))
            return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });

        var student = await _context.Students
            .FirstOrDefaultAsync(s => s.StudentId == studentId);

        if (student == null)
            return NotFound(new { message = "Không tìm thấy sinh viên" });

        // Lấy chương trình đào tạo
        var curriculum = await _context.Set<Curriculum>()
            .Where(c => c.Major == student.Major && c.CohortYear <= student.AdmissionYear)
            .OrderByDescending(c => c.CohortYear)
            .FirstOrDefaultAsync();

        var requiredCredits = curriculum?.TotalCredits ?? 120;

        // Tính tổng tín chỉ
        var totalCredits = await _context.Grades
            .Where(g => g.StudentId == studentId
                     && g.TotalScore >= 5.0m
                     && g.IsApproved == true)
            .SumAsync(g => g.Class.Subject.Credits);

        // Tính GPA
        var latestGpa = await _context.Gpas
            .Where(g => g.StudentId == studentId)
            .OrderByDescending(g => g.Semester.AcademicYear)
            .ThenByDescending(g => g.Semester.SemesterNumber)
            .Select(g => g.CumulativeGpa)
            .FirstOrDefaultAsync();

        decimal cumulativeGpa = latestGpa > 0 ? latestGpa : 0;

        // Tính công nợ
        var tuitionDebt = await _context.Tuitions
            .Where(t => t.StudentId == studentId && t.Status != "PAID")
            .SumAsync(t => t.Amount - t.AmountPaid);

        // Kiểm tra môn bắt buộc
        var mandatoryCompleted = await CheckMandatorySubjectsCompleted(studentId);

        // Số tín chỉ còn thiếu
        var missingCredits = requiredCredits - totalCredits;

        // Tạo danh sách lỗi
        var issues = new List<string>();

        if (missingCredits > 0)
            issues.Add($"Còn thiếu {missingCredits} tín chỉ (Yêu cầu: {requiredCredits} TC)");

        if (cumulativeGpa < 2.0m)
            issues.Add($"GPA tích lũy chưa đạt yêu cầu (GPA hiện tại: {cumulativeGpa:F2}, yêu cầu: ≥ 2.0)");

        if (tuitionDebt > 0)
            issues.Add($"Còn công nợ học phí ({tuitionDebt:N0} VNĐ)");

        if (!mandatoryCompleted)
            issues.Add("Chưa hoàn thành các môn bắt buộc");

        // Trả về response ĐƠN GIẢN - không tính toán học kỳ
        return Ok(new
        {
            isEligible = issues.Count == 0,
            totalCreditsEarned = totalCredits,
            requiredCredits = requiredCredits,
            cumulativeGpa = cumulativeGpa,
            requiredGpa = 2.0,
            tuitionDebt = tuitionDebt,
            mandatoryCompleted = mandatoryCompleted,
            issues = issues,
            missingCredits = missingCredits > 0 ? missingCredits : 0
        });
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