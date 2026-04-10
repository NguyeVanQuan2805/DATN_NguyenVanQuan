using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class GradesController : ControllerBase
{
    private readonly AppDbContext _context;

    public GradesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Grades
    [HttpGet]
    [Authorize(Roles = "ADMIN, TEACHER, ADVISOR")]
    public async Task<ActionResult<IEnumerable<Grade>>> GetGrades()
    {
        return await _context.Grades
            .Include(g => g.Student)
            .Include(g => g.Class).ThenInclude(c => c.Subject)
            .ToListAsync();
    }

    // GET: api/Grades/1
    [HttpGet("{id}")]
    public async Task<ActionResult<Grade>> GetGrade(int id)
    {
        var grade = await _context.Grades
            .Include(g => g.Student)
            .Include(g => g.Class).ThenInclude(c => c.Subject)
            .FirstOrDefaultAsync(g => g.GradeId == id);
        if (grade == null) return NotFound();
        return grade;
    }

    // POST: api/Grades
    [HttpPost]
    [Authorize(Roles = "TEACHER")]
    public async Task<ActionResult<Grade>> PostGrade(Grade grade)
    {
        grade.TotalScore =
            ((grade.ProcessScore ?? 0) * 0.3m) +
            ((grade.MidtermScore ?? 0) * 0.3m) +
            ((grade.FinalScore ?? 0) * 0.4m);

        if (grade.TotalScore >= 8.5m) grade.LetterGrade = "A";
        else if (grade.TotalScore >= 7.0m) grade.LetterGrade = "B";
        else if (grade.TotalScore >= 5.5m) grade.LetterGrade = "C";
        else if (grade.TotalScore >= 4.0m) grade.LetterGrade = "D";
        else grade.LetterGrade = "F";

        _context.Grades.Add(grade);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGrade), new { id = grade.GradeId }, grade);
    }

    // THÊM VÀO GradesController.cs

    [HttpPost("submit-for-approval")]
    [Authorize(Roles = "TEACHER")]
    public async Task<IActionResult> SubmitForApproval([FromBody] SubmitApprovalDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Kiểm tra giảng viên có dạy lớp này không
            var teacherId = User.FindFirst("teacherId")?.Value;
            var classEntity = await _context.Classes
                .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId && c.TeacherId == teacherId);

            if (classEntity == null)
                return Forbid("Bạn không dạy lớp này");

            // Cập nhật trạng thái isApproved = true cho các sinh viên được chọn
            foreach (var studentId in dto.StudentIds)
            {
                var grade = await _context.Grades
                    .FirstOrDefaultAsync(g => g.StudentId == studentId && g.ClassId == dto.ClassId);

                if (grade != null)
                {
                    grade.IsApproved = true;
                    _context.Grades.Update(grade);
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = $"Đã gửi duyệt thành công cho {dto.StudentIds.Count} sinh viên" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Lỗi khi gửi duyệt", error = ex.Message });
        }
    }

    public class SubmitApprovalDto
    {
        public string ClassId { get; set; } = null!;
        public List<string> StudentIds { get; set; } = new();
    }

    // THÊM VÀO GradesController.cs

    [HttpPost("approve")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ApproveGrades([FromBody] GradeApprovalDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            foreach (var studentId in dto.StudentIds)
            {
                var grade = await _context.Grades
                    .FirstOrDefaultAsync(g => g.StudentId == studentId && g.ClassId == dto.ClassId);

                if (grade != null)
                {
                    grade.IsApproved = true;
                    _context.Grades.Update(grade);
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = $"Đã duyệt điểm thành công cho {dto.StudentIds.Count} sinh viên" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Lỗi khi duyệt điểm", error = ex.Message });
        }
    }

    [HttpPost("reject")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> RejectGrades([FromBody] GradeApprovalDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            foreach (var studentId in dto.StudentIds)
            {
                var grade = await _context.Grades
                    .FirstOrDefaultAsync(g => g.StudentId == studentId && g.ClassId == dto.ClassId);

                if (grade != null)
                {
                    grade.IsApproved = false;
                    // Có thể thêm ghi chú lý do từ chối nếu cần
                    _context.Grades.Update(grade);
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = $"Đã từ chối điểm cho {dto.StudentIds.Count} sinh viên" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Lỗi khi từ chối điểm", error = ex.Message });
        }
    }

    public class GradeApprovalDto
    {
        public string ClassId { get; set; } = null!;
        public List<string> StudentIds { get; set; } = new();
    }

    // PUT: api/Grades/1
    [HttpPut("{id}")]
    [Authorize(Roles = "TEACHER")]
    public async Task<IActionResult> PutGrade(int id, Grade grade)
    {
        if (id != grade.GradeId) return BadRequest();

        grade.TotalScore =
            ((grade.ProcessScore ?? 0) * 0.3m) +
            ((grade.MidtermScore ?? 0) * 0.3m) +
            ((grade.FinalScore ?? 0) * 0.4m);

        if (grade.TotalScore >= 8.5m) grade.LetterGrade = "A";
        else if (grade.TotalScore >= 7.0m) grade.LetterGrade = "B";
        else if (grade.TotalScore >= 5.5m) grade.LetterGrade = "C";
        else if (grade.TotalScore >= 4.0m) grade.LetterGrade = "D";
        else grade.LetterGrade = "F";

        _context.Entry(grade).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }


    // DELETE: api/Grades/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN, TEACHER")]
    public async Task<IActionResult> DeleteGrade(int id)
    {
        var grade = await _context.Grades.FindAsync(id);
        if (grade == null) return NotFound();
        _context.Grades.Remove(grade);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("bulk")]
    [Authorize(Roles = "TEACHER")]
    public async Task<IActionResult> BulkCreateOrUpdateGrades([FromBody] BulkGradeDto dto)
    {
        var teacherId = User.FindFirst("teacherId")?.Value;
        var cls = await _context.Classes.FindAsync(dto.ClassId);
        if (cls == null || cls.TeacherId != teacherId)
            return Forbid("Bạn không dạy lớp này");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            foreach (var record in dto.Records)
            {
                var existing = await _context.Grades
                    .FirstOrDefaultAsync(g => g.StudentId == record.StudentId && g.ClassId == dto.ClassId);

                decimal total =
    ((record.ProcessScore ?? 0) * 0.3m) +
    ((record.MidtermScore ?? 0) * 0.3m) +
    ((record.FinalScore ?? 0) * 0.4m);

                string letter =
                    total >= 8.5m ? "A" :
                    total >= 7.0m ? "B" :
                    total >= 5.5m ? "C" :
                    total >= 4.0m ? "D" : "F";


                if (existing != null)
                {
                    existing.ProcessScore = record.ProcessScore;
                    existing.MidtermScore = record.MidtermScore;
                    existing.FinalScore = record.FinalScore;
                    existing.TotalScore = total;
                    existing.LetterGrade = letter;
                    existing.IsApproved = false; // chờ duyệt nếu cần
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
                        IsApproved = false
                    });
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Ok("Đã lưu điểm thành công");
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, "Lỗi khi lưu điểm");
        }
    }
    // GradesController.cs
    // Sửa endpoint GET class/{classId} để cho phép ADMIN truy cập

    [HttpGet("class/{classId}")]
    [Authorize(Roles = "ADMIN,TEACHER")] // THÊM ADMIN vào roles
    public async Task<ActionResult<IEnumerable<object>>> GetGradesByClass(string classId)
    {
        try
        {
            var currentUserRole = User.FindFirst("role")?.Value;
            var teacherId = User.FindFirst("teacherId")?.Value;

            // Nếu là TEACHER, kiểm tra quyền dạy lớp này
            if (currentUserRole == "TEACHER")
            {
                if (string.IsNullOrEmpty(teacherId))
                    return Unauthorized();

                var classEntity = await _context.Classes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.ClassId == classId && c.TeacherId == teacherId);

                if (classEntity == null)
                    return Forbid("Bạn không dạy lớp này");
            }
            // Nếu là ADMIN, không cần kiểm tra - cho phép truy cập tất cả

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
                    g.IsApproved
                })
                .OrderBy(g => g.StudentCode)
                .ToListAsync();

            return Ok(grades);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] GetGradesByClass: {ex.Message}");
            return StatusCode(500, new { message = "Lỗi server khi tải điểm", error = ex.Message });
        }
    }
    // GradesController.cs
    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "STUDENT, ADVISOR, ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetGradesByStudent(string studentId)
    {
        var grades = await _context.Grades
            .Where(g => g.StudentId == studentId)
            .Include(g => g.Class)
                .ThenInclude(c => c.Subject)
            .Include(g => g.Class)
                .ThenInclude(c => c.Semester)   // ← THÊM DÒNG NÀY
            .Select(g => new
            {
                g.GradeId,                       // ← THÊM
                g.ClassId,                       // ← THÊM
                ClassCode = g.Class.ClassCode,
                SubjectName = g.Class.Subject.SubjectName,
                Credits = g.Class.Subject.Credits,
                // Semester info                 // ← THÊM BLOCK NÀY
                SemesterId = g.Class.Semester.SemesterId,
                SemesterName = g.Class.Semester.SemesterName,
                AcademicYear = g.Class.Semester.AcademicYear,
                SemesterNumber = g.Class.Semester.SemesterNumber,
                // Scores
                ProcessScore = g.ProcessScore,
                MidtermScore = g.MidtermScore,
                FinalScore = g.FinalScore,
                TotalScore = g.TotalScore,
                LetterGrade = g.LetterGrade
            })
            .ToListAsync();

        return Ok(grades);
    }

    [HttpGet("{classId}/students")]
    [Authorize(Roles = "TEACHER,ADMIN")]
    public async Task<ActionResult> GetStudentsInMyClass(string classId)
    {
        var isAdmin = User.IsInRole("ADMIN");
        var teacherId = User.FindFirst("teacherId")?.Value;

        if (!isAdmin && string.IsNullOrEmpty(teacherId))
            return Unauthorized("Không tìm thấy thông tin giảng viên");

        // Chỉ load thông tin cần thiết, tránh Include sâu gây lỗi
        var cls = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Subject)           // chỉ cần tên môn
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (cls == null)
            return NotFound($"Không tìm thấy lớp: {classId}");

        if (!isAdmin && cls.TeacherId != teacherId)
            return Forbid("Bạn không dạy lớp này");

        // Lấy sinh viên qua CourseRegistration + Account (dùng projection)
        var students = await _context.CourseRegistrations
            .Where(r => r.ClassId == classId && r.Status == "APPROVED")
            .Select(r => new
            {
                StudentId = r.StudentId,
                StudentCode = r.Student != null ? r.Student.StudentCode : "N/A",
                FullName = r.Student != null && r.Student.Account != null
                    ? r.Student.Account.FullName
                    : "Chưa cập nhật",
                Email = r.Student != null && r.Student.Account != null
                    ? r.Student.Account.Email ?? "Chưa cập nhật"
                    : "Chưa cập nhật",
                Phone = r.Student != null && r.Student.Account != null
                    ? r.Student.Account.Phone ?? "Chưa cập nhật"
                    : "Chưa cập nhật",
                Gender = r.Student != null && r.Student.Account != null
                    ? r.Student.Account.Gender ?? "N/A"
                    : "N/A"
            })
            .OrderBy(s => s.FullName)
            .ToListAsync();

        return Ok(new
        {
            classInfo = new
            {
                ClassCode = cls.ClassCode,
                SubjectName = cls.Subject?.SubjectName ?? "N/A",
                CurrentStudents = cls.CurrentStudents,
                MaxStudents = cls.MaxStudents
            },
            students
        });
    }
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
}