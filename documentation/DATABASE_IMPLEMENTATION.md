# Database Implementation and Handover Guide

## 1. Purpose

This document describes the database implementation used by the YourQS Analytics Platform and provides the technical information required to reproduce the implemented functionality against the existing YourQS Firebird database.

During development, historical YourQS data was migrated from the provided Microsoft Access database into PostgreSQL hosted in Supabase. PostgreSQL was used as the development and validation environment for the analytics and feasibility functionality.

The PostgreSQL database is not intended to replace the existing YourQS Firebird database in production.

Instead, the PostgreSQL implementation documented here should be treated as a reference implementation. The existing YourQS production database should remain the primary data source, with equivalent queries, views, relationships and calculations implemented using the corresponding Firebird tables and SQL syntax.

The main objectives of this document are to:

- identify the source tables and fields used by the platform;
- document the logical relationships between the source tables;
- document the analytical views created during development;
- explain the calculations and data transformation logic;
- preserve the original PostgreSQL SQL as a reference implementation;
- document indexes and performance considerations introduced during development;
- identify PostgreSQL-specific behaviour that may require adaptation for Firebird;
- define the data outputs expected by the application.

---

## 2. Database Architecture

The development implementation uses the following data flow:

YourQS historical data  
→ Microsoft Access database  
→ PostgreSQL / Supabase  
→ analytical database views  
→ .NET application backend  
→ frontend

For the production environment, the intended architecture is:

YourQS Firebird database  
→ equivalent analytical queries/views  
→ .NET application backend  
→ frontend

The analytical views therefore act as a database abstraction layer between the original YourQS data structure and the application.

The application should depend on the documented analytical outputs rather than on PostgreSQL-specific implementation details.

---

## 3. Development Database

### 3.1 PostgreSQL / Supabase

PostgreSQL hosted in Supabase was used as the development database for the project.

The supplied YourQS data was migrated from Microsoft Access into PostgreSQL while preserving the original table and column naming wherever possible.

The migrated data was then used to:

- investigate the existing YourQS data structure;
- determine relationships between project, model and costing data;
- develop analytical queries;
- create reusable analytical views;
- develop and test the project analytics functionality;
- develop and validate the feasibility assessment methodology;
- test application API integration;
- evaluate query performance.

The PostgreSQL implementation should therefore be considered a tested reference for the data transformation and analytical logic rather than a required production database.

### 3.2 Database Relationships

The supplied source database does not define conventional foreign-key relationships for the tables used by the analytics implementation.

Relationships were instead identified through logical record identifiers, primarily columns following the `*_REC_ID` naming convention.

For example:

`PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID`
→ `PROJ_MASTER.REC_ID`

`JOB_COST_ELEMENT.PROJ_MASTER_REC_ID`
→ `PROJ_MASTER.REC_ID`

`JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID`
→ `JOB_COST_ELEMENT.REC_ID`

`PROJ_MODEL_ATTRIBUTES.PROJ_TYPE_REC_ID`
→ `PROJ_TYPE.REC_ID`

`PROJ_MODEL_HEADER.PROJ_MASTER_REC_ID`
→ `PROJ_MASTER.REC_ID`

These relationships are required by the analytical implementation even though they are not enforced through database foreign-key constraints.

When reproducing the implementation against Firebird, the equivalent relationships in the production database should be verified before the analytical queries are implemented.

---

## 4. Database Objects

The PostgreSQL development database contains both migrated YourQS data and application-specific tables introduced during development.

### 4.1 Source YourQS Tables

The following source tables are present in the development database:

- `GLOB_LEVEL`
- `GLOB_PHASE`
- `GLOB_TRADE`
- `ITEM_CATEGORY`
- `ITEM_MASTER`
- `ITEM_TYPE`
- `JOB_COST_ELEMENT`
- `JOB_COST_ITEM`
- `MODEL_ELEMENT`
- `MODEL_ELEMENT_GROUP`
- `MODEL_ELEMENT_PROP`
- `PROJ_MASTER`
- `PROJ_MODEL_ATTRIBUTES`
- `PROJ_MODEL_FAMILY_ATTRIBUTES`
- `PROJ_MODEL_FAMILY_PROP`
- `PROJ_MODEL_HEADER`
- `PROJ_TYPE`

Not all migrated tables are directly required by the analytical views documented in this guide.

The current core analytical implementation directly depends on:

- `PROJ_MASTER`
- `PROJ_MODEL_ATTRIBUTES`
- `PROJ_TYPE`
- `PROJ_MODEL_HEADER`
- `JOB_COST_ELEMENT`
- `JOB_COST_ITEM`

Additional source tables may be used by other application functionality outside the two analytical views described in this document.

### 4.2 Application-Specific Tables

The following tables were introduced for functionality developed as part of the platform:

- `APP_USER`
- `DEV_FEEDBACK`
- `FEASIBILITY_ASSESSMENT_LOG`
- `FEASIBILITY_REVIEW_FILE`
- `FEASIBILITY_REVIEW_REQUEST`

These tables should not automatically be assumed to exist in the current YourQS Firebird database.

If the associated application functionality is retained in production, equivalent persistent storage will need to be provided either within Firebird or through another application database selected by YourQS.

### 4.3 Analytical Views

Two primary analytical views were created:

#### `VW_PROJECT_OVERVIEW`

Provides a project-level analytical representation used by the project overview and general analytics functionality.

It combines project information, model attributes and costing data into a single project-level dataset.

#### `VW_FEASIBILITY_PROJECT_FEATURES`

Provides the historical project feature dataset used by the feasibility assessment system.

In addition to project attributes and pricing information, this view performs:

- project-type classification;
- relevant-area selection;
- cost and selling-price normalisation;
- margin calculation;
- textual scope feature detection;
- data-quality checks;
- project suitability classification for feasibility benchmarking.

The complete logic and original SQL definitions for both views are documented in the following sections.
## 5. Source Table Reference

This section documents the source YourQS tables directly required by the current analytical views.

Only columns that are relevant to the implemented analytics and feasibility functionality are included. The original tables contain additional fields that are not required by the current analytical implementation.

The table and column names below correspond to the PostgreSQL development database migrated from the supplied YourQS data. When implementing the same functionality against the production Firebird database, the equivalent tables and fields should be verified before the queries are reproduced.

---

### 5.1 `PROJ_MASTER`

#### Purpose

`PROJ_MASTER` represents the top-level project record.

It provides the primary project identifier used to connect project-level information to model attributes, model headers, and job costing data.

#### Columns Used

| Column | Type | Purpose |
|---|---|---|
| `REC_ID` | `varchar(50)` | Logical project identifier used throughout the analytical relationships. |
| `NAME` | `varchar(250)` | Project name displayed by the application and also used as part of feasibility text classification. |

#### Logical Relationships

```text
PROJ_MASTER.REC_ID
    ├── PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID
    ├── PROJ_MODEL_HEADER.PROJ_MASTER_REC_ID
    └── JOB_COST_ELEMENT.PROJ_MASTER_REC_ID
```

`REC_ID` is therefore the central project-level join identifier used by both analytical views.

#### Used By

- `VW_PROJECT_OVERVIEW`
- `VW_FEASIBILITY_PROJECT_FEATURES`

---

### 5.2 `PROJ_MODEL_ATTRIBUTES`

#### Purpose

`PROJ_MODEL_ATTRIBUTES` contains measurable and categorical attributes associated with a project model.

This table provides most of the physical project characteristics required by project analytics and feasibility benchmarking.

#### Columns Used

| Column | Type | Purpose |
|---|---|---|
| `REC_ID` | `varchar(50)` | Logical model-attribute record identifier. |
| `PROJ_MASTER_REC_ID` | `varchar(50)` | Links the model attributes to the parent project. |
| `PROJ_TYPE_REC_ID` | `varchar(50)` | Links the model to its project type. |
| `IS_INACTIVE` | `varchar(1)` | Indicates whether the model attribute record is inactive. |
| `FLOOR_AREA` | `numeric` | Floor area used for project analytics and new-build feasibility pricing. |
| `AFFECTED_AREA` | `numeric` | Area affected by alteration work; used as the pricing basis for alteration projects. |
| `BATHROOM_COUNT` | `integer` | Number of bathrooms associated with the model. |
| `KITCHEN_COUNT` | `integer` | Number of kitchens associated with the model. |
| `NO_LEVELS` | `integer` | Number of building levels. |

#### Logical Relationships

```text
PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID
    → PROJ_MASTER.REC_ID

PROJ_MODEL_ATTRIBUTES.PROJ_TYPE_REC_ID
    → PROJ_TYPE.REC_ID
```

#### Important Behaviour

The two analytical views currently use model attributes differently.

`VW_PROJECT_OVERVIEW` aggregates model records at project level:

- `FLOOR_AREA` is summed;
- `BATHROOM_COUNT` is summed;
- `NO_LEVELS` uses the maximum value;
- the number of model records is counted;
- records where `IS_INACTIVE = 'Y'` are excluded.

`VW_FEASIBILITY_PROJECT_FEATURES` groups model attributes by project but uses maximum values for the project characteristics and explicitly tracks `model_count`.

The feasibility implementation later uses `model_count = 1` as one of the requirements for identifying an unambiguous historical project.

#### Used By

- `VW_PROJECT_OVERVIEW`
- `VW_FEASIBILITY_PROJECT_FEATURES`

---

### 5.3 `PROJ_TYPE`

#### Purpose

`PROJ_TYPE` provides the source project classification associated with a project model.

The feasibility system uses the project type as the initial input for determining the feasibility category and the appropriate area basis for price normalisation.

#### Columns Used

| Column | Type | Purpose |
|---|---|---|
| `REC_ID` | `varchar(50)` | Logical project-type identifier. |
| `NAME` | `varchar(100)` | Human-readable source project type. |

#### Logical Relationship

```text
PROJ_MODEL_ATTRIBUTES.PROJ_TYPE_REC_ID
    → PROJ_TYPE.REC_ID
```

#### Project Types Used by Feasibility

The current feasibility implementation contains explicit logic for:

- `Residential New`
- `Residential Alteration`
- `Residential Multi-Unit`

Other values are classified as `other`.

For `Residential Alteration`, additional text analysis is performed to determine whether the historical project represents:

- renovation;
- extension;
- renovation and extension;
- an unclassified alteration.

#### Used By

- `VW_FEASIBILITY_PROJECT_FEATURES`

---

### 5.4 `PROJ_MODEL_HEADER`

#### Purpose

`PROJ_MODEL_HEADER` provides model-level metadata and descriptive notes.

The feasibility implementation uses the project relationship and free-text notes to identify scope characteristics that are not available as structured attributes in the supplied dataset.

#### Columns Used

| Column | Type | Purpose |
|---|---|---|
| `REC_ID` | `varchar(50)` | Logical model-header identifier. |
| `PROJ_MASTER_REC_ID` | `varchar(50)` | Links the model header to the parent project. |
| `IS_INACTIVE` | `varchar(1)` | Indicates whether the model header is inactive. |
| `NOTES_HEADER` | `varchar(32767)` | Header notes used for feasibility scope analysis. |
| `NOTES_FOOTER` | `varchar(32767)` | Footer notes used for feasibility scope analysis. |

#### Logical Relationship

```text
PROJ_MODEL_HEADER.PROJ_MASTER_REC_ID
    → PROJ_MASTER.REC_ID
```

#### Feasibility Usage

For each project, active model-header notes are combined into project-level text.

The feasibility view combines:

```text
Project Name + Notes Header + Notes Footer
```

and converts the resulting text to lowercase.

This searchable text is then used to identify characteristics such as:

- extension or addition work;
- renovation or alteration work;
- retaining work;
- demolition;
- recladding;
- roofing;
- pools;
- garages, carports, and other outbuildings;
- secondary dwellings;
- structural work;
- electrical upgrades;
- plumbing upgrades;
- labour-only projects;
- concept or assessment projects;
- client-supplied work;
- scope exclusions;
- partial-scope projects.

These classifications are heuristic indicators derived from text and should not be interpreted as structured source attributes stored directly by YourQS.

#### Used By

- `VW_FEASIBILITY_PROJECT_FEATURES`

---

### 5.5 `JOB_COST_ELEMENT`

#### Purpose

`JOB_COST_ELEMENT` connects project records to their associated job cost items.

It acts as the intermediate relationship between a project and the individual costing records stored in `JOB_COST_ITEM`.

#### Columns Used

