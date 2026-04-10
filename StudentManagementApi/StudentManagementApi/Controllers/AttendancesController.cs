using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class AttendancesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AttendancesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Attendances
    [HttpGet]
    [Authorize(Roles = "TEACHER, ADMIN")]
    public async Task<ActionResult<IEnumerable<AttendanceResponseDto>>> GetAttendances()
    {
        var attendances = await _context.Attendances
            .Include(a => a.Class)
            .Include(a => a.Student)
                .ThenInclude(s => s.Account) // load Account nếu có
            .Select(a => new AttendanceResponseDto
            {
                AttendanceId = a.AttendanceId,
                ClassId = a.ClassId,
                ClassCode = a.Class != null ? a.Class.ClassCode : "N/A",           // thay vì a.Class?.ClassCode
                                                                                   // SubjectName = a.Class != null && a.Class.Subject != null ? a.Class.Subject.SubjectName : "N/A", // nếu cần

                StudentId = a.StudentId,
                StudentCode = a.Student != null ? a.Student.StudentCode : "N/A",
                StudentFullName = a.Student != null && a.Student.Account != null
                    ? a.Student.Account.FullName
                    : "Chưa cập nhật",

                AttendanceDate = a.AttendanceDate,
                Status = a.Status,
                Notes = a.Notes
            })
            .ToListAsync();

        return Ok(attendances);
    }

    // GET: api/Attendances/1
    [HttpGet("{id}")]
    public async Task<ActionResult<AttendanceResponseDto>> GetAttendance(int id)
    {
        var attendance = await _context.Attendances
            .Include(a => a.Class)
            .Include(a => a.Student)
                .ThenInclude(s => s.Account)
            .Where(a => a.AttendanceId == id)
            .Select(a => new AttendanceResponseDto
            {
                AttendanceId = a.AttendanceId,
                ClassId = a.ClassId,
                ClassCode = a.Class != null ? a.Class.ClassCode : "N/A",
                StudentId = a.StudentId,
                StudentCode = a.Student != null ? a.Student.StudentCode : "N/A",
                StudentFullName = a.Student != null && a.Student.Account != null
                    ? a.Student.Account.FullName
                    : "Chưa cập nhật",
                AttendanceDate = a.AttendanceDate,
                Status = a.Status,
                Notes = a.Notes
            })
            .FirstOrDefaultAsync();

        if (attendance == null) return NotFound();
        return Ok(attendance);
    }

    // POST: api/Attendances
    [HttpPost]
    [Authorize(Roles = "TEACHER")]
    public async Task<ActionResult<Attendance>> PostAttendance(Attendance attendance)
    {
        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAttendance), new { id = attendance.AttendanceId }, attendance);
    }

    // PUT: api/Attendances/1
    [HttpPut("{id}")]
    [Authorize(Roles = "TEACHER")]
    public async Task<IActionResult> PutAttendance(int id, Attendance attendance)
    {
        if (id != attendance.AttendanceId) return BadRequest();
        _context.Entry(attendance).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Attendances/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "TEACHER, ADMIN")]
    public async Task<IActionResult> DeleteAttendance(int id)
    {
        var attendance = await _context.Attendances.FindAsync(id);
        if (attendance == null) return NotFound();
        _context.Attendances.Remove(attendance);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DTO đơn giản, không có navigation
    public class StudentInClassDto
    {
        public string StudentId { get; set; } = "";
        public string StudentCode { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Gender { get; set; } = "";
    }

    public class ClassInfoDto
    {
        public string ClassCode { get; set; } = "";
        public string SubjectName { get; set; } = "";
        public int? CurrentStudents { get; set; }
        public int MaxStudents { get; set; }
    }

    [HttpGet("{classId}/students")]
    [Authorize(Roles = "TEACHER")]
    public async Task<ActionResult> GetStudentsInMyClass(string classId)
    {
        var teacherId = User.FindFirst("teacherId")?.Value;
        if (string.IsNullOrEmpty(teacherId))
            return Unauthorized("Không tìm thấy thông tin giảng viên");

        // Chỉ lấy thông tin lớp cơ bản (không include gì cả)
        var cls = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Subject)  // Chỉ include Subject nếu cần tên môn
            .FirstOrDefaultAsync(c => c.ClassId == classId);

        if (cls == null)
            return NotFound($"Không tìm thấy lớp: {classId}");

        if (cls.TeacherId != teacherId)
            return Forbid("Bạn không dạy lớp này");

        // Query sinh viên qua CourseRegistration – KHÔNG include graph đầy đủ
        var students = await _context.CourseRegistrations
            .Where(r => r.ClassId == classId && r.Status == "APPROVED")
            .Select(r => new StudentInClassDto
            {
                StudentId = r.Student.StudentId,
                StudentCode = r.Student.StudentCode,
                FullName = r.Student.Account != null ? r.Student.Account.FullName : "Chưa cập nhật",
                Email = r.Student.Account != null ? r.Student.Account.Email : "Chưa cập nhật",
                Phone = r.Student.Account != null ? r.Student.Account.Phone : "Chưa cập nhật",
                Gender = r.Student.Account != null ? r.Student.Account.Gender : "N/A"
            })
            .OrderBy(s => s.FullName)
            .ToListAsync();

        var response = new
        {
            classInfo = new ClassInfoDto
            {
                ClassCode = cls.ClassCode,
                SubjectName = cls.Subject?.SubjectName ?? "N/A",
                CurrentStudents = cls.CurrentStudents,
                MaxStudents = cls.MaxStudents
            },
            students
        };

        return Ok(response);
    }
}
public class AttendanceResponseDto
{
    public int AttendanceId { get; set; }
    public string ClassId { get; set; } = null!;
    public string ClassCode { get; set; } = "";           // flatten
    public string SubjectName { get; set; } = "";         // nếu cần
    public string StudentId { get; set; } = null!;
    public string StudentCode { get; set; } = "";
    public string StudentFullName { get; set; } = "";
    public DateOnly AttendanceDate { get; set; }
    public string Status { get; set; } = null!;
    public string? Notes { get; set; }
}