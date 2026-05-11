using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers;

[Route("api/[controller]")]
[ApiController]
public class GradesController : ControllerBase
{
    private readonly AppDbContext _context;

    public GradesController(AppDbContext context)
    {
        _context = context;
    }

    // ==================== HELPER ====================
    private decimal CalcTotal(decimal? process, decimal? midterm, decimal? final)
    {
        return ((process ?? 0) * 0.3m) + ((midterm ?? 0) * 0.3m) + ((final ?? 0) * 0.4m);
    }

    private string CalcLetter(decimal total)
    {
        return total >= 8.5m ? "A" :
               total >= 7.0m ? "B" :
               total >= 5.5m ? "C" :
               total >= 4.0m ? "D" : "F";
    }

    // ==================== 1. GIẢNG VIÊN LƯU ĐIỂM ====================
    [HttpPost("bulk")]
    [Authorize(Roles = "TEACHER")]
    public async Task<IActionResult> BulkSave([FromBody] BulkGradeDto dto)
    {
        var teacherId = User.FindFirst("teacherId")?.Value;

        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId && c.TeacherId == teacherId);

        if (cls == null)
            return Forbid("Bạn không dạy lớp này");

        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            foreach (var record in dto.Records)
            {
                var existing = await _context.Grades
                    .FirstOrDefaultAsync(g => g.StudentId == record.StudentId && g.ClassId == dto.ClassId);

                var total = CalcTotal(record.ProcessScore, record.MidtermScore, record.FinalScore);
                var letter = CalcLetter(total);

                if (existing != null)
                {
                    existing.ProcessScore = record.ProcessScore;
                    existing.MidtermScore = record.MidtermScore;
                    existing.FinalScore = record.FinalScore;
                    existing.TotalScore = total;
                    existing.LetterGrade = letter;
                    existing.Status = "SAVED";

                    _context.Grades.Update(existing);
                }
                else
                {
                    _context.Grades.Add(new Grade
                    {
                        StudentId = record.StudentId,
                        ClassId = dto.ClassId,
                        ProcessScore = record.ProcessScore,
                        MidtermScore = record.MidtermScore,
                        FinalScore = record.FinalScore,
                        TotalScore = total,
                        LetterGrade = letter,
                        Status = "SAVED"
                    });
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = $"Đã lưu điểm cho {dto.Records.Count} sinh viên" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Lỗi khi lưu điểm", error = ex.Message });
        }
    }

    // ==================== 2. GIẢNG VIÊN GỬI DUYỆT ====================
    [HttpPost("submit")]
    [Authorize(Roles = "TEACHER")]
    public async Task<IActionResult> SubmitForApproval([FromBody] SubmitGradeDto dto)
    {
        var teacherId = User.FindFirst("teacherId")?.Value;

        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId && c.TeacherId == teacherId);

        if (cls == null)
            return Forbid("Bạn không dạy lớp này");

        int submittedCount = 0;