| Column | Type | Purpose |
|---|---|---|
| `REC_ID` | `varchar(50)` | Logical cost-element identifier. |
| `PROJ_MASTER_REC_ID` | `varchar(50)` | Links the cost element to the parent project. |

#### Logical Relationships

```text
JOB_COST_ELEMENT.PROJ_MASTER_REC_ID
    → PROJ_MASTER.REC_ID

JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID
    → JOB_COST_ELEMENT.REC_ID
```

This produces the costing relationship:

```text
PROJ_MASTER
    ↓
JOB_COST_ELEMENT
    ↓
JOB_COST_ITEM
```

#### Used By

- `VW_PROJECT_OVERVIEW`
- `VW_FEASIBILITY_PROJECT_FEATURES`

---

### 5.6 `JOB_COST_ITEM`

#### Purpose

`JOB_COST_ITEM` contains the individual costing records used to calculate project-level cost and selling-price metrics.

#### Columns Used

| Column | Type | Purpose |
|---|---|---|
| `REC_ID` | `varchar(50)` | Logical cost-item identifier. |
| `JOB_COST_ELEMENT_REC_ID` | `varchar(50)` | Links the item to its parent job cost element. |
| `IS_INACTIVE` | `varchar(1)` | Indicates whether the cost item is inactive. |
| `QUANTITY` | `numeric(28,4)` | Quantity associated with the cost item. |
| `COST_PRICE` | `numeric(14,4)` | Cost price associated with the item. |
| `SELLING_PRICE` | `numeric(14,4)` | Selling price associated with the item. |

#### Logical Relationship

```text
JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID
    → JOB_COST_ELEMENT.REC_ID
```

#### Cost Aggregation

The feasibility implementation calculates project totals using quantity-adjusted values:

```text
Total Cost =
SUM(QUANTITY × COST_PRICE)

Total Selling Price =
SUM(QUANTITY × SELLING_PRICE)
```

Inactive cost items are excluded from the feasibility dataset.

The project overview view currently uses a different aggregation:

```text
Total Cost =
SUM(COST_PRICE)

Total Selling Price =
SUM(SELLING_PRICE)
```

This difference reflects the current PostgreSQL reference implementation and should be reviewed with the YourQS development team before the Firebird implementation is finalised.

The production implementation should use the costing interpretation that matches the business meaning of these fields in the existing YourQS system.

#### Used By

- `VW_PROJECT_OVERVIEW`
- `VW_FEASIBILITY_PROJECT_FEATURES`

---

### 5.7 Relationship Summary

The core analytical relationships can be represented as follows:

```text
                           PROJ_TYPE
                               ↑
                               │ PROJ_TYPE_REC_ID
                               │
PROJ_MASTER ───────→ PROJ_MODEL_ATTRIBUTES
     │
     ├──────────────→ PROJ_MODEL_HEADER
     │
     └──────────────→ JOB_COST_ELEMENT
                              │
                              ↓
                       JOB_COST_ITEM
```

The corresponding logical joins are:

| Source | Target | Relationship |
|---|---|---|
| `PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID` | `PROJ_MASTER.REC_ID` | Model → Project |
| `PROJ_MODEL_ATTRIBUTES.PROJ_TYPE_REC_ID` | `PROJ_TYPE.REC_ID` | Model → Project Type |
| `PROJ_MODEL_HEADER.PROJ_MASTER_REC_ID` | `PROJ_MASTER.REC_ID` | Model Header → Project |
| `JOB_COST_ELEMENT.PROJ_MASTER_REC_ID` | `PROJ_MASTER.REC_ID` | Cost Element → Project |
| `JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID` | `JOB_COST_ELEMENT.REC_ID` | Cost Item → Cost Element |

These relationships are fundamental to the analytical implementation and must be mapped to their equivalent relationships in the production Firebird database.

---

### 5.8 Database Constraints

The migrated PostgreSQL dataset does not rely on conventional foreign-key constraints for the relationships described above.

The relationships were identified from the original YourQS data model and the `*_REC_ID` fields.

The PostgreSQL database therefore should not be treated as defining referential integrity for the production system.

The Firebird implementation should use the relationships already defined or understood by the existing YourQS application rather than creating new foreign-key constraints solely based on this development database.

---

### 5.9 Development Indexes

B-tree indexes were added to frequently used identifiers in the PostgreSQL development database to improve join and lookup performance.

The following indexes were created:

| Table | Column | PostgreSQL Index |
|---|---|---|
| `PROJ_MASTER` | `REC_ID` | `idx_proj_master_rec_id` |
| `PROJ_MODEL_ATTRIBUTES` | `REC_ID` | `idx_proj_model_attributes_rec_id` |
| `PROJ_MODEL_ATTRIBUTES` | `PROJ_MASTER_REC_ID` | `idx_proj_model_attributes_proj_master_rec_id` |
| `JOB_COST_ELEMENT` | `REC_ID` | `idx_job_cost_element_rec_id` |
| `JOB_COST_ELEMENT` | `PROJ_MASTER_REC_ID` | `idx_job_cost_element_proj_master_rec_id` |
| `JOB_COST_ITEM` | `REC_ID` | `idx_job_cost_item_rec_id` |
| `JOB_COST_ITEM` | `JOB_COST_ELEMENT_REC_ID` | `idx_job_cost_item_element_rec_id` |

These indexes were introduced for the PostgreSQL development environment and should not be copied directly into the production Firebird database without review.

The YourQS development team should first verify the indexes already present in Firebird and use the production query plans to determine whether additional indexes are required.
## 6. Project Overview Analytical View

### 6.1 Overview

`VW_PROJECT_OVERVIEW` is the primary project-level analytical view used by the general project analytics functionality.

The purpose of the view is to transform project, model, and costing records into a single project-level dataset that can be consumed by the application without repeatedly reproducing aggregation logic in the backend.

The view combines data from:

- `PROJ_MASTER`
- `PROJ_MODEL_ATTRIBUTES`
- `JOB_COST_ELEMENT`
- `JOB_COST_ITEM`

It provides:

- basic project information;
- aggregated model attributes;
- project cost and selling-price totals;
- data-availability indicators;
- analytics-readiness status;
- gross margin;
- margin percentage;
- selling price per square metre.

The PostgreSQL view is a reference implementation. Equivalent behaviour should be reproduced against the production Firebird database rather than relying on the PostgreSQL view itself.

---

### 6.2 Source Relationships

The view uses the following logical relationships:

```text
PROJ_MASTER.REC_ID
    ↓
PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID

PROJ_MASTER.REC_ID
    ↓
JOB_COST_ELEMENT.PROJ_MASTER_REC_ID
    ↓
JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID
```

`PROJ_MASTER` remains the base dataset.

Model attributes and costing information are joined using `LEFT JOIN`, allowing projects to remain visible even when model or costing information is unavailable.

---

### 6.3 Model Attribute Aggregation

Model attributes are aggregated to project level before being joined to `PROJ_MASTER`.

The PostgreSQL implementation uses:

```sql
SELECT
    pma."PROJ_MASTER_REC_ID" AS project_id,
    SUM(COALESCE(pma."FLOOR_AREA", 0)) AS floor_area,
    SUM(COALESCE(pma."BATHROOM_COUNT", 0)) AS total_bathroom_count,
    MAX(COALESCE(pma."NO_LEVELS", 0)) AS number_of_levels,
    COUNT(*) AS model_count
FROM "PROJ_MODEL_ATTRIBUTES" pma
WHERE COALESCE(pma."IS_INACTIVE", 'N') <> 'Y'
GROUP BY pma."PROJ_MASTER_REC_ID";
```

The resulting project-level values are:

| Output | Calculation |
|---|---|
| `floor_area` | Sum of `FLOOR_AREA` across active model records |
| `total_bathroom_count` | Sum of `BATHROOM_COUNT` across active model records |
| `number_of_levels` | Maximum `NO_LEVELS` value |
| `model_count` | Number of active model attribute records |

Inactive model attribute records are excluded where:

```text
IS_INACTIVE = 'Y'
```

A resulting floor area of zero is converted to `NULL` in the final output.

---

### 6.4 Cost Aggregation

Project costing information is obtained through:

```text
PROJ_MASTER
    ↓
JOB_COST_ELEMENT
    ↓
JOB_COST_ITEM
```

The current `VW_PROJECT_OVERVIEW` implementation calculates:

```text
total_cost =
SUM(COST_PRICE)

total_selling_price =
SUM(SELLING_PRICE)

cost_item_count =
COUNT(JOB_COST_ITEM.REC_ID)
```

The PostgreSQL implementation is:

```sql
SELECT
    jce."PROJ_MASTER_REC_ID" AS project_id,
    SUM(COALESCE(jci."COST_PRICE", 0)) AS total_cost,
    SUM(COALESCE(jci."SELLING_PRICE", 0)) AS total_selling_price,
    COUNT(jci."REC_ID") AS cost_item_count
FROM "JOB_COST_ELEMENT" jce
JOIN "JOB_COST_ITEM" jci
    ON jci."JOB_COST_ELEMENT_REC_ID" = jce."REC_ID"
GROUP BY jce."PROJ_MASTER_REC_ID";
```

> **Implementation Note**
>
> This aggregation differs from the feasibility reference implementation, which uses `QUANTITY × COST_PRICE` and `QUANTITY × SELLING_PRICE` and excludes inactive cost items.
>
> The difference is preserved here because this section documents the current PostgreSQL implementation exactly as developed.
>
> Before reproducing this logic in Firebird, the YourQS development team should confirm which interpretation of the cost fields represents the intended production business logic.

---

### 6.5 Output Columns

The view exposes the following output contract:

| Column | PostgreSQL Type | Description |
|---|---|---|
| `project_id` | `character varying` | Logical project identifier from `PROJ_MASTER.REC_ID`. |
| `project_name` | `character varying` | Project name from `PROJ_MASTER.NAME`. |
| `floor_area` | `numeric` | Aggregated floor area. Zero is returned as `NULL`. |
| `total_bathroom_count` | `bigint` | Total bathroom count across active model records. |
| `number_of_levels` | `integer` | Maximum number of levels across active model records. |
| `model_count` | `bigint` | Number of active model attribute records associated with the project. |
| `total_cost` | `numeric` | Aggregated project cost. |
| `total_selling_price` | `numeric` | Aggregated project selling price. |
| `cost_item_count` | `bigint` | Number of associated cost-item records. |
| `has_model_attributes` | `boolean` | Indicates whether model attribute data was found. |
| `has_cost_data` | `boolean` | Indicates whether costing data was found. |
| `has_valid_floor_area` | `boolean` | Indicates whether aggregated floor area is greater than zero. |
| `is_analytics_ready` | `boolean` | Indicates whether the minimum data required for analytics is available. |
| `gross_margin` | `numeric` | Difference between selling price and cost. |
| `margin_percent` | `numeric` | Gross margin expressed as a percentage of selling price. |
| `selling_price_per_sqm` | `numeric` | Selling price divided by floor area. |

---

### 6.6 Data Availability Flags

The view exposes several boolean flags so that the application does not need to repeatedly infer data availability.

#### `has_model_attributes`

```text
TRUE when model attribute data exists for the project.
```

Reference logic:

```sql
pa.project_id IS NOT NULL
```

#### `has_cost_data`

```text
TRUE when aggregated costing data exists for the project.
```

Reference logic:

```sql
pc.project_id IS NOT NULL
```

#### `has_valid_floor_area`

```text
TRUE when floor area exists and is greater than zero.
```

Reference logic:

```sql
pa.floor_area IS NOT NULL
AND pa.floor_area > 0
```

#### `is_analytics_ready`

A project is considered analytics-ready when:

1. cost data exists;
2. floor area exists;
3. floor area is greater than zero;
4. total selling price is greater than zero.

Reference logic:

```sql
pc.project_id IS NOT NULL
AND pa.floor_area IS NOT NULL
AND pa.floor_area > 0
AND pc.total_selling_price > 0
```

This flag provides a simple way for the application to exclude projects that cannot produce meaningful area-based analytical metrics.

---

### 6.7 Gross Margin

Gross margin represents the absolute difference between project selling price and project cost.

```text
gross_margin =
total_selling_price - total_cost
```

The reference implementation returns `NULL` when selling-price data is unavailable.

PostgreSQL implementation:

```sql
CASE
    WHEN pc.total_selling_price IS NOT NULL
        THEN pc.total_selling_price - pc.total_cost
    ELSE NULL
END
```

