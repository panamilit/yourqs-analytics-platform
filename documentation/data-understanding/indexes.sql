/* LIST OF ALL CURRENT INDEXES */

-- Core project lookup
CREATE INDEX IF NOT EXISTS idx_proj_master_rec_id 
ON proj_master ("REC_ID");


-- Project model attributes by project
CREATE INDEX IF NOT EXISTS idx_proj_model_attributes_proj_master_rec_id
ON proj_model_attributes ("PROJ_MASTER_REC_ID");


CREATE INDEX IF NOT EXISTS idx_proj_model_attributes_rec_id
ON proj_model_attributes ("REC_ID");


-- Cost elements by project
CREATE INDEX IF NOT EXISTS idx_job_cost_element_rec_id
ON job_cost_element ("rec_id");


CREATE INDEX IF NOT EXISTS idx_job_cost_element_proj_master_rec_id
ON job_cost_element ("proj_master_rec_id");


-- Cost items by cost element
CREATE INDEX IF NOT EXISTS idx_job_cost_item_rec_id
ON job_cost_item ("rec_id");


CREATE INDEX IF NOT EXISTS idx_job_cost_item_element_rec_id
ON job_cost_item ("job_cost_element_rec_id");




-- analyze;



/* _________________________Check all current indexes_________________________  */

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

/* ___________________________________________________________________________  */