using Dapper;
using YourQS.API.Data;
using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Repositories
{
    public class AnalyticsRepository : IAnalyticsRepository
    {
        private readonly DbConnectionFactory _connectionFactory;

        public AnalyticsRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<CostPerSqmDto>> GetCostPerSqmAsync()
        {
            const string sql = @"
                SELECT
                    project_id AS ""ProjectId"",
                    project_name AS ""ProjectName"",
                    floor_area AS ""FloorArea"",
                    total_selling_price AS ""TotalSellingPrice"",
                    selling_price_per_sqm AS ""CostPerSqm""
                FROM public.""VW_PROJECT_OVERVIEW""
                WHERE is_analytics_ready = TRUE
                  AND selling_price_per_sqm IS NOT NULL
                ORDER BY selling_price_per_sqm DESC";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<CostPerSqmDto>(sql);
        }

        public async Task<BenchmarkDto?> GetBenchmarkAsync(string projectId)
        {
            // Get all project costs, compute benchmark in C#
            var all = (await GetCostPerSqmAsync()).ToList();
            if (!all.Any()) return null;

            var project = all.FirstOrDefault(p => p.ProjectId == projectId);
            if (project == null) return null;

            var avg = all.Average(p => p.CostPerSqm);
            var variance = avg == 0 ? 0 : ((project.CostPerSqm - avg) / avg) * 100;
            var isFlagged = Math.Abs(variance) > 20;

            return new BenchmarkDto
            {
                ProjectId        = project.ProjectId,
                ProjectName      = project.ProjectName,
                ProjectCostPerSqm = project.CostPerSqm,
                AverageCostPerSqm = avg,
                VariancePercent  = variance,
                IsFlagged        = isFlagged,
                FlagReason       = isFlagged
                    ? $"Cost per m² is {variance:+0.0;-0.0}% vs dataset average"
                    : string.Empty
            };
        }

        public async Task<WhatIfDto?> GetWhatIfAsync(string projectId, string scopeName, double changePercent)
        {
            const string sql = @"
                SELECT
                    jce.""NAME"" AS ""ScopeName"",
                    SUM(jci.""SELLING_PRICE"") AS ""OriginalCost""
                FROM public.""JOB_COST_ELEMENT"" jce
                JOIN public.""JOB_COST_ITEM"" jci
                  ON jci.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                WHERE jce.""PROJ_MASTER_REC_ID"" = @ProjectId
                  AND LOWER(jce.""NAME"") = LOWER(@ScopeName)
                GROUP BY jce.""NAME""";

            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<dynamic>(
                sql, new { ProjectId = projectId, ScopeName = scopeName });

            if (result == null) return null;

            decimal original = (decimal)result.OriginalCost;
            decimal modified = original * (1 + (decimal)(changePercent / 100.0));

            return new WhatIfDto
            {
                ScopeName      = result.ScopeName,
                OriginalCost   = original,
                ModifiedCost   = modified,
                CostDifference = modified - original,
                ChangePercent  = changePercent
            };
        }

        public async Task<WhatIfCostInputsDto?> GetWhatIfCostInputsAsync(
            string projectId,
            string modelId,
            string scopeName,
            string scenarioType)
        {
            const string sql = @"
                WITH selected_model AS (
                    SELECT
                        pma.""PROJ_MASTER_REC_ID"" AS ""ProjectId"",
                        pma.""REC_ID"" AS ""ModelId"",
                        pma.""PROJ_MODEL_HEADER_REC_ID"" AS ""ModelHeaderId"",
                        pma.""MODEL_NAME"" AS ""ModelName"",
                        CASE
                            WHEN @ScenarioType = 'floor' THEN pma.""FLOOR_AREA""
                            WHEN @ScenarioType = 'wall-cladding' THEN pma.""EXT_WALL_AREA""
                        END AS ""AffectedQuantity""
                    FROM public.""PROJ_MODEL_ATTRIBUTES"" pma
                    WHERE pma.""REC_ID"" = @ModelId
                      AND pma.""PROJ_MASTER_REC_ID"" = @ProjectId
                )
                SELECT
                    sm.""ProjectId"",
                    sm.""ModelId"",
                    sm.""ModelName"",
                    sm.""AffectedQuantity"",
                    COALESCE((
                        SELECT SUM(jci.""SELLING_PRICE"")
                        FROM public.""JOB_COST_ELEMENT"" jce
                        JOIN public.""JOB_COST_ITEM"" jci
                          ON jci.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                        WHERE jce.""PROJ_MASTER_REC_ID"" = sm.""ProjectId""
                          AND LOWER(jce.""NAME"") = LOWER(@ScopeName)
                          AND EXISTS (
                              SELECT 1
                              FROM public.""PROJ_MODEL_FAMILY_ATTRIBUTES"" pmfa
                              WHERE pmfa.""PROJ_MODEL_HEADER_REC_ID"" = sm.""ModelHeaderId""
                                AND pmfa.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                          )
                    ), 0) AS ""OriginalAffectedCost"",
                    COALESCE((
                        SELECT SUM(jci.""SELLING_PRICE"")
                        FROM public.""JOB_COST_ELEMENT"" jce
                        JOIN public.""JOB_COST_ITEM"" jci
                          ON jci.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                        WHERE jce.""PROJ_MASTER_REC_ID"" = sm.""ProjectId""
                    ), 0) AS ""OriginalProjectTotal"",
                    (
                        SELECT COUNT(*)
                        FROM public.""JOB_COST_ELEMENT"" jce
                        JOIN public.""JOB_COST_ITEM"" jci
                          ON jci.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                        WHERE jce.""PROJ_MASTER_REC_ID"" = sm.""ProjectId""
                          AND LOWER(jce.""NAME"") = LOWER(@ScopeName)
                          AND EXISTS (
                              SELECT 1
                              FROM public.""PROJ_MODEL_FAMILY_ATTRIBUTES"" pmfa
                              WHERE pmfa.""PROJ_MODEL_HEADER_REC_ID"" = sm.""ModelHeaderId""
                                AND pmfa.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                          )
                    )::integer AS ""ScopeItemCount""
                FROM selected_model sm";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<WhatIfCostInputsDto>(sql, new
            {
                ProjectId = projectId,
                ModelId = modelId,
                ScopeName = scopeName,
                ScenarioType = scenarioType
            });
        }
    }
}