---

### 6.8 Margin Percentage

Margin percentage expresses gross margin as a percentage of the total selling price.

```text
margin_percent =
((total_selling_price - total_cost)
 / total_selling_price) × 100
```

The calculation is only performed when:

```text
total_selling_price > 0
```

Otherwise, the result is `NULL`.

PostgreSQL implementation:

```sql
CASE
    WHEN pc.total_selling_price > 0
        THEN (
            (pc.total_selling_price - pc.total_cost)
            / pc.total_selling_price
        ) * 100
    ELSE NULL
END
```

This condition prevents division by zero.

---

### 6.9 Selling Price per Square Metre

Selling price per square metre provides an area-normalised project pricing metric.

```text
selling_price_per_sqm =
total_selling_price / floor_area
```

The metric is calculated only when:

```text
floor_area > 0
AND
total_selling_price > 0
```

Otherwise, the result is `NULL`.

PostgreSQL implementation:

```sql
CASE
    WHEN pa.floor_area > 0
         AND pc.total_selling_price > 0
        THEN pc.total_selling_price / pa.floor_area
    ELSE NULL
END
```

---

### 6.10 Null and Missing Data Behaviour

The view intentionally preserves projects that do not contain complete analytical data.

Because `PROJ_MASTER` is joined to the aggregated model and cost datasets using `LEFT JOIN`, a project may still appear when:

- no model attributes exist;
- no cost data exists;
- floor area is unavailable;
- selling price is unavailable.

The boolean status fields indicate whether the project contains sufficient information for subsequent analytical operations.

This behaviour should be preserved in the Firebird implementation so that incomplete projects are not silently removed from the project dataset.

---

### 6.11 Original PostgreSQL View Definition

The following SQL represents the PostgreSQL reference implementation used during development.

```sql
CREATE OR REPLACE VIEW public."VW_PROJECT_OVERVIEW" AS

WITH project_attributes AS (
    SELECT
        pma."PROJ_MASTER_REC_ID" AS project_id,
        SUM(COALESCE(pma."FLOOR_AREA", 0)) AS floor_area,
        SUM(COALESCE(pma."BATHROOM_COUNT", 0)) AS total_bathroom_count,
        MAX(COALESCE(pma."NO_LEVELS", 0)) AS number_of_levels,
        COUNT(*) AS model_count
    FROM "PROJ_MODEL_ATTRIBUTES" pma
    WHERE COALESCE(pma."IS_INACTIVE", 'N') <> 'Y'
    GROUP BY pma."PROJ_MASTER_REC_ID"
),

project_costs AS (
    SELECT
        jce."PROJ_MASTER_REC_ID" AS project_id,
        SUM(COALESCE(jci."COST_PRICE", 0)) AS total_cost,
        SUM(COALESCE(jci."SELLING_PRICE", 0)) AS total_selling_price,
        COUNT(jci."REC_ID") AS cost_item_count
    FROM "JOB_COST_ELEMENT" jce
    JOIN "JOB_COST_ITEM" jci
        ON jci."JOB_COST_ELEMENT_REC_ID" = jce."REC_ID"
    GROUP BY jce."PROJ_MASTER_REC_ID"
)

SELECT
    pm."REC_ID" AS project_id,
    pm."NAME" AS project_name,
    NULLIF(pa.floor_area, 0) AS floor_area,
    pa.total_bathroom_count,
    pa.number_of_levels,
    pa.model_count,
    pc.total_cost,
    pc.total_selling_price,
    pc.cost_item_count,

    (pa.project_id IS NOT NULL) AS has_model_attributes,

    (pc.project_id IS NOT NULL) AS has_cost_data,

    (
        pa.floor_area IS NOT NULL
        AND pa.floor_area > 0
    ) AS has_valid_floor_area,

    (
        pc.project_id IS NOT NULL
        AND pa.floor_area IS NOT NULL
        AND pa.floor_area > 0
        AND pc.total_selling_price > 0
    ) AS is_analytics_ready,

    CASE
        WHEN pc.total_selling_price IS NOT NULL
            THEN pc.total_selling_price - pc.total_cost
        ELSE NULL
    END AS gross_margin,

    CASE
        WHEN pc.total_selling_price > 0
            THEN (
                (pc.total_selling_price - pc.total_cost)
                / pc.total_selling_price
            ) * 100
        ELSE NULL
    END AS margin_percent,

    CASE
        WHEN pa.floor_area > 0
             AND pc.total_selling_price > 0
            THEN pc.total_selling_price / pa.floor_area
        ELSE NULL
    END AS selling_price_per_sqm

FROM "PROJ_MASTER" pm

LEFT JOIN project_attributes pa
    ON pa.project_id = pm."REC_ID"

LEFT JOIN project_costs pc
    ON pc.project_id = pm."REC_ID";
```

---

### 6.12 Example Queries

#### Retrieve Projects

```sql
SELECT *
FROM public."VW_PROJECT_OVERVIEW"
LIMIT 20;
```

#### Retrieve Analytics-Ready Projects

```sql
SELECT *
FROM public."VW_PROJECT_OVERVIEW"
WHERE is_analytics_ready = TRUE;
```

#### Retrieve a Specific Project

```sql
SELECT *
FROM public."VW_PROJECT_OVERVIEW"
WHERE project_id = @project_id;
```

The parameter syntax used by the final Firebird/.NET implementation may differ depending on the selected Firebird data provider.

---

### 6.13 Application Usage

`VW_PROJECT_OVERVIEW` provides the database-side data contract for the project overview functionality.

The application uses this dataset for operations including:

- project listing;
- project search and filtering;
- project summary metrics;
- project-level analytical information;
- margin analysis;
- area-normalised selling-price analysis;
- determining whether a project contains sufficient data for analytics.

The application should not independently reproduce calculations such as `margin_percent` or `selling_price_per_sqm` when equivalent values are provided by the analytical data layer.

Keeping these calculations in a single data layer reduces the risk of different parts of the application applying different formulas to the same project.

---

### 6.14 Firebird Implementation Notes

The PostgreSQL SQL shown above should be treated as reference logic rather than Firebird-ready SQL.

When reproducing `VW_PROJECT_OVERVIEW` against the existing YourQS Firebird database, the implementation should preserve the following behaviour:

1. use the existing project record as the base dataset;
2. aggregate active model attributes at project level;
3. aggregate project costing information through the cost-element relationship;
4. retain projects with incomplete analytical data;
5. expose equivalent data-availability flags;
6. prevent division by zero in calculated metrics;
7. preserve the documented margin calculation;
8. preserve the documented area-normalised pricing calculation;
9. expose an equivalent output contract to the application.

The YourQS developer should verify:

- equivalent Firebird table and column names;
- existing Firebird relationships and constraints;
- treatment of inactive records;
- numeric precision and scale;
- existing indexes;
- Firebird boolean representation;
- Firebird view and CTE syntax supported by the production version;
- the intended interpretation of `COST_PRICE`, `SELLING_PRICE`, and `QUANTITY`.

The Firebird implementation does not need to reproduce the PostgreSQL SQL statement character-for-character.

The requirement is to reproduce the documented **business logic and output contract** using the existing YourQS production data model.
## 7. Feasibility Project Features Analytical View

### 7.1 Overview

`VW_FEASIBILITY_PROJECT_FEATURES` is the primary database-side analytical view supporting the feasibility assessment functionality.

The purpose of the view is to transform historical YourQS projects into a structured dataset that can be used for project classification, comparable-project selection, pricing analysis, and feasibility benchmarking.

Unlike `VW_PROJECT_OVERVIEW`, this view performs additional data preparation and classification before a historical project is considered suitable for feasibility analysis.

The view combines data from:

- `PROJ_MASTER`
- `PROJ_MODEL_ATTRIBUTES`
- `PROJ_TYPE`
- `PROJ_MODEL_HEADER`
- `JOB_COST_ELEMENT`
- `JOB_COST_ITEM`

The view performs the following main operations:

1. aggregates model attributes at project level;
2. calculates quantity-adjusted project costs and selling prices;
3. combines descriptive project notes;
4. creates area-normalised pricing metrics;
5. detects project characteristics from descriptive text;
6. classifies projects into feasibility categories;
7. selects the appropriate area basis for each project type;
8. identifies incomplete or potentially unsuitable historical projects;
9. produces a final `is_clean_feasibility_candidate` indicator.

The PostgreSQL implementation is the reference implementation developed and tested during the project.

The production Firebird implementation should reproduce the required behaviour and output contract rather than copy the PostgreSQL syntax directly.

---

### 7.2 Processing Pipeline

The view is implemented as a sequence of Common Table Expressions (CTEs).

```text
PROJ_MODEL_ATTRIBUTES + PROJ_TYPE
                │
                ↓
         model_summary
                │
                │
JOB_COST_ELEMENT + JOB_COST_ITEM
                │
                ↓
          project_costs
                │
                │
       PROJ_MODEL_HEADER
                │
                ↓
          project_notes
                │
                ↓
PROJ_MASTER → base
                │
                ↓
            features
                │
                ↓
           classified
                │
                ↓
VW_FEASIBILITY_PROJECT_FEATURES
```

Each stage has a separate responsibility:

| Stage | Responsibility |
|---|---|
| `model_summary` | Aggregates physical project/model characteristics. |
| `project_costs` | Calculates project cost and selling-price totals. |
| `project_notes` | Combines model notes into project-level text. |
| `base` | Combines source data and calculates initial pricing metrics. |
| `features` | Detects scope and project characteristics from text. |
| `classified` | Assigns feasibility category, relevant area, and pricing basis. |
| Final `SELECT` | Calculates quality flags and determines clean feasibility candidates. |

---

### 7.3 Model Summary

The `model_summary` stage combines `PROJ_MODEL_ATTRIBUTES` with `PROJ_TYPE`.

The relationship is:

```text
PROJ_MODEL_ATTRIBUTES.PROJ_TYPE_REC_ID
    → PROJ_TYPE.REC_ID
```

and the resulting records are grouped by:

```text
PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID
```

The reference query is:

```sql
SELECT
    pma."PROJ_MASTER_REC_ID" AS project_id,
    COUNT(*) AS model_count,
    MAX(pt."NAME"::text) AS source_project_type,
    MAX(pma."FLOOR_AREA") AS floor_area,
    MAX(pma."AFFECTED_AREA") AS affected_area,
    MAX(pma."NO_LEVELS") AS levels,
    MAX(pma."BATHROOM_COUNT") AS bathrooms,
    MAX(pma."KITCHEN_COUNT") AS kitchens
FROM "PROJ_MODEL_ATTRIBUTES" pma
JOIN "PROJ_TYPE" pt
    ON pt."REC_ID"::text = pma."PROJ_TYPE_REC_ID"::text
GROUP BY pma."PROJ_MASTER_REC_ID";
```

The stage produces:

| Field | Description |
|---|---|
| `project_id` | Parent project identifier. |
| `model_count` | Number of model attribute records associated with the project. |
| `source_project_type` | Project type from `PROJ_TYPE.NAME`. |
| `floor_area` | Maximum recorded floor area. |
| `affected_area` | Maximum recorded affected area. |
| `levels` | Maximum recorded number of levels. |
| `bathrooms` | Maximum recorded bathroom count. |
| `kitchens` | Maximum recorded kitchen count. |

The use of maximum values differs from the aggregation used by `VW_PROJECT_OVERVIEW`.

This behaviour is intentional in the current reference implementation because the feasibility dataset later identifies projects with exactly one model as unambiguous historical candidates.

---

### 7.4 Project Cost Aggregation

The feasibility implementation calculates project pricing through:

```text
PROJ_MASTER
    ↓
JOB_COST_ELEMENT
    ↓
JOB_COST_ITEM
```

Unlike the current project overview implementation, quantity is included in the feasibility cost calculation.

The calculations are:

```text
total_cost =
SUM(QUANTITY × COST_PRICE)

total_selling_price =
SUM(QUANTITY × SELLING_PRICE)
```

The reference query is:

```sql
SELECT
    jce."PROJ_MASTER_REC_ID" AS project_id,

    SUM(
        COALESCE(jci."QUANTITY", 0)
        * COALESCE(jci."COST_PRICE", 0)
    ) AS total_cost,

    SUM(
        COALESCE(jci."QUANTITY", 0)
        * COALESCE(jci."SELLING_PRICE", 0)
    ) AS total_selling_price,

    COUNT(jci."REC_ID") AS cost_item_count

FROM "JOB_COST_ELEMENT" jce

JOIN "JOB_COST_ITEM" jci
    ON jci."JOB_COST_ELEMENT_REC_ID"::text = jce."REC_ID"::text

WHERE COALESCE(jci."IS_INACTIVE", 'N')::text <> 'Y'

GROUP BY jce."PROJ_MASTER_REC_ID";
```

