# Database Overview

## Core Tables

### Projects 

##### PROJ_MASTER
- **Purpose:** Main project record
- **Rows:** 1,662
- **Primary Key:** REC_ID


### Model level

##### PROJ_MODEL_ATTRIBUTES
- **Purpose:** Model-level attributes
- **Rows:** 2,141
- **Primary Key:** REC_ID
- **Key fields:**
  - FLOOR_AREA
  - BATHROOM_COUNT
  - NO_LEVELS
  - LABOUR_HOURS
    - cost per m^2
    - comparison
    - filters

### Cost

##### JOB_COST_ITEM
- **Purpose:** Cost data per scope
- **Rows:** 243,404
- **Primary Key:** REC_ID
- **Key fields:**
  - COST_PRICE
  - SELLING_PRICE
  - QUANTITY

### Cost structure

##### JOB_COST_ELEMENT
- **Rows:** 11,842
- **Primary Key:** REC_ID
- "Scope"

### Grouping dimensions

##### GLOB_TRADE
- **Purpose:** Trade classification
- **Rows:** 110
- **Primary Key:** REC_ID

##### GLOB_PHASE
- **Purpose:** Project phase classification
- **Rows:** 32
- **Primary Key:** REC_ID

##### GLOB_LEVEL
- **Purpose:** Building level classification
- **Rows:** 11
- **Primary Key:** REC_ID