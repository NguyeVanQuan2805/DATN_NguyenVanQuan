using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CurriculumController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CurriculumController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Curriculum/curriculums
        [HttpGet("curriculums")]
        [Authorize(Roles = "ADMIN,ADVISOR")]
        public async Task<IActionResult> GetAllCurriculums()
        {
            try
            {
                var curriculums = await _context.Set<Curriculum>()
                    .OrderByDescending(c => c.CohortYear)
                    .Select(c => new
                    {
                        c.CurriculumId,
                        c.CurriculumCode,
                        c.CurriculumName,
                        c.Major,
                        c.CohortYear,
                        c.TotalCredits,
                        c.DepartmentId,
                        c.Status,
                        c.CreatedAt
                    })
                    .ToListAsync();

                return Ok(curriculums);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Curriculum/curriculums/{id}
        [HttpGet("curriculums/{id}")]
        [Authorize(Roles = "ADMIN,ADVISOR,STUDENT")]
        public async Task<IActionResult> GetCurriculumById(int id)
        {
            try
            {
                var curriculum = await _context.Set<Curriculum>()
                    .Where(c => c.CurriculumId == id)
                    .Select(c => new
                    {
                        c.CurriculumId,
                        c.CurriculumCode,
                        c.CurriculumName,
                        c.Major,
                        c.CohortYear,
                        c.TotalCredits,
                        c.DepartmentId,
                        c.Status,
                        c.CreatedAt,
                        c.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                if (curriculum == null)
                    return NotFound(new { message = "Không tìm thấy chương trình đào tạo" });

                // Lấy danh sách môn học trong chương trình
                var subjects = await _context.Set<CurriculumSubject>()
                    .Where(cs => cs.CurriculumId == id)
                    .Join(_context.Subjects,
                        cs => cs.SubjectId,
                        s => s.SubjectId,
                        (cs, s) => new
                        {
                            cs.CurriculumSubjectId,
                            cs.SubjectId,
                            s.SubjectCode,
                            s.SubjectName,
                            s.Credits,
                            s.Type,
                            cs.SubjectType,
                            cs.RecommendedSemester,
                            cs.IsRequired
                        })
                    .OrderBy(cs => cs.RecommendedSemester)
                    .ThenBy(cs => cs.SubjectCode)
                    .ToListAsync();

                // Nhóm theo học kỳ
                var groupedBySemester = subjects
                    .GroupBy(s => s.RecommendedSemester)
                    .Select(g => new
                    {
                        Semester = g.Key,
                        SemesterName = $"Học kỳ {g.Key}",
                        TotalCredits = g.Sum(s => s.Credits),
                        Subjects = g.Select(s => new
                        {
                            s.SubjectCode,
                            s.SubjectName,
                            s.Credits,
                            s.Type,
                            s.SubjectType,
                            s.IsRequired,
                            IsRequiredText = s.IsRequired ? "Bắt buộc" : "Tự chọn"
                        })
                    })
                    .OrderBy(g => g.Semester);

                return Ok(new
                {
                    curriculum,
                    subjects,
                    groupedBySemester,
                    totalSubjects = subjects.Count,
                    totalRequiredCredits = subjects.Where(s => s.IsRequired).Sum(s => s.Credits),
                    totalElectiveCredits = subjects.Where(s => !s.IsRequired).Sum(s => s.Credits)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/Curriculum/curriculums
        [HttpPost("curriculums")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CreateCurriculum([FromBody] CreateCurriculumDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Kiểm tra trùng mã
                if (await _context.Set<Curriculum>().AnyAsync(c => c.CurriculumCode == dto.CurriculumCode))
                    return BadRequest(new { message = "Mã chương trình đã tồn tại" });

                var curriculum = new Curriculum
                {
                    CurriculumCode = dto.CurriculumCode,
                    CurriculumName = dto.CurriculumName,
                    Major = dto.Major,
                    CohortYear = dto.CohortYear,
                    TotalCredits = dto.TotalCredits,
                    DepartmentId = dto.DepartmentId,
                    Status = "ACTIVE",
                    CreatedBy = User.FindFirst("accountId")?.Value,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Set<Curriculum>().Add(curriculum);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Tạo chương trình đào tạo thành công",
                    curriculumId = curriculum.CurriculumId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/Curriculum/curriculums/{id}
        [HttpPut("curriculums/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateCurriculum(int id, [FromBody] UpdateCurriculumDto dto)
        {
            try
            {
                var curriculum = await _context.Set<Curriculum>().FindAsync(id);
                if (curriculum == null)
                    return NotFound(new { message = "Không tìm thấy chương trình" });

                curriculum.CurriculumName = dto.CurriculumName ?? curriculum.CurriculumName;
                curriculum.TotalCredits = dto.TotalCredits ?? curriculum.TotalCredits;
                curriculum.Status = dto.Status ?? curriculum.Status;
                curriculum.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật chương trình thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/Curriculum/curriculums/{id}
        [HttpDelete("curriculums/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteCurriculum(int id)
        {
            try
            {
                var curriculum = await _context.Set<Curriculum>()
                    .Include(c => c.CurriculumSubjects)
                    .FirstOrDefaultAsync(c => c.CurriculumId == id);

                if (curriculum == null)
                    return NotFound(new { message = "Không tìm thấy chương trình" });

                // Kiểm tra có sinh viên nào đang theo chương trình này không
                var hasStudents = await _context.Students.AnyAsync(s => s.Major == curriculum.Major);
                if (hasStudents)
                    return BadRequest(new { message = "Không thể xóa chương trình đang có sinh viên theo học" });

                _context.Set<Curriculum>().Remove(curriculum);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa chương trình thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/Curriculum/curriculums/{id}/subjects
        [HttpPost("curriculums/{id}/subjects")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> AddSubjectToCurriculum(int id, [FromBody] AddSubjectDto dto)
        {
            try
            {
                var curriculum = await _context.Set<Curriculum>().FindAsync(id);
                if (curriculum == null)
                    return NotFound(new { message = "Không tìm thấy chương trình" });

                // Kiểm tra môn học tồn tại
                var subject = await _context.Subjects.FindAsync(dto.SubjectId);
                if (subject == null)
                    return BadRequest(new { message = "Môn học không tồn tại" });

                // Kiểm tra trùng
                var existing = await _context.Set<CurriculumSubject>()
                    .AnyAsync(cs => cs.CurriculumId == id && cs.SubjectId == dto.SubjectId);

                if (existing)
                    return BadRequest(new { message = "Môn học đã có trong chương trình" });

                var curriculumSubject = new CurriculumSubject
                {
                    CurriculumId = id,
                    SubjectId = dto.SubjectId,
                    SubjectType = dto.SubjectType,
                    RecommendedSemester = dto.RecommendedSemester,
                    IsRequired = dto.IsRequired
                };

                _context.Set<CurriculumSubject>().Add(curriculumSubject);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Thêm môn học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/Curriculum/curriculums/{id}/subjects/{subjectId}
        [HttpDelete("curriculums/{id}/subjects/{subjectId}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> RemoveSubjectFromCurriculum(int id, string subjectId)
        {
            try
            {
                var curriculumSubject = await _context.Set<CurriculumSubject>()
                    .FirstOrDefaultAsync(cs => cs.CurriculumId == id && cs.SubjectId == subjectId);

                if (curriculumSubject == null)
                    return NotFound(new { message = "Không tìm thấy môn học trong chương trình" });

                _context.Set<CurriculumSubject>().Remove(curriculumSubject);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa môn học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/Curriculum/curriculums/{id}/subjects/{subjectId}
        [HttpPut("curriculums/{id}/subjects/{subjectId}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateSubjectInCurriculum(int id, string subjectId, [FromBody] UpdateSubjectDto dto)
        {
            try
            {
                var curriculumSubject = await _context.Set<CurriculumSubject>()
                    .FirstOrDefaultAsync(cs => cs.CurriculumId == id && cs.SubjectId == subjectId);

                if (curriculumSubject == null)
                    return NotFound(new { message = "Không tìm thấy môn học trong chương trình" });

                curriculumSubject.SubjectType = dto.SubjectType ?? curriculumSubject.SubjectType;
                curriculumSubject.RecommendedSemester = dto.RecommendedSemester ?? curriculumSubject.RecommendedSemester;
                curriculumSubject.IsRequired = dto.IsRequired ?? curriculumSubject.IsRequired;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật môn học thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Curriculum/majors
        [HttpGet("majors")]
        [Authorize(Roles = "ADMIN,ADVISOR")]
        public async Task<IActionResult> GetMajors()
        {
            try
            {
                var majors = await _context.Set<Curriculum>()
                    .Select(c => c.Major)
                    .Distinct()
                    .OrderBy(m => m)
                    .ToListAsync();

                return Ok(majors);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Curriculum/student/{studentId}
        [HttpGet("student/{studentId}")]
        [Authorize(Roles = "STUDENT,ADVISOR,ADMIN")]
        public async Task<IActionResult> GetCurriculumByStudent(string studentId)
        {
            try
            {
                var student = await _context.Students
                    .FirstOrDefaultAsync(s => s.StudentId == studentId);

                if (student == null)
                    return NotFound(new { message = "Không tìm thấy sinh viên" });

                var curriculum = await _context.Set<Curriculum>()
                    .Where(c => c.Major == student.Major && c.CohortYear <= student.AdmissionYear)
                    .OrderByDescending(c => c.CohortYear)
                    .FirstOrDefaultAsync();

                if (curriculum == null)
                    return NotFound(new { message = "Chưa có chương trình đào tạo cho ngành này" });

                // Lấy chi tiết chương trình
                return await GetCurriculumById(curriculum.CurriculumId);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    // DTOs
    public class CreateCurriculumDto
    {
        public string CurriculumCode { get; set; } = null!;
        public string CurriculumName { get; set; } = null!;
        public string Major { get; set; } = null!;
        public int CohortYear { get; set; }
        public int TotalCredits { get; set; }
        public string? DepartmentId { get; set; }
    }

    public class UpdateCurriculumDto
    {
        public string? CurriculumName { get; set; }
        public int? TotalCredits { get; set; }
        public string? Status { get; set; }
    }

    public class AddSubjectDto
    {
        public string SubjectId { get; set; } = null!;
        public string SubjectType { get; set; } = "CORE";
        public int RecommendedSemester { get; set; }
        public bool IsRequired { get; set; }
    }

    public class UpdateSubjectDto
    {
        public string? SubjectType { get; set; }
        public int? RecommendedSemester { get; set; }
        public bool? IsRequired { get; set; }
    }
}