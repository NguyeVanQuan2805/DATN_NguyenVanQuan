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
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetAdvisors([FromQuery] string? accountId = null)
    {
        try
        {
            var query = _context.Advisors
                .Include(a => a.Account)
                .Include(a => a.Department)
                .AsQueryable();

            if (!string.IsNullOrEmpty(accountId))
            {
                query = query.Where(a => a.AccountId == accountId);
            }

            var advisors = await query
                .Select(a => new
                {
                    a.AdvisorId,
                    a.AccountId,
                    FullName = a.Account != null ? a.Account.FullName : "Chưa cập nhật",
                    Email = a.Account != null ? a.Account.Email : null,
                    Phone = a.Account != null ? a.Account.Phone : null,
                    Department = a.Department != null ? new
                    {
                        a.Department.DepartmentId,
                        a.Department.DepartmentName
                    } : null,
                    // Thống kê
                    ManagedClassesCount = _context.AdvisorClasses.Count(ac => ac.AdvisorId == a.AdvisorId),
                    TotalStudents = _context.Students
                        .Count(s => _context.AdvisorClasses
                            .Where(ac => ac.AdvisorId == a.AdvisorId)
                            .Select(ac => ac.AdvisorClassId)
                            .Contains(s.AdvisorClassId)),
                    ActiveWarningsCount = _context.Warnings
                        .Count(w => w.Status == "ACTIVE" && _context.Students
                            .Where(s => _context.AdvisorClasses
                                .Where(ac => ac.AdvisorId == a.AdvisorId)
                                .Select(ac => ac.AdvisorClassId)
                                .Contains(s.AdvisorClassId))
                            .Select(s => s.StudentId)
                            .Contains(w.StudentId))
                })
                .OrderBy(a => a.AdvisorId)
                .ToListAsync();

            return Ok(advisors);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAdvisors: {ex.Message}");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // GET: api/Advisors/{id}
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetAdvisor(string id)
    {
        try
        {
            // Kiểm tra quyền: ADVISOR chỉ xem được thông tin của mình
            var currentUserId = User.FindFirst("accountId")?.Value;
            var currentAdvisorId = User.FindFirst("advisorId")?.Value;
            var isAdmin = User.IsInRole("ADMIN");

            if (!isAdmin && currentAdvisorId != id)
            {
                // Thử tìm theo AccountId nếu không phải advisorId
                var advisorByAccount = await _context.Advisors
                    .FirstOrDefaultAsync(a => a.AccountId == currentUserId);
                if (advisorByAccount?.AdvisorId != id)
                {
                    return Forbid("Bạn chỉ được xem thông tin của chính mình");
                }
            }

            var advisor = await _context.Advisors
                .Include(a => a.Account)
                .Include(a => a.Department)
                .Where(a => a.AdvisorId == id)
                .Select(a => new
                {
                    a.AdvisorId,
                    a.AccountId,
                    FullName = a.Account != null ? a.Account.FullName : "Chưa cập nhật",
                    Email = a.Account != null ? a.Account.Email : null,
                    Phone = a.Account != null ? a.Account.Phone : null,
                    Gender = a.Account != null ? a.Account.Gender : null,
                    Department = a.Department != null ? new
                    {
                        a.Department.DepartmentId,
                        a.Department.DepartmentName,
                        a.Department.DepartmentCode
                    } : null,
                    // Thống kê thêm
                    ManagedClasses = _context.AdvisorClasses
                        .Where(ac => ac.AdvisorId == a.AdvisorId)
                        .Select(ac => new
                        {
                            ac.AdvisorClassId,
                            ac.ClassCode,
                            ac.ClassName,
                            ac.AcademicYear,
                            StudentCount = _context.Students.Count(s => s.AdvisorClassId == ac.AdvisorClassId)
                        })
                        .ToList(),
                    TotalStudents = _context.Students
                        .Count(s => _context.AdvisorClasses
                            .Where(ac => ac.AdvisorId == a.AdvisorId)
                            .Select(ac => ac.AdvisorClassId)
                            .Contains(s.AdvisorClassId)),
                    ActiveWarningsCount = _context.Warnings
                        .Count(w => w.Status == "ACTIVE" && _context.Students
                            .Where(s => _context.AdvisorClasses
                                .Where(ac => ac.AdvisorId == a.AdvisorId)
                                .Select(ac => ac.AdvisorClassId)
                                .Contains(s.AdvisorClassId))
                            .Select(s => s.StudentId)
                            .Contains(w.StudentId)),
                    PendingRegistrationsCount = _context.CourseRegistrations
                        .Count(r => r.Status == "PENDING" && _context.Students
                            .Where(s => _context.AdvisorClasses
                                .Where(ac => ac.AdvisorId == a.AdvisorId)
                                .Select(ac => ac.AdvisorClassId)
                                .Contains(s.AdvisorClassId))
                            .Select(s => s.StudentId)
                            .Contains(r.StudentId))
                })
                .FirstOrDefaultAsync();

            if (advisor == null)
            {
                // Thử tìm theo AccountId nếu không tìm thấy theo AdvisorId
                var advisorByAccount = await _context.Advisors
                    .Include(a => a.Account)
                    .Include(a => a.Department)
                    .Where(a => a.AccountId == id)
                    .Select(a => new
                    {
                        a.AdvisorId,
                        a.AccountId,
                        FullName = a.Account != null ? a.Account.FullName : "Chưa cập nhật",
                        Email = a.Account != null ? a.Account.Email : null,
                        Phone = a.Account != null ? a.Account.Phone : null,
                        Gender = a.Account != null ? a.Account.Gender : null,
                        Department = a.Department != null ? new
                        {
                            a.Department.DepartmentId,
                            a.Department.DepartmentName,
                            a.Department.DepartmentCode
                        } : null,
                        ManagedClasses = _context.AdvisorClasses
                            .Where(ac => ac.AdvisorId == a.AdvisorId)
                            .Select(ac => new
                            {
                                ac.AdvisorClassId,
                                ac.ClassCode,
                                ac.ClassName,
                                ac.AcademicYear,
                                StudentCount = _context.Students.Count(s => s.AdvisorClassId == ac.AdvisorClassId)
                            })
                            .ToList(),
                        TotalStudents = _context.Students
                            .Count(s => _context.AdvisorClasses
                                .Where(ac => ac.AdvisorId == a.AdvisorId)
                                .Select(ac => ac.AdvisorClassId)
                                .Contains(s.AdvisorClassId)),
                        ActiveWarningsCount = _context.Warnings
                            .Count(w => w.Status == "ACTIVE" && _context.Students
                                .Where(s => _context.AdvisorClasses
                                    .Where(ac => ac.AdvisorId == a.AdvisorId)
                                    .Select(ac => ac.AdvisorClassId)
                                    .Contains(s.AdvisorClassId))
                                .Select(s => s.StudentId)
                                .Contains(w.StudentId)),
                        PendingRegistrationsCount = _context.CourseRegistrations
                            .Count(r => r.Status == "PENDING" && _context.Students
                                .Where(s => _context.AdvisorClasses
                                    .Where(ac => ac.AdvisorId == a.AdvisorId)
                                    .Select(ac => ac.AdvisorClassId)
                                    .Contains(s.AdvisorClassId))
                                .Select(s => s.StudentId)
                                .Contains(r.StudentId))
                    })
                    .FirstOrDefaultAsync();

                if (advisorByAccount != null)
                {
                    return Ok(advisorByAccount);
                }

                return NotFound(new { message = $"Không tìm thấy cố vấn với ID: {id}" });
            }

            return Ok(advisor);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetAdvisor: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    // GET: api/Advisors/by-account/{accountId}
    [HttpGet("by-account/{accountId}")]
    [Authorize]
    public async Task<IActionResult> GetAdvisorByAccountId(string accountId)
    {
        try
        {
            var advisor = await _context.Advisors
                .Include(a => a.Account)
                .Include(a => a.Department)
                .FirstOrDefaultAsync(a => a.AccountId == accountId);

            if (advisor == null)
            {
                return NotFound(new { message = $"Không tìm thấy cố vấn với AccountId: {accountId}" });
            }

            return Ok(advisor);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // GET: api/Advisors/student-stats/{advisorClassId}
    [HttpGet("student-stats/{advisorClassId}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<IActionResult> GetStudentStatsForClass(int advisorClassId)
    {
        try
        {
            Console.WriteLine($"[DEBUG] GetStudentStatsForClass called with advisorClassId: {advisorClassId}");

            var students = await _context.Students
                .Where(s => s.AdvisorClassId == advisorClassId)
                .Select(s => s.StudentId)
                .ToListAsync();

            Console.WriteLine($"[DEBUG] Found {students.Count} students");

            if (!students.Any())
            {
                return Ok(new List<object>());
            }

            var warnings = await _context.Warnings
                .Where(w => students.Contains(w.StudentId) && w.Status == "ACTIVE")
                .GroupBy(w => w.StudentId)
                .Select(g => new { StudentId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.StudentId, x => x.Count);

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

    // POST: api/Advisors
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Advisor>> PostAdvisor(Advisor advisor)
    {
        _context.Advisors.Add(advisor);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAdvisor), new { id = advisor.AdvisorId }, advisor);
    }

    // PUT: api/Advisors/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutAdvisor(string id, Advisor advisor)
    {
        if (id != advisor.AdvisorId) return BadRequest();
        _context.Entry(advisor).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Advisors/{id}
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