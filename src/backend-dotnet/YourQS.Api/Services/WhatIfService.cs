using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;
using YourQS.API.Services.Interfaces;

namespace YourQS.API.Services
{
    public class WhatIfService : IWhatIfService
    {
        private static readonly HashSet<string> SupportedScenarios =
            new(StringComparer.OrdinalIgnoreCase) { "floor", "wall-cladding" };

        private readonly IAnalyticsRepository _analyticsRepository;

        public WhatIfService(IAnalyticsRepository analyticsRepository)
        {
            _analyticsRepository = analyticsRepository;
        }

        public async Task<WhatIfCalculationOutcome> CalculateAsync(MaterialWhatIfRequestDto request)
        {
            var scenarioType = request.ScenarioType.Trim().ToLowerInvariant();

            if (!SupportedScenarios.Contains(scenarioType))
            {
                return WhatIfCalculationOutcome.Failure(
                    "unsupported_scenario",
                    "ScenarioType must be either 'floor' or 'wall-cladding'.");
            }

            if (string.Equals(
                request.OriginalMaterial.Trim(),
                request.ReplacementMaterial.Trim(),
                StringComparison.OrdinalIgnoreCase))
            {
                return WhatIfCalculationOutcome.Failure(
                    "materials_must_differ",
                    "OriginalMaterial and ReplacementMaterial must be different.");
            }

            var inputs = await _analyticsRepository.GetWhatIfCostInputsAsync(
                request.ProjectId.Trim(),
                request.ModelId.Trim(),
                request.ScopeName.Trim(),
                scenarioType);

            if (inputs is null)
            {
                return WhatIfCalculationOutcome.Failure(
                    "model_not_found",
                    "The selected model was not found in the specified project.");
            }

            if (inputs.ScopeItemCount == 0)
            {
                return WhatIfCalculationOutcome.Failure(
                    "scope_not_found",
                    "The selected scope has no cost items for this project.");
            }

            if (inputs.AffectedQuantity is null or <= 0)
            {
                return WhatIfCalculationOutcome.Failure(
                    "measurement_unavailable",
                    scenarioType == "floor"
                        ? "The selected model has no usable floor-area measurement."
                        : "The selected model has no usable exterior-wall-area measurement.");
            }

            var quantity = inputs.AffectedQuantity.Value;
            var modifiedAffectedCost = quantity * request.ReplacementUnitRate;
            var modifiedProjectTotal = inputs.OriginalProjectTotal
                - inputs.OriginalAffectedCost
                + modifiedAffectedCost;
            var costDifference = modifiedProjectTotal - inputs.OriginalProjectTotal;
            var changePercent = inputs.OriginalProjectTotal == 0
                ? 0
                : costDifference / inputs.OriginalProjectTotal * 100;

            var result = new MaterialWhatIfDto
            {
                ProjectId = inputs.ProjectId,
                ModelId = inputs.ModelId,
                ModelName = inputs.ModelName,
                ScenarioType = scenarioType,
                ScopeName = request.ScopeName.Trim(),
                OriginalMaterial = request.OriginalMaterial.Trim(),
                ReplacementMaterial = request.ReplacementMaterial.Trim(),
                AffectedQuantity = decimal.Round(quantity, 2),
                OriginalUnitRate = decimal.Round(inputs.OriginalAffectedCost / quantity, 2),
                ReplacementUnitRate = decimal.Round(request.ReplacementUnitRate, 2),
                OriginalAffectedCost = decimal.Round(inputs.OriginalAffectedCost, 2),
                ModifiedAffectedCost = decimal.Round(modifiedAffectedCost, 2),
                OriginalProjectTotal = decimal.Round(inputs.OriginalProjectTotal, 2),
                ModifiedProjectTotal = decimal.Round(modifiedProjectTotal, 2),
                CostDifference = decimal.Round(costDifference, 2),
                ChangePercent = decimal.Round(changePercent, 2)
            };

            return WhatIfCalculationOutcome.Success(result);
        }
    }
}
