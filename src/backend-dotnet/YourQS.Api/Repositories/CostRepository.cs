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

        public async Task<IEnumerable<CostItem>> GetAllCostsByModelAsync(string modelHeaderId)
        {
            const string sql = @"
                SELECT REC_ID, NAME, CODE, SCOPE_ID, FAMILY, FAMILYCODE,
                       ITEM_MASTER_CODE, MODEL_HEADER_REC_ID, MODEL_ELEMENT_REC_ID,
                       NOTES, IS_DELETED, IS_INACTIVE, INS_DT
                FROM JOB_COST_ELEMENT
                WHERE MODEL_HEADER_REC_ID = @ModelHeaderId
                  AND IS_DELETED = False
                  AND IS_INACTIVE = False";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<CostItem>(sql, new { ModelHeaderId = modelHeaderId });
        }

        public async Task<IEnumerable<CostItem>> GetCostsByScopeAsync(string modelHeaderId, string scopeId)
        {
            const string sql = @"
                SELECT REC_ID, NAME, CODE, SCOPE_ID, FAMILY, FAMILYCODE,
                       ITEM_MASTER_CODE, MODEL_HEADER_REC_ID, MODEL_ELEMENT_REC_ID,
                       NOTES, IS_DELETED, IS_INACTIVE, INS_DT
                FROM JOB_COST_ELEMENT
                WHERE MODEL_HEADER_REC_ID = @ModelHeaderId
                  AND SCOPE_ID = @ScopeId
                  AND IS_DELETED = False
                  AND IS_INACTIVE = False";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<CostItem>(sql, new { ModelHeaderId = modelHeaderId, ScopeId = scopeId });
        }
    }
}
