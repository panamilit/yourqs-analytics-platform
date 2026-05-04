using Dapper;
using YourQS.API.Data;
using YourQS.API.Models;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Repositories
{
    public class ModelRepository : IModelRepository
    {
        private readonly DbConnectionFactory _connectionFactory;

        public ModelRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<ProjectModel>> GetModelsByProjectAsync(string projectId)
        {
            const string sql = @"
                SELECT REC_ID, PROJ_REC_ID, NAME, INS_DT
                FROM PROJ_MODEL_HEADER
                WHERE PROJ_REC_ID = @ProjectId";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<ProjectModel>(sql, new { ProjectId = projectId });
        }

        public async Task<IEnumerable<ModelAttributes>> GetAttributesByModelAsync(string modelHeaderId)
        {
            const string sql = @"
                SELECT REC_ID, MODEL_HEADER_REC_ID, MODEL_ELEMENT_REC_ID,
                       FAMILY, ITEM_MASTER_CODE, SCOPE_ID,
                       AREA, VOLUME, ELEMENTLENGTH, HEIGHT, MEMBER_COUNT, INS_DT
                FROM PROJ_MODEL_FAMILY_ATTRIBUTES
                WHERE MODEL_HEADER_REC_ID = @ModelHeaderId";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<ModelAttributes>(sql, new { ModelHeaderId = modelHeaderId });
        }

        public async Task<IEnumerable<ModelAttributes>> GetAttributesByScopeAsync(string modelHeaderId, string scopeId)
        {
            const string sql = @"
                SELECT REC_ID, MODEL_HEADER_REC_ID, MODEL_ELEMENT_REC_ID,
                       FAMILY, ITEM_MASTER_CODE, SCOPE_ID,
                       AREA, VOLUME, ELEMENTLENGTH, HEIGHT, MEMBER_COUNT, INS_DT
                FROM PROJ_MODEL_FAMILY_ATTRIBUTES
                WHERE MODEL_HEADER_REC_ID = @ModelHeaderId
                  AND SCOPE_ID = @ScopeId";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<ModelAttributes>(sql, new { ModelHeaderId = modelHeaderId, ScopeId = scopeId });
        }
    }
}
