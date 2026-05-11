using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.DTOs;
using StudentManagementApi.Models;
using StudentManagementApi.Services;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

[Route("api/[controller]")]
[ApiController]
public class StudentsController : ControllerBase
{
    private readonly IAcademicService _academicService;
    private readonly AppDbContext _context;
    private readonly ILogger<StudentsController> _logger;

    public StudentsController(AppDbContext context, IAcademicService academicService, ILogger<StudentsController> logger)
    {
        _context = context;
        _academicService = academicService;
        _logger = logger;
    }

    // GET: api/Students
    [HttpGet]
    [Authorize(Roles = "ADMIN,ADVISOR")]
    public async Task<IActionResult> GetStudents([FromQuery] string? accountId = null)
    {
        try
        {
            var query = _context.Students
                .Include(s => s.Account)
                .Include(s => s.AdvisorClass)
                    .ThenInclude(ac => ac.Advisor)
                        .ThenInclude(a => a.Account)
                .AsQueryable();

            if (!string.IsNullOrEmpty(accountId))
            {
                query = query.Where(s => s.AccountId == accountId);
            }

            var students = await query
                .Select(s => new
                {
                    s.StudentId,
                    s.StudentCode,
                    s.AccountId,
                    FullName = s.Account != null ? s.Account.FullName : "Chưa cập nhật",
                    Email = s.Account != null ? s.Account.Email : null,
                    Phone = s.Account != null ? s.Account.Phone : null,
                    Gender = s.Account != null ? s.Account.Gender : null,
                    DateOfBirth = s.Account != null ? s.Account.DateOfBirth : null,
                    s.Major,
                    s.AdmissionYear,
                    AdvisorClass = s.AdvisorClass != null ? new
                    {
                        s.AdvisorClass.AdvisorClassId,
                        s.AdvisorClass.ClassCode,
                        s.AdvisorClass.ClassName,
                        Advisor = s.AdvisorClass.Advisor != null ? new
                        {
                            s.AdvisorClass.Advisor.AdvisorId,
                            AdvisorName = s.AdvisorClass.Advisor.Account != null ? s.AdvisorClass.Advisor.Account.FullName : "Chưa có tên"
                        } : null
                    } : null,
                    // Thống kê thêm
                    TotalCreditsEarned = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.TotalCreditsEarned)
                        .FirstOrDefault(),
                    CurrentGpa = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.CumulativeGpa)
                        .FirstOrDefault(),
                    ActiveWarningsCount = _context.Warnings
                        .Count(w => w.StudentId == s.StudentId && w.Status == "ACTIVE")
                })
                .OrderBy(s => s.StudentCode)
                .ToListAsync();

            return Ok(students);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetStudents");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // GET: api/Students/{id}
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetStudent(string id)
    {
        try
        {
            // Kiểm tra quyền: STUDENT chỉ xem được thông tin của mình
            var currentUserId = User.FindFirst("accountId")?.Value;
            var currentStudentId = User.FindFirst("studentId")?.Value;
            var isAdmin = User.IsInRole("ADMIN");
            var isAdvisor = User.IsInRole("ADVISOR");

            if (!isAdmin && !isAdvisor && currentStudentId != id)
            {
                // Thử tìm theo AccountId nếu không phải studentId
                var studentByAccountCheck = await _context.Students
                    .FirstOrDefaultAsync(s => s.AccountId == currentUserId);
                if (studentByAccountCheck?.StudentId != id)
                {
                    return Forbid("Bạn chỉ được xem thông tin của chính mình");
                }
            }

            var studentData = await _context.Students
                .Include(s => s.Account)
                .Include(s => s.AdvisorClass)
                    .ThenInclude(ac => ac.Advisor)
                        .ThenInclude(a => a.Account)
                .Where(s => s.StudentId == id)
                .Select(s => new
                {
                    s.StudentId,
                    s.StudentCode,
                    s.AccountId,
                    FullName = s.Account != null ? s.Account.FullName : "Chưa cập nhật",
                    Email = s.Account != null ? s.Account.Email : null,
                    Phone = s.Account != null ? s.Account.Phone : null,
                    Gender = s.Account != null ? s.Account.Gender : null,
                    DateOfBirth = s.Account != null ? s.Account.DateOfBirth : null,
                    s.Major,
                    s.AdmissionYear,
                    AdvisorClass = s.AdvisorClass != null ? new
                    {
                        s.AdvisorClass.AdvisorClassId,
                        s.AdvisorClass.ClassCode,
                        s.AdvisorClass.ClassName,
                        s.AdvisorClass.AcademicYear,
                        Advisor = s.AdvisorClass.Advisor != null ? new
                        {
                            s.AdvisorClass.Advisor.AdvisorId,
                            s.AdvisorClass.Advisor.DepartmentId,
                            AdvisorName = s.AdvisorClass.Advisor.Account != null ? s.AdvisorClass.Advisor.Account.FullName : "Chưa có tên",
                            AdvisorEmail = s.AdvisorClass.Advisor.Account != null ? s.AdvisorClass.Advisor.Account.Email : null,
                            AdvisorPhone = s.AdvisorClass.Advisor.Account != null ? s.AdvisorClass.Advisor.Account.Phone : null
                        } : null
                    } : null,
                    // Thống kê thêm
                    TotalCreditsEarned = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.TotalCreditsEarned)
                        .FirstOrDefault(),
                    CurrentGpa = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.CumulativeGpa)
                        .FirstOrDefault(),
                    ActiveWarningsCount = _context.Warnings
                        .Count(w => w.StudentId == s.StudentId && w.Status == "ACTIVE"),
                    RegistrationCount = _context.CourseRegistrations
                        .Count(r => r.StudentId == s.StudentId && r.Status == "APPROVED")
                })
                .FirstOrDefaultAsync();

