using Microsoft.AspNetCore.Mvc;
using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Validation;

namespace YourQS.API.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectOverviewController : ControllerBase
{
    private readonly IProjectOverviewRepository _repository;

    public ProjectOverviewController(
        IProjectOverviewRepository repository)
    {
        _repository = repository;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ProjectsSummaryDto>> GetSummary()
    {
        var summary = await _repository.GetSummaryAsync();
        return Ok(summary);
    }

    [HttpGet("overview")]
    public async Task<ActionResult<ProjectsPageDto>> GetProjects(
        [FromQuery] ProjectOverviewQuery query)
    {
        var errors = ProjectOverviewQueryValidator.Validate(query);

        if (errors.Count > 0)
        {
            var problem = new ValidationProblemDetails(errors)
            {
                Title = "One or more query parameters are invalid.",
                Status = StatusCodes.Status422UnprocessableEntity
            };

            return UnprocessableEntity(problem);
        }

        var projects = await _repository.GetProjectsAsync(query);
        return Ok(projects);
    }
}