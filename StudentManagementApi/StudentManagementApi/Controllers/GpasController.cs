using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GpasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GpasController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Gpas
        [HttpGet]
        [Authorize(Roles = "ADMIN, ADVISOR")]
        public async Task<ActionResult<IEnumerable<object>>> GetGpas()
        {
            try
            {
                var gpas = await _context.Gpas
                    .Include(g => g.Student)
                        .ThenInclude(s => s.Account)
                    .Include(g => g.Semester)
                    .Select(g => new
                    {
                        g.Gpaid,
                        g.StudentId,
                        StudentCode = g.Student != null ? g.Student.StudentCode : "N/A",
                        StudentName = g.Student != null && g.Student.Account != null
                            ? g.Student.Account.FullName
                            : "N/A",
                        g.SemesterId,
                        SemesterName = g.Semester != null ? g.Semester.SemesterName : "N/A",
                        g.Gpa1,
                        g.CumulativeGpa,
                        g.TotalCreditsEarned,
                        g.TotalCreditsRegistered
                    })
                    .ToListAsync();

                return Ok(gpas);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetGpas: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tải danh sách GPA", error = ex.Message });
            }
        }

        // GET: api/Gpas/1
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<object>> GetGpa(int id)
        {
            try
            {
                var gpa = await _context.Gpas
                    .Include(g => g.Student)
                        .ThenInclude(s => s.Account)
                    .Include(g => g.Semester)
                    .Where(g => g.Gpaid == id)
                    .Select(g => new
                    {
                        g.Gpaid,
                        g.StudentId,
                        StudentCode = g.Student != null ? g.Student.StudentCode : "N/A",
                        StudentName = g.Student != null && g.Student.Account != null
                            ? g.Student.Account.FullName
                            : "N/A",
                        g.SemesterId,
                        SemesterName = g.Semester != null ? g.Semester.SemesterName : "N/A",
                        g.Gpa1,
                        g.CumulativeGpa,
                        g.TotalCreditsEarned,
                        g.TotalCreditsRegistered
                    })
                    .FirstOrDefaultAsync();

                if (gpa == null)
                    return NotFound(new { message = $"Không tìm thấy GPA với ID: {id}" });

                return Ok(gpa);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetGpa: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tải GPA", error = ex.Message });
            }
        }

        // GET: api/Gpas/student/{studentId} - QUAN TRỌNG NHẤT
        [HttpGet("student/{studentId}")]
        [Authorize(Roles = "ADMIN,ADVISOR,STUDENT")]
        public async Task<ActionResult<IEnumerable<object>>> GetGpasByStudent(string studentId)
        {
            try
            {
                Console.WriteLine($"[DEBUG] GetGpasByStudent called for StudentId: {studentId}");

                // Kiểm tra quyền truy cập
                var authCheck = await CheckAuthorization(studentId);
                if (authCheck != null)
                {
                    return authCheck;
                }

                // Kiểm tra sinh viên tồn tại
                var studentExists = await _context.Students.AnyAsync(s => s.StudentId == studentId);
                if (!studentExists)
                {
                    return NotFound(new { message = $"Không tìm thấy sinh viên với ID: {studentId}" });
                }

                // Lấy tất cả GPA đã có trong database
                var existingGpas = await _context.Gpas
                    .Include(g => g.Semester)
                    .Where(g => g.StudentId == studentId)
                    .ToListAsync();

                Console.WriteLine($"[DEBUG] Found {existingGpas.Count} existing GPA records");

                // Lấy tất cả học kỳ mà sinh viên đã có điểm APPROVED
                var semestersWithGrades = await _context.Grades
                    .Include(g => g.Class)
                    .Where(g => g.StudentId == studentId
                        && g.TotalScore.HasValue
                        && g.Status == "APPROVED")
                    .Select(g => g.Class.SemesterId)
                    .Distinct()
                    .ToListAsync();

                Console.WriteLine($"[DEBUG] Found {semestersWithGrades.Count} semesters with grades");

                // Tìm các học kỳ chưa có GPA record
                var existingSemesterIds = existingGpas.Select(g => g.SemesterId).ToHashSet();
                var missingSemesterIds = semestersWithGrades.Where(s => !existingSemesterIds.Contains(s)).ToList();

                Console.WriteLine($"[DEBUG] Missing semesters: {missingSemesterIds.Count}");

                // Tính GPA cho các học kỳ thiếu
                foreach (var semesterId in missingSemesterIds)
                {
                    try
                    {
                        var calculatedGpa = await CalculateAndSaveGpa(studentId, semesterId);
                        if (calculatedGpa != null)
                        {
                            existingGpas.Add(calculatedGpa);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[ERROR] Failed to calculate GPA for semester {semesterId}: {ex.Message}");
                    }
                }

                // Cập nhật cumulative GPA cho tất cả các học kỳ
                await UpdateAllCumulativeGpa(studentId, existingGpas);

                // Trả về kết quả
                var result = existingGpas
                    .Where(g => g.Semester != null)
                    .Select(g => new
                    {
                        g.Gpaid,
                        g.StudentId,
                        g.SemesterId,
                        Semester = new
                        {
                            g.Semester.SemesterId,
                            g.Semester.SemesterName,
                            g.Semester.AcademicYear,
                            g.Semester.SemesterNumber
                        },
                        g.Gpa1,
                        g.CumulativeGpa,
                        g.TotalCreditsEarned,
                        g.TotalCreditsRegistered
                    })
                    .OrderByDescending(g => g.Semester.AcademicYear)
                    .ThenByDescending(g => g.Semester.SemesterNumber)
                    .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetGpasByStudent: {ex.Message}");
                Console.WriteLine($"[ERROR] StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = "Lỗi server khi tải GPA", error = ex.Message });
            }
        }

        // POST: api/Gpas/calculate/{studentId}/{semesterId}
        [HttpPost("calculate/{studentId}/{semesterId}")]
        [Authorize(Roles = "ADMIN,ADVISOR,STUDENT")]
        public async Task<ActionResult<object>> CalculateGpa(string studentId, string semesterId)
        {
            try
            {
                var grades = await _context.Grades
                    .Include(g => g.Class)
                        .ThenInclude(c => c.Subject)
                    .Include(g => g.Class)
                        .ThenInclude(c => c.Semester)
                    .Where(g => g.StudentId == studentId
                             && g.Class.SemesterId == semesterId
                             && g.TotalScore.HasValue
                             && g.Status == "APPROVED")
                    .ToListAsync();

                if (!grades.Any())
                    return Ok(new { message = "Chưa có điểm trong học kỳ này", hasData = false });

                var (semesterGpa, earnedCredits, registeredCredits) = CalculateSemesterGpa(grades);

                // Tính cumulative GPA đến học kỳ này
                var cumulativeGpa = await CalculateCumulativeGpa(studentId, semesterId);

                // Tìm hoặc tạo GPA record
                var existingGpa = await _context.Gpas
                    .FirstOrDefaultAsync(g => g.StudentId == studentId && g.SemesterId == semesterId);

                if (existingGpa == null)
                {
                    existingGpa = new Gpa
                    {
                        StudentId = studentId,
                        SemesterId = semesterId,
                        Gpa1 = Math.Round(semesterGpa, 2),
                        CumulativeGpa = Math.Round(cumulativeGpa, 2),
                        TotalCreditsEarned = earnedCredits,
                        TotalCreditsRegistered = registeredCredits
                    };
                    _context.Gpas.Add(existingGpa);
                }
                else
                {
                    existingGpa.Gpa1 = Math.Round(semesterGpa, 2);
                    existingGpa.CumulativeGpa = Math.Round(cumulativeGpa, 2);
                    existingGpa.TotalCreditsEarned = earnedCredits;
                    existingGpa.TotalCreditsRegistered = registeredCredits;
                    _context.Gpas.Update(existingGpa);
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    semesterGpa = Math.Round(semesterGpa, 2),
                    cumulativeGpa = Math.Round(cumulativeGpa, 2),
                    earnedCredits,
                    registeredCredits,
                    hasData = true
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CalculateGpa: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tính GPA", error = ex.Message });
            }
        }

        // GET: api/Gpas/real-time/{studentId}
        [HttpGet("real-time/{studentId}")]
        [Authorize(Roles = "ADMIN,ADVISOR,STUDENT")]
        public async Task<ActionResult<IEnumerable<object>>> GetRealTimeGpa(string studentId)
        {
            try
            {
                var authCheck = await CheckAuthorization(studentId);
                if (authCheck != null)
                {
                    return authCheck;
                }

                var semesters = await _context.Grades
                    .Include(g => g.Class)
                        .ThenInclude(c => c.Semester)
                    .Where(g => g.StudentId == studentId
                        && g.TotalScore.HasValue
                        && g.Status == "APPROVED")
                    .Select(g => g.Class.Semester)
                    .Distinct()
                    .OrderBy(s => s.AcademicYear)
                    .ThenBy(s => s.SemesterNumber)
                    .ToListAsync();

                var result = new List<object>();

                foreach (var semester in semesters)
                {
                    var grades = await _context.Grades
                        .Include(g => g.Class)
                            .ThenInclude(c => c.Subject)
                        .Where(g => g.StudentId == studentId
                            && g.Class.SemesterId == semester.SemesterId
                            && g.TotalScore.HasValue
                            && g.Status == "APPROVED")
                        .ToListAsync();

                    var (semesterGpa, earnedCredits, registeredCredits) = CalculateSemesterGpa(grades);
                    var cumulativeGpa = await CalculateCumulativeGpa(studentId, semester.SemesterId);

                    result.Add(new
                    {
                        StudentId = studentId,
                        SemesterId = semester.SemesterId,
                        Semester = new
                        {
                            semester.SemesterId,
                            semester.SemesterName,
                            semester.AcademicYear,
                            semester.SemesterNumber
                        },
                        Gpa1 = Math.Round(semesterGpa, 2),
                        CumulativeGpa = Math.Round(cumulativeGpa, 2),
                        TotalCreditsEarned = earnedCredits,
                        TotalCreditsRegistered = registeredCredits
                    });
                }

                return Ok(result.OrderByDescending(r => ((dynamic)r).Semester.AcademicYear)
                               .ThenByDescending(r => ((dynamic)r).Semester.SemesterNumber));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRealTimeGpa: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tính GPA realtime", error = ex.Message });
            }
        }

        // POST: api/Gpas
        [HttpPost]
        [Authorize(Roles = "ADMIN, ADVISOR")]
        public async Task<ActionResult<Gpa>> PostGpa(Gpa gpa)
        {
            _context.Gpas.Add(gpa);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetGpa), new { id = gpa.Gpaid }, gpa);
        }

        // PUT: api/Gpas/1
        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN, ADVISOR")]
        public async Task<IActionResult> PutGpa(int id, Gpa gpa)
        {
            if (id != gpa.Gpaid) return BadRequest();
            _context.Entry(gpa).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Gpas/1
        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteGpa(int id)
        {
            var gpa = await _context.Gpas.FindAsync(id);
            if (gpa == null) return NotFound();
            _context.Gpas.Remove(gpa);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // POST: api/Gpas/calculate-all/{studentId}
        [HttpPost("calculate-all/{studentId}")]
        [Authorize(Roles = "ADMIN,ADVISOR")]
        public async Task<ActionResult> CalculateAllGpaForStudent(string studentId)
        {
            try
            {
                var semesters = await _context.Grades
                    .Include(g => g.Class)
                    .Where(g => g.StudentId == studentId
                        && g.TotalScore.HasValue
                        && g.Status == "APPROVED")
                    .Select(g => g.Class.SemesterId)
                    .Distinct()
                    .ToListAsync();

                foreach (var semesterId in semesters)
                {
                    await CalculateGpa(studentId, semesterId);
                }

                return Ok(new { message = $"Đã tính GPA cho {semesters.Count} học kỳ" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CalculateAllGpaForStudent: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi tính GPA", error = ex.Message });
            }
        }

        // GET: api/Gpas/debug - Thêm endpoint debug
        [HttpGet("debug")]
        [AllowAnonymous]
        public async Task<IActionResult> DebugGpas()
        {
            try
            {
                var count = await _context.Gpas.CountAsync();
                var sample = await _context.Gpas
                    .Take(5)
                    .Select(g => new { g.Gpaid, g.StudentId, g.SemesterId, g.Gpa1, g.CumulativeGpa })
                    .ToListAsync();

                return Ok(new { success = true, count = count, sample = sample });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        // ============================================================
        // Private Helper Methods
        // ============================================================

        private async Task<ActionResult?> CheckAuthorization(string studentId)
        {
            var currentUserId = User.FindFirst("sub")?.Value;
            var isAdmin = User.IsInRole("ADMIN");
            var isAdvisor = User.IsInRole("ADVISOR");
            var isStudent = User.IsInRole("STUDENT");

            if (isAdmin || isAdvisor)
            {
                return null; // Admin và Advisor có thể xem tất cả
            }

            if (isStudent)
            {
                var studentIdFromClaim = User.FindFirst("studentId")?.Value;

                if (string.IsNullOrEmpty(studentIdFromClaim))
                {
                    var student = await _context.Students
                        .FirstOrDefaultAsync(s => s.AccountId == currentUserId);

                    if (student == null)
                        return Forbid("Không tìm thấy thông tin sinh viên");

                    if (student.StudentId != studentId)
                        return Forbid("Bạn chỉ được xem GPA của chính mình");
                }
                else
                {
                    if (studentIdFromClaim != studentId)
                        return Forbid("Bạn chỉ được xem GPA của chính mình");
                }
            }

            return null;
        }

        private (decimal semesterGpa, int earnedCredits, int registeredCredits) CalculateSemesterGpa(List<Grade> grades)
        {
            decimal totalPoints = 0;
            int earnedCredits = 0;
            int registeredCredits = 0;

            foreach (var grade in grades)
            {
                var credits = grade.Class?.Subject?.Credits ?? 0;
                var point = grade.TotalScore ?? 0;
                registeredCredits += credits;

                if (point >= 5)
                {
                    decimal gpaPoint = point switch
                    {
                        >= 8.5m => 4.0m,
                        >= 8.0m => 3.7m,
                        >= 7.0m => 3.0m,
                        >= 6.5m => 2.7m,
                        >= 5.5m => 2.0m,
                        >= 5.0m => 1.7m,
                        _ => 0.0m
                    };
                    totalPoints += gpaPoint * credits;
                    earnedCredits += credits;
                }
            }

            var semesterGpa = earnedCredits > 0 ? totalPoints / earnedCredits : 0;
            return (semesterGpa, earnedCredits, registeredCredits);
        }

        private async Task<decimal> CalculateCumulativeGpa(string studentId, string currentSemesterId)
        {
            var currentSemester = await _context.Semesters
                .FirstOrDefaultAsync(s => s.SemesterId == currentSemesterId);

            if (currentSemester == null) return 0;

            var allGrades = await _context.Grades
                .Include(g => g.Class)
                    .ThenInclude(c => c.Subject)
                .Include(g => g.Class)
                    .ThenInclude(c => c.Semester)
                .Where(g => g.StudentId == studentId
                    && g.TotalScore.HasValue
                    && g.Status == "APPROVED"
                    && (g.Class.Semester.AcademicYear < currentSemester.AcademicYear
                        || (g.Class.Semester.AcademicYear == currentSemester.AcademicYear
                            && g.Class.Semester.SemesterNumber <= currentSemester.SemesterNumber)))
                .ToListAsync();

            decimal totalPoints = 0;
            int totalCredits = 0;

            foreach (var grade in allGrades)
            {
                var credits = grade.Class?.Subject?.Credits ?? 0;
                var point = grade.TotalScore ?? 0;

                if (point >= 5)
                {
                    decimal gpaPoint = point switch
                    {
                        >= 8.5m => 4.0m,
                        >= 8.0m => 3.7m,
                        >= 7.0m => 3.0m,
                        >= 6.5m => 2.7m,
                        >= 5.5m => 2.0m,
                        >= 5.0m => 1.7m,
                        _ => 0.0m
                    };

                    totalPoints += gpaPoint * credits;
                    totalCredits += credits;
                }
            }

            return totalCredits > 0 ? totalPoints / totalCredits : 0;
        }

        private async Task<Gpa?> CalculateAndSaveGpa(string studentId, string semesterId)
        {
            var grades = await _context.Grades
                .Include(g => g.Class)
                    .ThenInclude(c => c.Subject)
                .Include(g => g.Class)
                    .ThenInclude(c => c.Semester)
                .Where(g => g.StudentId == studentId
                         && g.Class.SemesterId == semesterId
                         && g.TotalScore.HasValue
                         && g.Status == "APPROVED")
                .ToListAsync();

            if (!grades.Any()) return null;

            var (semesterGpa, earnedCredits, registeredCredits) = CalculateSemesterGpa(grades);
            var cumulativeGpa = await CalculateCumulativeGpa(studentId, semesterId);

            var semester = await _context.Semesters.FindAsync(semesterId);
            if (semester == null) return null;

            var newGpa = new Gpa
            {
                StudentId = studentId,
                SemesterId = semesterId,
                Gpa1 = Math.Round(semesterGpa, 2),
                CumulativeGpa = Math.Round(cumulativeGpa, 2),
                TotalCreditsEarned = earnedCredits,
                TotalCreditsRegistered = registeredCredits
            };

            _context.Gpas.Add(newGpa);
            await _context.SaveChangesAsync();

            return await _context.Gpas
                .Include(g => g.Semester)
                .FirstOrDefaultAsync(g => g.StudentId == studentId && g.SemesterId == semesterId);
        }

        private async Task UpdateAllCumulativeGpa(string studentId, List<Gpa> gpas)
        {
            var sortedGpas = gpas
                .Where(g => g.Semester != null)
                .OrderBy(g => g.Semester.AcademicYear)
                .ThenBy(g => g.Semester.SemesterNumber)
                .ToList();

            foreach (var gpa in sortedGpas)
            {
                var cumulativeGpa = await CalculateCumulativeGpa(studentId, gpa.SemesterId);
                gpa.CumulativeGpa = Math.Round(cumulativeGpa, 2);
                _context.Gpas.Update(gpa);
            }

            await _context.SaveChangesAsync();
        }
    }
}