using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemConfigsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SystemConfigsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/SystemConfigs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SystemConfig>>> GetSystemConfigs()
        {
            return await _context.SystemConfigs.ToListAsync();
        }

        // GET: api/SystemConfigs/MaintenanceMode
        [HttpGet("{key}")]
        public async Task<ActionResult<SystemConfig>> GetSystemConfig(string key)
        {
            var config = await _context.SystemConfigs.FindAsync(key);
            if (config == null) return NotFound();
            return config;
        }

        // POST: api/SystemConfigs
        [HttpPost]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<SystemConfig>> PostSystemConfig(SystemConfig config)
        {
            _context.SystemConfigs.Add(config);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSystemConfig), new { key = config.ConfigKey }, config);
        }

        // PUT: api/SystemConfigs/MaintenanceMode
        [HttpPut("{key}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> PutSystemConfig(string key, SystemConfig config)
        {
            if (key != config.ConfigKey) return BadRequest();
            _context.Entry(config).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SystemConfigExists(key)) return NotFound();
                throw;
            }
            return NoContent();
        }

        // DELETE: api/SystemConfigs/MaintenanceMode
        [HttpDelete("{key}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteSystemConfig(string key)
        {
            var config = await _context.SystemConfigs.FindAsync(key);
            if (config == null) return NotFound();
            _context.SystemConfigs.Remove(config);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool SystemConfigExists(string key)
        {
            return _context.SystemConfigs.Any(e => e.ConfigKey == key);
        }
    }
}