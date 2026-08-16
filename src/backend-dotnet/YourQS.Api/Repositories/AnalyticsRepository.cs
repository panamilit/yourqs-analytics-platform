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
                    pm.""REC_ID""        AS ProjectId,
                    pm.""NAME""          AS ProjectName,
                    pma.""FLOOR_AREA""   AS FloorArea,
                    SUM(jci.selling_price) AS TotalSellingPrice,
                    CASE WHEN pma.""FLOOR_AREA"" > 0
                         THEN SUM(jci.selling_price) / CAST(pma.""FLOOR_AREA"" AS NUMERIC)
                         ELSE 0 END  AS CostPerSqm
                FROM public.proj_master pm
                JOIN public.proj_model_attributes pma ON pma.""PROJ_MASTER_REC_ID"" = pm.""REC_ID""
                JOIN public.job_cost_element jce       ON jce.proj_master_rec_id = pm.""REC_ID""
                JOIN public.job_cost_item jci          ON jci.job_cost_element_rec_id = jce.rec_id
                WHERE pma.""FLOOR_AREA"" > 0
                GROUP BY pm.""REC_ID"", pm.""NAME"", pma.""FLOOR_AREA""
                ORDER BY CostPerSqm DESC";

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
                    jce.name AS ScopeName,
                    SUM(jci.selling_price) AS OriginalCost
                FROM public.job_cost_element jce
                JOIN public.job_cost_item jci ON jci.job_cost_element_rec_id = jce.rec_id
                WHERE jce.proj_master_rec_id = @ProjectId
                  AND LOWER(jce.name) = LOWER(@ScopeName)
                GROUP BY jce.name";

            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<dynamic>(
                sql, new { ProjectId = projectId, ScopeName = scopeName });

            if (result == null) return null;

            decimal original = (decimal)result.originalcost;
            decimal modified = original * (1 + (decimal)(changePercent / 100.0));

            return new WhatIfDto
            {
                ScopeName      = result.scopename,
                OriginalCost   = original,
                ModifiedCost   = modified,
                CostDifference = modified - original,
                ChangePercent  = changePercent
            };
        }
    }
}
