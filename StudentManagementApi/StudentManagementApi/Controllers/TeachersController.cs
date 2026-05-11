// Controllers/TeachersController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class TeachersController : ControllerBase
{
    private readonly AppDbContext _context;

    public TeachersController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Teachers
    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> GetTeachers()
    {
        try
        {
            var teachers = await _context.Teachers
                .Include(t => t.Account)
                .Select(t => new
                {
                    t.TeacherId,
                    FullName = t.Account != null ? t.Account.FullName : "Chưa cập nhật",
                    t.Position,
                    DepartmentName = t.Department != null ? t.Department.DepartmentName : null
                })
                .OrderBy(t => t.TeacherId)
                .ToListAsync();

            return Ok(teachers);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetTeachers: {ex.Message}");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // GET: api/Teachers/{id}
    [HttpGet("{id}")]
    [Authorize] // Cho phép cả TEACHER và ADMIN
    public async Task<IActionResult> GetTeacher(string id)
    {
        try
        {
            // Kiểm tra quyền: TEACHER chỉ xem được thông tin của mình
            var currentUserId = User.FindFirst("accountId")?.Value;
            var currentTeacherId = User.FindFirst("teacherId")?.Value;
            var isAdmin = User.IsInRole("ADMIN");

            if (!isAdmin && currentTeacherId != id)
            {
                return Forbid("Bạn chỉ được xem thông tin của chính mình");
            }

            var teacher = await _context.Teachers
                .Include(t => t.Account)
                .Include(t => t.Department)
                .Where(t => t.TeacherId == id)
                .Select(t => new
                {
                    t.TeacherId,
                    t.AccountId,
                    AccountInfo = t.Account != null ? new
                    {
                        t.Account.FullName,
                        t.Account.Email,
                        t.Account.Phone,
                        t.Account.Gender,
                        t.Account.DateOfBirth
                    } : null,
                    t.Position,
                    Department = t.Department != null ? new
                    {
                        t.Department.DepartmentId,
                        t.Department.DepartmentName
                    } : null,
                    // Thống kê thêm
                    TotalClasses = _context.Classes.Count(c => c.TeacherId == id),
                    CurrentClasses = _context.Classes.Count(c => c.TeacherId == id && c.Status == "OPEN")
                })
                .FirstOrDefaultAsync();

            if (teacher == null)
            {
                // Thử tìm theo AccountId nếu không tìm thấy theo TeacherId
                var teacherByAccount = await _context.Teachers
                    .Include(t => t.Account)
                    .Include(t => t.Department)
                    .Where(t => t.AccountId == id)
                    .Select(t => new
                    {
                        t.TeacherId,
                        t.AccountId,
                        AccountInfo = t.Account != null ? new
                        {
                            t.Account.FullName,
                            t.Account.Email,
                            t.Account.Phone,
                            t.Account.Gender,
                            t.Account.DateOfBirth
                        } : null,
                        t.Position,
                        Department = t.Department != null ? new
                        {
                            t.Department.DepartmentId,
                            t.Department.DepartmentName
                        } : null,
                        TotalClasses = _context.Classes.Count(c => c.TeacherId == t.TeacherId),
                        CurrentClasses = _context.Classes.Count(c => c.TeacherId == t.TeacherId && c.Status == "OPEN")
                    })
                    .FirstOrDefaultAsync();

                if (teacherByAccount != null)
                {
                    return Ok(teacherByAccount);
                }

                return NotFound(new { message = $"Không tìm thấy giảng viên với ID: {id}" });
            }

            return Ok(teacher);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetTeacher: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    // GET: api/Teachers/by-account/{accountId}
    [HttpGet("by-account/{accountId}")]
    [Authorize]
    public async Task<IActionResult> GetTeacherByAccountId(string accountId)
    {
        try
        {
            var teacher = await _context.Teachers
                .Include(t => t.Account)
                .Include(t => t.Department)
                .FirstOrDefaultAsync(t => t.AccountId == accountId);

            if (teacher == null)
            {
                return NotFound(new { message = $"Không tìm thấy giảng viên với AccountId: {accountId}" });
            }

            return Ok(teacher);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // POST: api/Teachers
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Teacher>> PostTeacher(Teacher teacher)
    {
        _context.Teachers.Add(teacher);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTeacher), new { id = teacher.TeacherId }, teacher);
    }

    // PUT: api/Teachers/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutTeacher(string id, Teacher teacher)
    {
        if (id != teacher.TeacherId) return BadRequest();
        _context.Entry(teacher).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Teachers/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteTeacher(string id)
    {
        var teacher = await _context.Teachers.FindAsync(id);
        if (teacher == null) return NotFound();
        _context.Teachers.Remove(teacher);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}