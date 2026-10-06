# YourQS Analytics Platform - Technical Handover

## 1. Purpose

This document provides a technical handover of the final YourQS Analytics Platform implementation developed as part of the AUT R&D Capstone Project.

It is intended to help future developers understand:

- how the project is structured;
- where the main functionality is implemented;
- how the frontend, backend and database interact;
- how to configure and run the project;
- what remains development-specific or requires production integration.

Detailed database and feasibility calculation documentation is available separately:

```text
documentation/DATABASE_IMPLEMENTATION.md
documentation/FEASIBILITY_CALCULATION_LOGIC.md
```

User-facing instructions are provided in:

```text
documentation/USER_GUIDE.md
```

---

## 2. System Overview

The final implementation consists of:

```text
Frontend
HTML / CSS / JavaScript
        │
        │ REST API
        ▼
Backend
Python / FastAPI
        │
        ▼
PostgreSQL / Supabase
Development Database
```

The platform provides:

- project browsing and project-level analytics;
- historical project benchmarking;
- project comparison;
- what-if cost analysis;
- customer feasibility assessment;
- feasibility review requests and file uploads;
- feasibility administration;
- authentication;
- user feedback.

The frontend communicates with the FastAPI backend through HTTP API requests. The backend separates HTTP routing, business logic and database access into route, service and repository layers. The frontend API module centralises this communication with the backend. :chatgpt-content-reference{index="0"}

The backend entry point registers the project, benchmarking, comparison, what-if, authentication, feedback, feasibility and feasibility administration routers. :chatgpt-content-reference{index="1"}

The development implementation uses PostgreSQL/Supabase. It should not be treated as documentation of the existing YourQS production database or infrastructure.



## 3. Repository Structure

This section provides a map of the final project repository and identifies where the main application functionality is implemented.

### 3.1 Top-Level Structure

The main project structure is:

```text
project/
├── frontend/
├── src/
│   └── analytics-python/
├── documentation/
└── README.md
```

The three main areas are:

| Location | Purpose |
|---|---|
| `frontend/` | User interface implemented with HTML, CSS and JavaScript |
| `src/analytics-python/` | FastAPI backend, application logic and database access |
| `documentation/` | Technical handover and calculation documentation |

> **Note:** The root `README.md` contains earlier project architecture information and does not fully represent the final implementation. This handover document should be used as the reference for the final project structure.

---

### 3.2 Frontend

The frontend is located in:

```text
frontend/
```

The main pages are:

```text
frontend/
├── index.html
├── auth.html
├── platform.html
├── project.html
├── benchmarking.html
├── compare.html
├── what-if.html
└── dev.html
```

Their primary responsibilities are:

| File | Purpose |
|---|---|
| `index.html` | Public feasibility assessment |
| `auth.html` | Sign-in and authentication interface |
| `platform.html` | Main internal project analytics interface |
| `project.html` | Detailed view of an individual project |
| `benchmarking.html` | Historical project benchmarking |
| `compare.html` | Project-to-project comparison |
| `what-if.html` | What-if cost scenario analysis |
| `dev.html` | Development/admin interface |

Frontend JavaScript is located in:

```text
frontend/js/
```

The main JavaScript files are:

```text
js/
├── api.js
├── app.js
├── auth.js
├── auth-page.js
├── benchmarking.js
├── charts.js
├── comparison.js
├── config.js
├── dev.js
├── dev-fallback-data.js
├── feasibility.js
├── formatters.js
├── mobile-nav.js
├── project-details.js
├── projects.js
├── session-ui.js
└── what-if.js
```

Important files include:

| File | Responsibility |
|---|---|
| `api.js` | Shared HTTP communication with the FastAPI backend |
| `config.js` | Frontend API configuration |
| `auth.js` | Authentication/session handling used by the application |
| `auth-page.js` | Behaviour of the authentication page |
| `projects.js` | Project listing and filtering |
| `project-details.js` | Individual project analytics |
| `benchmarking.js` | Benchmarking interface |
| `comparison.js` | Project comparison interface |
| `what-if.js` | What-if scenario interface |
| `feasibility.js` | Public feasibility form, submission and result presentation |
| `charts.js` | Shared chart-related functionality |
| `formatters.js` | Shared display and value formatting |
| `dev.js` | Development/admin interface behaviour |

`api.js` should be the first frontend file checked when tracing communication between the UI and backend. It centralises requests for projects, project details, benchmarking, comparison, what-if analysis, feedback and feasibility administration.

For example:

```text
projects.js
        ↓
api.js
        ↓
GET /api/projects
        ↓
FastAPI backend
```

