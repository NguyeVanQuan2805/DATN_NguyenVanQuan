using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class GpasController : ControllerBase
{
    private readonly AppDbContext _context;

    public GpasController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Gpas
    [HttpGet]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<IEnumerable<Gpa>>> GetGpas()
    {
        return await _context.Gpas
            .Include(g => g.Student)
            .Include(g => g.Semester)
            .ToListAsync();
    }

    // GET: api/Gpas/1
    [HttpGet("{id}")]
    public async Task<ActionResult<Gpa>> GetGpa(int id)
    {
        var gpa = await _context.Gpas
            .Include(g => g.Student)
            .Include(g => g.Semester)
            .FirstOrDefaultAsync(g => g.Gpaid == id);
        if (gpa == null) return NotFound();
        return gpa;
    }

    [HttpGet("calculate/{studentId}/{semesterId}")]
    [Authorize(Roles = "ADMIN,ADVISOR,STUDENT")]
    public async Task<ActionResult<Gpa>> CalculateGpa(string studentId, string semesterId)
    {
        var grades = await _context.Grades
            .Include(g => g.Class).ThenInclude(c => c.Subject)
            .Where(g => g.StudentId == studentId
                     && g.Class.SemesterId == semesterId
                     && g.TotalScore.HasValue)
            .ToListAsync();

        if (!grades.Any()) return NotFound("Chưa có điểm trong học kỳ này");

        decimal totalPoints = 0;
        int totalCredits = 0;

        foreach (var grade in grades)
        {
            var credits = grade.Class?.Subject?.Credits ?? 0;
            var point = grade.TotalScore ?? 0;

            // Chuyển TotalScore (0-10) sang thang 4
            decimal gpaPoint = point switch
            {
                >= 8.5m => 4.0m,
                >= 8.0m => 3.7m,
                >= 7.0m => 3.0m,
                >= 6.5m => 2.7m,
                >= 5.5m => 2.0m,
                >= 5.0m => 1.7m,
                _ => 0.0m
            };

            totalPoints += gpaPoint * credits;
            totalCredits += credits;
        }

        if (totalCredits == 0) return BadRequest("Tổng tín chỉ bằng 0");

        var semesterGpa = totalPoints / totalCredits;

        // Tìm hoặc tạo GPA record
        var existingGpa = await _context.Gpas
            .FirstOrDefaultAsync(g => g.StudentId == studentId && g.SemesterId == semesterId);

        if (existingGpa == null)
        {
            existingGpa = new Gpa
            {
                StudentId = studentId,
                SemesterId = semesterId,
                Gpa1 = Math.Round(semesterGpa, 2),  
                CumulativeGpa = semesterGpa,  
                TotalCreditsEarned = totalCredits,
                TotalCreditsRegistered = totalCredits
            };
            _context.Gpas.Add(existingGpa);
        }
        else
        {
            existingGpa.Gpa1 = Math.Round(semesterGpa, 2);  
            existingGpa.TotalCreditsEarned = totalCredits;
            _context.Gpas.Update(existingGpa);
        }

        await _context.SaveChangesAsync();

        return Ok(existingGpa);
    }

    // GET: api/Gpas/student/STU001
    // GET: api/Gpas/student/{studentId}
    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "ADMIN,ADVISOR,STUDENT")]
    public async Task<ActionResult<IEnumerable<object>>> GetGpasByStudent(string studentId)
    {
        try
        {
            var currentUserId = User.FindFirst("sub")?.Value;
            var isAdmin = User.IsInRole("ADMIN");
            var isAdvisor = User.IsInRole("ADVISOR");
            var isStudent = User.IsInRole("STUDENT");

            if (isStudent)
            {
                var studentIdFromClaim = User.FindFirst("studentId")?.Value;

                if (string.IsNullOrEmpty(studentIdFromClaim))
                {
                    var student = await _context.Students
                        .FirstOrDefaultAsync(s => s.AccountId == currentUserId);

                    if (student == null)
                        return Forbid("Không tìm thấy thông tin sinh viên");

                    if (student.StudentId != studentId)
                        return Forbid("Bạn chỉ được xem GPA của chính mình");
                }
                else
                {
                    if (studentIdFromClaim != studentId)
                        return Forbid("Bạn chỉ được xem GPA của chính mình");
                }
            }

            var gpas = await _context.Gpas
                .Include(g => g.Semester)
                .Where(g => g.StudentId == studentId)
                .Select(g => new
                {
                    g.Gpaid,
                    g.StudentId,
                    g.SemesterId,
                    Semester = new
                    {
                        g.Semester.SemesterId,
                        g.Semester.SemesterName,
                        g.Semester.AcademicYear,
                        g.Semester.SemesterNumber
                    },
                    g.Gpa1,
                    g.CumulativeGpa,
                    g.TotalCreditsEarned,
                    g.TotalCreditsRegistered
                })
                .OrderByDescending(g => g.Semester.AcademicYear)
                .ThenByDescending(g => g.Semester.SemesterNumber)
                .ToListAsync();

            return Ok(gpas);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] GetGpasByStudent: {ex.Message}");
            return StatusCode(500, new { message = "Lỗi server khi tải GPA", error = ex.Message });
        }
    }


    // POST: api/Gpas
    [HttpPost]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<Gpa>> PostGpa(Gpa gpa)
    {
        _context.Gpas.Add(gpa);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetGpa), new { id = gpa.Gpaid }, gpa);
    }

    // PUT: api/Gpas/1
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> PutGpa(int id, Gpa gpa)
    {
        if (id != gpa.Gpaid) return BadRequest();
        _context.Entry(gpa).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Gpas/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteGpa(int id)
    {
        var gpa = await _context.Gpas.FindAsync(id);
        if (gpa == null) return NotFound();
        _context.Gpas.Remove(gpa);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}