        foreach (var studentId in dto.StudentIds)
        {
            var grade = await _context.Grades
                .FirstOrDefaultAsync(g => g.StudentId == studentId && g.ClassId == dto.ClassId);

            // Chỉ gửi những điểm đang ở trạng thái SAVED
            if (grade != null && grade.Status == "SAVED")
            {
                grade.Status = "SUBMITTED";
                submittedCount++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã gửi duyệt cho {submittedCount} sinh viên" });
    }

    // ==================== 3. ADMIN DUYỆT ĐIỂM ====================
    [HttpPost("approve")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ApproveGrades([FromBody] SubmitGradeDto dto)
    {
        int approvedCount = 0;

        foreach (var studentId in dto.StudentIds)
        {
            var grade = await _context.Grades
                .FirstOrDefaultAsync(g => g.StudentId == studentId && g.ClassId == dto.ClassId);

            // Chỉ duyệt những điểm đang ở trạng thái SUBMITTED
            if (grade != null && grade.Status == "SUBMITTED")
            {
                grade.Status = "APPROVED";
                approvedCount++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã duyệt điểm cho {approvedCount} sinh viên" });
    }

    // ==================== 4. ADMIN TỪ CHỐI DUYỆT ====================
    [HttpPost("reject")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> RejectGrades([FromBody] SubmitGradeDto dto)
    {
        int rejectedCount = 0;

        foreach (var studentId in dto.StudentIds)
        {
            var grade = await _context.Grades
                .FirstOrDefaultAsync(g => g.StudentId == studentId && g.ClassId == dto.ClassId);

            if (grade != null && grade.Status == "SUBMITTED")
            {
                grade.Status = "SAVED"; 
                rejectedCount++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Đã từ chối điểm cho {rejectedCount} sinh viên" });
    }

    // ==================== 5. LẤY ĐIỂM THEO LỚP ====================
    [HttpGet("class/{classId}")]
    [Authorize(Roles = "ADMIN,TEACHER")]
    public async Task<ActionResult<IEnumerable<object>>> GetGradesByClass(string classId)
    {
        var currentUserRole = User.FindFirst("role")?.Value;
        var teacherId = User.FindFirst("teacherId")?.Value;

        if (currentUserRole == "TEACHER")
        {
            var classEntity = await _context.Classes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClassId == classId && c.TeacherId == teacherId);

            if (classEntity == null)
                return Forbid("Bạn không dạy lớp này");
        }

        var grades = await _context.Grades
            .Where(g => g.ClassId == classId)
            .Include(g => g.Student)
                .ThenInclude(s => s.Account)
            .Select(g => new
            {
                g.GradeId,
                StudentId = g.StudentId,
                StudentCode = g.Student != null ? g.Student.StudentCode : "",
                FullName = g.Student != null && g.Student.Account != null
                    ? g.Student.Account.FullName
                    : "Chưa cập nhật",
                g.ProcessScore,
                g.MidtermScore,
                g.FinalScore,
                g.TotalScore,
                g.LetterGrade,
                g.Status  
            })
            .OrderBy(g => g.StudentCode)
            .ToListAsync();

        return Ok(grades);
    }

    // ==================== 6. LẤY ĐIỂM THEO SINH VIÊN ====================
    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "STUDENT,ADVISOR,ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetGradesByStudent(string studentId)
    {
        var grades = await _context.Grades
            .Where(g => g.StudentId == studentId)
            .Include(g => g.Class)
                .ThenInclude(c => c.Subject)
            .Include(g => g.Class)
                .ThenInclude(c => c.Semester)
            .Select(g => new
            {
                g.GradeId,
                g.ClassId,
                ClassCode = g.Class.ClassCode,
                SubjectName = g.Class.Subject.SubjectName,
                Credits = g.Class.Subject.Credits,
                SemesterId = g.Class.Semester.SemesterId,
                SemesterName = g.Class.Semester.SemesterName,
                AcademicYear = g.Class.Semester.AcademicYear,
                SemesterNumber = g.Class.Semester.SemesterNumber,
                g.ProcessScore,
                g.MidtermScore,
                g.FinalScore,
                g.TotalScore,
                g.LetterGrade,
                g.Status  
            })
            .ToListAsync();

        return Ok(grades);
    }

    // ==================== 7. LẤY DANH SÁCH CHỜ DUYỆT CHO ADMIN ====================
    [HttpGet("pending/{classId}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetPendingGrades(string classId)
    {
        var pendingGrades = await _context.Grades
            .Where(g => g.ClassId == classId && g.Status == "SUBMITTED")
            .Include(g => g.Student)
                .ThenInclude(s => s.Account)
            .Select(g => new
            {
                g.GradeId,
                g.StudentId,
                StudentCode = g.Student != null ? g.Student.StudentCode : "",
                FullName = g.Student != null && g.Student.Account != null
                    ? g.Student.Account.FullName
                    : "Chưa cập nhật",
                g.ProcessScore,
                g.MidtermScore,
                g.FinalScore,
                g.TotalScore,
                g.LetterGrade,
                g.Status
            })
            .ToListAsync();

        return Ok(pendingGrades);
    }
}

// ==================== DTOs ====================
public class BulkGradeDto
{
    public string ClassId { get; set; } = null!;
    public List<GradeRecordDto> Records { get; set; } = new();
}

public class GradeRecordDto
{
    public string StudentId { get; set; } = null!;
    public decimal? ProcessScore { get; set; }
    public decimal? MidtermScore { get; set; }
    public decimal? FinalScore { get; set; }
}

public class SubmitGradeDto
{
    public string ClassId { get; set; } = null!;
    public List<string> StudentIds { get; set; } = new();
}