The same general pattern is used by the other application pages.

---

### 3.3 Backend

The backend is located in:

```text
src/analytics-python/
```

The main application package is:

```text
src/analytics-python/app/
```

Its structure is:

```text
app/
├── core/
├── db/
├── dependencies/
├── repositories/
├── routes/
├── schemas/
├── services/
├── main.py
└── __init__.py
```

The backend follows the general pattern:

```text
HTTP Request
     ↓
Route
     ↓
Service
     ↓
Repository
     ↓
Database
```

Not every operation requires exactly the same processing path, but this structure is used throughout the main application features.

---

### 3.4 Backend Entry Point

The FastAPI application is created in:

```text
app/main.py
```

This file is responsible for:

- creating the FastAPI application;
- opening and closing the database connection pool;
- configuring CORS;
- registering API routers;
- exposing the database health endpoint.

The registered functional areas include:

```text
Projects
Benchmarking
Comparison
What-if
Authentication
Feedback
Feasibility
Feasibility Administration
```

The health endpoint is:

```http
GET /health
```

It performs a simple database query and returns a healthy response when the database connection is available.

---

### 3.5 Routes

API route definitions are located in:

```text
app/routes/
```

The main route modules are:

```text
routes/
├── auth.py
├── benchmarking.py
├── comparison.py
├── feasibility.py
├── feasibility_admin.py
├── feedback.py
├── projects.py
└── what_if.py
```

| Route File | Main Responsibility |
|---|---|
| `auth.py` | User authentication |
| `projects.py` | Project listing, summary and project details |
| `benchmarking.py` | Historical project benchmarking |
| `comparison.py` | Comparison of selected projects |
| `what_if.py` | What-if cost scenarios |
| `feedback.py` | User feedback submission/retrieval |
| `feasibility.py` | Public feasibility assessment and detailed review requests |
| `feasibility_admin.py` | Administrative access to feasibility assessments and review requests |

For example, `projects.py` exposes:

```http
GET /api/projects/summary
GET /api/projects
GET /api/projects/{project_id}/details
```

These project endpoints require an authenticated user.

The public feasibility route uses the prefix:

```http
/api/feasibility
```

and includes:

```http
POST /api/feasibility/assess
POST /api/feasibility/assess-combined
POST /api/feasibility/review-requests
```

---

### 3.6 Services

Business and analytical logic is located in:

```text
app/services/
```

The main service modules are:

```text
services/
├── feasibility/
├── auth_service.py
├── benchmarking_service.py
├── combined_feasibility_service.py
├── comparison_service.py
├── feasibility_admin_service.py
├── feasibility_review_service.py
├── feasibility_service.py
├── feasibility_storage_service.py
├── feedback_service.py
├── project_details_service.py
├── projects_service.py
└── what_if_service.py
```

Services sit between API routes and data access.

For example:

```text
GET /api/projects
        ↓
routes/projects.py
        ↓
services/projects_service.py
        ↓
repositories/projects_repository.py
```

The feasibility functionality contains additional analytical logic and is therefore more extensive than the standard project retrieval flow.

Its main entry point is:

```text
services/feasibility_service.py
```

Additional feasibility calculation components are organised under:

```text
services/feasibility/
```

The detailed feasibility algorithm is documented separately in:

```text
documentation/FEASIBILITY_CALCULATION_LOGIC.md
```

---

### 3.7 Repositories

Database access is located in:

```text
app/repositories/
```

The repository modules are:

```text
repositories/
├── auth_repository.py
├── benchmarking_repository.py
├── comparison_repository.py
├── feasibility_admin_repository.py
├── feasibility_repository.py
├── feasibility_review_repository.py
├── feedback_repository.py
├── project_details_repository.py
├── projects_repository.py
└── what_if_repository.py
```

Repositories are the main location to inspect when changing:

- SQL queries;
- source tables or analytical views;
- database filtering;
- project retrieval;
- persistence of application data.

For example:

```text
projects_repository.py
```

provides database access for the project listing functionality, while:

```text
feasibility_repository.py
```

provides the historical project data required by the feasibility calculation.

The database implementation and source data relationships are documented in:

```text
documentation/DATABASE_IMPLEMENTATION.md
```

---

### 3.8 Schemas

API request and response models are located in:

```text
app/schemas/
```

The main schema modules are:

```text
schemas/
├── auth.py
├── benchmarking.py
├── combined_feasibility.py
├── comparison.py
├── feasibility.py
├── feasibility_admin.py
├── feasibility_review.py
├── feedback.py
├── project_details.py
├── projects.py
└── what_if.py
```

