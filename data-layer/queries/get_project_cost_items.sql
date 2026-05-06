-- Endpoint: GET/projects/{projectId}/cost-items
-- Purpose: Returns cost items for a selected project.
-- Parameter: projectId = JOB_COST_ELEMENT.PROJ_MASTER_REC_ID
-- Limit 100: temporary option


SELECT TOP 100
	jci.REC_ID,
	jci.NAME,
	jci.QUANTITY,
	jci.COST_PRICE,
	jci.SELLING_PRICE,
	jce.NAME as scope_name
FROM JOB_COST_ITEM jci 
INNER JOIN JOB_COST_ELEMENT jce 
	ON jci.JOB_COST_ELEMENT_REC_ID = jce.REC_ID
WHERE jce.PROJ_MASTER_REC_ID = '{PROJECT_ID}';