using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services.Interfaces;

namespace YourQS.API.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IProjectRepository _projectRepository;
        private readonly IModelRepository _modelRepository;

        public ProjectService(IProjectRepository projectRepository, IModelRepository modelRepository)
        {
            _projectRepository = projectRepository;
            _modelRepository = modelRepository;
        }

        public async Task<IEnumerable<ProjectDto>> GetAllProjectsAsync()
        {
            var projects = await _projectRepository.GetAllProjectsAsync();
            return projects.Select(p => new ProjectDto
            {
                Id = p.REC_ID,
                Name = p.NAME,
                CreatedDate = p.INS_DT
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
                CreatedDate = project.INS_DT
            };
        }

        public async Task<IEnumerable<ProjectModelDto>> GetModelsByProjectAsync(string projectId)
        {
            var models = await _modelRepository.GetModelsByProjectAsync(projectId);
            return models.Select(m => new ProjectModelDto
            {
                Id = m.REC_ID,
                ProjectId = m.PROJ_REC_ID,
                Name = m.NAME,
                CreatedDate = m.INS_DT
            });
        }
    }
}
