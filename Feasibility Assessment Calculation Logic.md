
# Feasibility Assessment - Calculation Logic

**The main process is:**

```
User project details
        ↓
Select relevant historical projects
        ↓
Calculate similarity
        ↓
Select comparable projects
        ↓
Calculate weighted historical $/m² distribution
        ↓
Low / Typical / High estimate
        ↓
Calculate confidence
        ↓
Compare estimate with user budget
        ↓
Return feasibility result
```

**P.S** The public API exposes the assessment through `POST /api/feasibility/assess`, which passes the validated request into `FeasibilityService`.


## Pricing Area

The first calculation determines which area should be used for pricing.

#### For New Build anf Multi-Unit:
`Pricing Area = Floor Area`

#### For Renovation and Extension:
`Pricing Area = Affected Area`

**P.S** An extension or renovation should not automatically be priced using the total size of the existing building:

```
Existing house: 200 m²
Extension: 60 m²

Pricing area = 60 m²
```
**Implemented in:** `app/services/feasibility_service.py`



## Candidate Selection
Before similarity is calculated, the system first creates a candidate pool. 
```
New Build
→ new_build

Renovation
→ renovation

Extension
→ extension
→ renovation_and_extension

Multi-unit
→ multi_unit
```
**P.S** Candidates are loaded from:

`public."VW_FEASIBILITY_PROJECT_FEATURES"`

! Only projects marked as clean feasibility candidates are included.

The repository also requires:

```Python
relevant_area > 0

selling_per_relevant_sqm > 0
```

Projects with missing or invalid pricing area or selling rate therefore do not enter the comparison process.
## Comparable Project Matching

Historical projects are compared with the proposed project using a similarity score from 0 to 1.

**The comparison mainly uses:**

- pricing area;
- number of levels;
- bathrooms;
- kitchens;
- selected scope characteristics.

**Note:** Different project types use different weights. Area always has the highest weight, while the remaining weight is split between levels, bathrooms and kitchens.

**Code Reference:**

```
File:
app/services/feasibility/comparable_engine.py

Main functions:
- find_comparables()
- _calculate_similarity()
- _area_similarity()
- _numeric_similarity()
```

**Core weights:**

```
New Build:
Area 55%
Levels 20%
Bathrooms 15%
Kitchens 10%

Renovation / Extension:
Area 50%
Levels 15%
Bathrooms 17.5%
Kitchens 17.5%

Multi-unit:
Area 60%
Levels 20%
Bathrooms 10%
Kitchens 10%
```

Area similarity is based on the percentage difference between the proposed and historical project area.

For levels, bathrooms and kitchens:

```
Same value → 1.00
Difference of 1 → 0.60
Difference of 2 → 0.25
Difference >= 3 → 0.00
```

If a historical value is missing, a reduced similarity value of 0.35 is used instead of automatically rejecting the project. If the user does not provide a field, that field is excluded from the calculation.

Small positive bonuses are added when both the proposed project and historical project share relevant scope characteristics such as demolition, retaining, roofing, recladding, pool or outbuilding.

**Only projects with a final similarity score of at least: `0.5` are kept.**

The remaining projects are sorted from highest to lowest similarity, and currently the top: **25 projects** are used in the pricing calculation.

**P.S:** The 25 project limit and the 0.50 similarity threshold are current design parameters and should be reviewed and tested against a larger historical sample.

## Minimum Evidence

The current implementation requires at least: **5 comparable projects**

before an automated estimate is produced.

```
Comparable count >= 5
→ continue calculation

Comparable count < 5
→ Insufficient Evidence
```

If there are fewer than five suitable projects, the system returns:

```
status = insufficient_data
confidence = insufficient
confidence_score = 0
```
and recommends a detailed YourQS review instead of presenting an unreliable automated estimate.


## Minimum Evidence

The current implementation requires at least: **5 comparable projects**

before an automated estimate is produced.

