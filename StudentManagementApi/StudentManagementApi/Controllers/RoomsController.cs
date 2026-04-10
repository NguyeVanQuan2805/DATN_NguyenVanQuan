using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;

[Route("api/[controller]")]
[ApiController]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _context;

    public RoomsController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/Rooms
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetRooms(
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
                r.Notes
            })
            .OrderBy(r => r.Building)
            .ThenBy(r => r.RoomName)
            .ToListAsync();

        return Ok(rooms);
    }

    // GET: api/Rooms/1
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetRoom(int id)
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
            return NotFound();

        return Ok(room);
    }

    // GET: api/Rooms/available
    [HttpGet("available")]
    public async Task<ActionResult<IEnumerable<object>>> GetAvailableRooms(
        [FromQuery] int capacity = 0,
        [FromQuery] string? roomType = null)
    {
        var query = _context.Set<Room>().Where(r => r.IsAvailable == true);

        if (capacity > 0)
            query = query.Where(r => r.Capacity >= capacity);

        if (!string.IsNullOrEmpty(roomType))
            query = query.Where(r => r.RoomType == roomType);

        var rooms = await query
            .Select(r => new
            {
                r.RoomId,
                r.RoomCode,
                r.RoomName,
                r.Building,
                r.Capacity,
                r.RoomType,
                r.IsAvailable
            })
            .OrderBy(r => r.Building)
            .ThenBy(r => r.RoomName)
            .ToListAsync();

        return Ok(rooms);
    }

    // POST: api/Rooms
    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<ActionResult<Room>> PostRoom([FromBody] RoomCreateDto dto)
    {
        // Kiểm tra trùng mã phòng
        if (await _context.Set<Room>().AnyAsync(r => r.RoomCode == dto.RoomCode))
            return BadRequest("Mã phòng đã tồn tại");

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

        return CreatedAtAction(nameof(GetRoom), new { id = room.RoomId }, room);
    }

    // PUT: api/Rooms/1
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PutRoom(int id, [FromBody] RoomUpdateDto dto)
    {
        var room = await _context.Set<Room>().FindAsync(id);
        if (room == null)
            return NotFound();

        room.RoomName = dto.RoomName ?? room.RoomName;
        room.Building = dto.Building ?? room.Building;
        room.Capacity = dto.Capacity ?? room.Capacity;
        room.RoomType = dto.RoomType ?? room.RoomType;
        room.IsAvailable = dto.IsAvailable ?? room.IsAvailable;
        room.Notes = dto.Notes ?? room.Notes;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/Rooms/1
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteRoom(int id)
    {
        var room = await _context.Set<Room>().FindAsync(id);
        if (room == null)
            return NotFound();

        // Kiểm tra xem phòng có đang được sử dụng trong lịch học không
        var isUsed = await _context.ClassSchedules.AnyAsync(s => s.Room == room.RoomCode);
        if (isUsed)
            return BadRequest("Không thể xóa phòng đang được sử dụng trong lịch học");

        _context.Set<Room>().Remove(room);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class RoomCreateDto
{
    public string RoomCode { get; set; } = null!;
    public string RoomName { get; set; } = null!;
    public string? Building { get; set; }
    public int Capacity { get; set; }
    public string RoomType { get; set; } = "CLASSROOM";
    public bool IsAvailable { get; set; } = true;
    public string? Notes { get; set; }
}

public class RoomUpdateDto
{
    public string? RoomName { get; set; }
    public string? Building { get; set; }
    public int? Capacity { get; set; }
    public string? RoomType { get; set; }
    public bool? IsAvailable { get; set; }
    public string? Notes { get; set; }
}
