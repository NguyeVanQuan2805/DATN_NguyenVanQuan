using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;
using System.Linq;

namespace StudentManagementApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomManagementController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomManagementController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/RoomManagement/rooms
        [HttpGet("rooms")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<IEnumerable<object>>> GetAllRooms(
            [FromQuery] string? building = null,
            [FromQuery] string? roomType = null,
            [FromQuery] bool? isAvailable = null)
        {
            var query = _context.Set<Room>().AsQueryable();

            if (!string.IsNullOrEmpty(building))
                query = query.Where(r => r.Building == building);

            if (!string.IsNullOrEmpty(roomType))
                query = query.Where(r => r.RoomType == roomType);

            if (isAvailable.HasValue)
                query = query.Where(r => r.IsAvailable == isAvailable.Value);

            var rooms = await query
                .Select(r => new
                {
                    r.RoomId,
                    r.RoomCode,
                    r.RoomName,
                    r.Building,
                    r.Capacity,
                    r.RoomType,
                    r.IsAvailable,
                    r.Notes,
                    r.CreatedAt
                })
                .OrderBy(r => r.Building)
                .ThenBy(r => r.RoomName)
                .ToListAsync();

            return Ok(rooms);
        }

        // GET: api/RoomManagement/rooms/{id}
        [HttpGet("rooms/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<object>> GetRoomById(int id)
        {
            var room = await _context.Set<Room>()
                .Where(r => r.RoomId == id)
                .Select(r => new
                {
                    r.RoomId,
                    r.RoomCode,
                    r.RoomName,
                    r.Building,
                    r.Capacity,
                    r.RoomType,
                    r.IsAvailable,
                    r.Notes,
                    r.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (room == null)
                return NotFound(new { message = "Không tìm thấy phòng học" });

            return Ok(room);
        }

        // POST: api/RoomManagement/rooms
        [HttpPost("rooms")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<Room>> CreateRoom([FromBody] CreateRoomDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Kiểm tra trùng mã phòng
            if (await _context.Set<Room>().AnyAsync(r => r.RoomCode == dto.RoomCode))
                return BadRequest(new { message = "Mã phòng đã tồn tại" });

            var room = new Room
            {
                RoomCode = dto.RoomCode,
                RoomName = dto.RoomName,
                Building = dto.Building,
                Capacity = dto.Capacity,
                RoomType = dto.RoomType,
                IsAvailable = dto.IsAvailable,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow
            };

            _context.Set<Room>().Add(room);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Thêm phòng học thành công",
                roomId = room.RoomId,
                room
            });
        }

        // PUT: api/RoomManagement/rooms/{id}
        [HttpPut("rooms/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateRoom(int id, [FromBody] UpdateRoomDto dto)
        {
            var room = await _context.Set<Room>().FindAsync(id);
            if (room == null)
                return NotFound(new { message = "Không tìm thấy phòng học" });

            room.RoomName = dto.RoomName ?? room.RoomName;
            room.Building = dto.Building ?? room.Building;
            room.Capacity = dto.Capacity ?? room.Capacity;
            room.RoomType = dto.RoomType ?? room.RoomType;
            room.IsAvailable = dto.IsAvailable ?? room.IsAvailable;
            room.Notes = dto.Notes ?? room.Notes;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật phòng học thành công" });
        }

        // DELETE: api/RoomManagement/rooms/{id}
        [HttpDelete("rooms/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var room = await _context.Set<Room>().FindAsync(id);
            if (room == null)
                return NotFound(new { message = "Không tìm thấy phòng học" });

            // Kiểm tra phòng có đang được sử dụng không
            var isUsed = await _context.ClassSchedules.AnyAsync(s => s.Room == room.RoomCode);
            if (isUsed)
                return BadRequest(new { message = "Không thể xóa phòng đang được sử dụng trong lịch học" });

            _context.Set<Room>().Remove(room);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa phòng học thành công" });
        }

        // GET: api/RoomManagement/buildings
        [HttpGet("buildings")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<IEnumerable<string>>> GetBuildings()
        {
            var buildings = await _context.Set<Room>()
                .Select(r => r.Building)
                .Where(b => b != null)
                .Distinct()
                .OrderBy(b => b)
                .ToListAsync();

            return Ok(buildings);
        }

        // GET: api/RoomManagement/available-rooms
        [HttpGet("available-rooms")]
        public async Task<ActionResult<IEnumerable<object>>> GetAvailableRooms(
            [FromQuery] string? dayOfWeek = null,
            [FromQuery] int? periodStart = null,
            [FromQuery] int? periodEnd = null)
        {
            var query = _context.Set<Room>().Where(r => r.IsAvailable == true);

            if (!string.IsNullOrEmpty(dayOfWeek) && periodStart.HasValue && periodEnd.HasValue)
            {
                var day = int.Parse(dayOfWeek);
                // Lấy các phòng đã có lịch vào khung giờ này
                var occupiedRooms = await _context.ClassSchedules
                    .Where(s => s.DayOfWeek == day
                             && ((periodStart >= s.PeriodStart && periodStart <= s.PeriodEnd)
                              || (periodEnd >= s.PeriodStart && periodEnd <= s.PeriodEnd)
                              || (periodStart <= s.PeriodStart && periodEnd >= s.PeriodEnd)))
                    .Select(s => s.Room)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(r => !occupiedRooms.Contains(r.RoomCode));
            }

            var rooms = await query
                .Select(r => new
                {
                    r.RoomId,
                    r.RoomCode,
                    r.RoomName,
                    r.Building,
                    r.Capacity,
                    r.RoomType
                })
                .OrderBy(r => r.Building)
                .ThenBy(r => r.RoomName)
                .ToListAsync();

            return Ok(rooms);
        }
    }

    // DTOs
    public class CreateRoomDto
    {
        public string RoomCode { get; set; } = null!;
        public string RoomName { get; set; } = null!;
        public string? Building { get; set; }
        public int Capacity { get; set; }
        public string RoomType { get; set; } = "CLASSROOM";
        public bool IsAvailable { get; set; } = true;
        public string? Notes { get; set; }
    }

    public class UpdateRoomDto
    {
        public string? RoomName { get; set; }
        public string? Building { get; set; }
        public int? Capacity { get; set; }
        public string? RoomType { get; set; }
        public bool? IsAvailable { get; set; }
        public string? Notes { get; set; }
    }
}