Inactive cost items are therefore excluded.

Null quantities and prices are treated as zero.

> **Implementation Note**
>
> This calculation should be treated as the feasibility reference calculation.
>
> The YourQS development team should verify the meaning of `QUANTITY`, `COST_PRICE`, and `SELLING_PRICE` in the production Firebird database before reproducing the calculation.

---

### 7.5 Project Notes

Some characteristics required for feasibility comparison are not available as structured fields in the supplied historical dataset.

The implementation therefore uses descriptive model notes as an additional source of information.

Active `PROJ_MODEL_HEADER` records are grouped by project.

The reference query is:

```sql
SELECT
    pmh."PROJ_MASTER_REC_ID" AS project_id,

    STRING_AGG(
        DISTINCT COALESCE(pmh."NOTES_HEADER", '')::text,
        ' '
    ) AS notes_header,

    STRING_AGG(
        DISTINCT COALESCE(pmh."NOTES_FOOTER", '')::text,
        ' '
    ) AS notes_footer

FROM "PROJ_MODEL_HEADER" pmh

WHERE pmh."PROJ_MASTER_REC_ID" IS NOT NULL
  AND COALESCE(pmh."IS_INACTIVE", 'N')::text <> 'Y'

GROUP BY pmh."PROJ_MASTER_REC_ID";
```

This produces combined header and footer notes for each project.

`STRING_AGG` is PostgreSQL-specific behaviour and may require an equivalent Firebird implementation.

---

### 7.6 Searchable Project Text

The `base` stage creates a single lowercase text value used for feature detection.

The value combines:

```text
Project Name
+
Notes Header
+
Notes Footer
```

Reference logic:

```sql
LOWER(
    COALESCE(pm."NAME", '')::text
    || ' '
    || COALESCE(pn.notes_header, '')
    || ' '
    || COALESCE(pn.notes_footer, '')
) AS searchable_text
```

This approach allows historical projects to be classified using information already present in project names and model notes.

The text classification is heuristic.

A detected term indicates that the corresponding language appears in the available project text. It does not guarantee that the characteristic is a formally structured attribute of the project.

---

### 7.7 Base Pricing Metrics

The `base` stage calculates several area-normalised pricing metrics.

#### Cost per Floor Square Metre

```text
cost_per_floor_sqm =
total_cost / floor_area
```

Calculated only when:

```text
floor_area > 0
AND
total_cost > 0
```

#### Selling Price per Floor Square Metre

```text
selling_per_floor_sqm =
total_selling_price / floor_area
```

Calculated only when:

```text
floor_area > 0
AND
total_selling_price > 0
```

#### Cost per Affected Square Metre

```text
cost_per_affected_sqm =
total_cost / affected_area
```

Calculated only when:

```text
affected_area > 0
AND
total_cost > 0
```

#### Selling Price per Affected Square Metre

```text
selling_per_affected_sqm =
total_selling_price / affected_area
```

Calculated only when:

```text
affected_area > 0
AND
total_selling_price > 0
```

These separate metrics are required because new-build and alteration projects use different area concepts.

---

### 7.8 Margin Percentage

The feasibility view calculates project margin as:

```text
margin_percent =
((total_selling_price - total_cost)
 / total_selling_price) × 100
```

Reference logic:

```sql
CASE
    WHEN pc.total_selling_price > 0
        THEN (
            (pc.total_selling_price - pc.total_cost)
            / pc.total_selling_price
        ) * 100
    ELSE NULL
END
```

The calculation is not performed when selling price is zero or unavailable.

---

### 7.9 Text-Derived Feature Detection

The `features` stage searches `searchable_text` for predefined terms.

These indicators provide additional information for feasibility filtering and project comparison.

#### Extension Language

`has_extension_language` is set when the text contains one or more of:

```text
extension
addition
additions
extend existing
new extension
```

#### Renovation Language

`has_renovation_language` is set when the text contains one or more of:

```text
renovation
renovate
alteration
alterations
refurb
reconfigure
```

#### Retaining

`mentions_retaining` detects:

```text
retaining
```

#### Demolition

`mentions_demolition` detects terms beginning with:

```text
demol
```

This allows terms such as `demolition` and related variants to be detected.

#### Recladding

`mentions_recladding` detects:

```text
reclad
re-clad
re clad
```

#### Roofing

`mentions_roofing` detects:

```text
roof replacement
reroof
re-roof
re roof
new roof
```

#### Pool

`mentions_pool` detects:

```text
pool
swimming pool
```

#### Outbuilding

`mentions_outbuilding` detects:

```text
garage
carport
outbuilding
```

#### Secondary Dwelling

`mentions_secondary_dwelling` detects:

```text
sleepout
minor dwelling
ancillary
```

#### Structural Complexity

`mentions_structural_complexity` detects:

```text
structural steel
structural wall
structural walls
structural opening
structural works
```

#### Electrical Upgrade

`mentions_electrical_upgrade` detects:

```text
electrical upgrade
rewire
re-wire
```

#### Plumbing Upgrade

`mentions_plumbing_upgrade` detects:

```text
plumbing upgrade
replumb
re-plumb
```

---

### 7.10 Scope and Data-Quality Indicators

The same text analysis identifies historical projects that may not represent complete conventional construction pricing.

#### Labour Only

`is_labour_only` detects:

```text
labour only
labor only
```

#### Concept Project

`is_concept` detects:

```text
concept
```

#### Assessment Project

`is_assessment` detects:

```text
assessment
```

#### Client-Supplied Scope

`has_client_supplied_scope` detects:

```text
client supplied
client-supplied
supplied by client
by client
```

#### Scope Exclusions

`has_scope_exclusions` detects:

```text
excluded
exclude
excludes
by others
done by others
```

#### Partial Scope

`is_partial_scope` detects:

```text
labour only
labor only
foundation only
foundations only
concrete floor only
to lock up
to lock-up
```

These indicators are used to reduce the likelihood of comparing a new feasibility request against historical projects whose recorded price does not represent the complete project scope.

---

### 7.11 Feasibility Category Classification

After the text-derived features have been generated, each project is assigned a `feasibility_category`.

The classification is based primarily on `source_project_type`, with additional text-derived classification for residential alterations.

The reference rules are:

| Source Project Type | Additional Condition | Feasibility Category |
|---|---|---|
| `Residential New` | - | `new_build` |
| `Residential Alteration` | Extension + renovation language | `renovation_and_extension` |
| `Residential Alteration` | Extension language | `extension` |
| `Residential Alteration` | Renovation language | `renovation` |
| `Residential Alteration` | No recognised classification | `unclassified_alteration` |
| `Residential Multi-Unit` | - | `multi_unit` |
| Other | - | `other` |

Reference logic:

```sql
CASE
    WHEN source_project_type = 'Residential New'
        THEN 'new_build'

    WHEN source_project_type = 'Residential Alteration'
         AND has_extension_language
         AND has_renovation_language
        THEN 'renovation_and_extension'

    WHEN source_project_type = 'Residential Alteration'
         AND has_extension_language
        THEN 'extension'

    WHEN source_project_type = 'Residential Alteration'
         AND has_renovation_language
        THEN 'renovation'

    WHEN source_project_type = 'Residential Alteration'
        THEN 'unclassified_alteration'

    WHEN source_project_type = 'Residential Multi-Unit'
        THEN 'multi_unit'

    ELSE 'other'
END
```

The ordering of these rules is important.

For example, a residential alteration containing both renovation and extension language must be classified as `renovation_and_extension` before the individual extension or renovation conditions are evaluated.

---

### 7.12 Relevant Area Selection

Different project types require different area measurements for meaningful price normalisation.

The view therefore produces a common `relevant_area` field.

The current rules are:

| Source Project Type | Relevant Area |
|---|---|
| `Residential New` | `floor_area` |
| `Residential Alteration` | `affected_area` |
| `Residential Multi-Unit` | `floor_area` |
| Other | `NULL` |

Reference logic:

```sql
CASE
    WHEN source_project_type = 'Residential New'
        THEN floor_area

    WHEN source_project_type = 'Residential Alteration'
        THEN affected_area

    WHEN source_project_type = 'Residential Multi-Unit'
        THEN floor_area

    ELSE NULL
END
```

This allows downstream feasibility logic to use a single area field without independently determining whether floor area or affected area should be used.

---

### 7.13 Pricing Area Basis

The view also explicitly identifies which area field was selected.

The output is stored in `pricing_area_basis`.

| Source Project Type | `pricing_area_basis` |
|---|---|
| `Residential New` | `floor_area` |
| `Residential Alteration` | `affected_area` |
| `Residential Multi-Unit` | `floor_area` |
| Other | `NULL` |

This field makes the area-normalisation decision visible to downstream application logic and improves traceability of feasibility calculations.

---

### 7.14 Relevant-Area Pricing Metrics

After `relevant_area` has been selected, the corresponding cost and selling-price metrics are exposed through common fields.

#### `selling_per_relevant_sqm`

For new-build and multi-unit projects:

```text
selling_per_relevant_sqm =
selling_per_floor_sqm
```

For alteration projects:

```text
selling_per_relevant_sqm =
selling_per_affected_sqm
```

#### `cost_per_relevant_sqm`

For new-build and multi-unit projects:

```text
cost_per_relevant_sqm =
cost_per_floor_sqm
```

For alteration projects:

```text
cost_per_relevant_sqm =
cost_per_affected_sqm
```

This abstraction allows downstream feasibility logic to compare projects using the appropriate pricing basis without repeatedly branching on project type.

---

### 7.15 New-Build Name Anomaly Detection

The view performs an additional check for projects whose source type is `Residential New` but whose project name suggests that the project may not represent a conventional residential new build.

`has_new_build_name_anomaly` becomes `TRUE` when:

```text
source_project_type = Residential New
```

and the project name contains one or more of:

```text
sleepout
garage
ancillary
shed
pool
alteration
addition
rebuild
assessment
concept
```

The purpose of this flag is to identify records where the structured project type may be too broad or inconsistent with the apparent project scope.

Such projects are not automatically treated as clean feasibility candidates.

---

### 7.16 Core Pricing Data

`has_core_pricing_data` indicates whether a historical project contains the minimum pricing information required for area-based feasibility comparison.

The flag requires:

```text
total_selling_price IS NOT NULL
AND total_selling_price > 0

AND relevant_area IS NOT NULL
AND relevant_area > 0

AND selling_per_relevant_sqm IS NOT NULL
AND selling_per_relevant_sqm > 0
```

This flag only verifies the core pricing information.

It does not by itself mean that the historical project is suitable for feasibility benchmarking.

---

### 7.17 Unambiguous Model

`has_unambiguous_model` is defined as:

```text
model_count = 1
```

Projects containing multiple model attribute records may represent data that cannot be safely interpreted as a single project configuration by the current feasibility logic.

The flag therefore allows downstream logic to distinguish projects with a single clearly identifiable model.

---

### 7.18 Clean Feasibility Candidate

`is_clean_feasibility_candidate` is the final database-side suitability indicator.

A project is considered a clean candidate only when all required conditions are satisfied.

The current reference implementation requires:

```text
model_count = 1

AND total_selling_price IS NOT NULL
AND total_selling_price > 0

AND relevant_area IS NOT NULL
AND relevant_area > 0

AND selling_per_relevant_sqm IS NOT NULL
AND selling_per_relevant_sqm > 0

AND NOT is_labour_only

AND NOT is_concept

AND NOT is_assessment

AND NOT is_partial_scope

AND NOT has_client_supplied_scope

AND NOT has_new_build_name_anomaly

AND margin_percent IS NOT NULL
AND margin_percent >= 0
AND margin_percent <= 50
```

In simplified form, a clean candidate must therefore:

1. have exactly one model;
2. contain valid selling-price information;
3. contain a valid relevant area;
4. produce a valid selling price per relevant square metre;
5. not represent labour-only work;
6. not be a concept project;
7. not be an assessment project;
8. not represent an identified partial scope;
9. not contain identified client-supplied scope;
10. not contain a new-build naming anomaly;
11. have a calculable margin;
12. have a margin between 0% and 50%.

