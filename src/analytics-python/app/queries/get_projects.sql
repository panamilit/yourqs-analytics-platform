-- Endpoint: GET/projects
-- Purpose: Returns a basic list of projects for selection in the prototype.
-- Source: PROJ_MASTER
-- Limit 100: temporary option


SELECT
	pm."REC_ID",
	pm."NAME"
FROM PROJ_MASTER pm
ORDER BY pm."NAME"
LIMIT 100;

