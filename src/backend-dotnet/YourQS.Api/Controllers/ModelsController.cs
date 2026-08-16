using Microsoft.AspNetCore.Mvc;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Controllers
{
   
[ApiController]
[Route("api/projects/{projectId}")]
public class ModelsController : ControllerBase
{
    private readonly IModelRepository _modelRepository;
    private readonly ICostRepository _costRepository;

    public ModelsController(IModelRepository modelRepository, ICostRepository costRepository)
    {
        _modelRepository = modelRepository;
        _costRepository = costRepository;
    }

    /// <summary>GET /api/projects/{projectId}/model-attributes: BIM measurements for a project</summary>
    [HttpGet("model-attributes")]
    public async Task<IActionResult> GetModelAttributes(string projectId)
    {
        var attributes = await _modelRepository.GetAttributesByProjectAsync(projectId);
        return Ok(attributes);
    }

    /// <summary>GET /api/projects/{projectId}/cost-breakdown/scope: cost breakdown by scope</summary>
    [HttpGet("cost-breakdown/scope")]
    public async Task<IActionResult> GetCostBreakdownByScope(string projectId)
    {
        var costs = await _costRepository.GetCostBreakdownByScopeAsync(projectId);
        return Ok(costs);
    }
}
}
