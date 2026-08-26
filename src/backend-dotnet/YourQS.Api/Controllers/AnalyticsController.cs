using Microsoft.AspNetCore.Mvc;
using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services.Interfaces;

namespace YourQS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsRepository _analyticsRepository;
        private readonly IWhatIfService _whatIfService;

        public AnalyticsController(
            IAnalyticsRepository analyticsRepository,
            IWhatIfService whatIfService)
        {
            _analyticsRepository = analyticsRepository;
            _whatIfService = whatIfService;
        }

        [HttpGet("cost-per-sqm")]
        public async Task<IActionResult> GetCostPerSqm()
        {
            var results = await _analyticsRepository.GetCostPerSqmAsync();
            return Ok(results);
        }

        [HttpGet("benchmark/{projectId}")]
        public async Task<IActionResult> GetBenchmark(string projectId)
        {
            var result = await _analyticsRepository.GetBenchmarkAsync(projectId);
            if (result == null) return NotFound();
            return Ok(result);
        }

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

        [HttpPost("what-if")]
        [ProducesResponseType(typeof(MaterialWhatIfDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
        public async Task<IActionResult> CalculateMaterialWhatIf(
            [FromBody] MaterialWhatIfRequestDto request)
        {
            var outcome = await _whatIfService.CalculateAsync(request);

            if (outcome.IsSuccess)
            {
                return Ok(outcome.Result);
            }

            var problem = new ProblemDetails
            {
                Title = "What-if simulation could not be calculated",
                Detail = outcome.ErrorMessage,
                Status = outcome.ErrorCode == "model_not_found"
                    ? StatusCodes.Status404NotFound
                    : StatusCodes.Status422UnprocessableEntity
            };
            problem.Extensions["code"] = outcome.ErrorCode;

            return StatusCode(problem.Status.Value, problem);
        }
    }
}
