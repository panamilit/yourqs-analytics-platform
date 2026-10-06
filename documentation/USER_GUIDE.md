# YourQS Analytics Platform - User Guide

## 1. Introduction

The platform includes:

- project browsing and filtering;
- project cost analysis;
- benchmarking;
- project comparison;
- what-if analysis;
- public feasibility assessment;
- internal administration and review monitoring.

This guide explains how to use the main application features.

---

## 2. Access and Navigation

### 2.1 Sign In

Internal analytics features require a user account.

Open:

```text
auth.html
```

Enter your email address and password and select:

```text
Sign in
```

New users can select:

```text
Create account
```

and provide:

- name;
- email;
- optional company;
- optional role/job title;
- access code;
- password.

After authentication, the user can access the internal analytics platform.

---

### 2.2 Main Navigation

The sidebar provides access to:

```text
Projects
Project Analysis
Benchmarking
Compare Projects
What-if Analysis
Feasibility
Admin Panel
```

`Project Analysis` and `Benchmarking` require a project to be selected first.

---

## 3. Projects

The **Projects** page is the main starting point for internal analytics.

It displays summary information including:

- total projects;
- projects with cost data;
- analytics-ready projects.

The project table includes:

```text
Project Name
Floor Area
Levels
Bathrooms
Total Cost
Selling Price
Margin
Price / m²
Status
```

### 3.1 Filtering Projects

Projects can be filtered by:

- project name;
- minimum floor area;
- maximum floor area;
- number of levels;
- availability of cost data;
- analytics readiness.

The results can also be sorted using the available sorting controls.

Use:

```text
Clear Filters
```

to return to the full project list.

### 3.2 Opening a Project

Select a project from the project list to open its **Project Analysis** page.

---

## 4. Project Analysis

The Project Analysis page provides detailed information about one historical project.

The main summary metrics are:

```text
Total Cost
Selling Price
Margin
Selling Price / m²
```

The page also contains:

- project information;
- top cost drivers;
- cost breakdown by scope;
- cost distribution charts.

### 4.1 Top Cost Drivers

The **Top Cost Drivers** section shows the scopes that contribute the most to the project's total cost.

This can be used to quickly identify the main cost components of the project.

### 4.2 Cost Breakdown

The **Cost Breakdown by Scope** section provides:

- scope name;
- total scope cost;
- percentage of total project cost.

Charts provide a visual representation of the largest scopes and overall cost distribution.

### 4.3 Benchmarking a Project

Select:

```text
View Benchmark
```

to open the benchmarking analysis for the current project.


## 5. Benchmarking

The **Benchmarking** page compares one selected project against the historical YourQS dataset.

The page shows:

- project cost per m²;
- dataset median;
- dataset average;
- cost position and percentile;
- benchmark range;
- similar historical projects.

To use benchmarking:

1. Open a project from the Projects page.
2. Select **View Benchmark**.
3. Review the project's position against the historical dataset.

If the selected project does not contain enough cost or floor-area data, benchmarking may not be available.

---

## 6. Compare Projects

The **Compare Projects** page allows multiple historical projects to be compared side by side.

Only analytics-ready projects can be selected.

To compare projects:

1. Open **Compare Projects**.
2. Search for projects by name.
3. Select between 2 and 4 projects.
4. Select **Compare Projects**.

The comparison includes:

- project summary values;
- cost per m²;
- margin;
- total cost versus selling price;
- floor area versus cost efficiency;
- top cost scope comparison.

---

## 7. What-if Analysis

The **What-if Analysis** tool shows how changes to individual project cost scopes affect the overall project result.

To create a scenario:

1. Open **What-if Analysis**.
2. Search for and select an analytics-ready project.
3. Find the required cost scope.
4. Enter a percentage adjustment.

Positive values increase the scope cost and negative values reduce it.

The permitted adjustment range is:

```text
-100% to +500%
```

The scenario updates automatically and shows changes to:

- total cost;
- cost per m²;
- margin;
- individual scope costs.

