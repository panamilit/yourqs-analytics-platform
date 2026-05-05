
# R&amp;D Project 2026 - EX35 (Capstone project for YourQS: analytics platform for quantity surveying data)

This project is developed as part of the final-year Capstone Project at Auckland University of Technology (AUT) in collaboration with YourQS.

The objective is to enhance the client’s existing quantity surveying and construction cost estimation platform by integrating structured data processing, backend service architecture, advanced analytics, and AI-assisted natural language interaction.


## Technical Stack

**Application Layer**

- C#
- ASP.NET Core Web API
- RESTful service architecture
- Blazor Server / Blazor Web UI

**Data & Analytics Layer**

- Access SQL
- Microsoft Access (.accdb) for initial client dataset
- Query optimization and relational mapping
- Python3
- Pandas / NumPy / Matplotlib Pyplot
- Jupyter Notebook

**AI Interaction Layer**

- Controlled LLM integration 
- Natural language request interpretation
- Secure internal prompt routing
- Restricted model access through backend services only (MCP)

**Engineering & Collaboration**

- GitHub
- DBeaver / MS Access
- OneDrive
- Microsoft Teams
- Lucidchart / Lucidspark / Visual Paradigm
## Core Objectives

- Design a scalable service architecture for project cost retrieval and analysis
- Improve database interaction and query performance across large estimation datasets
- Build structured API endpoints for estimator workflows
- Support analytical reporting and cost comparison across projects
- Introduce controlled LLM-assisted querying using natural language
- Maintain secure internal-only handling of commercial project data


## Repository Structure

    yourqs-capstone/ 

     ├── backend/ # ASP.NET Core services and API endpoints 

     ├── frontend/ # Blazor UI application 

     ├── analytics/ # Python workflows, notebooks, and reporting logic 

     ├── database/ 
    
        ├── sql-scripts/ # Query development and testing 
        ├── schema-analysis/ # Relationship mapping and DB structure work 
        └── exports/ # CSV and transformed client datasets 

     ├── documentation/ 

        ├── proposal/ # Project proposal and feasibility documents 
        ├── architecture/ # System diagrams and technical documentation 
        └── presentations/ # Capstone presentation materials 

     ├── assets/ # Supporting resources 

     ├── .gitignore

     └── README.md


## Authors

- [@Becky Zhou](https://github.com/meanaspotato) - Backend Developer
- [@Max Makarov](https://github.com/panamilit) - Data Engineer
- [@Jackson Full](https://www.github.com/) - Frontend Developer
- [@Mantej Singh](https://www.github.com/singhm2929-bot) - Data Analyst



## Appendix

Developed under the Auckland University of Technology (AUT) Bachelor of Computer and Information Sciences Capstone Project.

**Note:** within a real-world industry collaboration with YourQS.


