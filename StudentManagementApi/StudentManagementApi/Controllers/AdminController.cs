using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        public AdminController(AppDbContext context)
        {
            _context = context;
        }
        [Authorize(Roles = "ADMIN")]
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = new
            {
                TotalSubjects = await _context.Subjects.CountAsync(),
                TotalClasses = await _context.Classes.CountAsync(),
                TotalAccounts = await _context.Accounts.CountAsync(),
                ActiveClasses = await _context.Classes.CountAsync(c => c.Status == "OPEN"),
                PendingRegistrations = await _context.CourseRegistrations.CountAsync(r => r.Status == "PENDING"),
                WarningsActive = await _context.Warnings.CountAsync(w => w.Status == "ACTIVE"),
                MaintenanceMode = await _context.SystemConfigs
                    .AnyAsync(c => c.ConfigKey == "MaintenanceMode" && c.ConfigValue == "1"),
            };

            return Ok(stats);
        }
    }
}
