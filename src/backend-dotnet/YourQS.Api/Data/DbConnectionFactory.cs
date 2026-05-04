using System.Data;
using System.Data.OleDb;

namespace YourQS.API.Data
{
    public class DbConnectionFactory
    {
        private readonly string _connectionString;

        public DbConnectionFactory(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("AccessDb")
                ?? throw new InvalidOperationException("Connection string 'AccessDb' not found in appsettings.json.");
        }

        public IDbConnection CreateConnection()
        {
            return new OleDbConnection(_connectionString);
        }
    }
}
