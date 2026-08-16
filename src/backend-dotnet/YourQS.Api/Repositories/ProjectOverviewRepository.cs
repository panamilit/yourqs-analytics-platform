using System.Text;
using Dapper;
using YourQS.API.Data;
using YourQS.API.DTOs;
using YourQS.API.Repositories.Interfaces;

namespace YourQS.API.Repositories;

public sealed class ProjectOverviewRepository : IProjectOverviewRepository
{
    private readonly DbConnectionFactory _connectionFactory;

    private static readonly IReadOnlyDictionary<string, string> SortColumns =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["project_name"] = "project_name",
            ["floor_area"] = "floor_area",
            ["total_cost"] = "total_cost",
            ["selling_price"] = "total_selling_price",
            ["total_selling_price"] = "total_selling_price",
            ["margin_percent"] = "margin_percent",
            ["selling_price_per_sqm"] = "selling_price_per_sqm"
        };

    public ProjectOverviewRepository(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ProjectsSummaryDto> GetSummaryAsync()
    {
        const string sql = """
            SELECT
                COUNT(*)::INTEGER AS "TotalProjects",
                COUNT(*) FILTER (
                    WHERE has_cost_data
                )::INTEGER AS "ProjectsWithCostData",
                COUNT(*) FILTER (
                    WHERE is_analytics_ready
                )::INTEGER AS "AnalyticsReadyProjects"
            FROM public."VW_PROJECT_OVERVIEW";
            """;

        using var connection = _connectionFactory.CreateConnection();

        return await connection.QuerySingleAsync<ProjectsSummaryDto>(sql);
    }

    public async Task<ProjectsPageDto> GetProjectsAsync(
        ProjectOverviewQuery query)
    {
        if (!SortColumns.TryGetValue(query.SortBy, out var sortColumn))
        {
            throw new ArgumentException("Unsupported sort column.");
        }

        var sortOrder = query.SortOrder.Equals(
            "desc",
            StringComparison.OrdinalIgnoreCase)
                ? "DESC"
                : "ASC";

        var where = new StringBuilder(" WHERE 1 = 1");
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            where.Append(
                " AND project_name ILIKE '%' || @Search || '%'");

            parameters.Add("Search", query.Search.Trim());
        }

        if (query.MinFloorArea.HasValue)
        {
            where.Append(" AND floor_area >= @MinFloorArea");
            parameters.Add("MinFloorArea", query.MinFloorArea.Value);
        }

        if (query.MaxFloorArea.HasValue)
        {
            where.Append(" AND floor_area <= @MaxFloorArea");
            parameters.Add("MaxFloorArea", query.MaxFloorArea.Value);
        }

        if (query.Levels.HasValue)
        {
            where.Append(" AND number_of_levels = @Levels");
            parameters.Add("Levels", query.Levels.Value);
        }

        if (query.HasCostData.HasValue)
        {
            where.Append(" AND has_cost_data = @HasCostData");
            parameters.Add("HasCostData", query.HasCostData.Value);
        }

        if (query.AnalyticsReady.HasValue)
        {
            where.Append(" AND is_analytics_ready = @AnalyticsReady");
            parameters.Add(
                "AnalyticsReady",
                query.AnalyticsReady.Value);
        }

        var countSql = $"""
            SELECT COUNT(*)::INTEGER
            FROM public."VW_PROJECT_OVERVIEW"
            {where};
            """;

        var offset = ((long)query.Page - 1) * query.PageSize;

        parameters.Add("PageSize", query.PageSize);
        parameters.Add("Offset", offset);

        var projectsSql = $"""
            SELECT
                project_id AS "ProjectId",
                project_name AS "ProjectName",
                floor_area AS "FloorArea",
                total_bathroom_count AS "TotalBathroomCount",
                number_of_levels AS "NumberOfLevels",
                model_count AS "ModelCount",
                total_cost AS "TotalCost",
                total_selling_price AS "TotalSellingPrice",
                cost_item_count AS "CostItemCount",
                has_model_attributes AS "HasModelAttributes",
                has_cost_data AS "HasCostData",
                has_valid_floor_area AS "HasValidFloorArea",
                is_analytics_ready AS "IsAnalyticsReady",
                gross_margin AS "GrossMargin",
                margin_percent AS "MarginPercent",
                selling_price_per_sqm AS "SellingPricePerSqm"
            FROM public."VW_PROJECT_OVERVIEW"
            {where}
            ORDER BY {sortColumn} {sortOrder} NULLS LAST,
                     project_id ASC
            LIMIT @PageSize
            OFFSET @Offset;
            """;

        using var connection = _connectionFactory.CreateConnection();

        var totalItems =
            await connection.QuerySingleAsync<int>(countSql, parameters);

        var projects =
            await connection.QueryAsync<ProjectOverviewDto>(
                projectsSql,
                parameters);

        var totalPages = totalItems == 0
            ? 1
            : (int)Math.Ceiling(
                totalItems / (double)query.PageSize);

        return new ProjectsPageDto
        {
            Items = projects.ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalItems = totalItems,
            TotalPages = totalPages
        };
    }
}