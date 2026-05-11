using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Controllers;
using StudentManagementApi.Models;
using System.Security.Claims;
using System.Text.RegularExpressions;

[Route("api/[controller]")]
[ApiController]
public class AccountsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AccountsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<IEnumerable<Account>>> GetAccounts()
    {
        return await _context.Accounts
            .Select(a => new Account
            {
                AccountId = a.AccountId,
                Username = a.Username,
                FullName = a.FullName,
                Email = a.Email,
                Phone = a.Phone,
                Gender = a.Gender,
                DateOfBirth = a.DateOfBirth,
                Role = a.Role,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    [HttpGet("my-profile")]
    [Authorize]
    public async Task<ActionResult<object>> GetMyProfile()
    {
        var userId = User.FindFirst("sub")?.Value
                  ?? User.FindFirst("nameidentifier")?.Value
                  ?? User.FindFirst("accountId")?.Value   // Thêm fallback cho admin nếu token dùng claim này
                  ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized("Không tìm thấy thông tin định danh người dùng trong token");

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.AccountId == userId);

        if (account == null)
            return NotFound("Không tìm thấy tài khoản");

        return Ok(new
        {
            account.AccountId,
            account.Username,
            account.FullName,
            account.Email,
            account.Phone,
            account.Gender,
            account.DateOfBirth,
            account.Role,
            account.IsActive,
            account.CreatedAt
        });
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<ActionResult<object>> GetAccount(string id)
    {
        var currentUserId = User.FindFirst("sub")?.Value ?? User.FindFirst("nameidentifier")?.Value;
        var isAdmin = User.IsInRole("ADMIN");

        if (!isAdmin && currentUserId != id)
            return Forbid("Bạn chỉ được xem thông tin của chính mình");

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.AccountId == id);

        if (account == null) return NotFound();

        return Ok(new
        {
            account.AccountId,
            account.Username,
            account.FullName,
            account.Email,
            account.Phone,
            account.Gender,
            account.DateOfBirth,
            account.Role,
            account.IsActive,
            account.CreatedAt
        });
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<object>> PostAccount([FromBody] AccountDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Sinh AccountId tự động
        var prefixMap = new Dictionary<string, string>
    {
        { "STUDENT", "SV" },
        { "TEACHER", "GV" },
        { "ADVISOR", "CV" },
        { "ADMIN",   "AD" },
    };
        if (!prefixMap.TryGetValue(dto.Role, out var prefix))
            return BadRequest("Role không hợp lệ");

        var lastAccount = await _context.Accounts
            .Where(a => a.AccountId.StartsWith(prefix))
            .OrderByDescending(a => a.AccountId)
            .Select(a => a.AccountId)
            .FirstOrDefaultAsync();

        int nextNum = 1;
        if (lastAccount != null && Regex.Match(lastAccount, @"\d+$").Success)
        {
            nextNum = int.Parse(Regex.Match(lastAccount, @"\d+$").Value) + 1;
        }

        string newAccountId = $"{prefix}{nextNum:000}";

        // Kiểm tra trùng
        if (await _context.Accounts.AnyAsync(a => a.AccountId == newAccountId))
            return Conflict("Xung đột mã tài khoản tự động, vui lòng thử lại");

        if (await _context.Accounts.AnyAsync(a => a.Username == dto.Username))
            return BadRequest("Tên đăng nhập đã tồn tại");

        if (!string.IsNullOrEmpty(dto.Email) &&
            await _context.Accounts.AnyAsync(a => a.Email == dto.Email))
            return BadRequest("Email đã được sử dụng");
        if (!string.IsNullOrEmpty(dto.Phone) && dto.Phone.Length > 10)
            return BadRequest("Số điện thoại không hợp lệ");

        var account = new Account
        {
            AccountId = newAccountId,
            Username = dto.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            Gender = dto.Gender,
            DateOfBirth = dto.DateOfBirth.HasValue ? DateOnly.FromDateTime(dto.DateOfBirth.Value) : null,
            Role = dto.Role,
            IsActive = dto.IsActive ?? true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        if (dto.Role == "TEACHER")
        {
            // Tạo TeacherId với prefix GV và số thứ tự
            var lastTeacher = await _context.Teachers
                .OrderByDescending(t => t.TeacherId)
                .Select(t => t.TeacherId)
                .FirstOrDefaultAsync();

            int teacherNum = 1;
            if (lastTeacher != null && Regex.Match(lastTeacher, @"\d+$").Success)
            {
                teacherNum = int.Parse(Regex.Match(lastTeacher, @"\d+$").Value) + 1;
            }

            string teacherId = $"TCH{teacherNum:000}"; 

            // Đảm bảo không trùng TeacherId
            while (await _context.Teachers.AnyAsync(t => t.TeacherId == teacherId))
            {
                teacherNum++;
                teacherId = $"TCH{teacherNum:000}";
            }

            var teacher = new Teacher
            {
                TeacherId = teacherId,
                AccountId = account.AccountId,
                DepartmentId = null,  
                Position = "Giảng viên" 
            };

            _context.Teachers.Add(teacher);
            await _context.SaveChangesAsync();
        }
        // Nếu role là STUDENT, tự động tạo record trong bảng Student
        else if (dto.Role == "STUDENT")
        {
            // Tìm lớp cố vấn mặc định 
            var defaultAdvisorClass = await _context.AdvisorClasses
                .OrderBy(ac => ac.AdvisorClassId)
                .Select(ac => ac.AdvisorClassId)
                .FirstOrDefaultAsync();

            // Tạo StudentId với prefix SV và số thứ tự
            var lastStudent = await _context.Students
                .OrderByDescending(s => s.StudentId)
                .Select(s => s.StudentId)
                .FirstOrDefaultAsync();

            int studentNum = 1;
            if (lastStudent != null && Regex.Match(lastStudent, @"\d+$").Success)
            {
                studentNum = int.Parse(Regex.Match(lastStudent, @"\d+$").Value) + 1;
            }

            string studentId = $"STU{studentNum:000}";

            while (await _context.Students.AnyAsync(s => s.StudentId == studentId))
            {
                studentNum++;
                studentId = $"STU{studentNum:000}";
            }

            var student = new Student
            {
                StudentId = studentId,
                StudentCode = $"SV{DateTime.Now.Year}{studentNum:000}", // Mã sinh viên: SV2024001
                AccountId = account.AccountId,
                AdvisorClassId = defaultAdvisorClass > 0 ? defaultAdvisorClass : 1, // Gán lớp mặc định
                Major = "Chưa cập nhật",
                AdmissionYear = DateTime.Now.Year
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();
        }
        // Nếu role là ADVISOR, tự động tạo record trong bảng Advisor
        else if (dto.Role == "ADVISOR")
        {
            // Tạo AdvisorId với prefix ADV và số thứ tự
            var lastAdvisor = await _context.Advisors
                .OrderByDescending(a => a.AdvisorId)
                .Select(a => a.AdvisorId)
                .FirstOrDefaultAsync();

            int advisorNum = 1;
            if (lastAdvisor != null && Regex.Match(lastAdvisor, @"\d+$").Success)
            {
                advisorNum = int.Parse(Regex.Match(lastAdvisor, @"\d+$").Value) + 1;
            }

            string advisorId = $"ADV{advisorNum:000}";

            while (await _context.Advisors.AnyAsync(a => a.AdvisorId == advisorId))
            {
                advisorNum++;
                advisorId = $"ADV{advisorNum:000}";
            }

            var advisor = new Advisor
            {
                AdvisorId = advisorId,
                AccountId = account.AccountId,
                DepartmentId = null
            };

            _context.Advisors.Add(advisor);
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetAccount), new { id = account.AccountId }, new
        {
            account.AccountId,
            account.Username,
            account.FullName,
            account.Email,
            account.Phone,
            account.Gender,
            account.DateOfBirth,
            account.Role,
            account.IsActive,
            account.CreatedAt
        });
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> PutAccount(string id, [FromBody] AccountUpdateDto dto)
    {
        ModelState.Remove("PasswordHash");
        ModelState.Remove("Username");
        ModelState.Remove("Role");
        ModelState.Remove("AccountId");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return NotFound();

        // Cập nhật partial
        if (!string.IsNullOrEmpty(dto.FullName)) account.FullName = dto.FullName;
        if (!string.IsNullOrEmpty(dto.Email)) account.Email = dto.Email;
        if (!string.IsNullOrEmpty(dto.Phone)) account.Phone = dto.Phone;
        if (!string.IsNullOrEmpty(dto.Gender)) account.Gender = dto.Gender;
        if (dto.DateOfBirth.HasValue)
            account.DateOfBirth = DateOnly.FromDateTime(dto.DateOfBirth.Value);

        if (User.IsInRole("ADMIN"))
        {
            if (!string.IsNullOrEmpty(dto.Role)) account.Role = dto.Role;
            if (dto.IsActive.HasValue) account.IsActive = dto.IsActive.Value;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/reset-password")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return NotFound("Không tìm thấy tài khoản");

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            return BadRequest("Mật khẩu mới phải có ít nhất 6 ký tự");

        account.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đặt lại mật khẩu thành công" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteAccount(string id)
    {
        var account = await _context.Accounts
            .Include(a => a.Student)
            .Include(a => a.Teacher)
            .Include(a => a.Advisor)
            .FirstOrDefaultAsync(a => a.AccountId == id);

        if (account == null) return NotFound();

        if (account.IsActive == true)
            return BadRequest("Không thể xóa tài khoản đang hoạt động. Vui lòng khóa trước.");

        if (account.Student != null || account.Teacher != null || account.Advisor != null)
            return BadRequest("Tài khoản đang được liên kết với vai trò khác (SV/GV/CV). Không thể xóa.");

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
public class AccountDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool? IsActive { get; set; }
}

public class AccountUpdateDto
{
    public string? Username { get; set; }           
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Role { get; set; }               
    public bool? IsActive { get; set; }
}

public class ResetPasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
}


