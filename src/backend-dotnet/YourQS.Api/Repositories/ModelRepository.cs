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

        public async Task<IEnumerable<ModelAttributes>> GetAttributesByProjectAsync(string projectId)
        {
            const string sql = @"
                SELECT
                    pma.""REC_ID"",
                    pma.""PROJ_MASTER_REC_ID"",
                    pma.""MODEL_NAME"",
                    pma.""CODE"",
                    pma.""MODEL_DT"",
                    pma.""AFFECTED_AREA"",
                    pma.""FLOOR_AREA"",
                    pma.""EXT_WALL_AREA"",
                    pma.""INT_WALL_AREA"",
                    pma.""ROOF_AREA"",
                    pma.""CEILING_AREA"",
                    pma.""BATHROOM_COUNT"",
                    pma.""KITCHEN_COUNT"",
                    pma.""NO_LEVELS"",
                    pma.""NO_HOUSING_UNITS"",
                    pma.""LABOUR_HOURS""
                FROM proj_model_attributes pma
                WHERE pma.""PROJ_MASTER_REC_ID"" = @ProjectId";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<ModelAttributes>(sql, new { ProjectId = projectId });
        }
    }
}
