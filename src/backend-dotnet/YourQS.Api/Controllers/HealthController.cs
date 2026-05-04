using Microsoft.AspNetCore.Mvc;

namespace YourQS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { message = "YourQS API is running" });
        }
    }
}
