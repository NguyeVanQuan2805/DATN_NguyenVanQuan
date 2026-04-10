using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DepartmentsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Departments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Department>>> GetDepartments()
    {
        return await _context.Departments.ToListAsync();
    }

    // GET: api/Departments/CNTT
    [HttpGet("{id}")]
    public async Task<ActionResult<Department>> GetDepartment(string id)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null) return NotFound();
        return department;
    }

    // POST: api/Departments
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Department>> PostDepartment(Department department)
    {
        _context.Departments.Add(department);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDepartment), new { id = department.DepartmentId }, department);
    }

    // PUT: api/Departments/CNTT
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutDepartment(string id, Department department)
    {
        if (id != department.DepartmentId) return BadRequest();
        _context.Entry(department).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Departments/CNTT
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteDepartment(string id)
    {
        var department = await _context.Departments.FindAsync(id);
        if (department == null) return NotFound();
        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}