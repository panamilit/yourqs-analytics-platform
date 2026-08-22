from typing import Any

from psycopg import sql

from app.db.pool import database_pool


SORT_COLUMNS: dict[str, str] = {
    "project_name": "project_name",
    "floor_area": "floor_area",
    "total_cost": "total_cost",
    # Frontend sends selling_price, but the view uses total_selling_price.
    "selling_price": "total_selling_price",
    "total_selling_price": "total_selling_price",
    "margin_percent": "margin_percent",
    "selling_price_per_sqm": "selling_price_per_sqm",
}


class ProjectsRepository:
    def get_summary(self) -> dict[str, Any]:
        query = """
            SELECT
                COUNT(*)::INTEGER AS total_projects,
                COUNT(*) FILTER (
                    WHERE has_cost_data
                )::INTEGER AS projects_with_cost_data,
                COUNT(*) FILTER (
                    WHERE is_analytics_ready
                )::INTEGER AS analytics_ready_projects
            FROM public."VW_PROJECT_OVERVIEW";
        """

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query)
                row = cursor.fetchone()

        if row is None:
            return {
                "total_projects": 0,
                "projects_with_cost_data": 0,
                "analytics_ready_projects": 0,
            }

        return row

    def get_projects(
        self,
        *,
        search: str | None,
        min_floor_area: float | None,
        max_floor_area: float | None,
        levels: int | None,
        has_cost_data: bool | None,
        analytics_ready: bool | None,
        page: int,
        page_size: int,
        sort_by: str,
        sort_order: str,
    ) -> tuple[list[dict[str, Any]], int]:
        conditions: list[sql.Composable] = []
        parameters: dict[str, Any] = {}

        if search:
            conditions.append(
                sql.SQL("project_name ILIKE %(search)s")
            )
            parameters["search"] = f"%{search}%"

        if min_floor_area is not None:
            conditions.append(
                sql.SQL("floor_area >= %(min_floor_area)s")
            )
            parameters["min_floor_area"] = min_floor_area

        if max_floor_area is not None:
            conditions.append(
                sql.SQL("floor_area <= %(max_floor_area)s")
            )
            parameters["max_floor_area"] = max_floor_area

        if levels is not None:
            conditions.append(
                sql.SQL("number_of_levels = %(levels)s")
            )
            parameters["levels"] = levels

        if has_cost_data is not None:
            conditions.append(
                sql.SQL("has_cost_data = %(has_cost_data)s")
            )
            parameters["has_cost_data"] = has_cost_data

        if analytics_ready is not None:
            conditions.append(
                sql.SQL("is_analytics_ready = %(analytics_ready)s")
            )
            parameters["analytics_ready"] = analytics_ready

        where_clause = sql.SQL("TRUE")
        if conditions:
            where_clause = sql.SQL(" AND ").join(conditions)

        sort_column = SORT_COLUMNS[sort_by]
        direction = (
            sql.SQL("DESC")
            if sort_order == "desc"
            else sql.SQL("ASC")
        )

        offset = (page - 1) * page_size
        parameters["limit"] = page_size
        parameters["offset"] = offset

        list_query = sql.SQL(
            """
            SELECT
                project_id,
                project_name,
                floor_area,
                total_bathroom_count,
                number_of_levels,
                model_count,
                total_cost,
                total_selling_price,
                cost_item_count,
                has_model_attributes,
                has_cost_data,
                has_valid_floor_area,
                is_analytics_ready,
                gross_margin,
                margin_percent,
                selling_price_per_sqm
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE {where_clause}
            ORDER BY {sort_column} {sort_order}
                NULLS LAST,
                project_id ASC
            LIMIT %(limit)s
            OFFSET %(offset)s;
            """
        ).format(
            where_clause=where_clause,
            sort_column=sql.Identifier(sort_column),
            sort_order=direction,
        )

        count_query = sql.SQL(
            """
            SELECT COUNT(*)::INTEGER AS total_items
            FROM public."VW_PROJECT_OVERVIEW"
            WHERE {where_clause};
            """
        ).format(where_clause=where_clause)

        with database_pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(count_query, parameters)
                count_row = cursor.fetchone()
                total_items = (
                    count_row["total_items"]
                    if count_row
                    else 0
                )

                cursor.execute(list_query, parameters)
                items = cursor.fetchall()

        return items, total_items