These models define the data contracts between the frontend and backend.

When changing an API response or request format, the relevant schema should therefore be checked together with:

```text
route
service
frontend consumer
```

---

### 3.9 Database Connection

Database infrastructure is located in:

```text
app/db/
```

The primary file is:

```text
app/db/pool.py
```

The application opens the database connection pool when FastAPI starts and closes it when the application shuts down.

Database credentials and connection settings are not hard-coded into the application.

They are loaded through the application configuration described in Section 4.10.

---

### 3.10 Configuration and Security

Core configuration is located in:

```text
app/core/
```

The main files are:

```text
core/
├── config.py
└── security.py
```

`config.py` loads backend configuration from environment variables and `.env`.

The current configuration includes settings for:

```text
Application environment
Database connection
Database connection pool
CORS
JWT authentication
Registration access
Supabase
Feasibility file storage
File upload limits
```

Sensitive values such as database passwords, JWT secrets and Supabase service credentials must not be committed to documentation or source control.

The repository contains:

```text
.env.example
```

which should be used as the configuration reference when setting up a new environment.

`security.py` contains security-related application functionality.

Authentication dependencies used by protected API routes are located in:

```text
app/dependencies/current_user.py
```

---

### 3.11 Feature-to-Code Map

The following table provides a quick reference for locating the implementation of each major feature.

| Feature | Frontend | Route | Service | Repository |
|---|---|---|---|---|
| Project List | `projects.js` | `projects.py` | `projects_service.py` | `projects_repository.py` |
| Project Details | `project-details.js` | `projects.py` | `project_details_service.py` | `project_details_repository.py` |
| Benchmarking | `benchmarking.js` | `benchmarking.py` | `benchmarking_service.py` | `benchmarking_repository.py` |
| Project Comparison | `comparison.js` | `comparison.py` | `comparison_service.py` | `comparison_repository.py` |
| What-if Analysis | `what-if.js` | `what_if.py` | `what_if_service.py` | `what_if_repository.py` |
| Authentication | `auth.js`, `auth-page.js` | `auth.py` | `auth_service.py` | `auth_repository.py` |
| Feedback | application UI / `api.js` | `feedback.py` | `feedback_service.py` | `feedback_repository.py` |
| Feasibility Assessment | `feasibility.js` | `feasibility.py` | `feasibility_service.py` | `feasibility_repository.py` |
| Feasibility Review | `feasibility.js` | `feasibility.py` | `feasibility_review_service.py` | `feasibility_review_repository.py` |
| Feasibility Admin | `dev.js` | `feasibility_admin.py` | `feasibility_admin_service.py` | `feasibility_admin_repository.py` |

This table is the quickest starting point when tracing a feature through the application.

For example:

```text
Project Comparison

frontend/js/comparison.js
        ↓
frontend/js/api.js
        ↓
app/routes/comparison.py
        ↓
app/services/comparison_service.py
        ↓
app/repositories/comparison_repository.py
        ↓
Database
```

---

### 3.12 Documentation

Technical documentation is located in:

```text
documentation/
```

The current handover documentation includes:

```text
documentation/
├── DATABASE_IMPLEMENTATION.md
├── FEASIBILITY_CALCULATION_LOGIC.md
├── PROJECT_TECHNICAL_HANDOVER.md
└── USER_GUIDE.md
```

The documents have separate purposes:

| Document | Purpose |
|---|---|
| `DATABASE_IMPLEMENTATION.md` | Development database structure, analytical views, relationships, application tables and limitations |
| `FEASIBILITY_CALCULATION_LOGIC.md` | Detailed explanation of the feasibility calculation methodology |
| `PROJECT_TECHNICAL_HANDOVER.md` | Overall technical map and handover of the final application |
| `USER_GUIDE.md` | Instructions for operating the application |

---

### 3.13 Where to Start

When investigating an existing feature, the recommended order is:

```text
1. Identify the relevant frontend page
        ↓
2. Find its JavaScript module
        ↓
3. Check the API call in api.js
        ↓
4. Open the corresponding backend route
        ↓
5. Follow the service
        ↓
6. Follow the repository if database access is involved
        ↓
7. Check the relevant schema for request/response structure
```

For database behaviour:

```text
See DATABASE_IMPLEMENTATION.md
```

For feasibility calculation behaviour:

```text
See FEASIBILITY_CALCULATION_LOGIC.md
```

This avoids duplicating detailed database and calculation documentation inside the general project handover.
## 4. Running the Project

### 4.1 Backend

