using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class SemestersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SemestersController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Semesters
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Semester>>> GetSemesters()
    {
        return await _context.Semesters.Select(s => new Semester
        {
            SemesterId = s.SemesterId,
            SemesterName = s.SemesterName,  
            StartDate = s.StartDate,
            EndDate = s.EndDate,
            AcademicYear = s.AcademicYear,
            SemesterNumber = s.SemesterNumber,
            IsRegistrationOpen = s.IsRegistrationOpen
        })
        .ToListAsync();
    }

    // GET: api/Semesters/HK2024_2
    [HttpGet("{id}")]
    public async Task<ActionResult<Semester>> GetSemester(string id)
    {
        var semester = await _context.Semesters.FindAsync(id);
        if (semester == null) return NotFound();
        return semester;
    }

    // POST: api/Semesters
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Semester>> PostSemester(Semester semester)
    {
        _context.Semesters.Add(semester);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSemester), new { id = semester.SemesterId }, semester);
    }

    // PUT: api/Semesters/HK2024_2
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutSemester(string id, Semester semester)
    {
        if (id != semester.SemesterId) return BadRequest();
        _context.Entry(semester).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Semesters/HK2024_2
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteSemester(string id)
    {
        var semester = await _context.Semesters.FindAsync(id);
        if (semester == null) return NotFound();
        _context.Semesters.Remove(semester);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}