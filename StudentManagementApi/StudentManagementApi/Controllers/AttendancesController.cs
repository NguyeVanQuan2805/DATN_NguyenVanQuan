// Controllers/AttendancesController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttendancesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AttendancesController(AppDbContext context)
        {
            _context = context;
        }

        // ================= HELPER =================
        private static string NormalizeStatus(string? status)
        {
            return (status ?? "PRESENT").ToUpperInvariant() switch
            {
                "PRESENT" => "PRESENT",
                "ABSENT" => "ABSENT",
                "LATE" => "LATE",
                "EXCUSED" => "EXCUSED",
                "ONTIME" => "PRESENT",
                "TARDY" => "LATE",
                "EXCUSED_ABSENCE" => "EXCUSED",
                var other => other.ToUpperInvariant(),
            };
        }

        // GET: api/Attendances
        [HttpGet]
        [Authorize(Roles = "TEACHER, ADMIN")]
        public async Task<ActionResult<IEnumerable<AttendanceResponseDto>>> GetAttendances()
        {
            var attendances = await _context.Attendances
                .Include(a => a.Class)
                .Include(a => a.Student).ThenInclude(s => s.Account)
                .Select(a => new AttendanceResponseDto
                {
                    AttendanceId = a.AttendanceId,
                    ClassId = a.ClassId,
                    ClassCode = a.Class != null ? a.Class.ClassCode : "N/A",
                    StudentId = a.StudentId,
                    StudentCode = a.Student != null ? a.Student.StudentCode : "N/A",
                    StudentFullName = a.Student != null && a.Student.Account != null
                                        ? a.Student.Account.FullName : "Chua cap nhat",
                    AttendanceDate = a.AttendanceDate,
                    Status = a.Status,
                    Notes = a.Notes
                })
                .ToListAsync();
            return Ok(attendances);
        }

        // GET: api/Attendances/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AttendanceResponseDto>> GetAttendance(int id)
        {
            var attendance = await _context.Attendances
                .Include(a => a.Class)
                .Include(a => a.Student).ThenInclude(s => s.Account)
                .Where(a => a.AttendanceId == id)
                .Select(a => new AttendanceResponseDto
                {
                    AttendanceId = a.AttendanceId,
                    ClassId = a.ClassId,
                    ClassCode = a.Class != null ? a.Class.ClassCode : "N/A",
                    StudentId = a.StudentId,
                    StudentCode = a.Student != null ? a.Student.StudentCode : "N/A",
                    StudentFullName = a.Student != null && a.Student.Account != null
                                        ? a.Student.Account.FullName : "Chua cap nhat",
                    AttendanceDate = a.AttendanceDate,
                    Status = a.Status,
                    Notes = a.Notes
                })
                .FirstOrDefaultAsync();

            if (attendance == null) return NotFound();
            return Ok(attendance);
        }

        // GET: api/Attendances/class/{classId}?date=yyyy-MM-dd
        [HttpGet("class/{classId}")]
        [Authorize(Roles = "TEACHER, ADMIN")]
        public async Task<ActionResult<IEnumerable<AttendanceResponseDto>>> GetByClass(
            string classId,
            [FromQuery] string? date = null)
        {
            var teacherId = User.FindFirst("teacherId")?.Value;
            if (!string.IsNullOrEmpty(teacherId))
            {
                var cls = await _context.Classes.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.ClassId == classId);
                if (cls == null) return NotFound("Khong tim thay lop");
                if (cls.TeacherId != teacherId) return Forbid("Ban khong day lop nay");
            }

            var query = _context.Attendances
                .Include(a => a.Student).ThenInclude(s => s.Account)
                .Where(a => a.ClassId == classId);

            if (!string.IsNullOrEmpty(date) && DateOnly.TryParse(date, out var parsedDate))
                query = query.Where(a => a.AttendanceDate == parsedDate);

            var result = await query
                .Select(a => new AttendanceResponseDto
                {
                    AttendanceId = a.AttendanceId,
                    ClassId = a.ClassId,
                    ClassCode = a.Class != null ? a.Class.ClassCode : "N/A",
                    StudentId = a.StudentId,
                    StudentCode = a.Student != null ? a.Student.StudentCode : "N/A",
                    StudentFullName = a.Student != null && a.Student.Account != null
                                        ? a.Student.Account.FullName : "Chua cap nhat",
                    AttendanceDate = a.AttendanceDate,
                    Status = NormalizeStatus(a.Status),
                    Notes = a.Notes
                })
                .OrderBy(a => a.StudentCode)
                .ToListAsync();

            return Ok(result);
        }

        // GET: api/Attendances/history/{classId}
        [HttpGet("history/{classId}")]
        [Authorize(Roles = "TEACHER, ADMIN")]
        public async Task<ActionResult<IEnumerable<AttendanceHistoryDto>>> GetHistory(string classId)
        {
            var teacherId = User.FindFirst("teacherId")?.Value;
            if (!string.IsNullOrEmpty(teacherId))
            {
                var cls = await _context.Classes.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.ClassId == classId);
                if (cls == null) return NotFound("Khong tim thay lop");
                if (cls.TeacherId != teacherId) return Forbid("Ban khong day lop nay");
            }

            var records = await _context.Attendances
                .Where(a => a.ClassId == classId)
                .Include(a => a.Class).ThenInclude(c => c.Schedule)
                .AsNoTracking()
                .ToListAsync();

            if (records.Count == 0) return Ok(new List<AttendanceHistoryDto>());

            var schedule = records.First().Class?.Schedule;
            int periodStart = schedule?.PeriodStart ?? 0;
            int periodEnd = schedule?.PeriodEnd ?? 0;
            string room = schedule?.Room ?? "";

            var history = records
                .GroupBy(a => a.AttendanceDate)
                .Select(g => new AttendanceHistoryDto
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    PeriodStart = periodStart,
                    PeriodEnd = periodEnd,
                    Room = room,
                    TotalStudents = g.Count(),
                    PresentCount = g.Count(a => NormalizeStatus(a.Status) == "PRESENT"),
                    AbsentCount = g.Count(a => NormalizeStatus(a.Status) == "ABSENT"),
                    LateCount = g.Count(a => NormalizeStatus(a.Status) == "LATE"),
                    ExcusedCount = g.Count(a => NormalizeStatus(a.Status) == "EXCUSED"),
                })
                .OrderByDescending(h => h.Date)
                .ToList();

            return Ok(history);
        }

        [HttpGet("status-values")]
        [Authorize(Roles = "TEACHER, ADMIN")]
        public async Task<IActionResult> GetStatusValues()
        {
            try
            {
                // Query SQL Server system tables de lay dinh nghia CHECK constraint
                var sql = @"
                    SELECT cc.definition
                    FROM sys.check_constraints cc
                    INNER JOIN sys.columns c
                        ON cc.parent_object_id = c.object_id
                        AND cc.parent_column_id = c.column_id
                    INNER JOIN sys.tables t
                        ON cc.parent_object_id = t.object_id
                    WHERE t.name = 'Attendance'
                      AND c.name = 'Status'";

                string? definition = null;
                using (var cmd = _context.Database.GetDbConnection().CreateCommand())
                {
                    cmd.CommandText = sql;
                    if (cmd.Connection!.State != System.Data.ConnectionState.Open)
                        await cmd.Connection.OpenAsync();
                    var result = await cmd.ExecuteScalarAsync();
                    definition = result?.ToString();
                }

                return Ok(new { constraintDefinition = definition });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // POST: api/Attendances/bulk
        // POST: api/Attendances/bulk
        [HttpPost("bulk")]
        [Authorize(Roles = "TEACHER")]
        public async Task<IActionResult> BulkAttendance([FromBody] BulkAttendanceRequest request)
        {
            if (request == null || request.Records == null || request.Records.Count == 0)
                return BadRequest(new { message = "Khong co du lieu diem danh" });

            if (!DateOnly.TryParse(request.Date, out var attendanceDate))
                return BadRequest(new { message = "Ngay khong hop le (yyyy-MM-dd)" });

            var teacherId = User.FindFirst("teacherId")?.Value;
            if (!string.IsNullOrEmpty(teacherId))
            {
                var cls = await _context.Classes.AsNoTracking()
                    .FirstOrDefaultAsync(c => c.ClassId == request.ClassId);

                if (cls == null) return NotFound(new { message = "Khong tim thay lop" });
                if (cls.TeacherId != teacherId)
                    return StatusCode(403, new { message = "Ban khong day lop nay" });
            }

            int created = 0, updated = 0;

            foreach (var rec in request.Records)
            {
                var existing = await _context.Attendances
                    .FirstOrDefaultAsync(a =>
                        a.ClassId == request.ClassId &&
                        a.StudentId == rec.StudentId &&
                        a.AttendanceDate == attendanceDate);

                if (existing != null)
                {
                    existing.Status = rec.Status;
                    existing.Notes = rec.Note ?? "";
                    updated++;
                }
                else
                {
                    _context.Attendances.Add(new Attendance
                    {
                        ClassId = request.ClassId,
                        StudentId = rec.StudentId,
                        AttendanceDate = attendanceDate,
                        Status = rec.Status,
                        Notes = rec.Note ?? ""
                    });
                    created++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Da luu diem danh",
                created,
                updated,
                total = created + updated
            });
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

        // PUT: api/Attendances/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "TEACHER")]
        public async Task<IActionResult> PutAttendance(int id, Attendance attendance)
        {
            if (id != attendance.AttendanceId) return BadRequest();
            _context.Entry(attendance).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Attendances/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "TEACHER, ADMIN")]
        public async Task<IActionResult> DeleteAttendance(int id)
        {
            var attendance = await _context.Attendances.FindAsync(id);
            if (attendance == null) return NotFound();
            _context.Attendances.Remove(attendance);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    // ================= DTOs =================
    public class AttendanceResponseDto
    {
        public int AttendanceId { get; set; }
        public string ClassId { get; set; } = null!;
        public string ClassCode { get; set; } = "";
        public string SubjectName { get; set; } = "";
        public string StudentId { get; set; } = null!;
        public string StudentCode { get; set; } = "";
        public string StudentFullName { get; set; } = "";
        public DateOnly AttendanceDate { get; set; }
        public string Status { get; set; } = null!;
        public string? Notes { get; set; }
    }

    public class AttendanceHistoryDto
    {
        public string Date { get; set; } = "";
        public int PeriodStart { get; set; }
        public int PeriodEnd { get; set; }
        public string Room { get; set; } = "";
        public int TotalStudents { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int LateCount { get; set; }
        public int ExcusedCount { get; set; }
    }

    public class BulkAttendanceRequest
    {
        public string ClassId { get; set; } = "";
        public string Date { get; set; } = "";
        public List<BulkAttendanceItem> Records { get; set; } = new();
    }

    public class BulkAttendanceItem
    {
        public string StudentId { get; set; } = "";
        public string Status { get; set; } = "PRESENT";
        public string? Note { get; set; }
    }
}