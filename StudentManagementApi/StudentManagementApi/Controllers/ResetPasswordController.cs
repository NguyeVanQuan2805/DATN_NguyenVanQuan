// Ví dụ: Tạo file tạm ResetPasswordController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;
using BCrypt.Net;

[Route("api/[controller]")]
[ApiController]
public class ResetController : ControllerBase
{
    private readonly AppDbContext _context;

    public ResetController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("reset-admin")]
    public async Task<IActionResult> ResetAdmin()
    {
        var admin = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Username == "admin");

        if (admin == null)
            return NotFound("Không tìm thấy admin");

        string newPassword = "123456";                  // ← Bạn có thể đổi thành password mong muốn
        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã reset password admin thành công!",
            newHash = admin.PasswordHash,               // copy cái này để kiểm tra
            username = "admin",
            password_moi = newPassword
        });
    }
}