```
Comparable count >= 5
→ continue calculation

Comparable count < 5
→ Insufficient Evidence
```

If there are fewer than five suitable projects, the system returns:

```
status = insufficient_data
confidence = insufficient
confidence_score = 0
```
and recommends a detailed YourQS review instead of presenting an unreliable automated estimate.


## Price Distribution

For each comparable project, the system uses: `selling_per_relevant_sqm`.

Each historical price is weighted using `similarity_score`.

**The algorithm then calculates three weighted percentiles:**
- 25th percentile → Low Rate
- 50th percentile → Typical Rate
- 75th percentile → High Rate

**Therefore**

- Low Rate = weighted P25 of comparable $/m²
- Typical Rate = weighted P50 of comparable $/m²
- High Rate = weighted P75 of comparable $/m²
## Minimum Evidence

The current implementation requires at least: **5 comparable projects**

before an automated estimate is produced.

```
Comparable count >= 5
→ continue calculation

Comparable count < 5
→ Insufficient Evidence
```

If there are fewer than five suitable projects, the system returns:

```
status = insufficient_data
confidence = insufficient
confidence_score = 0
```
and recommends a detailed YourQS review instead of presenting an unreliable automated estimate.


## Minimum Evidence

The current implementation requires at least: **5 comparable projects**

before an automated estimate is produced.

```
Comparable count >= 5
→ continue calculation

Comparable count < 5
→ Insufficient Evidence
```

If there are fewer than five suitable projects, the system returns:

```
status = insufficient_data
confidence = insufficient
confidence_score = 0
```
and recommends a detailed YourQS review instead of presenting an unreliable automated estimate.


## Final Cost Estimate

The three selected rates are multiplied by the project's pricing area.

```
Low Estimate
= Pricing Area * Low Rate

Typical Estimate
= Pricing Area * Typical Rate

High Estimate
= Pricing Area * High Rate
```

**For example**

```
Pricing Area = 100 m²

Low Rate = $3,000/m²
Typical Rate = $3,500/m²
High Rate = $4,200/m²
```

**The result would be:**

```
Low Estimate      = $300,000
Typical Estimate  = $350,000
High Estimate     = $420,000

```
## Confidence Calculation

**The system calculates a confidence score from 0 to 100 using three components.**

### Number of Comparable Projects - maximum 30 points

`Sample Score = min(30, Comparable Count / 20 * 30)`

**For Example:**

```
5 projects → 7.5 points
10 projects → 15 points
20 projects → 30 points
25 projects → 30 points
```

**Note:** additional projects beyond 20 currently do not increase this component further.

### Average Similarity - maximum 45 points

`Similarity Score = Average Similarity * 45`

**For Example:**

```
Average Similarity = 0.80

Similarity Score = 0.80 * 45 = 36
```

### Price Spread - maximum 25 points

The system measures how wide the historical pricing range is relative to the typical rate:

```
Relative Spread = (High Rate - Low Rate) / Typical Rate
```

**The score is then assigned as:**

| Relative spread | Points |
| --------------- | ------ |
| ≤ 30%           | 25     |
| ≤ 50%           | 20     |
| ≤ 75%           | 14     |
| ≤ 100%          | 8      |
| ≤ 100%          | 3      |

**P.S** A tighter historical price distribution therefore increases confidence, while a very wide range reduces it.

The final confidence score is:

```
Confidence Score = Sample Score + Similarity Score + Spread Score
```
with the result limited to the range 0-100.


## Confidence Labels

The numerical score is converted into a user-facing confidence level:

```
80–100 → High Confidence
55–79 → Medium Confidence
30–54 → Low Confidence
0–29 → Insufficient Evidence
```

There is also a specific rule for Extensions.

If an Extension calculation would normally receive: `High Confidence`
the displayed result is currently capped at: `Medium Confidence` because the historical evidence for this category is treated more cautiously.
## Budget Assessment

If the customer provides a budget, the system compares it with the calculated historical range.

