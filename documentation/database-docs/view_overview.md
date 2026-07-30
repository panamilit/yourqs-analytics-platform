
# Project Overview Analytical View

The view is already deployed in the shared Supabase PostgreSQL database.

The .NET backend should read data directly from:

```sql
public."VW_PROJECT_OVERVIEW"
```


| Column                  | Expected type  | Description                                                                    |
| ----------------------- | -------------- | ------------------------------------------------------------------------------ |
| `project_id`            | varchar        | Unique project identifier.                                                     |
| `project_name`          | varchar           | Project name.                                                                  |
| `floor_area`            | numeric / null | Project floor area.                                                            |
| `total_bathroom_count`  | integer | Total number of bathrooms recorded for the project models.                     |
| `number_of_levels`      | integer | Number of building levels.                                                     |
| `model_count`           | integer        | Number of models associated with the project.                                  |
| `total_cost`            | numeric / null | Total project cost calculated from cost items.                                 |
| `total_selling_price`   | numeric / null | Total selling price calculated from cost items.                                |
| `cost_item_count`       | integer        | Number of cost items associated with the project.                              |
| `has_model_attributes`  | boolean        | Indicates whether model attribute data exists for the project.                 |
| `has_cost_data`         | boolean        | Indicates whether cost data exists for the project.                            |
| `has_valid_floor_area`  | boolean        | Indicates whether the project has a valid floor area value.                    |
| `is_analytics_ready`    | boolean        | Indicates whether the project has sufficient data for analytical calculations. |
| `gross_margin`          | numeric / null | Difference between total selling price and total cost.                         |
| `margin_percent`        | numeric / null | Gross margin as a percentage of total selling price.                           |
| `selling_price_per_sqm` | numeric / null | Total selling price divided by floor area.                                     |

___


### Basic Query
```
SELECT *
FROM public."VW_PROJECT_OVERVIEW"
LIMIT 20;
```

### Analytics-ready Projects
```
SELECT *
FROM public."VW_PROJECT_OVERVIEW"
WHERE is_analytics_ready = TRUE
ORDER BY project_name;
```

### Query a Single Project
```
SELECT *
FROM public."VW_PROJECT_OVERVIEW" 
WHERE project_id = @project_id;
```

## Important Notes
- The analytical calculations are performed inside PostgreSQL.
- The .NET backend should not recalculate gross_margin, margin_percent, or selling_price_per_sqm.
- Nullable database values should be represented using nullable C# types.
- The view is shared by the development team.
- Changes to the view should be discussed with the team before deployment.





