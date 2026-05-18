using System.Data;
using Npgsql;

namespace YourQS.API.Data
{
    public class DbConnectionFactory
    {
        private readonly string _connectionString;

        public DbConnectionFactory(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("PostgresDb")
                ?? throw new InvalidOperationException("Connection string 'PostgresDb' not found in appsettings.json.");
        }

        public IDbConnection CreateConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }
    }
}