using Xunit;
using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services;

namespace YourQS.Api.Tests.Services;

public class WhatIfServiceTests
{
    [Fact]
    public async Task CalculateAsync_ReturnsWholeProjectImpact_ForValidFloorScenario()
    {
        var repository = new FakeAnalyticsRepository
        {
            Inputs = new WhatIfCostInputsDto
            {
                ProjectId = "project-1",
                ModelId = "model-1",
                ModelName = "House A",
                AffectedQuantity = 100m,
                OriginalAffectedCost = 15_000m,
                OriginalProjectTotal = 200_000m,
                ScopeItemCount = 12
            }
        };
        var service = new WhatIfService(repository);

        var outcome = await service.CalculateAsync(ValidRequest());

        Assert.True(outcome.IsSuccess);
        Assert.NotNull(outcome.Result);
        Assert.Equal(150m, outcome.Result.OriginalUnitRate);
        Assert.Equal(18_000m, outcome.Result.ModifiedAffectedCost);
        Assert.Equal(203_000m, outcome.Result.ModifiedProjectTotal);
        Assert.Equal(3_000m, outcome.Result.CostDifference);
        Assert.Equal(1.5m, outcome.Result.ChangePercent);
    }

    [Fact]
    public async Task CalculateAsync_NormalisesWallCladdingScenario()
    {
        var repository = new FakeAnalyticsRepository
        {
            Inputs = new WhatIfCostInputsDto
            {
                ProjectId = "project-1",
                ModelId = "model-1",
                ModelName = "House A",
                AffectedQuantity = 80m,
                OriginalAffectedCost = 12_000m,
                OriginalProjectTotal = 180_000m,
                ScopeItemCount = 4
            }
        };
        var service = new WhatIfService(repository);
        var request = ValidRequest();
        request.ScenarioType = " WALL-CLADDING ";
        request.OriginalMaterial = "Weatherboard";
        request.ReplacementMaterial = "Brick";

        var outcome = await service.CalculateAsync(request);

        Assert.True(outcome.IsSuccess);
        Assert.Equal("wall-cladding", outcome.Result!.ScenarioType);
        Assert.Equal("wall-cladding", repository.LastScenarioType);
    }

    [Fact]
    public async Task CalculateAsync_RejectsUnsupportedScenarioBeforeQueryingDatabase()
    {
        var repository = new FakeAnalyticsRepository();
        var service = new WhatIfService(repository);
        var request = ValidRequest();
        request.ScenarioType = "roof";

        var outcome = await service.CalculateAsync(request);

        Assert.False(outcome.IsSuccess);
        Assert.Equal("unsupported_scenario", outcome.ErrorCode);
        Assert.Equal(0, repository.QueryCount);
    }

    [Fact]
    public async Task CalculateAsync_RejectsIdenticalMaterialsBeforeQueryingDatabase()
    {
        var repository = new FakeAnalyticsRepository();
        var service = new WhatIfService(repository);
        var request = ValidRequest();
        request.ReplacementMaterial = " timber ";

        var outcome = await service.CalculateAsync(request);

        Assert.False(outcome.IsSuccess);
        Assert.Equal("materials_must_differ", outcome.ErrorCode);
        Assert.Equal(0, repository.QueryCount);
    }

    [Fact]
    public async Task CalculateAsync_ReturnsModelNotFound_WhenModelDoesNotBelongToProject()
    {
        var service = new WhatIfService(new FakeAnalyticsRepository());

        var outcome = await service.CalculateAsync(ValidRequest());

        Assert.False(outcome.IsSuccess);
        Assert.Equal("model_not_found", outcome.ErrorCode);
    }

    [Fact]
    public async Task CalculateAsync_ReturnsScopeNotFound_WhenScopeHasNoItems()
    {
        var service = new WhatIfService(new FakeAnalyticsRepository
        {
            Inputs = new WhatIfCostInputsDto
            {
                ProjectId = "project-1",
                ModelId = "model-1",
                AffectedQuantity = 100m,
                ScopeItemCount = 0
            }
        });

        var outcome = await service.CalculateAsync(ValidRequest());

        Assert.False(outcome.IsSuccess);
        Assert.Equal("scope_not_found", outcome.ErrorCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0.0)]
    public async Task CalculateAsync_ReturnsMeasurementUnavailable_ForMissingOrZeroArea(double? area)
    {
        var service = new WhatIfService(new FakeAnalyticsRepository
        {
            Inputs = new WhatIfCostInputsDto
            {
                ProjectId = "project-1",
                ModelId = "model-1",
                AffectedQuantity = area is null ? null : (decimal)area.Value,
                ScopeItemCount = 1
            }
        });

        var outcome = await service.CalculateAsync(ValidRequest());

        Assert.False(outcome.IsSuccess);
        Assert.Equal("measurement_unavailable", outcome.ErrorCode);
    }

    private static MaterialWhatIfRequestDto ValidRequest() => new()
    {
        ProjectId = "project-1",
        ModelId = "model-1",
        ScenarioType = "floor",
        ScopeName = "Floor Structure",
        OriginalMaterial = "Timber",
        ReplacementMaterial = "Concrete",
        ReplacementUnitRate = 180m
    };

    private sealed class FakeAnalyticsRepository : IAnalyticsRepository
    {
        public WhatIfCostInputsDto? Inputs { get; init; }
        public int QueryCount { get; private set; }
        public string? LastScenarioType { get; private set; }

        public Task<WhatIfCostInputsDto?> GetWhatIfCostInputsAsync(
            string projectId,
            string modelId,
            string scopeName,
            string scenarioType)
        {
            QueryCount++;
            LastScenarioType = scenarioType;
            return Task.FromResult(Inputs);
        }

        public Task<IEnumerable<CostPerSqmDto>> GetCostPerSqmAsync() =>
            Task.FromResult(Enumerable.Empty<CostPerSqmDto>());

        public Task<IEnumerable<BenchmarkCandidateDto>> GetBenchmarkCandidatesAsync(
            string projectId,
            decimal floorAreaTolerancePercent,
            bool matchNumberOfLevels) =>
            Task.FromResult(Enumerable.Empty<BenchmarkCandidateDto>());

        public Task<WhatIfDto?> GetWhatIfAsync(
            string projectId,
            string scopeName,
            double changePercent) => Task.FromResult<WhatIfDto?>(null);
    }
}
