using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class TuitionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TuitionsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Tuitions/my
    [HttpGet("my")]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyTuitions(
        [FromQuery] string? semesterId = null,
        [FromQuery] string? status = null)
    {
        var studentId = User.FindFirst("studentId")?.Value;
        if (string.IsNullOrEmpty(studentId))
            return Unauthorized();

        var query = _context.Tuitions
            .Include(t => t.Semester)
            .Where(t => t.StudentId == studentId);

        if (!string.IsNullOrEmpty(semesterId))
            query = query.Where(t => t.SemesterId == semesterId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);

        var tuitions = await query
            .Select(t => new
            {
                t.TuitionId,
                t.SemesterId,
                SemesterName = t.Semester != null ? t.Semester.SemesterName : "N/A",
                t.FeeType,
                t.Amount,
                t.AmountPaid,
                Remaining = t.Amount - t.AmountPaid,
                t.DueDate,
                t.Status,
                t.Notes,
                t.CreatedAt
            })
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(tuitions);
    }

    // GET: api/Tuitions/student/{studentId}
    [HttpGet("student/{studentId}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetTuitionsByStudent(string studentId)
    {
        var tuitions = await _context.Tuitions
            .Where(t => t.StudentId == studentId)
            .Include(t => t.Semester)
            .Include(t => t.TuitionPayments)
            .Select(t => new
            {
                t.TuitionId,
                t.SemesterId,
                SemesterName = t.Semester != null ? t.Semester.SemesterName : "N/A",
                t.FeeType,
                t.Amount,
                t.AmountPaid,
                Remaining = t.Amount - t.AmountPaid,
                t.DueDate,
                t.Status,
                t.Notes,
                Payments = t.TuitionPayments.Select(p => new
                {
                    p.PaymentId,
                    p.AmountSubmitted,
                    p.PaymentDate,
                    p.Status,
                    p.ReviewNote
                })
            })
            .OrderByDescending(t => t.SemesterId)
            .ToListAsync();

        return Ok(tuitions);
    }

    // GET: api/Tuitions/{id}
    [HttpGet("{id}")]
    [Authorize]
    public async Task<ActionResult<object>> GetTuition(int id)
    {
        var studentId = User.FindFirst("studentId")?.Value;
        var isAdmin = User.IsInRole("ADMIN");
        var isAdvisor = User.IsInRole("ADVISOR");

        var tuition = await _context.Tuitions
            .Include(t => t.Semester)
            .Include(t => t.Student)
                .ThenInclude(s => s.Account)
            .Include(t => t.TuitionPayments)
            .Where(t => t.TuitionId == id)
            .Select(t => new
            {
                t.TuitionId,
                t.StudentId,
                StudentCode = t.Student != null ? t.Student.StudentCode : "N/A",
                StudentName = t.Student != null && t.Student.Account != null
                    ? t.Student.Account.FullName
                    : "N/A",
                t.SemesterId,
                SemesterName = t.Semester != null ? t.Semester.SemesterName : "N/A",
                t.FeeType,
                t.Amount,
                t.AmountPaid,
                Remaining = t.Amount - t.AmountPaid,
                t.DueDate,
                t.Status,
                t.Notes,
                Payments = t.TuitionPayments.Select(p => new
                {
                    p.PaymentId,
                    p.AmountSubmitted,
                    p.PaymentDate,
                    p.Status,
                    p.ReviewNote
                })
            })
            .FirstOrDefaultAsync();

        if (tuition == null)
            return NotFound();

        // Kiểm tra quyền
        if (!isAdmin && !isAdvisor && tuition.StudentId != studentId)
            return Forbid();

        return Ok(tuition);
    }

    // POST: api/Tuitions/payment
    [HttpPost("payment")]
    [Authorize(Roles = "STUDENT")]
    public async Task<ActionResult<object>> SubmitPayment([FromBody] PaymentSubmitDto dto)
    {
        var studentId = User.FindFirst("studentId")?.Value;
        if (string.IsNullOrEmpty(studentId))
            return Unauthorized();

        var tuition = await _context.Tuitions
            .FirstOrDefaultAsync(t => t.TuitionId == dto.TuitionId && t.StudentId == studentId);

        if (tuition == null)
            return NotFound("Không tìm thấy khoản phí");

        if (tuition.Status == "PAID")
            return BadRequest("Khoản phí này đã được thanh toán đầy đủ");

        if (dto.Amount <= 0)
            return BadRequest("Số tiền thanh toán phải lớn hơn 0");

        if (dto.Amount > (tuition.Amount - tuition.AmountPaid))
            return BadRequest("Số tiền thanh toán vượt quá số tiền còn lại");

        var payment = new TuitionPayment
        {
            TuitionId = dto.TuitionId,
            StudentId = studentId,
            AmountSubmitted = dto.Amount,
            PaymentDate = DateTime.UtcNow,
            EvidenceFile = dto.EvidenceFile,
            Status = "PENDING"
        };

        _context.TuitionPayments.Add(payment);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã gửi yêu cầu thanh toán thành công, chờ xác nhận",
            paymentId = payment.PaymentId,
            status = payment.Status
        });
    }

    // GET: api/Tuitions/payments/pending
    [HttpGet("payments/pending")]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IEnumerable<object>>> GetPendingPayments()
    {
        var payments = await _context.TuitionPayments
            .Include(p => p.Tuition)
                .ThenInclude(t => t.Semester)
            .Include(p => p.Student)
                .ThenInclude(s => s.Account)
            .Where(p => p.Status == "PENDING")
            .Select(p => new
            {
                p.PaymentId,
                p.TuitionId,
                p.StudentId,
                StudentCode = p.Student != null ? p.Student.StudentCode : "N/A",
                StudentName = p.Student != null && p.Student.Account != null
                    ? p.Student.Account.FullName
                    : "N/A",
                SemesterName = p.Tuition.Semester != null
                    ? p.Tuition.Semester.SemesterName
                    : "N/A",
                p.AmountSubmitted,
                p.PaymentDate,
                p.EvidenceFile,
                p.Status
            })
            .OrderBy(p => p.PaymentDate)
            .ToListAsync();

        return Ok(payments);
    }

    // PUT: api/Tuitions/payment/{paymentId}/confirm
    [HttpPut("payment/{paymentId}/confirm")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ConfirmPayment(int paymentId, [FromBody] PaymentConfirmDto dto)
    {
        var payment = await _context.TuitionPayments
            .Include(p => p.Tuition)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return NotFound();

        if (payment.Status != "PENDING")
            return BadRequest("Thanh toán này đã được xử lý");

        payment.Status = dto.Approved ? "APPROVED" : "REJECTED";
        payment.ReviewedBy = User.FindFirst("accountId")?.Value;
        payment.ReviewedAt = DateTime.UtcNow;
        payment.ReviewNote = dto.ReviewNote;

        if (dto.Approved)
        {
            payment.Tuition.AmountPaid += payment.AmountSubmitted;
            payment.Tuition.UpdatedAt = DateTime.UtcNow;

            if (payment.Tuition.AmountPaid >= payment.Tuition.Amount)
                payment.Tuition.Status = "PAID";
            else
                payment.Tuition.Status = "PARTIAL";
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = dto.Approved ? "Đã xác nhận thanh toán" : "Đã từ chối thanh toán",
            paymentId = payment.PaymentId,
            status = payment.Status
        });
    }

    // POST: api/Tuitions/create-batch
    [HttpPost("create-batch")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateTuitionBatch([FromBody] TuitionBatchDto dto)
    {
        // Validate semester
        var semester = await _context.Semesters.FindAsync(dto.SemesterId);
        if (semester == null)
            return BadRequest("Học kỳ không tồn tại");

        // Lấy danh sách sinh viên theo năm nhập học
        var students = await _context.Students
            .Where(s => s.AdmissionYear <= dto.ForYear)
            .Select(s => s.StudentId)
            .ToListAsync();

        if (!students.Any())
            return BadRequest("Không có sinh viên nào trong năm nhập học này");

        int created = 0;
        int skipped = 0;

        foreach (var studentId in students)
        {
            var existing = await _context.Tuitions
                .AnyAsync(t => t.StudentId == studentId && t.SemesterId == dto.SemesterId);

            if (!existing)
            {
                var tuition = new Tuition
                {
                    StudentId = studentId,
                    SemesterId = dto.SemesterId,
                    FeeType = "TUITION",
                    Amount = dto.BaseAmount,
                    AmountPaid = 0,
                    DueDate = semester.EndDate.AddDays(-30),
                    Status = "UNPAID",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Tuitions.Add(tuition);
                created++;
            }
            else
            {
                skipped++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Đã tạo {created} khoản học phí cho học kỳ {dto.SemesterId}",
            totalStudents = students.Count,
            created,
            skipped
        });
    }

    // PUT: api/Tuitions/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateTuition(int id, [FromBody] TuitionUpdateDto dto)
    {
        var tuition = await _context.Tuitions.FindAsync(id);
        if (tuition == null)
            return NotFound();

        if (dto.Amount.HasValue)
            tuition.Amount = dto.Amount.Value;

        if (dto.DueDate.HasValue)
            tuition.DueDate = dto.DueDate.Value;

        if (!string.IsNullOrEmpty(dto.Status))
            tuition.Status = dto.Status;

        if (!string.IsNullOrEmpty(dto.Notes))
            tuition.Notes = dto.Notes;

        tuition.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật học phí thành công" });
    }

    // DELETE: api/Tuitions/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteTuition(int id)
    {
        var tuition = await _context.Tuitions
            .Include(t => t.TuitionPayments)
            .FirstOrDefaultAsync(t => t.TuitionId == id);

        if (tuition == null)
            return NotFound();

        if (tuition.TuitionPayments.Any(p => p.Status == "APPROVED"))
            return BadRequest("Không thể xóa học phí đã có thanh toán được xác nhận");

        _context.Tuitions.Remove(tuition);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa học phí thành công" });
    }
}

// DTOs
public class PaymentSubmitDto
{
    public int TuitionId { get; set; }
    public decimal Amount { get; set; }
    public string? EvidenceFile { get; set; }
}

public class PaymentConfirmDto
{
    public bool Approved { get; set; }
    public string? ReviewNote { get; set; }
}

public class TuitionBatchDto
{
    public string SemesterId { get; set; } = null!;
    public int ForYear { get; set; }
    public decimal BaseAmount { get; set; }
}

public class TuitionUpdateDto
{
    public decimal? Amount { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}