using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class AdvisorClassesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdvisorClassesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/AdvisorClasses
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdvisorClass>>> GetAdvisorClasses()
    {
        return await _context.AdvisorClasses
            .Include(ac => ac.Advisor)
            .ToListAsync();
    }

    // GET: api/AdvisorClasses/1
    [HttpGet("{id}")]
    public async Task<ActionResult<AdvisorClass>> GetAdvisorClass(int id)
    {
        var advisorClass = await _context.AdvisorClasses
            .Include(ac => ac.Advisor)
            .FirstOrDefaultAsync(ac => ac.AdvisorClassId == id);
        if (advisorClass == null) return NotFound();
        return advisorClass;
    }

    // POST: api/AdvisorClasses
    [HttpPost]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<AdvisorClass>> PostAdvisorClass(AdvisorClass advisorClass)
    {
        _context.AdvisorClasses.Add(advisorClass);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAdvisorClass), new { id = advisorClass.AdvisorClassId }, advisorClass);
    }

    // PUT: api/AdvisorClasses/1
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> PutAdvisorClass(int id, AdvisorClass advisorClass)
    {
        if (id != advisorClass.AdvisorClassId) return BadRequest();
        _context.Entry(advisorClass).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/AdvisorClasses/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteAdvisorClass(int id)
    {
        var advisorClass = await _context.AdvisorClasses.FindAsync(id);
        if (advisorClass == null) return NotFound();
        _context.AdvisorClasses.Remove(advisorClass);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("by-advisor/{advisorId}")]
    [Authorize(Roles = "ADVISOR")]
    public async Task<ActionResult<IEnumerable<AdvisorClass>>> GetAdvisorClassesByAdvisor(string advisorId)
    {
        var classes = await _context.AdvisorClasses
            .Where(ac => ac.AdvisorId == advisorId)
            .Select(ac => new
            {
                ac.AdvisorClassId,
                ac.ClassCode,
                ac.ClassName,
                ac.AcademicYear
            })
            .OrderBy(ac => ac.ClassCode)
            .ToListAsync();

        return Ok(classes);
    }
}