using Microsoft.AspNetCore.Mvc;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ModelsController : ControllerBase
    {
        private readonly IModelRepository _modelRepository;
        private readonly ICostRepository _costRepository;

        public ModelsController(IModelRepository modelRepository, ICostRepository costRepository)
        {
            _modelRepository = modelRepository;
            _costRepository = costRepository;
        }

        /// <summary>GET /api/models/{modelHeaderId}/attributes — all attributes for a model</summary>
        [HttpGet("{modelHeaderId}/attributes")]
        public async Task<IActionResult> GetAttributes(string modelHeaderId)
        {
            var attributes = await _modelRepository.GetAttributesByModelAsync(modelHeaderId);
            return Ok(attributes);
        }

        /// <summary>GET /api/models/{modelHeaderId}/attributes/by-scope?scopeId=EXTERIOR</summary>
        [HttpGet("{modelHeaderId}/attributes/by-scope")]
        public async Task<IActionResult> GetAttributesByScope(string modelHeaderId, [FromQuery] string scopeId)
        {
            if (string.IsNullOrWhiteSpace(scopeId))
                return BadRequest("scopeId query parameter is required.");

            var attributes = await _modelRepository.GetAttributesByScopeAsync(modelHeaderId, scopeId);
            return Ok(attributes);
        }

        /// <summary>GET /api/models/{modelHeaderId}/costs — all cost items for a model</summary>
        [HttpGet("{modelHeaderId}/costs")]
        public async Task<IActionResult> GetCosts(string modelHeaderId)
        {
            var costs = await _costRepository.GetAllCostsByModelAsync(modelHeaderId);
            return Ok(costs);
        }

        /// <summary>GET /api/models/{modelHeaderId}/costs/by-scope?scopeId=EXTERIOR</summary>
        [HttpGet("{modelHeaderId}/costs/by-scope")]
        public async Task<IActionResult> GetCostsByScope(string modelHeaderId, [FromQuery] string scopeId)
        {
            if (string.IsNullOrWhiteSpace(scopeId))
                return BadRequest("scopeId query parameter is required.");

            var costs = await _costRepository.GetCostsByScopeAsync(modelHeaderId, scopeId);
            return Ok(costs);
        }
    }
}
