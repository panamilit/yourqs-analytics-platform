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
                    jce.name AS ScopeName,
                    SUM(jci.cost_price) AS TotalCost,
                    SUM(jci.selling_price) AS TotalSellingPrice,
                    COUNT(*) AS ItemCount
                FROM job_cost_item jci
                INNER JOIN job_cost_element jce
                    ON jci.job_cost_element_rec_id = jce.rec_id
                WHERE jce.proj_master_rec_id = @ProjectId
                GROUP BY jce.name";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<CostItem>(sql, new { ProjectId = projectId });
        }
    }
}