**First: `Difference = Customer Budget - Typical Estimate`**

**Then `Difference % = (Difference / Typical Estimate) * 100`**

**The verdict is determined as follows:**

```
Budget >= Typical Estimate → Feasible

Budget >= Low Estimate AND Budget < Typical Estimate → Borderline

Budget < Low Estimate → Unlikely
```

**Note:** An important interpretation is that Feasible does not represent a guaranteed construction price. It means that the proposed budget is at or above the typical historical estimate produced by the current feasibility model.


## Insufficient Evidence

If fewer than five comparable projects survive the matching process, no low, typical or high estimate is returned.

Instead, the customer receives a message explaining that there is not enough sufficiently similar historical evidence and that a detailed YourQS review is recommended.

This prevents the system from presenting a precise-looking result when the underlying historical evidence is weak.


## Result Presentation

**A successful assessment returns:**

```
Low Estimate
Typical Estimate
High Estimate

Low $/m²
Typical $/m²
High $/m²

Pricing Area
Pricing Area Basis

Customer Budget
Difference from Typical
Difference %

Verdict

Comparable Count
Average Similarity
Confidence Score
Confidence Label

Matched Scope Characteristics
Assumptions
```

**Response Snapshot:**

```json
{
  "budget": {
    "amount": "1200000.00",
    "verdict": "feasible",
    "verdict_label": "Feasible",
    "difference_percent": "9.33",
    "difference_from_typical": "102392.23"
  },
  "status": "completed",
  "estimate": {
    "low": "919961.84",
    "high": "1472469.84",
    "typical": "1097607.77",
    "low_per_sqm": "4278.89",
    "high_per_sqm": "6848.70",
    "pricing_area": "215.00",
    "typical_per_sqm": "5105.15",
    "pricing_area_basis": "floor_area"
  },
  "evidence": {
    "confidence": "medium",
    "comparable_count": 25,
    "confidence_label": "Medium Confidence",
    "confidence_score": 79,
    "average_similarity": "0.79"
  },
  "assessment": {
    "summary": "Your proposed budget is at or above the typical historical estimate for projects with similar characteristics.",
    "matched_scope_characteristics": [
      "Swimming pool"
    ]
  },
  "session_id": "64a36bfc-2dae-4111-adf0-0a44b370658e",
  "assumptions": [
    "This indicative assessment is based on historical YourQS project data.",
    "Historical projects are matched using project size, layout and available scope characteristics.",
    "Final construction cost may vary due to detailed design, specification, location, site conditions and scope."
  ],
  "project_type": "new_build",
  "assessment_id": "5f240f66-f239-4d92-8ebe-ace5dacf87c8"
}
```


## Assessment Basis and Assumptions

- The assessment uses historical YourQS projects as its pricing basis. It assumes that the available historical projects are reasonably representative of the proposed project.

- Historical projects are matched using project size, layout and available scope characteristics. The model assumes that projects with similar characteristics provide more relevant pricing evidence.

- The assessment does not currently model every factor that may affect construction cost. Detailed design, specification level, location, site conditions, access, complexity and final scope may cause the actual cost to differ from the indicative estimate.

- The result should therefore be treated as an early feasibility estimate rather than a final construction price or quantity survey.


## Current Limitations

- Similarity parameters have not yet been statistically calibrated against a formal validation dataset.

- The current minimum of five comparable projects is a design guardrail rather than a statistically proven threshold.

- The current comparable pool is limited by the ComparableEngine and should be reviewed to determine whether a larger pool improves estimate stability.

- Location is not currently included in automated pricing.

- Historical scope indicators are based on the data currently available and do not necessarily represent complete project scope.

- Multi-unit projects have limited historical evidence and are intentionally not being expanded further at this stage.

- Complexity is not currently applied as a pricing premium.

- Specification quality is not currently included.

- The assessment is indicative and is not a replacement for a detailed quantity survey.