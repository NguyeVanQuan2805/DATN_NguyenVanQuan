using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class ClassSchedulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClassSchedulesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/ClassSchedules
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClassSchedule>>> GetClassSchedules()
    {
        return await _context.ClassSchedules.ToListAsync();
    }

    // GET: api/ClassSchedules/1
    [HttpGet("{id}")]
    public async Task<ActionResult<ClassSchedule>> GetClassSchedule(int id)
    {
        var schedule = await _context.ClassSchedules.FindAsync(id);
        if (schedule == null) return NotFound();
        return schedule;
    }

    // POST: api/ClassSchedules
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<ClassSchedule>> PostClassSchedule(ClassSchedule schedule)
    {
        _context.ClassSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetClassSchedule), new { id = schedule.ScheduleId }, schedule);
    }

    // PUT: api/ClassSchedules/1
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutClassSchedule(int id, ClassSchedule schedule)
    {
        if (id != schedule.ScheduleId) return BadRequest();
        _context.Entry(schedule).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/ClassSchedules/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteClassSchedule(int id)
    {
        var schedule = await _context.ClassSchedules.FindAsync(id);
        if (schedule == null) return NotFound();
        _context.ClassSchedules.Remove(schedule);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}