![Logo](https://media.discordapp.net/attachments/1224623887505952819/1532005280190304266/content.png?ex=6a8a41da&is=6a88f05a&hm=17a9da582d3e15c4f603b568b3f4436fff828124ed6ef07b34ee073361235967&=&format=webp&quality=lossless)



# R&amp;D Project 2026 - EX35 (Capstone project for YourQS: analytics platform for quantity surveying data)

This project is developed as part of the final-year Capstone Project at Auckland University of Technology (AUT) in collaboration with YourQS.

The objective is to enhance the client's existing quantity surveying and construction cost estimation platform through cloud-based data management, backend services, analytical reporting, and AI-assisted natural language interaction.


## Technical Stack

**Application Layer**

- C#
- ASP.NET Core Web API
- RESTful service architecture
- Blazor Server / Blazor Web UI

**Data & Analytics Layer**

- Supabase PostgreSQL (cloud-hosted shared database)
- Microsoft Access (.accdb) as the original client dataset
- Data migration: Microsoft Access → PostgreSQL → Supabase
- SQL query optimization, indexing, and relational mapping
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
- DBeaver / MS Access / Supabase Dashboard
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


## Repository Structure (In progress...)

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

- [@Becky Zhou](https://github.com/meanaspotato) - Project Manager & Fullstack Developer
- [@Max Makarov](https://github.com/panamilit) - Data Engineer & Analytics Developer
- [@Jackson Full](https://www.github.com/) - Technical Writer & Documentation Specialist
- [@Mantej Singh](https://www.github.com/singhm2929-bot) - Research Analyst & Technical Writer
 


## Appendix

Developed under the Auckland University of Technology (AUT) Bachelor of Computer and Information Sciences Capstone Project.

**Note:** This project is conducted in collaboration with YourQS as part of the AUT Bachelor of Computer and Information Sciences Capstone programme.



