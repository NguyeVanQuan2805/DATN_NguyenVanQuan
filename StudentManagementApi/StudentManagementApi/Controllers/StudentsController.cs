using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class StudentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public StudentsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Students
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Student>>> GetStudents()
    {
        return await _context.Students
            .Include(s => s.Account)
            .Include(s => s.AdvisorClass).ThenInclude(ac => ac.Advisor)
            .ToListAsync();
    }

    // GET: api/Students/STU001
    [HttpGet("{id}")]
    public async Task<ActionResult<Student>> GetStudent(string id)
    {
        var student = await _context.Students
            .Include(s => s.Account)
            .Include(s => s.AdvisorClass).ThenInclude(ac => ac.Advisor)
            .FirstOrDefaultAsync(s => s.StudentId == id);
        if (student == null) return NotFound();
        return student;
    }

    // POST: api/Students
    [HttpPost]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<Student>> PostStudent(Student student)
    {
        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetStudent), new { id = student.StudentId }, student);
    }

    // PUT: api/Students/STU001
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> PutStudent(string id, Student student)
    {
        if (id != student.StudentId) return BadRequest();
        _context.Entry(student).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Students/STU001
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteStudent(string id)
    {
        var student = await _context.Students.FindAsync(id);
        if (student == null) return NotFound();
        _context.Students.Remove(student);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/Students/advisor-class/{advisorId}
    [HttpGet("advisor-class/{advisorId}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetStudentsByAdvisor(string advisorId)
    {
        var advisorClasses = await _context.AdvisorClasses
            .Where(ac => ac.ClassCode == advisorId)
            .Select(ac => ac.AdvisorClassId)
            .ToListAsync();

        if (!advisorClasses.Any()) return Ok(new List<object>());

        var students = await _context.Students
            .Include(s => s.Account)
            .Include(s => s.AdvisorClass)
            .Where(s => advisorClasses.Contains(s.AdvisorClassId))
            .Select(s => new
            {
                s.StudentId,
                s.StudentCode,
                FullName = s.Account.FullName,
                Email = s.Account.Email,
                AdvisorClassName = s.AdvisorClass.ClassName,
                AdmissionYear = s.AdmissionYear,
                Major = s.Major
            })
            .OrderBy(s => s.FullName)
            .ToListAsync();

        return Ok(students);
    }

    // Controllers/StudentsController.cs
    [HttpGet("by-advisor-class/{advisorClassId}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetStudentsByAdvisorClass(int advisorClassId)
    {
        try
        {
            var students = await _context.Students
                .Where(s => s.AdvisorClassId == advisorClassId)
                .Include(s => s.Account)
                .Select(s => new
                {
                    s.StudentId,
                    s.StudentCode,
                    FullName = s.Account.FullName,
                    Email = s.Account.Email,
                    Phone = s.Account.Phone,
                    Gender = s.Account.Gender,
                    s.Major,
                    s.AdmissionYear,
                    AccountId = s.AccountId
                })
                .OrderBy(s => s.FullName)
                .ToListAsync();

            // Log để debug
            Console.WriteLine($"Found {students.Count} students for class {advisorClassId}");

            return Ok(students);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetStudentsByAdvisorClass: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new
            {
                message = "Lỗi server khi lấy danh sách sinh viên",
                error = ex.Message
            });
        }
    }
}