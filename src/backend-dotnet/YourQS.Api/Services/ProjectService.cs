using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services.Interfaces;

namespace YourQS.API.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IProjectRepository _projectRepository;

        public ProjectService(IProjectRepository projectRepository)
        {
            _projectRepository = projectRepository;
        }

        public async Task<IEnumerable<ProjectDto>> GetAllProjectsAsync()
        {
            var projects = await _projectRepository.GetAllProjectsAsync();
            return projects.Select(p => new ProjectDto
            {
                Id = p.REC_ID,
                Name = p.NAME,
            });
        }

        public async Task<ProjectDto?> GetProjectByIdAsync(string id)
        {
            var project = await _projectRepository.GetProjectByIdAsync(id);
            if (project is null) return null;

            return new ProjectDto
            {
                Id = project.REC_ID,
                Name = project.NAME,
            };
        }
    }
}
