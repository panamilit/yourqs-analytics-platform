using Dapper;
using YourQS.API.Data;
using YourQS.API.Models;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Repositories
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly DbConnectionFactory _connectionFactory;

        public ProjectRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<Project>> GetAllProjectsAsync()
        {
            const string sql = "SELECT REC_ID, NAME, LAST_KEY_NOTE_NO, INS_DT FROM Projects";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync<Project>(sql);
        }

        public async Task<Project?> GetProjectByIdAsync(string id)
        {
            const string sql = "SELECT REC_ID, NAME, LAST_KEY_NOTE_NO, INS_DT FROM Projects WHERE REC_ID = @Id";

            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<Project>(sql, new { Id = id });
        }
    }
}
