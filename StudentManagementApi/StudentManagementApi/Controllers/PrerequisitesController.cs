using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class PrerequisitesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PrerequisitesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Prerequisites
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Prerequisite>>> GetPrerequisites()
    {
        return await _context.Prerequisites
            .Include(p => p.Subject)
            .Include(p => p.RequiredSubject)
            .ToListAsync();
    }

    // GET: api/Prerequisites/1
    [HttpGet("{id}")]
    public async Task<ActionResult<Prerequisite>> GetPrerequisite(int id)
    {
        var prerequisite = await _context.Prerequisites
            .Include(p => p.Subject)
            .Include(p => p.RequiredSubject)
            .FirstOrDefaultAsync(p => p.PrerequisiteId == id);
        if (prerequisite == null) return NotFound();
        return prerequisite;
    }

    // POST: api/Prerequisites
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Prerequisite>> PostPrerequisite(Prerequisite prerequisite)
    {
        _context.Prerequisites.Add(prerequisite);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPrerequisite), new { id = prerequisite.PrerequisiteId }, prerequisite);
    }

    // PUT: api/Prerequisites/1
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutPrerequisite(int id, Prerequisite prerequisite)
    {
        if (id != prerequisite.PrerequisiteId) return BadRequest();
        _context.Entry(prerequisite).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Prerequisites/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeletePrerequisite(int id)
    {
        var prerequisite = await _context.Prerequisites.FindAsync(id);
        if (prerequisite == null) return NotFound();
        _context.Prerequisites.Remove(prerequisite);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}