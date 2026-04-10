using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[Route("api/[controller]")]
[ApiController]
public class SubjectsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SubjectsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Subjects - Trả về DTO để tránh cycle
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetSubjects()
    {
        var subjects = await _context.Subjects
            .Include(s => s.Department)
            .Select(s => new
            {
                s.SubjectId,
                s.SubjectCode,
                s.SubjectName,
                s.Credits,
                s.Type,
                s.DepartmentId,
                DepartmentName = s.Department != null ? s.Department.DepartmentName : null,
                s.Description
                // Không trả về navigation đầy đủ để tránh cycle
            })
            .ToListAsync();

        return Ok(subjects);
    }

    // GET: api/Subjects/IT101
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetSubject(string id)
    {
        var subject = await _context.Subjects
            .Include(s => s.Department)
            .Where(s => s.SubjectId == id)
            .Select(s => new
            {
                s.SubjectId,
                s.SubjectCode,
                s.SubjectName,
                s.Credits,
                s.Type,
                s.DepartmentId,
                DepartmentName = s.Department != null ? s.Department.DepartmentName : null,
                s.Description
            })
            .FirstOrDefaultAsync();

        if (subject == null) return NotFound();
        return Ok(subject);
    }

    // POST: api/Subjects - Thêm mới
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<object>> PostSubject([FromBody] SubjectCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Kiểm tra trùng SubjectCode
        if (await _context.Subjects.AnyAsync(s => s.SubjectCode == dto.SubjectCode))
            return BadRequest("Mã môn học đã tồn tại!");

        // Tạo SubjectId nếu client không gửi (hoặc dùng chính SubjectCode)
        string subjectId = dto.SubjectId ?? dto.SubjectCode?.ToUpper()
            ?? $"SUB-{Guid.NewGuid().ToString("N").Substring(0, 8)}";

        // Kiểm tra trùng SubjectId
        if (await _context.Subjects.AnyAsync(s => s.SubjectId == subjectId))
            return BadRequest("SubjectId đã tồn tại!");

        var subject = new Subject
        {
            SubjectId = subjectId,
            SubjectCode = dto.SubjectCode,
            SubjectName = dto.SubjectName,
            Credits = dto.Credits,
            Type = dto.Type,
            DepartmentId = dto.DepartmentId,
            Description = dto.Description
        };

        _context.Subjects.Add(subject);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSubject), new { id = subject.SubjectId }, subject);
    }

    // PUT: api/Subjects/IT101
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutSubject(string id, [FromBody] SubjectUpdateDto dto)
    {
        var subject = await _context.Subjects.FindAsync(id);
        if (subject == null) return NotFound();

        if (id != dto.SubjectId) return BadRequest("SubjectId không khớp");

        // Cập nhật các field
        subject.SubjectCode = dto.SubjectCode ?? subject.SubjectCode;
        subject.SubjectName = dto.SubjectName ?? subject.SubjectName;
        subject.Credits = dto.Credits ?? subject.Credits;
        subject.Type = dto.Type ?? subject.Type;
        subject.DepartmentId = dto.DepartmentId ?? subject.DepartmentId;
        subject.Description = dto.Description ?? subject.Description;

        _context.Entry(subject).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/Subjects/IT101
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteSubject(string id)
    {
        var subject = await _context.Subjects
            .Include(s => s.Classes) // Kiểm tra có lớp học phần nào dùng không
            .FirstOrDefaultAsync(s => s.SubjectId == id);

        if (subject == null) return NotFound();

        if (subject.Classes.Any())
            return BadRequest("Không thể xóa môn học đang được sử dụng trong lớp học phần");

        _context.Subjects.Remove(subject);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

// DTO cho POST (thêm mới)
public class SubjectCreateDto
{
    public string? SubjectId { get; set; } // optional, backend sẽ tự sinh nếu thiếu
    public string SubjectCode { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public int Credits { get; set; }
    public string? Type { get; set; }
    public string? DepartmentId { get; set; }
    public string? Description { get; set; }
}

// DTO cho PUT (sửa)
public class SubjectUpdateDto
{
    public string SubjectId { get; set; } = null!;
    public string? SubjectCode { get; set; }
    public string? SubjectName { get; set; }
    public int? Credits { get; set; }
    public string? Type { get; set; }
    public string? DepartmentId { get; set; }
    public string? Description { get; set; }
}