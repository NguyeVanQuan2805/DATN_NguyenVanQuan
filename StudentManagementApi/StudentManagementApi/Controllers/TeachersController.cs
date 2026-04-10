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
    public async Task<IActionResult> GetTeachers()
    {
        var teachers = await _context.Teachers
            .Include(t => t.Account)
            .Select(t => new
            {
                TeacherId = t.TeacherId,
                FullName = t.Account.FullName,
                Position = t.Position
            })
            .OrderBy(t => t.TeacherId)
            .ToListAsync();

        return Ok(teachers);
    }


    // GET: api/Teachers/TCH001
    [HttpGet("{id}")]
    public async Task<ActionResult<Teacher>> GetTeacher(string id)
    {
        var teacher = await _context.Teachers
            .Include(t => t.Account)
            .Include(t => t.Department)
            .FirstOrDefaultAsync(t => t.TeacherId == id);
        if (teacher == null) return NotFound();
        return teacher;
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

    // PUT: api/Teachers/TCH001
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutTeacher(string id, Teacher teacher)
    {
        if (id != teacher.TeacherId) return BadRequest();
        _context.Entry(teacher).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Teachers/TCH001
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