The backend is located in:

```text
src/analytics-python/
```

Create and activate a virtual environment, then install the dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create a local `.env` file using:

```text
.env.example
```

as the configuration reference.

Start the backend with:

```bash
uvicorn app.main:app --reload
```

The default local API address is:

```text
http://127.0.0.1:8000
```

The database connection can be checked through:

```text
GET /health
```

---

### 4.2 Frontend

The frontend is located in:

```text
frontend/
```

It is a static HTML/CSS/JavaScript application and does not require a build process.

Serve the folder using a local HTTP server such as VS Code Live Server.

For local backend development, update:

```text
frontend/js/config.js
```

so that:

```javascript
API_BASE_URL = "http://127.0.0.1:8000"
```

The current committed frontend configuration points to the development API URL:

```text
https://api.ex35-prototype.com
```

:chatgpt-content-reference{index="0"}

Protected analytics pages require authentication before the backend will return project data.
## 5. Authentication and Configuration

### 5.1 Authentication

The internal analytics area uses JWT-based authentication.

Protected backend routes require:

```http
Authorization: Bearer <token>
```

The shared authentication dependency is implemented in:

```text
app/dependencies/current_user.py
```

It validates the bearer token and rejects missing, invalid or expired tokens with HTTP `401`. :chatgpt-content-reference{index="0"}

Password hashing and JWT token creation are implemented in:

```text
app/core/security.py
```

Passwords are hashed using the configured password-hashing implementation, while JWT tokens contain the user ID and expiry time. :chatgpt-content-reference{index="1"} :chatgpt-content-reference{index="2"}

Account registration also uses a configured access code.

---

### 5.2 Configuration

Backend configuration is loaded from environment variables through:

```text
app/core/config.py
```

The main configuration areas are:

```text
Database connection
JWT authentication
Registration access code
CORS
Supabase access
Feasibility file storage
```

Sensitive configuration must remain outside source code and documentation.

The backend database connection is managed through a shared PostgreSQL connection pool. :chatgpt-content-reference{index="3"}

Frontend API configuration is located in:

```text
frontend/js/config.js
```

The current committed API base URL is:

```text
https://api.ex35-prototype.com
```

:chatgpt-content-reference{index="4"}

For another environment, this value should be changed to the corresponding backend API address.
## 6. Production Integration Notes

The final project was developed and tested against the PostgreSQL/Supabase development environment.

The existing YourQS production system uses a different production database environment, which was not analysed as part of this project.

The development implementation should therefore be treated as a reference for:

- required application behaviour;
- API functionality;
- analytical calculations;
- required data fields;
- user workflows.

The production YourQS development team will need to map these requirements to the corresponding structures in their existing system.

The following development-specific elements should not be treated as production requirements:

```text
PostgreSQL-specific SQL
Supabase-specific configuration
Development database indexes
Development API URL
Development storage configuration
```

The detailed database boundary and assumptions are documented in:

```text
documentation/DATABASE_IMPLEMENTATION.md
```

No production deployment procedure is included in this handover.


## 7. Known Limitations

The current implementation should be understood as a final capstone development version rather than a completed production integration.

The main known limitations are:

- the application depends on the PostgreSQL/Supabase development environment;
- production YourQS database integration was not implemented;
- some feasibility parameters are design rules rather than statistically validated thresholds;
- feasibility pricing does not currently model every cost driver, including location, specification quality and detailed site complexity;
- multi-unit feasibility logic remains limited;
- historical data quality affects analytics and feasibility results;
- the frontend API URL is environment-specific and must be updated when connecting to another backend environment.

Detailed feasibility limitations are documented in:

```text
documentation/FEASIBILITY_CALCULATION_LOGIC.md
```

Detailed database assumptions and data-quality limitations are documented in:

```text
documentation/DATABASE_IMPLEMENTATION.md
```
## 8. Handover Summary

The final handover consists of:

```text
PROJECT_TECHNICAL_HANDOVER.md
→ overall project structure and technical setup

DATABASE_IMPLEMENTATION.md
→ database structure, analytical views and database limitations

FEASIBILITY_CALCULATION_LOGIC.md
→ feasibility methodology and calculation rules

USER_GUIDE.md
→ instructions for using the application
```

For future development, the main starting points are:

```text
Frontend
→ frontend/

Backend
→ src/analytics-python/app/

Database access
→ app/repositories/

Business logic
→ app/services/

API routes
→ app/routes/

Configuration
→ app/core/config.py
→ frontend/js/config.js
```

The project code and documentation together provide the reference implementation developed during the AUT capstone project.