The purpose of this flag is to remove obviously unsuitable or ambiguous historical records before they are used as feasibility comparables.

> **Important**
>
> `is_clean_feasibility_candidate` is a data-quality and suitability heuristic developed for the feasibility implementation.
>
> It should not be interpreted as a statement that projects failing the flag contain incorrect data.
>
> A project may be valid for its original business purpose while still being unsuitable as a comparable project for automated feasibility estimation.

---

### 7.19 Output Columns

The final view exposes the following output contract.

#### Project Identification and Classification

| Column | Type | Description |
|---|---|---|
| `project_id` | `character varying` | Logical project identifier. |
| `project_name` | `character varying` | Project name. |
| `source_project_type` | `text` | Original project type from YourQS data. |
| `feasibility_category` | `text` | Derived feasibility project category. |
| `model_count` | `bigint` | Number of model attribute records. |

#### Project Characteristics

| Column | Type | Description |
|---|---|---|
| `floor_area` | `numeric` | Recorded floor area. |
| `affected_area` | `numeric` | Recorded affected area. |
| `relevant_area` | `numeric` | Area selected for feasibility pricing. |
| `pricing_area_basis` | `text` | Identifies whether floor or affected area is used. |
| `levels` | `integer` | Number of building levels. |
| `bathrooms` | `integer` | Bathroom count. |
| `kitchens` | `integer` | Kitchen count. |

#### Pricing

| Column | Type | Description |
|---|---|---|
| `total_cost` | `numeric` | Quantity-adjusted total project cost. |
| `total_selling_price` | `numeric` | Quantity-adjusted total project selling price. |
| `cost_item_count` | `bigint` | Number of active cost items. |
| `cost_per_floor_sqm` | `numeric` | Cost divided by floor area. |
| `selling_per_floor_sqm` | `numeric` | Selling price divided by floor area. |
| `cost_per_affected_sqm` | `numeric` | Cost divided by affected area. |
| `selling_per_affected_sqm` | `numeric` | Selling price divided by affected area. |
| `cost_per_relevant_sqm` | `numeric` | Cost using the selected project-type area basis. |
| `selling_per_relevant_sqm` | `numeric` | Selling price using the selected project-type area basis. |
| `margin_percent` | `numeric` | Project margin percentage. |

#### Detected Scope Characteristics

| Column | Type |
|---|---|
| `has_extension_language` | `boolean` |
| `has_renovation_language` | `boolean` |
| `mentions_retaining` | `boolean` |
| `mentions_demolition` | `boolean` |
| `mentions_recladding` | `boolean` |
| `mentions_roofing` | `boolean` |
| `mentions_pool` | `boolean` |
| `mentions_outbuilding` | `boolean` |
| `mentions_secondary_dwelling` | `boolean` |
| `mentions_structural_complexity` | `boolean` |
| `mentions_electrical_upgrade` | `boolean` |
| `mentions_plumbing_upgrade` | `boolean` |

#### Scope and Quality Indicators

| Column | Type |
|---|---|
| `is_labour_only` | `boolean` |
| `is_concept` | `boolean` |
| `is_assessment` | `boolean` |
| `is_partial_scope` | `boolean` |
| `has_client_supplied_scope` | `boolean` |
| `has_scope_exclusions` | `boolean` |
| `has_new_build_name_anomaly` | `boolean` |
| `has_core_pricing_data` | `boolean` |
| `has_unambiguous_model` | `boolean` |
| `is_clean_feasibility_candidate` | `boolean` |

#### Reference Text

| Column | Type | Description |
|---|---|---|
| `notes_header` | `text` | Combined project model header notes. |
| `notes_footer` | `text` | Combined project model footer notes. |

---

### 7.20 Important Interpretation Notes

The feature flags produced by this view should be interpreted as analytical indicators rather than authoritative project metadata.

For example:

```text
mentions_roofing = TRUE
```

means that recognised roofing-related language was detected in the available project text.

It does not necessarily mean that roofing work represents a specific percentage of the project cost.

Similarly:

```text
mentions_structural_complexity = TRUE
```

indicates that recognised structural terminology was found, not that a formal engineering complexity assessment was performed.

These distinctions should be preserved if the feasibility implementation is extended in the future.

---

### 7.21 Original PostgreSQL View Definition

The following is the reference PostgreSQL implementation used during development.

```sql
CREATE OR REPLACE VIEW public."VW_FEASIBILITY_PROJECT_FEATURES" AS

WITH model_summary AS (
    SELECT
        pma."PROJ_MASTER_REC_ID" AS project_id,
        COUNT(*) AS model_count,
        MAX(pt."NAME"::text) AS source_project_type,
        MAX(pma."FLOOR_AREA") AS floor_area,
        MAX(pma."AFFECTED_AREA") AS affected_area,
        MAX(pma."NO_LEVELS") AS levels,
        MAX(pma."BATHROOM_COUNT") AS bathrooms,
        MAX(pma."KITCHEN_COUNT") AS kitchens
    FROM "PROJ_MODEL_ATTRIBUTES" pma
    JOIN "PROJ_TYPE" pt
        ON pt."REC_ID"::text = pma."PROJ_TYPE_REC_ID"::text
    GROUP BY pma."PROJ_MASTER_REC_ID"
),

project_costs AS (
    SELECT
        jce."PROJ_MASTER_REC_ID" AS project_id,

        SUM(
            COALESCE(jci."QUANTITY", 0)
            * COALESCE(jci."COST_PRICE", 0)
        ) AS total_cost,

        SUM(
            COALESCE(jci."QUANTITY", 0)
            * COALESCE(jci."SELLING_PRICE", 0)
        ) AS total_selling_price,

        COUNT(jci."REC_ID") AS cost_item_count

    FROM "JOB_COST_ELEMENT" jce

    JOIN "JOB_COST_ITEM" jci
        ON jci."JOB_COST_ELEMENT_REC_ID"::text = jce."REC_ID"::text

    WHERE COALESCE(jci."IS_INACTIVE", 'N')::text <> 'Y'

    GROUP BY jce."PROJ_MASTER_REC_ID"
),

project_notes AS (
    SELECT
        pmh."PROJ_MASTER_REC_ID" AS project_id,

        STRING_AGG(
            DISTINCT COALESCE(pmh."NOTES_HEADER", '')::text,
            ' '
        ) AS notes_header,

        STRING_AGG(
            DISTINCT COALESCE(pmh."NOTES_FOOTER", '')::text,
            ' '
        ) AS notes_footer

    FROM "PROJ_MODEL_HEADER" pmh

    WHERE pmh."PROJ_MASTER_REC_ID" IS NOT NULL
      AND COALESCE(pmh."IS_INACTIVE", 'N')::text <> 'Y'

    GROUP BY pmh."PROJ_MASTER_REC_ID"
),

base AS (
    SELECT
        pm."REC_ID" AS project_id,
        pm."NAME" AS project_name,
        ms.source_project_type,
        ms.model_count,
        ms.floor_area,
        ms.affected_area,
        ms.levels,
        ms.bathrooms,
        ms.kitchens,
        pc.total_cost,
        pc.total_selling_price,
        pc.cost_item_count,

        CASE
            WHEN ms.floor_area > 0
                 AND pc.total_cost > 0
                THEN pc.total_cost / ms.floor_area
            ELSE NULL
        END AS cost_per_floor_sqm,

        CASE
            WHEN ms.floor_area > 0
                 AND pc.total_selling_price > 0
                THEN pc.total_selling_price / ms.floor_area
            ELSE NULL
        END AS selling_per_floor_sqm,

        CASE
            WHEN ms.affected_area > 0
                 AND pc.total_cost > 0
                THEN pc.total_cost / ms.affected_area
            ELSE NULL
        END AS cost_per_affected_sqm,

        CASE
            WHEN ms.affected_area > 0
                 AND pc.total_selling_price > 0
                THEN pc.total_selling_price / ms.affected_area
            ELSE NULL
        END AS selling_per_affected_sqm,

        CASE
            WHEN pc.total_selling_price > 0
                THEN (
                    (pc.total_selling_price - pc.total_cost)
                    / pc.total_selling_price
                ) * 100
            ELSE NULL
        END AS margin_percent,

        pn.notes_header,
        pn.notes_footer,

        LOWER(
            COALESCE(pm."NAME", '')::text
            || ' '
            || COALESCE(pn.notes_header, '')
            || ' '
            || COALESCE(pn.notes_footer, '')
        ) AS searchable_text

    FROM "PROJ_MASTER" pm

    JOIN model_summary ms
        ON ms.project_id::text = pm."REC_ID"::text

    LEFT JOIN project_costs pc
        ON pc.project_id::text = pm."REC_ID"::text

    LEFT JOIN project_notes pn
        ON pn.project_id::text = pm."REC_ID"::text
),

features AS (
    SELECT
        base.*,

        (
            searchable_text LIKE '%extension%'
            OR searchable_text LIKE '%addition%'
            OR searchable_text LIKE '%additions%'
            OR searchable_text LIKE '%extend existing%'
            OR searchable_text LIKE '%new extension%'
        ) AS has_extension_language,

        (
            searchable_text LIKE '%renovation%'
            OR searchable_text LIKE '%renovate%'
            OR searchable_text LIKE '%alteration%'
            OR searchable_text LIKE '%alterations%'
            OR searchable_text LIKE '%refurb%'
            OR searchable_text LIKE '%reconfigure%'
        ) AS has_renovation_language,

        searchable_text LIKE '%retaining%'
            AS mentions_retaining,

        searchable_text LIKE '%demol%'
            AS mentions_demolition,

        (
            searchable_text LIKE '%reclad%'
            OR searchable_text LIKE '%re-clad%'
            OR searchable_text LIKE '%re clad%'
        ) AS mentions_recladding,

        (
            searchable_text LIKE '%roof replacement%'
            OR searchable_text LIKE '%reroof%'
            OR searchable_text LIKE '%re-roof%'
            OR searchable_text LIKE '%re roof%'
            OR searchable_text LIKE '%new roof%'
        ) AS mentions_roofing,

        (
            searchable_text LIKE '%pool%'
            OR searchable_text LIKE '%swimming pool%'
        ) AS mentions_pool,

        (
            searchable_text LIKE '%garage%'
            OR searchable_text LIKE '%carport%'
            OR searchable_text LIKE '%outbuilding%'
        ) AS mentions_outbuilding,

        (
            searchable_text LIKE '%sleepout%'
            OR searchable_text LIKE '%minor dwelling%'
            OR searchable_text LIKE '%ancillary%'
        ) AS mentions_secondary_dwelling,

        (
            searchable_text LIKE '%structural steel%'
            OR searchable_text LIKE '%structural wall%'
            OR searchable_text LIKE '%structural walls%'
            OR searchable_text LIKE '%structural opening%'
            OR searchable_text LIKE '%structural works%'
        ) AS mentions_structural_complexity,

        (
            searchable_text LIKE '%electrical upgrade%'
            OR searchable_text LIKE '%rewire%'
            OR searchable_text LIKE '%re-wire%'
        ) AS mentions_electrical_upgrade,

        (
            searchable_text LIKE '%plumbing upgrade%'
            OR searchable_text LIKE '%replumb%'
            OR searchable_text LIKE '%re-plumb%'
        ) AS mentions_plumbing_upgrade,

        (
            searchable_text LIKE '%labour only%'
            OR searchable_text LIKE '%labor only%'
        ) AS is_labour_only,

        searchable_text LIKE '%concept%'
            AS is_concept,

        searchable_text LIKE '%assessment%'
            AS is_assessment,

        (
            searchable_text LIKE '%client supplied%'
            OR searchable_text LIKE '%client-supplied%'
            OR searchable_text LIKE '%supplied by client%'
            OR searchable_text LIKE '%by client%'
        ) AS has_client_supplied_scope,

        (
            searchable_text LIKE '%excluded%'
            OR searchable_text LIKE '%exclude %'
            OR searchable_text LIKE '%excludes %'
            OR searchable_text LIKE '%by others%'
            OR searchable_text LIKE '%done by others%'
        ) AS has_scope_exclusions,

        (
            searchable_text LIKE '%labour only%'
            OR searchable_text LIKE '%labor only%'
            OR searchable_text LIKE '%foundation only%'
            OR searchable_text LIKE '%foundations only%'
            OR searchable_text LIKE '%concrete floor only%'
            OR searchable_text LIKE '%to lock up%'
            OR searchable_text LIKE '%to lock-up%'
        ) AS is_partial_scope

    FROM base
),

classified AS (
    SELECT
        features.*,

        CASE
            WHEN source_project_type = 'Residential New'
                THEN 'new_build'

            WHEN source_project_type = 'Residential Alteration'
                 AND has_extension_language
                 AND has_renovation_language
                THEN 'renovation_and_extension'

            WHEN source_project_type = 'Residential Alteration'
                 AND has_extension_language
                THEN 'extension'

            WHEN source_project_type = 'Residential Alteration'
                 AND has_renovation_language
                THEN 'renovation'

            WHEN source_project_type = 'Residential Alteration'
                THEN 'unclassified_alteration'

            WHEN source_project_type = 'Residential Multi-Unit'
                THEN 'multi_unit'

            ELSE 'other'
        END AS feasibility_category,

        CASE
            WHEN source_project_type = 'Residential New'
                THEN floor_area

            WHEN source_project_type = 'Residential Alteration'
                THEN affected_area

            WHEN source_project_type = 'Residential Multi-Unit'
                THEN floor_area

            ELSE NULL
        END AS relevant_area,

        CASE
            WHEN source_project_type = 'Residential New'
                THEN 'floor_area'

            WHEN source_project_type = 'Residential Alteration'
                THEN 'affected_area'

            WHEN source_project_type = 'Residential Multi-Unit'
                THEN 'floor_area'

            ELSE NULL
        END AS pricing_area_basis,

        CASE
            WHEN source_project_type = 'Residential New'
                THEN selling_per_floor_sqm

            WHEN source_project_type = 'Residential Alteration'
                THEN selling_per_affected_sqm

            WHEN source_project_type = 'Residential Multi-Unit'
                THEN selling_per_floor_sqm

            ELSE NULL
        END AS selling_per_relevant_sqm,

        CASE
            WHEN source_project_type = 'Residential New'
                THEN cost_per_floor_sqm

            WHEN source_project_type = 'Residential Alteration'
                THEN cost_per_affected_sqm

            WHEN source_project_type = 'Residential Multi-Unit'
                THEN cost_per_floor_sqm

            ELSE NULL
        END AS cost_per_relevant_sqm,

        (
            source_project_type = 'Residential New'
            AND (
                LOWER(COALESCE(project_name, '')) LIKE '%sleepout%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%garage%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%ancillary%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%shed%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%pool%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%alteration%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%addition%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%rebuild%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%assessment%'
                OR LOWER(COALESCE(project_name, '')) LIKE '%concept%'
            )
        ) AS has_new_build_name_anomaly

    FROM features
)

SELECT
    project_id,
    project_name,
    source_project_type,
    feasibility_category,
    model_count,
    floor_area,
    affected_area,
    relevant_area,
    pricing_area_basis,
    levels,
    bathrooms,
    kitchens,
    total_cost,
    total_selling_price,
    cost_item_count,
    cost_per_floor_sqm,
    selling_per_floor_sqm,
    cost_per_affected_sqm,
    selling_per_affected_sqm,
    cost_per_relevant_sqm,
    selling_per_relevant_sqm,
    margin_percent,
    has_extension_language,
    has_renovation_language,
    mentions_retaining,
    mentions_demolition,
    mentions_recladding,
    mentions_roofing,
    mentions_pool,
    mentions_outbuilding,
    mentions_secondary_dwelling,
    mentions_structural_complexity,
    mentions_electrical_upgrade,
    mentions_plumbing_upgrade,
    is_labour_only,
    is_concept,
    is_assessment,
    is_partial_scope,
    has_client_supplied_scope,
    has_scope_exclusions,
    has_new_build_name_anomaly,

    (
        total_selling_price IS NOT NULL
        AND total_selling_price > 0
        AND relevant_area IS NOT NULL
        AND relevant_area > 0
        AND selling_per_relevant_sqm IS NOT NULL
        AND selling_per_relevant_sqm > 0
    ) AS has_core_pricing_data,

    (model_count = 1) AS has_unambiguous_model,

    (
        model_count = 1

        AND total_selling_price IS NOT NULL
        AND total_selling_price > 0

        AND relevant_area IS NOT NULL
        AND relevant_area > 0

        AND selling_per_relevant_sqm IS NOT NULL
        AND selling_per_relevant_sqm > 0

        AND NOT is_labour_only
        AND NOT is_concept
        AND NOT is_assessment
        AND NOT is_partial_scope
        AND NOT has_client_supplied_scope
        AND NOT has_new_build_name_anomaly

        AND margin_percent IS NOT NULL
        AND margin_percent >= 0
        AND margin_percent <= 50
    ) AS is_clean_feasibility_candidate,

    notes_header,
    notes_footer

FROM classified;
```

