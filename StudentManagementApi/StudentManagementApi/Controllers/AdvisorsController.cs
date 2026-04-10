// Controllers/AdvisorsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class AdvisorsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdvisorsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Advisors
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Advisor>>> GetAdvisors()
    {
        return await _context.Advisors
            .Include(a => a.Account)
            .Include(a => a.Department)
            .ToListAsync();
    }

    [HttpGet("student-stats/{advisorClassId}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<ActionResult<object>> GetStudentStatsForClass(int advisorClassId)
    {
        try
        {
            Console.WriteLine($"[DEBUG] GetStudentStatsForClass called with advisorClassId: {advisorClassId}");

            // Lấy danh sách sinh viên trong lớp
            var students = await _context.Students
                .Where(s => s.AdvisorClassId == advisorClassId)
                .Select(s => s.StudentId)
                .ToListAsync();

            Console.WriteLine($"[DEBUG] Found {students.Count} students");

            if (!students.Any())
                return Ok(new List<object>());

            // Lấy warnings cho các sinh viên này
            var warnings = await _context.Warnings
                .Where(w => students.Contains(w.StudentId) && w.Status == "ACTIVE")
                .GroupBy(w => w.StudentId)
                .Select(g => new { StudentId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.StudentId, x => x.Count);

            // Lấy GPA mới nhất - SỬA LẠI PHẦN NÀY
            var latestGpas = new Dictionary<string, decimal?>();
            foreach (var studentId in students)
            {
                var gpa = await _context.Gpas
                    .Where(g => g.StudentId == studentId)
                    .OrderByDescending(g => g.Semester.AcademicYear)
                    .ThenByDescending(g => g.Semester.SemesterNumber)
                    .Select(g => g.CumulativeGpa)
                    .FirstOrDefaultAsync();

                latestGpas[studentId] = gpa > 0 ? gpa : (decimal?)null;
            }

            // Lấy đăng ký môn học
            var registrations = await _context.CourseRegistrations
                .Include(r => r.Class)
                    .ThenInclude(c => c.Subject)
                .Where(r => students.Contains(r.StudentId))
                .ToListAsync();

            var approvedRegs = registrations
                .Where(r => r.Status == "APPROVED")
                .GroupBy(r => r.StudentId)
                .ToDictionary(g => g.Key, g => g.Sum(r => r.Class?.Subject?.Credits ?? 0));

            var pendingRegs = registrations
                .Where(r => r.Status == "PENDING")
                .GroupBy(r => r.StudentId)
                .ToDictionary(g => g.Key, g => g.Count());

            // Tổng hợp kết quả
            var result = students.Select(studentId => new
            {
                StudentId = studentId,
                TotalWarnings = warnings.ContainsKey(studentId) ? warnings[studentId] : 0,
                CurrentGpa = latestGpas.ContainsKey(studentId) ? latestGpas[studentId] : null,
                RegisteredCredits = approvedRegs.ContainsKey(studentId) ? approvedRegs[studentId] : 0,
                PendingRegistrations = pendingRegs.ContainsKey(studentId) ? pendingRegs[studentId] : 0
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] GetStudentStatsForClass: {ex.Message}");
            Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
        }
    }



// GET: api/Advisors/ADV001
[HttpGet("{id}")]
    public async Task<ActionResult<Advisor>> GetAdvisor(string id)
    {
        var advisor = await _context.Advisors
            .Include(a => a.Account)
            .Include(a => a.Department)
            .FirstOrDefaultAsync(a => a.AdvisorId == id);
        if (advisor == null) return NotFound();
        return advisor;
    }

    // POST: api/Advisors
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Advisor>> PostAdvisor(Advisor advisor)
    {
        _context.Advisors.Add(advisor);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAdvisor), new { id = advisor.AdvisorId }, advisor);
    }

    // PUT: api/Advisors/ADV001
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutAdvisor(string id, Advisor advisor)
    {
        if (id != advisor.AdvisorId) return BadRequest();
        _context.Entry(advisor).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Advisors/ADV001
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteAdvisor(string id)
    {
        var advisor = await _context.Advisors.FindAsync(id);
        if (advisor == null) return NotFound();
        _context.Advisors.Remove(advisor);
        await _context.SaveChangesAsync();
        return NoContent();
    }
    
}