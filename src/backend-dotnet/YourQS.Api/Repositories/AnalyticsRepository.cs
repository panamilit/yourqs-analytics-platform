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

        public async Task<IEnumerable<BenchmarkCandidateDto>> GetBenchmarkCandidatesAsync(
            string projectId,
            decimal floorAreaTolerancePercent,
            bool matchNumberOfLevels)
        {
            const string sql = @"
                WITH target AS (
                    SELECT
                        project_id,
                        project_name,
                        floor_area,
                        number_of_levels,
                        selling_price_per_sqm
                    FROM public.""VW_PROJECT_OVERVIEW""
                    WHERE UPPER(BTRIM(project_id, '{} ')) =
                          UPPER(BTRIM(@ProjectId, '{} '))
                      AND is_analytics_ready = TRUE
                      AND floor_area IS NOT NULL
                      AND floor_area > 0
                      AND selling_price_per_sqm IS NOT NULL
                )
                SELECT
                    candidate.project_id AS ""ProjectId"",
                    candidate.project_name AS ""ProjectName"",
                    candidate.floor_area AS ""FloorArea"",
                    candidate.number_of_levels AS ""NumberOfLevels"",
                    candidate.selling_price_per_sqm AS ""CostPerSqm""
                FROM public.""VW_PROJECT_OVERVIEW"" candidate
                CROSS JOIN target
                WHERE candidate.is_analytics_ready = TRUE
                  AND candidate.floor_area IS NOT NULL
                  AND candidate.floor_area > 0
                  AND candidate.selling_price_per_sqm IS NOT NULL
                  AND (
                      candidate.project_id = target.project_id
                      OR (
                          candidate.project_id <> target.project_id
                          AND candidate.floor_area BETWEEN
                              target.floor_area * (1 - @FloorAreaTolerancePercent / 100.0)
                              AND target.floor_area * (1 + @FloorAreaTolerancePercent / 100.0)
                          AND (
                              NOT @MatchNumberOfLevels
                              OR candidate.number_of_levels IS NOT DISTINCT FROM target.number_of_levels
                          )
                      )
                  )
                ORDER BY
                    (candidate.project_id = target.project_id) DESC,
                    candidate.project_id";

            using var connection = _connectionFactory.CreateConnection();
            var candidates = (await connection.QueryAsync<BenchmarkCandidateDto>(sql, new
            {
                ProjectId = projectId,
                FloorAreaTolerancePercent = floorAreaTolerancePercent,
                MatchNumberOfLevels = matchNumberOfLevels
            })).ToList();

            var normalizedTargetId = NormalizeProjectId(projectId);

            foreach (var candidate in candidates)
            {
                candidate.IsTarget = NormalizeProjectId(candidate.ProjectId) == normalizedTargetId;
            }

            return candidates;
        }

        private static string NormalizeProjectId(string projectId) =>
            projectId.Trim().Trim('{', '}').ToUpperInvariant();

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