---

### 7.22 Firebird Implementation Notes

The SQL above contains PostgreSQL-specific syntax and should not be copied directly into Firebird.

Areas requiring particular attention include:

- PostgreSQL `STRING_AGG(DISTINCT ...)`;
- PostgreSQL `::text` casts;
- boolean expressions returned directly as columns;
- quoted identifier behaviour;
- CTE syntax supported by the production Firebird version;
- string concatenation and null handling;
- case-insensitive text comparison behaviour;
- numeric precision during division;
- implementation of boolean outputs if the production Firebird version or application schema uses a different representation.

The Firebird implementation should preserve the logical processing stages:

```text
Model aggregation
    ↓
Cost aggregation
    ↓
Project-note aggregation
    ↓
Base pricing metrics
    ↓
Text-derived features
    ↓
Project classification
    ↓
Relevant-area selection
    ↓
Candidate-quality filtering
```

The implementation does not need to remain a single large database view.

For example, the YourQS development team may choose to reproduce the same behaviour using:

- one Firebird view;
- several smaller views;
- stored procedures;
- backend queries;
- another database abstraction mechanism already used by the existing YourQS system.

The important requirement is that the resulting application receives equivalent data and that the documented calculation and classification behaviour is preserved.

---

### 7.23 Production Considerations

The current feasibility feature extraction was developed against the historical dataset supplied for this project.

Several rules, particularly the text-derived feature flags, are intentionally heuristic and should remain maintainable as additional YourQS production data becomes available.

Future improvements may include:

- replacing text-derived characteristics with structured source attributes where available;
- expanding project classification rules;
- adding additional project complexity factors;
- improving handling of projects containing multiple models;
- refining historical-project quality filters;
- reviewing the accepted margin range;
- extending project-type support;
- validating keyword rules against a larger production dataset.

Where structured production data is available, it should generally be preferred over keyword inference.

The current view should therefore be treated as the documented baseline implementation rather than a permanent limitation on future feasibility development.
## 8. Application-Specific Tables

### 8.1 Overview

In addition to the historical YourQS tables used by the analytical views, the development database contains several application-specific tables introduced as part of the EX35 platform.

These tables are:

- `APP_USER`
- `DEV_FEEDBACK`
- `FEASIBILITY_ASSESSMENT_LOG`
- `FEASIBILITY_REVIEW_REQUEST`
- `FEASIBILITY_REVIEW_FILE`

These tables are not part of the historical YourQS dataset migrated from Microsoft Access.

They support application functionality such as:

- user accounts;
- development feedback;
- feasibility assessment history;
- feasibility review requests;
- uploaded review-file metadata.

Unlike the analytical source tables documented earlier, these tables contain conventional primary keys, foreign keys, unique constraints, and application-specific indexes.

The production implementation does not necessarily need to reproduce these tables directly inside the existing Firebird database.

If the associated functionality is retained, equivalent persistent storage must be provided either:

- within the existing YourQS Firebird database;
- within another application database;
- or through an existing YourQS service providing equivalent functionality.

The schemas below therefore document the current PostgreSQL implementation and the data contracts required by the application.

---

### 8.2 `APP_USER`

#### Purpose

`APP_USER` stores application user accounts used by the platform.

The table contains user identity information, authentication data, optional organisational information, account status, and audit timestamps.

#### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `ID` | `uuid` | No | `gen_random_uuid()` | Primary identifier for the application user. |
| `NAME` | `varchar(150)` | No | - | User display/name value. |
| `EMAIL` | User-defined | No | - | Unique user email address. |
| `PASSWORD_HASH` | `text` | No | - | Stored password hash. |
| `COMPANY` | `varchar(150)` | Yes | - | Optional company name. |
| `ROLE_TITLE` | `varchar(150)` | Yes | - | Optional role or job title. |
| `IS_ACTIVE` | `boolean` | No | `true` | Indicates whether the user account is active. |
| `CREATED_AT` | `timestamp with time zone` | No | `now()` | Account creation timestamp. |
| `UPDATED_AT` | `timestamp with time zone` | No | `now()` | Last update timestamp. |

`EMAIL` is represented by a PostgreSQL user-defined type in the development schema. The production implementation should use the email representation appropriate to the existing application architecture.

#### Constraints

| Constraint | Type | Column |
|---|---|---|
| `APP_USER_pkey` | Primary Key | `ID` |
| `APP_USER_EMAIL_key` | Unique | `EMAIL` |

Additional generated `CHECK` constraints enforce required/non-null values.

#### Indexes

```text
APP_USER_pkey
    UNIQUE BTREE (ID)

APP_USER_EMAIL_key
    UNIQUE BTREE (EMAIL)
```

The unique email index prevents multiple application accounts from using the same stored email value.

---

### 8.3 `DEV_FEEDBACK`

#### Purpose

`DEV_FEEDBACK` stores feedback submitted by authenticated application users.

It allows feedback to be associated with a user, category, optional feature, processing status, and creation time.

#### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `ID` | `uuid` | No | `gen_random_uuid()` | Primary feedback identifier. |
| `USER_ID` | `uuid` | No | - | User who submitted the feedback. |
| `CATEGORY` | `varchar(50)` | No | - | Feedback category. |
| `FEATURE` | `varchar(100)` | Yes | - | Optional application feature associated with the feedback. |
| `MESSAGE` | `text` | No | - | Feedback content. |
| `STATUS` | `varchar(30)` | No | `'new'` | Current feedback status. |
| `CREATED_AT` | `timestamp with time zone` | No | `now()` | Submission timestamp. |

#### Relationship

```text
DEV_FEEDBACK.USER_ID
    → APP_USER.ID
```

Unlike the historical YourQS source relationships, this relationship is enforced by a database foreign key.

#### Constraints

The table includes:

- primary key on `ID`;
- foreign key from `USER_ID` to the application user table;
- category validation through `DEV_FEEDBACK_CATEGORY_CHECK`;
- status validation through `DEV_FEEDBACK_STATUS_CHECK`;
- required-value checks for mandatory fields.

The exact allowed values defined by the category and status `CHECK` expressions should be preserved if this table is recreated elsewhere.

#### Indexes

```text
DEV_FEEDBACK_pkey
    UNIQUE BTREE (ID)

IX_DEV_FEEDBACK_USER_ID
    BTREE (USER_ID)

IX_DEV_FEEDBACK_CREATED_AT
    BTREE (CREATED_AT DESC)
```

The indexes support retrieval by user and chronological feedback queries.

---

### 8.4 `FEASIBILITY_ASSESSMENT_LOG`

#### Purpose

`FEASIBILITY_ASSESSMENT_LOG` stores a persistent record of feasibility assessments processed by the application.

The table captures:

- submitted project characteristics;
- scope information;
- the original assessment request;
- assessment status;
- calculated estimate range;
- feasibility verdict;
- confidence information;
- comparable-project statistics;
- the generated response.

This provides a historical record of feasibility calculations without requiring the assessment to be reconstructed from the historical YourQS source tables.

#### Input Columns

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary assessment identifier. |
| `created_at` | `timestamp with time zone` | No | `now()` | Assessment creation timestamp. |
| `session_id` | `uuid` | No | - | Session associated with the assessment. |
| `project_type` | `text` | No | - | Submitted feasibility project type. |
| `floor_area` | `numeric(12,2)` | Yes | - | Submitted floor area. |
| `affected_area` | `numeric(12,2)` | Yes | - | Submitted affected area. |
| `levels` | `integer` | Yes | - | Submitted number of levels. |
| `bathrooms` | `integer` | Yes | - | Submitted bathroom count. |
| `kitchens` | `integer` | Yes | - | Submitted kitchen count. |
| `budget` | `numeric(14,2)` | Yes | - | Submitted project budget. |
| `scope_json` | `jsonb` | No | `{}` | Structured scope information. |
| `request_json` | `jsonb` | No | `{}` | Stored assessment request payload. |

