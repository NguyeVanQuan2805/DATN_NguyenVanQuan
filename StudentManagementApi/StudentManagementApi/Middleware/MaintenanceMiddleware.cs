using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using StudentManagementApi.Models;
using System.Security.Claims;
using System.Threading.Tasks;

public class MaintenanceMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _scopeFactory;

    public MaintenanceMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Bỏ qua kiểm tra cho các endpoint đặc biệt
        var path = context.Request.Path.ToString().ToLower();
        if (path.Contains("/auth/login") || path.Contains("/auth/check-maintenance"))
        {
            await _next(context);
            return;
        }

        // Kiểm tra trạng thái bảo trì
        using (var scope = _scopeFactory.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var maintenanceConfig = await dbContext.SystemConfigs
                .FirstOrDefaultAsync(c => c.ConfigKey == "MaintenanceMode");

            bool isMaintenance = maintenanceConfig != null && maintenanceConfig.ConfigValue == "1";

            if (isMaintenance)
            {
                // Kiểm tra role từ token
                var user = context.User;
                var isAdmin = user?.IsInRole("ADMIN") ?? false;

                if (!isAdmin)
                {
                    context.Response.StatusCode = 503;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
                    {
                        message = "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
                        maintenanceMode = true
                    }));
                    return;
                }
            }
        }

        await _next(context);
    }
}