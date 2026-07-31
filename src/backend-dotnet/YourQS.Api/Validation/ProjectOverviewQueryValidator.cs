using YourQS.API.DTOs;

namespace YourQS.API.Validation;

public static class ProjectOverviewQueryValidator
{
    private static readonly HashSet<string> AllowedSortValues =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "project_name",
            "floor_area",
            "total_cost",
            "selling_price",
            "total_selling_price",
            "margin_percent",
            "selling_price_per_sqm"
        };

    public static Dictionary<string, string[]> Validate(
        ProjectOverviewQuery query)
    {
        var errors = new Dictionary<string, List<string>>();

        if (query.Search?.Length > 200)
        {
            AddError(
                errors,
                "search",
                "Search cannot exceed 200 characters.");
        }

        if (query.MinFloorArea < 0)
        {
            AddError(
                errors,
                "min_floor_area",
                "Minimum floor area cannot be negative.");
        }

        if (query.MaxFloorArea < 0)
        {
            AddError(
                errors,
                "max_floor_area",
                "Maximum floor area cannot be negative.");
        }

        if (query.MinFloorArea.HasValue &&
            query.MaxFloorArea.HasValue &&
            query.MinFloorArea > query.MaxFloorArea)
        {
            AddError(
                errors,
                "min_floor_area",
                "Minimum floor area cannot exceed maximum floor area.");
        }

        if (query.Levels < 0)
        {
            AddError(
                errors,
                "levels",
                "Levels cannot be negative.");
        }

        if (query.Page < 1)
        {
            AddError(
                errors,
                "page",
                "Page must be at least 1.");
        }

        if (query.PageSize is < 1 or > 100)
        {
            AddError(
                errors,
                "page_size",
                "Page size must be between 1 and 100.");
        }

        if (string.IsNullOrWhiteSpace(query.SortBy) ||
            !AllowedSortValues.Contains(query.SortBy))
        {
            AddError(
                errors,
                "sort_by",
                "The selected sort field is not supported.");
        }

        if (!string.Equals(
                query.SortOrder,
                "asc",
                StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(
                query.SortOrder,
                "desc",
                StringComparison.OrdinalIgnoreCase))
        {
            AddError(
                errors,
                "sort_order",
                "Sort order must be 'asc' or 'desc'.");
        }

        return errors.ToDictionary(
            item => item.Key,
            item => item.Value.ToArray());
    }

    private static void AddError(
        IDictionary<string, List<string>> errors,
        string field,
        string message)
    {
        if (!errors.TryGetValue(field, out var messages))
        {
            messages = new List<string>();
            errors[field] = messages;
        }

        messages.Add(message);
    }
}
