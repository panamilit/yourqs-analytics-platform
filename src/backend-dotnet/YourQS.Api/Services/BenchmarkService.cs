using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services.Interfaces;

namespace YourQS.API.Services
{
    public class BenchmarkService : IBenchmarkService
    {
        private readonly IAnalyticsRepository _analyticsRepository;

        public BenchmarkService(IAnalyticsRepository analyticsRepository)
        {
            _analyticsRepository = analyticsRepository;
        }

        public async Task<BenchmarkCalculationOutcome> CalculateAsync(
            string projectId,
            BenchmarkQueryDto query)
        {
            var candidates = (await _analyticsRepository.GetBenchmarkCandidatesAsync(
                projectId.Trim(),
                query.FloorAreaTolerancePercent,
                query.MatchNumberOfLevels)).ToList();

            var target = candidates.SingleOrDefault(candidate => candidate.IsTarget);

            if (target is null)
            {
                return BenchmarkCalculationOutcome.Failure(
                    "project_not_ready",
                    "The project was not found or does not have enough data for benchmarking.");
            }

            var peers = candidates
                .Where(candidate => !candidate.IsTarget)
                .ToList();

            if (peers.Count < query.MinimumPeers)
            {
                return BenchmarkCalculationOutcome.Failure(
                    "insufficient_peers",
                    $"Only {peers.Count} comparable project(s) were found; at least {query.MinimumPeers} are required.",
                    peers.Count);
            }

            var orderedCosts = peers
                .Select(peer => peer.CostPerSqm)
                .OrderBy(cost => cost)
                .ToList();

            var average = orderedCosts.Average();
            var median = CalculateMedian(orderedCosts);
            var variance = average == 0
                ? 0
                : (target.CostPerSqm - average) / average * 100;
            var isFlagged = Math.Abs(variance) > query.AlertThresholdPercent;
            var flagDirection = variance > query.AlertThresholdPercent
                ? "above"
                : variance < -query.AlertThresholdPercent
                    ? "below"
                    : "within";
            var toleranceRatio = query.FloorAreaTolerancePercent / 100;

            return BenchmarkCalculationOutcome.Success(new BenchmarkDto
            {
                ProjectId = target.ProjectId,
                ProjectName = target.ProjectName,
                FloorArea = decimal.Round(target.FloorArea, 2),
                NumberOfLevels = target.NumberOfLevels,
                ProjectCostPerSqm = decimal.Round(target.CostPerSqm, 2),
                PeerCount = peers.Count,
                FloorAreaTolerancePercent = query.FloorAreaTolerancePercent,
                MinimumComparableFloorArea = decimal.Round(
                    target.FloorArea * (1 - toleranceRatio),
                    2),
                MaximumComparableFloorArea = decimal.Round(
                    target.FloorArea * (1 + toleranceRatio),
                    2),
                MatchedNumberOfLevels = query.MatchNumberOfLevels,
                AverageCostPerSqm = decimal.Round(average, 2),
                MedianCostPerSqm = decimal.Round(median, 2),
                MinimumCostPerSqm = decimal.Round(orderedCosts.First(), 2),
                MaximumCostPerSqm = decimal.Round(orderedCosts.Last(), 2),
                VariancePercent = decimal.Round(variance, 2),
                AlertThresholdPercent = query.AlertThresholdPercent,
                IsFlagged = isFlagged,
                FlagDirection = flagDirection,
                FlagReason = isFlagged
                    ? $"Cost per m2 is {variance:+0.0;-0.0}% compared with the similar-project average."
                    : string.Empty
            });
        }

        private static decimal CalculateMedian(IReadOnlyList<decimal> orderedValues)
        {
            var middle = orderedValues.Count / 2;

            return orderedValues.Count % 2 == 1
                ? orderedValues[middle]
                : (orderedValues[middle - 1] + orderedValues[middle]) / 2;
        }
    }
}