Select:

```text
Reset Scenario
```

to remove the adjustments and return to the original project values.

---

## 8. Feasibility Assessment

The **Feasibility Assessment** is a public tool for producing an indicative construction feasibility range using historical YourQS project data.

A user does not need to sign in to complete the assessment.

### 8.1 Project Type

Start by selecting the proposed project type:

```text
New Build
Renovation
Extension / Addition
Renovation and Extension
Multi-Unit Development
```

The remaining questions change depending on the selected project type.

### 8.2 Project Details

Depending on the project type, the form asks for relevant information such as:

- floor area;
- affected or extension area;
- existing home area;
- number of levels;
- bathrooms;
- kitchens.

For renovation and extension projects, the affected area refers to the area of work rather than automatically using the full existing property area.

### 8.3 Scope

Where applicable, the assessment asks additional scope questions.

Select:

```text
Yes
No
Not sure
```

for each applicable characteristic.

These answers help the system identify more relevant historical projects.

### 8.4 Budget

Enter the approximate construction budget in NZD.

The expected start timeframe can also be provided, but this field is optional.

### 8.5 Review and Submit

The final step summarises the information entered.

Review the details and use the edit options if anything needs to be changed.

Submit the assessment to generate the feasibility result.

### 8.6 Understanding the Result

Where sufficient historical evidence is available, the result can include:

```text
Low Estimate
Typical Estimate
High Estimate

Low / Typical / High rate per m²

Budget Verdict
Confidence
Comparable Project Count
```

The budget verdict may be shown as:

```text
Feasible
Borderline
Unlikely
```

The confidence indicator reflects the amount and quality of historical evidence used by the assessment.

If there are not enough suitable historical projects, the system returns an **Insufficient Evidence** result instead of producing a potentially unreliable estimate.

The feasibility result is indicative only and is not a formal quotation or quantity survey.

---

## 9. Requesting a Detailed Review

After completing a feasibility assessment, the user can select:

```text
Request a Detailed Review
```

to send additional project information to YourQS.

The review form includes contact and project information and requires a supporting file.

Supported file types include:

```text
PDF
DOCX
XLSX
JPG
PNG
WEBP
```

The maximum supported file size is:

```text
15 MB
```

After submission, the request becomes available through the internal Admin Panel for further review.

---

## 10. Admin Panel

The **Admin Panel** provides internal access to platform and feasibility activity.

Users must be signed in to access it.

The main sections include:

```text
Overview
Feasibility
Feedback
Platform
```

The Overview section displays feasibility usage information such as:

- total assessments;
- unique sessions;
- detailed review requests;
- review conversion;
- recent assessment activity;
- project type distribution;
- budget verdict distribution;
- confidence distribution.

The Feasibility section provides access to:

- assessment logs;
- detailed review requests.

Review requests can be opened to inspect submitted customer information and supporting files.

---

## 11. Common Issues

### Unable to access internal analytics

Confirm that the user is signed in.

If the session has expired, sign in again through:

```text
auth.html
```

### Project Analysis or Benchmarking is unavailable

These pages require a project to be selected first.

Return to:

```text
Projects
```

and open the required project.

### Project cannot be used for comparison or What-if Analysis

Some analytical features require complete historical cost and area data.

Select another analytics-ready project if the required project is unavailable.

### Feasibility returns Insufficient Evidence

This means that the system could not find enough suitable historical projects for a reliable automated estimate.

A detailed YourQS review can be requested instead.

### Application cannot load data

Check that the backend service and database connection are available.

If the issue continues, contact the system administrator.

---

## 12. Quick Reference

```text
Projects
→ Browse and filter historical projects

Project Analysis
→ Review detailed project costs and scopes

Benchmarking
→ Compare one project against historical data

Compare Projects
→ Compare 2–4 historical projects

What-if Analysis
→ Test cost changes to project scopes

Feasibility
→ Produce an indicative early-stage budget assessment

Admin Panel
→ Review feasibility activity, customer requests and feedback
```