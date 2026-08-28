using YourQS.API.DTOs;

namespace YourQS.API.Services.Interfaces
{
    public interface IBenchmarkService
    {
        Task<BenchmarkCalculationOutcome> CalculateAsync(
            string projectId,
            BenchmarkQueryDto query);
    }
}