#### Result Columns

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `assessment_status` | `text` | No | - | Processing/result status of the assessment. |
| `estimate_low` | `numeric(14,2)` | Yes | - | Lower feasibility estimate. |
| `estimate_typical` | `numeric(14,2)` | Yes | - | Typical feasibility estimate. |
| `estimate_high` | `numeric(14,2)` | Yes | - | Upper feasibility estimate. |
| `typical_per_sqm` | `numeric(14,2)` | Yes | - | Typical calculated price per relevant square metre. |
| `verdict` | `text` | Yes | - | Generated feasibility verdict. |
| `confidence` | `text` | Yes | - | Human-readable confidence classification. |
| `confidence_score` | `integer` | Yes | - | Numeric confidence score. |
| `comparable_count` | `integer` | Yes | - | Number of historical comparable projects used. |
| `average_similarity` | `numeric(6,4)` | Yes | - | Average similarity value for selected comparable projects. |
| `response_json` | `jsonb` | No | `{}` | Stored complete assessment response. |

#### Constraints

The table includes:

- primary key on `id`;
- project-type validation;
- assessment-status validation;
- verdict validation;
- confidence validation;
- required-value checks for mandatory fields.

The relevant named validation constraints are:

```text
feasibility_assessment_log_project_type_check
feasibility_assessment_log_assessment_status_check
feasibility_assessment_log_verdict_check
feasibility_assessment_log_confidence_check
```

If the table is reproduced outside PostgreSQL, the allowed values represented by these constraints should remain consistent with the application contract.

#### Indexes

```text
feasibility_assessment_log_pkey
    UNIQUE BTREE (id)

idx_feasibility_assessment_created_at
    BTREE (created_at DESC)

idx_feasibility_assessment_project_type
    BTREE (project_type)

idx_feasibility_assessment_session
    BTREE (session_id)

idx_feasibility_assessment_status
    BTREE (assessment_status)

idx_feasibility_assessment_verdict
    BTREE (verdict)
```

These indexes support common assessment-history queries including:

- session history;
- project-type filtering;
- status filtering;
- verdict filtering;
- chronological retrieval.

---

### 8.5 `FEASIBILITY_REVIEW_REQUEST`

#### Purpose

`FEASIBILITY_REVIEW_REQUEST` stores requests for further review of a feasibility assessment.

The table combines:

- contact information;
- project information;
- feasibility inputs;
- additional project description;
- review status;
- contact consent.

A review request may optionally reference an existing feasibility assessment.

#### Identification and Tracking

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary review-request identifier. |
| `created_at` | `timestamp with time zone` | No | `now()` | Creation timestamp. |
| `updated_at` | `timestamp with time zone` | No | `now()` | Last update timestamp. |
| `assessment_id` | `uuid` | Yes | - | Optional reference to the originating feasibility assessment. |
| `session_id` | `uuid` | No | - | Application session associated with the request. |

#### Contact Information

| Column | Type | Nullable | Description |
|---|---|---:|---|
| `first_name` | `text` | No | Contact first name. |
| `last_name` | `text` | No | Contact last name. |
| `email` | `text` | No | Contact email address. |
| `phone` | `text` | Yes | Optional contact phone number. |
| `location` | `text` | Yes | Optional project/contact location. |
| `postcode` | `text` | Yes | Optional postcode. |

#### Project Information

| Column | Type | Nullable | Description |
|---|---|---:|---|
| `project_description` | `text` | No | User-provided description of the project. |
| `additional_comments` | `text` | Yes | Additional information supplied with the request. |
| `timeframe` | `text` | Yes | User-provided project timeframe. |
| `project_type` | `text` | Yes | Project type associated with the request. |
| `floor_area` | `numeric(12,2)` | Yes | Floor area. |
| `affected_area` | `numeric(12,2)` | Yes | Affected area. |
| `levels` | `integer` | Yes | Number of levels. |
| `bathrooms` | `integer` | Yes | Bathroom count. |
| `kitchens` | `integer` | Yes | Kitchen count. |
| `budget` | `numeric(14,2)` | Yes | Project budget. |
| `scope_json` | `jsonb` | No | Structured project scope. |

#### Workflow Fields

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `status` | `text` | No | `'new'` | Current review-request status. |
| `consent_to_contact` | `boolean` | No | `false` | Indicates whether the user provided contact consent. |

#### Relationship

```text
FEASIBILITY_REVIEW_REQUEST.assessment_id
    → FEASIBILITY_ASSESSMENT_LOG.id
```

The relationship is optional because `assessment_id` is nullable.

This allows a review request to exist even when it is not associated with a stored feasibility assessment.

#### Constraints

The table includes:

- primary key on `id`;
- foreign key on `assessment_id`;
- project-type validation;
- review-status validation;
- contact-consent validation;
- required-value checks for mandatory fields.

Named application validation constraints include:

```text
feasibility_review_request_project_type_check
feasibility_review_request_status_check
feasibility_review_request_contact_consent
```

#### Indexes

```text
feasibility_review_request_pkey
    UNIQUE BTREE (id)

idx_feasibility_review_assessment
    BTREE (assessment_id)

idx_feasibility_review_created_at
    BTREE (created_at DESC)

idx_feasibility_review_session
    BTREE (session_id)

idx_feasibility_review_status
    BTREE (status)
```

These indexes support lookup by assessment, session, status, and creation time.

---

### 8.6 `FEASIBILITY_REVIEW_FILE`

#### Purpose

`FEASIBILITY_REVIEW_FILE` stores metadata for files associated with a feasibility review request.

The table does not contain the file binary itself.

Instead, it records the storage location and metadata required to associate an externally stored file with a review request.

#### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---:|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary file-record identifier. |
| `review_request_id` | `uuid` | No | - | Review request associated with the file. |
| `uploaded_at` | `timestamp with time zone` | No | `now()` | File upload timestamp. |
| `original_file_name` | `text` | No | - | Original file name supplied during upload. |
| `storage_path` | `text` | No | - | Path or identifier used to locate the stored file. |
| `mime_type` | `text` | No | - | File MIME type. |
| `file_size` | `bigint` | No | - | File size. |

#### Relationship

```text
FEASIBILITY_REVIEW_FILE.review_request_id
    → FEASIBILITY_REVIEW_REQUEST.id
```

This relationship is enforced by a foreign key.

A single review request may therefore be associated with multiple file metadata records.

#### Constraints

The table includes:

- primary key on `id`;
- foreign key on `review_request_id`;
- unique constraint on `storage_path`;
- file-size validation;
- required-value checks for all fields.

The named file-size constraint is:

```text
feasibility_review_file_file_size_check
```

#### Indexes

```text
feasibility_review_file_pkey
    UNIQUE BTREE (id)

feasibility_review_file_storage_path_key
    UNIQUE BTREE (storage_path)

idx_feasibility_review_file_request
    BTREE (review_request_id)
```

The `review_request_id` index supports retrieval of all files associated with a review request.

The unique `storage_path` constraint prevents the same storage path from being registered multiple times.

---

### 8.7 Application Table Relationships

The application-specific tables form two main groups.

#### User and Feedback

```text
APP_USER
    │
    │ ID → USER_ID
    ↓
DEV_FEEDBACK
```

#### Feasibility Assessment and Review

```text
FEASIBILITY_ASSESSMENT_LOG
            │
            │ id → assessment_id
            ↓
FEASIBILITY_REVIEW_REQUEST
            │
            │ id → review_request_id
            ↓
FEASIBILITY_REVIEW_FILE
```

`FEASIBILITY_REVIEW_REQUEST.assessment_id` is optional.

`FEASIBILITY_REVIEW_FILE.review_request_id` is required.

There is no database foreign-key relationship between the feasibility assessment tables and the historical YourQS project tables.

Historical projects are used as analytical reference data, while assessment and review records represent new application activity.

---

### 8.8 PostgreSQL-Specific Data Types

Several types and defaults used by these tables are PostgreSQL-specific or require special consideration during migration.

#### UUID

The application tables use UUID identifiers extensively.

Examples include:

```text
APP_USER.ID
DEV_FEEDBACK.ID
FEASIBILITY_ASSESSMENT_LOG.id
FEASIBILITY_REVIEW_REQUEST.id
FEASIBILITY_REVIEW_FILE.id
```

PostgreSQL currently generates identifiers using:

```sql
gen_random_uuid()
```

An equivalent identifier strategy must be selected if these tables are moved to another database.

#### JSONB

The feasibility tables use PostgreSQL `jsonb` fields:

```text
FEASIBILITY_ASSESSMENT_LOG.scope_json
FEASIBILITY_ASSESSMENT_LOG.request_json
FEASIBILITY_ASSESSMENT_LOG.response_json
FEASIBILITY_REVIEW_REQUEST.scope_json
```

These fields allow the application to preserve structured request, response, and scope information without expanding every value into a separate relational column.

A Firebird implementation should not assume direct `jsonb` compatibility.

If the tables are migrated, the YourQS development team should determine whether these values should be represented using:

- JSON text;
- BLOB/text storage;
- relational tables;
- or another application persistence mechanism.

#### Timestamp with Time Zone

The PostgreSQL tables use `timestamp with time zone` for audit and creation timestamps.

Equivalent production behaviour should preserve the intended timestamp semantics even if the underlying Firebird representation differs.

#### Boolean

Several application fields use PostgreSQL boolean values, including:

```text
APP_USER.IS_ACTIVE
FEASIBILITY_REVIEW_REQUEST.consent_to_contact
```

The production representation should match the capabilities and conventions of the existing YourQS system.

---

### 8.9 Migration Requirements

The application-specific tables should be treated differently from the historical analytical source tables.

The historical YourQS tables already have production equivalents in Firebird.

The five application-specific tables were introduced by this project and therefore require an explicit production persistence decision.

The recommended migration process is:

1. determine which application features will be retained in the production YourQS implementation;
2. identify whether an existing YourQS table or service already provides equivalent storage;
3. create new production storage only where equivalent functionality does not already exist;
4. preserve required application relationships and validation rules;
5. map PostgreSQL-specific types to production-compatible representations;
6. preserve application-level data contracts even if the physical schema changes;
7. review indexes based on actual production query patterns rather than copying PostgreSQL indexes directly.

The production schema does not need to match the PostgreSQL schema exactly.

For example:

```text
PostgreSQL development
FEASIBILITY_ASSESSMENT_LOG.response_json
        ↓
Production
Equivalent persisted assessment result
```

is sufficient as long as the application can store and retrieve the information required by the feasibility workflow.

---

### 8.10 Data and Privacy Considerations

The application-specific tables contain data that differs significantly from the historical analytical dataset.

In particular, `APP_USER` contains account information and `FEASIBILITY_REVIEW_REQUEST` may contain user contact information.

Examples include:

```text
name
email
phone
location
postcode
company
```

`APP_USER` also contains `PASSWORD_HASH`, which is authentication-sensitive data.

`FEASIBILITY_REVIEW_FILE` may reference user-uploaded files through `storage_path`.

The production implementation should therefore apply the existing YourQS security, authentication, authorisation, retention, and access-control requirements to these records.

The analytical historical-project views should not require access to these application-specific records.

This separation should be maintained so that analytical project access does not automatically provide access to user account, contact, review, or uploaded-file information.

---

### 8.11 Application-Specific Index Summary

The current PostgreSQL application indexes are summarised below.

