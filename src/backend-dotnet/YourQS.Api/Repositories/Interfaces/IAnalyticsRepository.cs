using YourQS.API.DTOs;

namespace YourQS.API.Repositories.Interfaces
{
    public interface IAnalyticsRepository
    {
        Task<IEnumerable<CostPerSqmDto>> GetCostPerSqmAsync();
        Task<BenchmarkDto?> GetBenchmarkAsync(string projectId);
        Task<WhatIfDto?> GetWhatIfAsync(string projectId, string scopeName, double changePercent);
    }
}