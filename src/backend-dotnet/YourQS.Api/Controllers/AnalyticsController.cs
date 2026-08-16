using Microsoft.AspNetCore.Mvc;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsRepository _analyticsRepository;

        public AnalyticsController(IAnalyticsRepository analyticsRepository)
        {
            _analyticsRepository = analyticsRepository;
        }

        /// <summary>GET /api/analytics/cost-per-sqm — cost per m² for all projects</summary>
        [HttpGet("cost-per-sqm")]
        public async Task<IActionResult> GetCostPerSqm()
        {
            var results = await _analyticsRepository.GetCostPerSqmAsync();
            return Ok(results);
        }

        /// <summary>GET /api/analytics/benchmark/{projectId} — compare project cost vs dataset average, flags if >±20%</summary>
        [HttpGet("benchmark/{projectId}")]
        public async Task<IActionResult> GetBenchmark(string projectId)
        {
            var result = await _analyticsRepository.GetBenchmarkAsync(projectId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        /// <summary>GET /api/analytics/whatif/{projectId}?scopeName=Concrete&changePercent=10 — simulate a cost change</summary>
        [HttpGet("whatif/{projectId}")]
        public async Task<IActionResult> GetWhatIf(
            string projectId,
            [FromQuery] string scopeName,
            [FromQuery] double changePercent)
        {
            var result = await _analyticsRepository.GetWhatIfAsync(projectId, scopeName, changePercent);
            if (result == null) return NotFound();
            return Ok(result);
        }
    }
}