            if (studentData == null)
            {
                // Thử tìm theo AccountId nếu không tìm thấy theo StudentId
                var studentByAccountData = await _context.Students
                    .Include(s => s.Account)
                    .Include(s => s.AdvisorClass)
                        .ThenInclude(ac => ac.Advisor)
                            .ThenInclude(a => a.Account)
                    .Where(s => s.AccountId == id)
                    .Select(s => new
                    {
                        s.StudentId,
                        s.StudentCode,
                        s.AccountId,
                        FullName = s.Account != null ? s.Account.FullName : "Chưa cập nhật",
                        Email = s.Account != null ? s.Account.Email : null,
                        Phone = s.Account != null ? s.Account.Phone : null,
                        Gender = s.Account != null ? s.Account.Gender : null,
                        DateOfBirth = s.Account != null ? s.Account.DateOfBirth : null,
                        s.Major,
                        s.AdmissionYear,
                        AdvisorClass = s.AdvisorClass != null ? new
                        {
                            s.AdvisorClass.AdvisorClassId,
                            s.AdvisorClass.ClassCode,
                            s.AdvisorClass.ClassName,
                            Advisor = s.AdvisorClass.Advisor != null ? new
                            {
                                s.AdvisorClass.Advisor.AdvisorId,
                                AdvisorName = s.AdvisorClass.Advisor.Account != null ? s.AdvisorClass.Advisor.Account.FullName : "Chưa có tên"
                            } : null
                        } : null,
                        TotalCreditsEarned = _context.Gpas
                            .Where(g => g.StudentId == s.StudentId)
                            .OrderByDescending(g => g.Semester.AcademicYear)
                            .Select(g => g.TotalCreditsEarned)
                            .FirstOrDefault(),
                        CurrentGpa = _context.Gpas
                            .Where(g => g.StudentId == s.StudentId)
                            .OrderByDescending(g => g.Semester.AcademicYear)
                            .Select(g => g.CumulativeGpa)
                            .FirstOrDefault(),
                        ActiveWarningsCount = _context.Warnings
                            .Count(w => w.StudentId == s.StudentId && w.Status == "ACTIVE"),
                        RegistrationCount = _context.CourseRegistrations
                            .Count(r => r.StudentId == s.StudentId && r.Status == "APPROVED")
                    })
                    .FirstOrDefaultAsync();

                if (studentByAccountData != null)
                {
                    return Ok(studentByAccountData);
                }

                return NotFound(new { message = $"Không tìm thấy sinh viên với ID: {id}" });
            }

