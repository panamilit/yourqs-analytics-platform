using Microsoft.AspNetCore.Mvc;

namespace YourQS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { message = "Backend is running" });
    }
}