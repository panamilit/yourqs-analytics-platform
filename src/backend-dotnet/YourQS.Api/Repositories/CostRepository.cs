using Dapper;
using YourQS.API.Data;
using YourQS.API.Models;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Repositories
{
    public class CostRepository : ICostRepository
    {
        private readonly DbConnectionFactory _connectionFactory;

        public CostRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<CostItem>> GetCostBreakdownByScopeAsync(string projectId)
        {
            const string sql = @"
                SELECT
                    jce.""NAME"" AS ScopeName,
                    SUM(jci.""COST_PRICE"") AS TotalCost,
                    SUM(jci.""SELLING_PRICE"") AS TotalSellingPrice,
                    COUNT(*) AS ItemCount
                FROM public.""JOB_COST_ITEM"" jci
                INNER JOIN public.""JOB_COST_ELEMENT"" jce
                    ON jci.""JOB_COST_ELEMENT_REC_ID"" = jce.""REC_ID""
                WHERE jce.""PROJ_MASTER_REC_ID"" = @ProjectId
                GROUP BY jce.""NAME""";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<CostItem>(sql, new { ProjectId = projectId });
        }
    }
}