            return Ok(studentData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetStudent for ID: {Id}", id);
            return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    // GET: api/Students/by-account/{accountId}
    [HttpGet("by-account/{accountId}")]
    [Authorize]
    public async Task<IActionResult> GetStudentByAccountId(string accountId)
    {
        try
        {
            var student = await _context.Students
                .Include(s => s.Account)
                .Include(s => s.AdvisorClass)
                    .ThenInclude(ac => ac.Advisor)
                        .ThenInclude(a => a.Account)
                .FirstOrDefaultAsync(s => s.AccountId == accountId);

            if (student == null)
            {
                return NotFound(new { message = $"Không tìm thấy sinh viên với AccountId: {accountId}" });
            }

            return Ok(student);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetStudentByAccountId for AccountId: {AccountId}", accountId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // POST: api/Students
    [HttpPost]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<ActionResult<Student>> PostStudent(Student student)
    {
        _context.Students.Add(student);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetStudent), new { id = student.StudentId }, student);
    }

    // PUT: api/Students/STU001
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN, ADVISOR")]
    public async Task<IActionResult> PutStudent(string id, Student student)
    {
        if (id != student.StudentId) return BadRequest();
        _context.Entry(student).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Students/STU001
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteStudent(string id)
    {
        var student = await _context.Students.FindAsync(id);
        if (student == null) return NotFound();
        _context.Students.Remove(student);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/Students/advisor-class/{advisorId}
    [HttpGet("advisor-class/{advisorId}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetStudentsByAdvisor(string advisorId)
    {
        try
        {
            var advisorClasses = await _context.AdvisorClasses
                .Where(ac => ac.AdvisorId == advisorId)
                .Select(ac => ac.AdvisorClassId)
                .ToListAsync();

            if (!advisorClasses.Any()) return Ok(new List<object>());

            var students = await _context.Students
                .Include(s => s.Account)
                .Include(s => s.AdvisorClass)
                .Where(s => advisorClasses.Contains(s.AdvisorClassId))
                .Select(s => new
                {
                    s.StudentId,
                    s.StudentCode,
                    FullName = s.Account != null ? s.Account.FullName : "Chưa cập nhật",
                    Email = s.Account != null ? s.Account.Email : null,
                    Phone = s.Account != null ? s.Account.Phone : null,
                    AdvisorClassName = s.AdvisorClass != null ? s.AdvisorClass.ClassName : null,
                    AdmissionYear = s.AdmissionYear,
                    Major = s.Major,
                    CurrentGpa = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.CumulativeGpa)
                        .FirstOrDefault(),
                    WarningCount = _context.Warnings
                        .Count(w => w.StudentId == s.StudentId && w.Status == "ACTIVE")
                })
                .OrderBy(s => s.FullName)
                .ToListAsync();

            return Ok(students);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetStudentsByAdvisor for AdvisorId: {AdvisorId}", advisorId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // GET: api/Students/by-advisor-class/{advisorClassId}
    [HttpGet("by-advisor-class/{advisorClassId}")]
    [Authorize(Roles = "ADVISOR,ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetStudentsByAdvisorClass(int advisorClassId)
    {
        try
        {
            var students = await _context.Students
                .Where(s => s.AdvisorClassId == advisorClassId)
                .Include(s => s.Account)
                .Select(s => new
                {
                    s.StudentId,
                    s.StudentCode,
                    FullName = s.Account != null ? s.Account.FullName : "Chưa cập nhật",
                    Email = s.Account != null ? s.Account.Email : null,
                    Phone = s.Account != null ? s.Account.Phone : null,
                    Gender = s.Account != null ? s.Account.Gender : null,
                    s.Major,
                    s.AdmissionYear,
                    AccountId = s.AccountId,
                    CurrentGpa = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.CumulativeGpa)
                        .FirstOrDefault(),
                    TotalCredits = _context.Gpas
                        .Where(g => g.StudentId == s.StudentId)
                        .OrderByDescending(g => g.Semester.AcademicYear)
                        .Select(g => g.TotalCreditsEarned)
                        .FirstOrDefault()
                })
                .OrderBy(s => s.FullName)
                .ToListAsync();

            _logger.LogInformation("Found {Count} students for class {AdvisorClassId}", students.Count, advisorClassId);
            return Ok(students);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetStudentsByAdvisorClass for AdvisorClassId: {AdvisorClassId}", advisorClassId);
            return StatusCode(500, new
            {
                message = "Lỗi server khi lấy danh sách sinh viên",
                error = ex.Message
            });
        }
    }

    // GET: api/Students/{studentId}/advisor
    [HttpGet("{studentId}/advisor")]
    [Authorize(Roles = "STUDENT,ADMIN,ADVISOR")]
    public async Task<ActionResult<object>> GetStudentAdvisor(string studentId)
    {
        try
        {
            // Kiểm tra quyền
            var currentStudentId = User.FindFirst("studentId")?.Value;
            var isAdmin = User.IsInRole("ADMIN");
            var isAdvisor = User.IsInRole("ADVISOR");

            if (!isAdmin && !isAdvisor && currentStudentId != studentId)
            {
                return Forbid("Bạn chỉ được xem thông tin cố vấn của chính mình");
            }

            var student = await _context.Students
                .Include(s => s.AdvisorClass)
                    .ThenInclude(ac => ac.Advisor)
                        .ThenInclude(a => a.Account)
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (student == null)
                return NotFound(new { message = "Không tìm thấy sinh viên" });

            if (student.AdvisorClass?.Advisor == null)
                return NotFound(new { message = "Sinh viên chưa được gán cố vấn học tập" });

            var advisor = student.AdvisorClass.Advisor;
            var account = advisor.Account;

            return Ok(new
            {
                advisorId = advisor.AdvisorId,
                fullName = account?.FullName ?? "Chưa cập nhật",
                email = account?.Email,
                phone = account?.Phone,
                departmentId = advisor.DepartmentId,
                advisorClass = new
                {
                    student.AdvisorClass.AdvisorClassId,
                    student.AdvisorClass.ClassCode,
                    student.AdvisorClass.ClassName
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetStudentAdvisor for StudentId: {StudentId}", studentId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // GET: api/Students/my-program-progress
    [HttpGet("my-program-progress")]
    [Authorize]
    public async Task<IActionResult> GetMyProgramProgress()
    {
        try
        {
            var studentId = User.FindFirst("studentId")?.Value;
            if (string.IsNullOrEmpty(studentId))
            {
                var accountId = User.FindFirst("accountId")?.Value;
                var studentByAccount = await _context.Students
                    .FirstOrDefaultAsync(s => s.AccountId == accountId);
                if (studentByAccount == null)
                {
                    return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });
                }
                studentId = studentByAccount.StudentId;
            }

            // Lấy thông tin sinh viên
            var currentStudent = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (currentStudent == null)
            {
                return NotFound(new { message = "Không tìm thấy sinh viên" });
            }

            var curriculum = await _context.Curriculums
                .FirstOrDefaultAsync(c => c.Major == currentStudent.Major
                    && c.CohortYear <= currentStudent.AdmissionYear
                    && c.Status == "ACTIVE");

            if (curriculum == null)
            {
                curriculum = await _context.Curriculums
                    .FirstOrDefaultAsync(c => c.Major == currentStudent.Major && c.Status == "ACTIVE");
            }

            if (curriculum == null)
            {
                curriculum = new Curriculum
                {
                    CurriculumCode = "CTTT-CNTT-2024",
                    CurriculumName = "Chương trình đào tạo cử nhân công nghệ thông tin",
                    Major = currentStudent.Major ?? "Công nghệ thông tin",
                    CohortYear = currentStudent.AdmissionYear,
                    TotalCredits = 120,
                    Status = "ACTIVE"
                };
            }

            int totalCreditsRequired = curriculum.TotalCredits;

            // Lấy điểm đã được duyệt 
            var approvedGrades = await _context.Grades
                .Where(g => g.StudentId == studentId && g.Status == "APPROVED" && g.TotalScore >= 4)
                .Include(g => g.Class)
                    .ThenInclude(c => c.Subject)
                .ToListAsync();

            int completedCredits = approvedGrades
                .Sum(g => g.Class?.Subject?.Credits ?? 0);

            // Tính GPA tích lũy
            var latestGpa = await _context.Gpas
                .Where(g => g.StudentId == studentId)
                .OrderByDescending(g => g.Semester.AcademicYear)
                .ThenByDescending(g => g.Semester.SemesterNumber)
                .Select(g => g.CumulativeGpa)
                .FirstOrDefaultAsync();

            int finalCompletedCredits = Math.Min(completedCredits, totalCreditsRequired);
            int remainingCredits = totalCreditsRequired - finalCompletedCredits;
            double progressPercent = totalCreditsRequired > 0
                ? Math.Round((double)finalCompletedCredits / totalCreditsRequired * 100, 2)
                : 0;
            // Tính GPA theo thang điểm 4 từ điểm chữ (nếu chưa có GPA trong bảng Gpas)
            double calculatedGpa = (double)latestGpa;
            if (calculatedGpa == 0 && approvedGrades.Any())
            {
                double totalPoints = 0;
                int totalCreditsWithGrade = 0;
                foreach (var grade in approvedGrades)
                {
                    var credits = grade.Class?.Subject?.Credits ?? 0;
                    var gpaValue = GetGpaValue(grade.LetterGrade);
                    totalPoints += gpaValue * credits;
                    totalCreditsWithGrade += credits;
                }
                calculatedGpa = totalCreditsWithGrade > 0 ? totalPoints / totalCreditsWithGrade : 0;
            }

            var result = new
            {
                programId = curriculum.CurriculumId.ToString(),
                programName = curriculum.CurriculumName,
                programCode = curriculum.CurriculumCode,
                totalCreditsRequired = totalCreditsRequired,
                completedCredits = finalCompletedCredits,
                remainingCredits = remainingCredits,
                completedCreditsRaw = completedCredits,
                progressPercent = progressPercent,
                gpa = Math.Round(calculatedGpa, 2),
                major = currentStudent.Major,
                admissionYear = currentStudent.AdmissionYear,
                trainingProgram = new
                {
                    programId = curriculum.CurriculumId.ToString(),
                    programCode = curriculum.CurriculumCode,
                    programName = curriculum.CurriculumName,
                    totalCredits = totalCreditsRequired,
                    major = curriculum.Major,
                    cohortYear = curriculum.CohortYear
                }
            };

            _logger.LogInformation("Student {StudentId}: Completed {CompletedCredits}/{TotalCredits} credits, GPA: {Gpa}",
                studentId, completedCredits, totalCreditsRequired, calculatedGpa);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMyProgramProgress");
            return StatusCode(500, new
            {
                message = "Lỗi khi lấy thông tin tiến độ học tập",
                error = ex.Message
            });
        }
    }


    // GET: api/Students/academic-summary
    [HttpGet("academic-summary")]
    [Authorize(Roles = "STUDENT,ADMIN,ADVISOR")]
    public async Task<ActionResult<AcademicSummaryDto>> GetAcademicSummary([FromQuery] bool includeDetails = false)
    {
        string? studentId;

        // Lấy studentId từ claim
        if (User.IsInRole("STUDENT"))
        {
            studentId = User.FindFirst("studentId")?.Value;

            // Fallback: tìm từ AccountId
            if (string.IsNullOrEmpty(studentId))
            {
                var accountId = User.FindFirst("accountId")?.Value ?? User.FindFirst("sub")?.Value;
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.AccountId == accountId);
                studentId = student?.StudentId;
            }
        }
        else
        {
            // ADMIN hoặc ADVISOR có thể truyền studentId qua query
            studentId = Request.Query["studentId"].ToString();
            if (string.IsNullOrEmpty(studentId))
            {
                return BadRequest(new { message = "Vui lòng cung cấp studentId" });
            }
        }

        if (string.IsNullOrEmpty(studentId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin sinh viên" });
        }

        try
        {
            var summary = await _academicService.GetStudentAcademicSummary(studentId, includeDetails);
            return Ok(summary);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = $"Không tìm thấy sinh viên với ID: {studentId}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting academic summary for student {StudentId}", studentId);
            return StatusCode(500, new { message = "Lỗi server khi lấy dữ liệu học tập", error = ex.Message });
        }
    }

    // GET: api/Students/graduation-eligibility
    [HttpGet("graduation-eligibility")]
    [Authorize(Roles = "STUDENT,ADMIN,ADVISOR")]
    public async Task<ActionResult<GraduationEligibilityDto>> GetGraduationEligibility()
    {
        string? studentId = User.FindFirst("studentId")?.Value;

        if (string.IsNullOrEmpty(studentId))
        {
            var accountId = User.FindFirst("accountId")?.Value;
            var student = await _context.Students.FirstOrDefaultAsync(s => s.AccountId == accountId);
            studentId = student?.StudentId;
        }

        if (string.IsNullOrEmpty(studentId))
            return Unauthorized();

        var eligibility = await _academicService.CheckGraduationEligibility(studentId);
        return Ok(eligibility);
    }

    // POST: api/Students/recalculate-gpa/{studentId}
    [HttpPost("recalculate-gpa/{studentId}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<RecalculationResultDto>> RecalculateGpa(string studentId)
    {
        var result = await _academicService.RecalculateAllGpa(studentId);
        if (result.Success)
            return Ok(result);
        return StatusCode(500, result);
    }

    private double GetGpaValue(string letterGrade)
    {
        if (string.IsNullOrEmpty(letterGrade)) return 0;

        return letterGrade.ToUpper() switch
        {
            "A" => 4.0,
            "A-" => 3.7,
            "B+" => 3.5,
            "B" => 3.0,
            "B-" => 2.7,
            "C+" => 2.5,
            "C" => 2.0,
            "C-" => 1.7,
            "D+" => 1.5,
            "D" => 1.0,
            "D-" => 0.7,
            "F" => 0.0,
            _ => 0.0
        };
    }
}