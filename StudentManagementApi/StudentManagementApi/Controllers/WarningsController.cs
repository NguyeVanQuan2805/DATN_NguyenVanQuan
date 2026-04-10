using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class WarningsController : ControllerBase
{
    private readonly AppDbContext _context;

    public WarningsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Warnings
    // GET: api/Warnings
    [HttpGet]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<IEnumerable<object>>> GetWarnings()
    {
        try
        {
            var warnings = await _context.Warnings
                .Include(w => w.Student)
                    .ThenInclude(s => s.Account)
                .Include(w => w.Semester)
                .Include(w => w.IssuedByNavigation)
                .Select(w => new
                {
                    w.WarningId,
                    w.StudentId,
                    w.SemesterId,
                    w.WarningLevel,
                    w.WarningReason,
                    w.IssuedBy,
                    w.IssuedDate,
                    w.Status,
                    w.ResolutionNotes,
                    Student = w.Student == null ? null : new
                    {
                        w.Student.StudentId,
                        w.Student.StudentCode,
                        FullName = w.Student.Account != null ? w.Student.Account.FullName : "N/A"
                    },
                    Semester = w.Semester == null ? null : new
                    {
                        w.Semester.SemesterId,
                        w.Semester.SemesterName
                    }
                })
                .ToListAsync();

            return Ok(warnings);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetWarnings: {ex.Message}");
            return StatusCode(500, new { message = "Lỗi server khi tải warnings", error = ex.Message });
        }
    }

    // GET: api/Warnings/1
    [HttpGet("{id}")]
    public async Task<ActionResult<Warning>> GetWarning(int id)
    {
        var warning = await _context.Warnings
            .Include(w => w.Student)
            .Include(w => w.Semester)
            .Include(w => w.IssuedBy)
            .FirstOrDefaultAsync(w => w.WarningId == id);
        if (warning == null) return NotFound();
        return warning;
    }

    // POST: api/Warnings
    [HttpPost]
    [Authorize(Roles = "ADVISOR")]
    public async Task<ActionResult<Warning>> PostWarning(Warning warning)
    {
        warning.IssuedDate = DateTime.Now;
        _context.Warnings.Add(warning);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetWarning), new { id = warning.WarningId }, warning);
    }

    // PUT: api/Warnings/1

    [HttpPut("{id}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<IActionResult> PutWarning(int id, [FromBody] WarningUpdateDto dto)
    {
        var warning = await _context.Warnings.FindAsync(id);
        if (warning == null) return NotFound();
        if (warning.Status != "ACTIVE") return BadRequest("Cảnh báo đã được xử lý");

        warning.Status = dto.Status;
        warning.ResolutionNotes = dto.ResolutionNotes;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    public class WarningUpdateDto
    {
        public string Status { get; set; } = "RESOLVED";
        public string? ResolutionNotes { get; set; }
    }

    // DELETE: api/Warnings/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> DeleteWarning(int id)
    {
        var warning = await _context.Warnings.FindAsync(id);
        if (warning == null) return NotFound();
        _context.Warnings.Remove(warning);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/Warnings/advisor-summary/{advisorId}
    // GET: api/Warnings/advisor-summary/{advisorId}
    [HttpGet("advisor-summary/{advisorId}")]
    [Authorize(Roles = "ADVISOR")]
    public async Task<ActionResult<object>> GetAdvisorWarningsSummary(string advisorId)
    {
        try
        {
            var advisorClasses = await _context.AdvisorClasses
                .Where(ac => ac.AdvisorId == advisorId)
                .Select(ac => ac.AdvisorClassId)
                .ToListAsync();

            if (!advisorClasses.Any())
                return Ok(new { message = "Cố vấn chưa quản lý lớp nào", data = new List<object>() });

            // Lấy ACTIVE warnings
            var warnings = await _context.Warnings
                .Include(w => w.Student)
                    .ThenInclude(s => s.Account)
                .Include(w => w.Semester)
                .Where(w => w.Student.AdvisorClassId != null
                         && advisorClasses.Contains(w.Student.AdvisorClassId)
                         && w.Status == "ACTIVE")
                .ToListAsync();

            var byLevel = warnings
                .GroupBy(w => w.WarningLevel)
                .Select(g => new
                {
                    Level = g.Key,
                    Count = g.Count(),
                    Students = g.Select(w => new
                    {
                        StudentID = w.Student.StudentId,
                        StudentCode = w.Student.StudentCode,
                        FullName = w.Student.Account.FullName,
                        WarningReason = w.WarningReason,
                        IssuedDate = w.IssuedDate,
                        Semester = w.Semester.SemesterName,
                        WarningId = w.WarningId,
                        Status = w.Status
                    }).ToList()
                })
                .ToList();

            var totalActive = warnings.Count;

            return Ok(new
            {
                TotalActiveWarnings = totalActive,
                TotalResolvedWarnings = 0, // Tạm thời
                ByLevel = byLevel,
                ResolvedByLevel = new List<object>()
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAdvisorWarningsSummary: {ex.Message}");
            return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
        }
    }
}