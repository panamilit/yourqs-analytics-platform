-- Endpoint: GET/projects/{projectId}/model-attribute
-- Purpose: Returns BIM/model-level attributes for a selected project.
-- Parameter: PROJECT_ID = PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID
-- Source: PROJ_MODEL_ATTRIBUTES
-- NOTE: Data for future metrics such as cost per m², comparisons and filters.


SELECT
    pma.REC_ID,
    pma.MODEL_NAME,
    pma.CODE,
    pma.MODEL_DT,
    pma.AFFECTED_AREA,
    pma.FLOOR_AREA,
    pma.EXT_WALL_AREA,
    pma.INT_WALL_AREA,
    pma.ROOF_AREA,
    pma.CEILING_AREA,
    pma.BATHROOM_COUNT,
    pma.KITCHEN_COUNT,
    pma.NO_LEVELS,
    pma.NO_HOUSING_UNITS,
    pma.LABOUR_HOURS
FROM PROJ_MODEL_ATTRIBUTES pma
WHERE pma.PROJ_MASTER_REC_ID = '{PROJECT_ID}';
