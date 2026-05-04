using YourQS.API.Models;

namespace YourQS.API.Repositories.Interfaces
{
    public interface IModelRepository
    {
        Task<IEnumerable<ProjectModel>> GetModelsByProjectAsync(string projectId);
        Task<IEnumerable<ModelAttributes>> GetAttributesByModelAsync(string modelHeaderId);
        Task<IEnumerable<ModelAttributes>> GetAttributesByScopeAsync(string modelHeaderId, string scopeId);
    }
}
