-- Endpoint: GET/projects/{projectId}/total-cost
-- Purpose: Returns the total cost, total selling price, and quantity of items across all projects.
-- Parameter: 


SELECT 
    SUM(jci.COST_PRICE) AS total_cost,
    SUM(jci.SELLING_PRICE) AS total_selling_price,
    COUNT(*) AS item_count
FROM JOB_COST_ITEM jci
INNER JOIN JOB_COST_ELEMENT jce 
    ON jci.JOB_COST_ELEMENT_REC_ID = jce.REC_ID
WHERE jce.PROJ_MASTER_REC_ID = '{PROJECT_ID}';