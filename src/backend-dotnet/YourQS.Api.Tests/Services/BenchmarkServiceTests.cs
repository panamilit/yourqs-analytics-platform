using Xunit;
using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services;

namespace YourQS.Api.Tests.Services;

public class BenchmarkServiceTests
{
    [Fact]
    public async Task CalculateAsync_ReturnsPeerStatisticsAndAboveFlag()
    {
        var repository = new FakeAnalyticsRepository(
            Target(1_500m),
            Peer("peer-1", 900m),
            Peer("peer-2", 1_000m),
            Peer("peer-3", 1_100m));
        var service = new BenchmarkService(repository);

        var outcome = await service.CalculateAsync(" project-1 ", DefaultQuery());

        Assert.True(outcome.IsSuccess);
        Assert.NotNull(outcome.Result);
        Assert.Equal(3, outcome.Result.PeerCount);
        Assert.Equal(1_000m, outcome.Result.AverageCostPerSqm);
        Assert.Equal(1_000m, outcome.Result.MedianCostPerSqm);
        Assert.Equal(900m, outcome.Result.MinimumCostPerSqm);
        Assert.Equal(1_100m, outcome.Result.MaximumCostPerSqm);
        Assert.Equal(50m, outcome.Result.VariancePercent);
        Assert.Equal(80m, outcome.Result.MinimumComparableFloorArea);
        Assert.Equal(120m, outcome.Result.MaximumComparableFloorArea);
        Assert.True(outcome.Result.IsFlagged);
        Assert.Equal("above", outcome.Result.FlagDirection);
        Assert.Equal("project-1", repository.LastProjectId);
    }

    [Fact]
    public async Task CalculateAsync_ReturnsBelowFlag()
    {
        var repository = new FakeAnalyticsRepository(
            Target(700m),
            Peer("peer-1", 900m),
            Peer("peer-2", 1_000m),
            Peer("peer-3", 1_100m));
        var service = new BenchmarkService(repository);

        var outcome = await service.CalculateAsync("project-1", DefaultQuery());

        Assert.True(outcome.Result!.IsFlagged);
        Assert.Equal(-30m, outcome.Result.VariancePercent);
        Assert.Equal("below", outcome.Result.FlagDirection);
    }

    [Fact]
    public async Task CalculateAsync_DoesNotFlagVarianceEqualToThreshold()
    {
        var repository = new FakeAnalyticsRepository(
            Target(1_200m),
            Peer("peer-1", 900m),
            Peer("peer-2", 1_000m),
            Peer("peer-3", 1_100m));
        var service = new BenchmarkService(repository);

        var outcome = await service.CalculateAsync("project-1", DefaultQuery());

        Assert.False(outcome.Result!.IsFlagged);
        Assert.Equal(20m, outcome.Result.VariancePercent);
        Assert.Equal("within", outcome.Result.FlagDirection);
        Assert.Equal(string.Empty, outcome.Result.FlagReason);
    }

    [Fact]
    public async Task CalculateAsync_UsesMiddleTwoValuesForEvenMedian()
    {
        var repository = new FakeAnalyticsRepository(
            Target(1_000m),
            Peer("peer-1", 800m),
            Peer("peer-2", 1_000m),
            Peer("peer-3", 1_200m),
            Peer("peer-4", 2_000m));
        var service = new BenchmarkService(repository);
        var query = DefaultQuery();
        query.MinimumPeers = 4;

        var outcome = await service.CalculateAsync("project-1", query);

        Assert.Equal(1_100m, outcome.Result!.MedianCostPerSqm);
        Assert.Equal(1_250m, outcome.Result.AverageCostPerSqm);
    }

    [Fact]
    public async Task CalculateAsync_ReturnsProjectNotReadyWhenTargetIsMissing()
    {
        var service = new BenchmarkService(new FakeAnalyticsRepository());

        var outcome = await service.CalculateAsync("missing", DefaultQuery());

        Assert.False(outcome.IsSuccess);
        Assert.Equal("project_not_ready", outcome.ErrorCode);
    }

    [Fact]
    public async Task CalculateAsync_ReturnsAvailableCountWhenPeersAreInsufficient()
    {
        var repository = new FakeAnalyticsRepository(
            Target(1_000m),
            Peer("peer-1", 900m),
            Peer("peer-2", 1_100m));
        var service = new BenchmarkService(repository);

        var outcome = await service.CalculateAsync("project-1", DefaultQuery());

        Assert.False(outcome.IsSuccess);
        Assert.Equal("insufficient_peers", outcome.ErrorCode);
        Assert.Equal(2, outcome.AvailablePeerCount);
    }

    [Fact]
    public async Task CalculateAsync_PassesComparisonOptionsToRepository()
    {
        var repository = new FakeAnalyticsRepository(
            Target(1_000m),
            Peer("peer-1", 900m));
        var service = new BenchmarkService(repository);
        var query = new BenchmarkQueryDto
        {
            FloorAreaTolerancePercent = 35,
            AlertThresholdPercent = 25,
            MinimumPeers = 1,
            MatchNumberOfLevels = false
        };

        await service.CalculateAsync("project-1", query);

        Assert.Equal(35m, repository.LastTolerancePercent);
        Assert.False(repository.LastMatchNumberOfLevels);
    }

    private static BenchmarkQueryDto DefaultQuery() => new();

    private static BenchmarkCandidateDto Target(decimal costPerSqm) => new()
    {
        ProjectId = "project-1",
        ProjectName = "Target House",
        FloorArea = 100m,
        NumberOfLevels = 2,
        CostPerSqm = costPerSqm,
        IsTarget = true
    };

    private static BenchmarkCandidateDto Peer(string id, decimal costPerSqm) => new()
    {
        ProjectId = id,
        ProjectName = id,
        FloorArea = 100m,
        NumberOfLevels = 2,
        CostPerSqm = costPerSqm,
        IsTarget = false
    };

    private sealed class FakeAnalyticsRepository : IAnalyticsRepository
    {
        private readonly IReadOnlyList<BenchmarkCandidateDto> _candidates;

        public FakeAnalyticsRepository(params BenchmarkCandidateDto[] candidates)
        {
            _candidates = candidates;
        }

        public string? LastProjectId { get; private set; }
        public decimal LastTolerancePercent { get; private set; }
        public bool LastMatchNumberOfLevels { get; private set; }

        public Task<IEnumerable<BenchmarkCandidateDto>> GetBenchmarkCandidatesAsync(
            string projectId,
            decimal floorAreaTolerancePercent,
            bool matchNumberOfLevels)
        {
            LastProjectId = projectId;
            LastTolerancePercent = floorAreaTolerancePercent;
            LastMatchNumberOfLevels = matchNumberOfLevels;
            return Task.FromResult<IEnumerable<BenchmarkCandidateDto>>(_candidates);
        }

        public Task<IEnumerable<CostPerSqmDto>> GetCostPerSqmAsync() =>
            Task.FromResult(Enumerable.Empty<CostPerSqmDto>());

        public Task<WhatIfDto?> GetWhatIfAsync(
            string projectId,
            string scopeName,
            double changePercent) => Task.FromResult<WhatIfDto?>(null);

        public Task<WhatIfCostInputsDto?> GetWhatIfCostInputsAsync(
            string projectId,
            string modelId,
            string scopeName,
            string scenarioType) => Task.FromResult<WhatIfCostInputsDto?>(null);
    }
}