| Table | Index | Purpose |
|---|---|---|
| `APP_USER` | `APP_USER_pkey` | Primary lookup by user ID. |
| `APP_USER` | `APP_USER_EMAIL_key` | Unique user lookup by email. |
| `DEV_FEEDBACK` | `DEV_FEEDBACK_pkey` | Primary feedback lookup. |
| `DEV_FEEDBACK` | `IX_DEV_FEEDBACK_USER_ID` | Feedback lookup by user. |
| `DEV_FEEDBACK` | `IX_DEV_FEEDBACK_CREATED_AT` | Chronological feedback retrieval. |
| `FEASIBILITY_ASSESSMENT_LOG` | `feasibility_assessment_log_pkey` | Primary assessment lookup. |
| `FEASIBILITY_ASSESSMENT_LOG` | `idx_feasibility_assessment_created_at` | Chronological assessment retrieval. |
| `FEASIBILITY_ASSESSMENT_LOG` | `idx_feasibility_assessment_project_type` | Filtering by project type. |
| `FEASIBILITY_ASSESSMENT_LOG` | `idx_feasibility_assessment_session` | Assessment lookup by session. |
| `FEASIBILITY_ASSESSMENT_LOG` | `idx_feasibility_assessment_status` | Filtering by assessment status. |
| `FEASIBILITY_ASSESSMENT_LOG` | `idx_feasibility_assessment_verdict` | Filtering by feasibility verdict. |
| `FEASIBILITY_REVIEW_REQUEST` | `feasibility_review_request_pkey` | Primary review-request lookup. |
| `FEASIBILITY_REVIEW_REQUEST` | `idx_feasibility_review_assessment` | Review lookup by assessment. |
| `FEASIBILITY_REVIEW_REQUEST` | `idx_feasibility_review_created_at` | Chronological review retrieval. |
| `FEASIBILITY_REVIEW_REQUEST` | `idx_feasibility_review_session` | Review lookup by session. |
| `FEASIBILITY_REVIEW_REQUEST` | `idx_feasibility_review_status` | Review workflow filtering. |
| `FEASIBILITY_REVIEW_FILE` | `feasibility_review_file_pkey` | Primary file-metadata lookup. |
| `FEASIBILITY_REVIEW_FILE` | `feasibility_review_file_storage_path_key` | Enforces unique storage paths. |
| `FEASIBILITY_REVIEW_FILE` | `idx_feasibility_review_file_request` | Retrieves files for a review request. |

These indexes document the access patterns anticipated by the development implementation.

They should be used as guidance during production implementation rather than as a requirement to reproduce the same physical indexes in Firebird.
## 9. Production Database Integration Notes

The database implementation documented in this file was developed and tested using PostgreSQL/Supabase.

The production YourQS application uses an existing Firebird database. The Firebird database was not part of the development environment for this project and its production schema was not analysed as part of this work.

Therefore, this document does not provide a Firebird migration procedure or prescribe how the analytical logic should be implemented in the production database.

The PostgreSQL implementation should instead be treated as a reference for the data requirements and analytical behaviour developed during the project.

The main implementation dependencies are the historical data represented in the development environment by:

- `PROJ_MASTER`
- `PROJ_MODEL_ATTRIBUTES`
- `PROJ_TYPE`
- `PROJ_MODEL_HEADER`
- `JOB_COST_ELEMENT`
- `JOB_COST_ITEM`

The logical relationships, calculations, analytical views, classification rules, and output fields used by the application are documented in the previous sections.

When integrating the project with the production environment, the YourQS development team can map these requirements to the corresponding structures in their existing Firebird database.

The following PostgreSQL/Supabase-specific elements should not be considered production requirements:

- PostgreSQL view syntax;
- PostgreSQL-specific data types such as `jsonb`;
- `gen_random_uuid()`;
- PostgreSQL-specific casting syntax;
- PostgreSQL indexes created during development;
- Supabase-specific database configuration.

The required production implementation may differ internally as long as it provides the data required by the application and preserves the intended analytical behaviour documented in this handover.
## 10. Development Validation and Known Limitations

### 10.1 Purpose

This section summarises the validation performed on the development database implementation and the main limitations and assumptions that should be understood when using it as a reference.

The implementation documented in this file was developed and tested against the PostgreSQL/Supabase development database created from the supplied historical YourQS data.

It was not validated against the production Firebird database.

---

### 10.2 Database Migration Validation

The historical dataset used during development was migrated from Microsoft Access to PostgreSQL.

During development, the migrated database was checked to confirm that the required tables and data were available for the analytical implementation.

The migration also required cleanup of invalid data that prevented successful PostgreSQL import, including invalid null-byte (`0x00`) content encountered in migrated data.

The resulting PostgreSQL database was then used as the development source for the analytics and feasibility functionality documented in this file.

The PostgreSQL schema should therefore be treated as the development representation of the supplied YourQS data rather than a documented copy of the production Firebird schema.

---

### 10.3 Relationship Validation

The analytical implementation was developed using logical relationships between the migrated tables.

The primary relationships used are:

```text
PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID
    → PROJ_MASTER.REC_ID

PROJ_MODEL_ATTRIBUTES.PROJ_TYPE_REC_ID
    → PROJ_TYPE.REC_ID

PROJ_MODEL_HEADER.PROJ_MASTER_REC_ID
    → PROJ_MASTER.REC_ID

JOB_COST_ELEMENT.PROJ_MASTER_REC_ID
    → PROJ_MASTER.REC_ID

JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID
    → JOB_COST_ELEMENT.REC_ID
```

These relationships were sufficient for the development implementation of the analytical views.

The migrated PostgreSQL schema does not enforce these historical relationships through conventional foreign-key constraints.

They should therefore be understood as logical relationships derived from the supplied data structure.

---

### 10.4 Analytical View Validation

Two analytical views were developed and used during the project:

```text
VW_PROJECT_OVERVIEW
VW_FEASIBILITY_PROJECT_FEATURES
```

`VW_PROJECT_OVERVIEW` was used to provide project-level analytical information including:

- project characteristics;
- cost and selling-price totals;
- margin;
- selling price per square metre;
- data-availability indicators.

`VW_FEASIBILITY_PROJECT_FEATURES` was used to prepare historical projects for feasibility analysis including:

- project classification;
- relevant-area selection;
- quantity-adjusted pricing;
- price-per-square-metre metrics;
- text-derived project characteristics;
- data-quality indicators;
- clean feasibility candidate identification.

The calculations and output contracts of both views are documented in Sections 6 and 7.

---

### 10.5 Query Performance

During development, indexes were added to frequently used relationship fields in the PostgreSQL database.

The main indexed relationships included:

```text
PROJ_MASTER.REC_ID

PROJ_MODEL_ATTRIBUTES.PROJ_MASTER_REC_ID

JOB_COST_ELEMENT.REC_ID
JOB_COST_ELEMENT.PROJ_MASTER_REC_ID

JOB_COST_ITEM.REC_ID
JOB_COST_ITEM.JOB_COST_ELEMENT_REC_ID
```

For representative analytical aggregation queries used during development, PostgreSQL execution time was reduced from approximately 13 seconds in the original Microsoft Access environment to below one second in PostgreSQL.

This result reflects the development environment and should not be interpreted as a performance benchmark for the production YourQS database.

The indexes documented earlier in this file are therefore development implementation details rather than requirements for the production database.

---

### 10.6 Known Cost Aggregation Difference

The two analytical views currently use different cost aggregation methods.

`VW_PROJECT_OVERVIEW` uses:

```text
SUM(COST_PRICE)

SUM(SELLING_PRICE)
```

while `VW_FEASIBILITY_PROJECT_FEATURES` uses:

```text
SUM(QUANTITY × COST_PRICE)

SUM(QUANTITY × SELLING_PRICE)
```

The feasibility view also excludes cost items where:

```text
IS_INACTIVE = 'Y'
```

This difference reflects the current PostgreSQL development implementation.

It has been documented explicitly so that it is not hidden by the handover.

The final production interpretation of these source fields depends on the business meaning of the corresponding data in the existing YourQS system.

---

### 10.7 Historical Data Quality

The historical source data was created for normal YourQS operational use rather than specifically for automated feasibility analysis.

As a result, not every historical project contains all of the information required for reliable analytical comparison.

Examples include:

- missing or zero area values;
- missing pricing information;
- multiple model records for a project;
- incomplete project scope;
- concept or assessment projects;
- labour-only work;
- client-supplied scope;
- unusual margin values;
- project names that do not clearly match the recorded project type.

The feasibility implementation does not modify or remove these source records.

Instead, analytical flags are used to identify records that are more suitable for automated feasibility comparison.

---

### 10.8 Multiple Model Records

Historical projects may contain more than one record in `PROJ_MODEL_ATTRIBUTES`.

For feasibility analysis, the current implementation considers a project unambiguous when:

```text
model_count = 1
```

This is exposed through:

```text
has_unambiguous_model
```

and is also required by:

```text
is_clean_feasibility_candidate
```

Projects containing multiple model records are therefore not treated as clean feasibility candidates by the current implementation.

This is a conservative filtering decision intended to avoid ambiguous interpretation of project characteristics.

---

### 10.9 Text-Derived Features

Several feasibility characteristics are inferred from:

```text
project name
+
model header notes
+
model footer notes
```

Examples include:

- renovation;
- extension;
- roofing;
- retaining;
- demolition;
- recladding;
- pools;
- outbuildings;
- secondary dwellings;
- structural work;
- electrical upgrades;
- plumbing upgrades;
- labour-only scope;
- client-supplied work;
- partial scope.

These fields are based on keyword detection.

They should therefore be interpreted as indicators rather than authoritative structured project attributes.

For example:

```text
mentions_roofing = TRUE
```

means that recognised roofing-related language was detected in the available project text.

It does not represent a formal measurement of roofing complexity or roofing cost.

---

### 10.10 Feasibility Classification Limitations

The current feasibility classification is primarily designed around the historical residential project types available during development.

The main supported classifications are:

```text
new_build
renovation
extension
renovation_and_extension
unclassified_alteration
multi_unit
other
```

Residential alterations rely partly on text-derived features to distinguish between renovation and extension work.

Projects that cannot be classified more specifically remain available through broader categories rather than being assigned an unsupported classification.

---

### 10.11 Relevant Area Assumption

The feasibility implementation uses different pricing areas depending on project type.

Current behaviour is:

```text
Residential New
    → floor_area

Residential Alteration
    → affected_area

Residential Multi-Unit
    → floor_area
```

This allows the feasibility implementation to expose a common:

```text
relevant_area
```

and:

```text
selling_per_relevant_sqm
```

for downstream comparison.

This is part of the current feasibility methodology and should be understood when interpreting historical price-per-square-metre values.

---

### 10.12 Multi-Unit Limitation

`Residential Multi-Unit` projects are recognised by the analytical view and classified as:

```text
multi_unit
```

However, the current feasibility implementation does not contain advanced multi-unit-specific modelling.

Multi-unit projects may require additional characteristics and business rules that were not available in the development dataset.

The existing classification therefore identifies these projects without attempting to model all of their additional complexity.

---

### 10.13 Clean Feasibility Candidate

The current implementation provides:

```text
is_clean_feasibility_candidate
```

as a conservative indicator of whether a historical project is suitable for automated feasibility comparison.

The current rule requires:

```text
model_count = 1

valid selling price

valid relevant area

valid selling price per relevant sqm

not labour only

not concept

not assessment

not partial scope

no detected client-supplied scope

no new-build name anomaly

margin between 0% and 50%
```

This flag should not be interpreted as a general data-quality judgement.

A project that fails the flag may still be a completely valid historical YourQS project.

It only means that the project does not satisfy the current requirements for use as a clean automated feasibility comparable.

---

### 10.14 Scope Exclusion Flag

The feasibility dataset exposes:

```text
has_scope_exclusions
```

when recognised exclusion-related language is found in project text.

However, this flag is not currently included as an independent exclusion condition in:

```text
is_clean_feasibility_candidate
```

This is the behaviour of the current development implementation and is documented here to avoid ambiguity.

---

### 10.15 Application-Specific Data

The following tables were created specifically for the developed application:

```text
APP_USER
DEV_FEEDBACK
FEASIBILITY_ASSESSMENT_LOG
FEASIBILITY_REVIEW_REQUEST
FEASIBILITY_REVIEW_FILE
```

These tables were not part of the historical YourQS source dataset.

They should therefore be understood as part of the development application's persistence model rather than as modifications to the original YourQS data model.

Their schemas and relationships are documented in Section 8.

---

### 10.16 Production Environment Boundary

The following were outside the scope of the database development work documented here:

- analysis of the production Firebird schema;
- implementation of the analytical views in Firebird;
- validation against production Firebird data;
- production Firebird performance testing;
- production database index design;
- production database security configuration.

The PostgreSQL/Supabase implementation documents the data and analytical behaviour required by the developed application.

How these requirements are mapped to the existing production environment remains dependent on the actual YourQS production architecture.

---

### 10.17 Handover Summary

The database handover provides the following reference information:

```text
Development database architecture
        ↓
Relevant historical source tables
        ↓
Logical source relationships
        ↓
PostgreSQL development indexes
        ↓
Project overview analytical logic
        ↓
Feasibility analytical logic
        ↓
Application-specific persistence
        ↓
Production integration boundary
        ↓
Known assumptions and limitations
```

The primary purpose of this document is to make the implemented database behaviour understandable and reproducible without requiring access to the original development process.

The PostgreSQL/Supabase implementation should be treated as the reference for what was developed and tested during the project.

