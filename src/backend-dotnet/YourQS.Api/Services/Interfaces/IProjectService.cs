using YourQS.API.DTOs;

namespace YourQS.API.Services.Interfaces
{
    public interface IProjectService
    {
        Task<IEnumerable<ProjectDto>> GetAllProjectsAsync();
        Task<ProjectDto?> GetProjectByIdAsync(string id);
        Task<IEnumerable<ProjectModelDto>> GetModelsByProjectAsync(string projectId);
    }
}
