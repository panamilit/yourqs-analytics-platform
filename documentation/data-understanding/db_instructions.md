# PostgreSQL Database Migration & Restore Guide

## Overview

The original client database was migrated from Microsoft Access (`.accdb`) to PostgreSQL in order to improve query performance and make backend/API development easier.

The migration was performed using DBeaver.

Most tables were migrated successfully. The only table currently excluded is:

* `ProjectModelCost`

This table appears to be extremely slow/problematic even inside the original Access database and requires separate investigation.

---

# Important Notes

## Performance Improvement

The migration significantly improved query performance.

Example:

* MS Access query execution time: ~2-5 minutes
* PostgreSQL query execution time: < 1 second


### Indexes have been created

Detailed information about the indexes can be found in the file: `indexes.sql`


---

## REC_ID Fields

Some tables contain mixed ID formats inside `REC_ID` columns.

Examples:

* Integer values:

  * `-1`
  * `0`
  * `10`
* GUID values:

  * `{2A3CE9E3-D3B9-45DB-874A-C047F3911956}`

Because of this, many `REC_ID` and `*_REC_ID` columns were kept as `TEXT/VARCHAR` during migration.

---

## MODEL_ELEMENT Table

The `MODEL_ELEMENT` table contained invalid UTF-8/null-byte characters (`0x00`) inside text fields, which caused PostgreSQL import errors.

The issue was resolved by cleaning the problematic text values during migration.

---

# Restore Instructions (DBeaver)

## Requirements

Install:

* PostgreSQL
* DBeaver

---

## Step 1 — Create Empty Database

Inside PostgreSQL/DBeaver:

```sql
CREATE DATABASE yourqs_db;
```

---

## Step 2 — Restore Backup

1. Open DBeaver
2. Connect to PostgreSQL
3. Right click on `yourqs_db`
4. Select:

```text
Tools → Restore
```

5. Choose the provided `.backup` file
6. Start restore

---

## Step 3 — Verify Restore

Run:

```sql
SELECT COUNT(*)
FROM job_cost_item jci;
```
OR
```sql
SELECT *
FROM proj_master pm;
```

and verify tables exist inside:

```text
Schemas → public → Tables
```

---

# Current Migration Status

Successfully migrated core tables include:

* `glob_level`
* `glob_phase`
* `glob_trade`
* `item_category`
* `item_master`
* `item_type`
* `job_cost_element`
* `job_cost_item`
* `model_element`
* `model_element_group`
* `model_element_prop`
* `proj_master`
* `proj_model_attributes`
* `proj_model_family_attributes`
* `proj_model_family_prop`
* `proj_model_header`
* `proj_type`

Pending investigation:

* `ProjectModelCost`

---



