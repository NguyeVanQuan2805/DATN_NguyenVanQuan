// Controllers/AuthController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StudentManagementApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.Password))
                return BadRequest("Username và password không được để trống");

            // KIỂM TRA CHẾ ĐỘ BẢO TRÌ
            var maintenanceMode = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MaintenanceMode");

            bool isMaintenance = maintenanceMode != null && maintenanceMode.ConfigValue == "1";

            var account = await _context.Accounts
                .Include(a => a.Student)
                .Include(a => a.Teacher)
                .Include(a => a.Advisor)
                .FirstOrDefaultAsync(a => a.Username == model.Username);

            if (account == null)
                return Unauthorized("Tài khoản không tồn tại");

            // Nếu đang bảo trì, chỉ ADMIN mới được đăng nhập
            if (isMaintenance && account.Role != "ADMIN")
            {
                return StatusCode(503, new
                {
                    message = "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
                    maintenanceMode = true
                });
            }

            if (!account.IsActive.GetValueOrDefault(true))
                return Unauthorized("Tài khoản đã bị khóa");

            if (!BCrypt.Net.BCrypt.Verify(model.Password, account.PasswordHash))
                return Unauthorized("Mật khẩu không đúng");

            var token = GenerateJwtToken(account);
            return Ok(new
            {
                token,
                user = new
                {
                    username = account.Username,
                    fullName = account.FullName,
                    role = account.Role,
                    accountId = account.AccountId,
                    studentId = account.Student != null ? account.Student.StudentId : null,
                    teacherId = account.Teacher != null ? account.Teacher.TeacherId : null,
                    advisorId = account.Advisor != null ? account.Advisor.AdvisorId : null,
                }
            });
        }
        // Controllers/AuthController.cs - Thêm method
        [HttpGet("check-maintenance")]
        public async Task<IActionResult> CheckMaintenance()
        {
            var maintenanceConfig = await _context.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MaintenanceMode");

            bool isMaintenance = maintenanceConfig != null && maintenanceConfig.ConfigValue == "1";

            return Ok(new { maintenanceMode = isMaintenance });
        }

        private string GenerateJwtToken(Account account)
        {
            var securityKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
            );

            var credentials = new SigningCredentials(
                securityKey, SecurityAlgorithms.HmacSha256
            );

            var claims = new List<Claim>
            {

                new Claim(JwtRegisteredClaimNames.Sub, account.AccountId.ToString()),
                new Claim("username", account.Username),
                new Claim("fullName", account.FullName ?? ""),
                new Claim("role", account.Role),
                new Claim(ClaimTypes.Role, account.Role),

                new Claim("accountId", account.AccountId),
            };

            if (account.Role == "TEACHER" && account.Teacher != null)
            {
                claims.Add(new Claim("teacherId", account.Teacher.TeacherId));
            }
            if (account.Role == "STUDENT" && account.Student != null)
                claims.Add(new Claim("studentId", account.Student.StudentId));
            if (account.Role == "ADVISOR" && account.Advisor != null)
            {
                claims.Add(new Claim("advisorId", account.Advisor.AdvisorId));
            }

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginModel
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}