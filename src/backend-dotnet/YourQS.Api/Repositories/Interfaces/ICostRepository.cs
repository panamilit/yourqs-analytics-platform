using YourQS.API.Models;

namespace YourQS.API.Repositories.Interfaces
{
    public interface ICostRepository
    {
        Task<IEnumerable<CostItem>> GetAllCostsByModelAsync(string modelHeaderId);
        Task<IEnumerable<CostItem>> GetCostsByScopeAsync(string modelHeaderId, string scopeId);
    }
}
