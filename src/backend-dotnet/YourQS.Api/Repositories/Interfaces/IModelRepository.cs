using YourQS.API.Models;

namespace YourQS.API.Repositories.Interfaces
{
    public interface IModelRepository
    {
        Task<IEnumerable<ModelAttributes>> GetAttributesByProjectAsync(string projectId);
    }
}
