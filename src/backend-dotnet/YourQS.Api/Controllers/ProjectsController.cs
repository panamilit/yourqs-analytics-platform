using Microsoft.AspNetCore.Mvc;
using YourQS.API.Services.Interfaces;

namespace YourQS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        /// <summary>GET /api/projects — returns all projects</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var projects = await _projectService.GetAllProjectsAsync();
            return Ok(projects);
        }

        /// <summary>GET /api/projects/{id} — returns a single project</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            if (project is null) return NotFound();
            return Ok(project);
        }

        /// <summary>GET /api/projects/{id}/models — returns BIM models for a project</summary>
        [HttpGet("{id}/models")]
        public async Task<IActionResult> GetModels(string id)
        {
            var models = await _projectService.GetModelsByProjectAsync(id);
            return Ok(models);
        }
    }
}
