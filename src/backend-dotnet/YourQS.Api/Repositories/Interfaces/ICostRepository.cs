using YourQS.API.Models;

namespace YourQS.API.Repositories.Interfaces
{
    public interface ICostRepository
    {
        Task<IEnumerable<CostItem>> GetCostBreakdownByScopeAsync(string projectId);
    }
}
