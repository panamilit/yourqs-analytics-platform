
# Database Connection Guide

A brief description of how to connect to a database hosted on Supabase.


### Direct DBeaver Connection String Info:
```
Host=aws-1-ap-southeast-2.pooler.supabase.com
Port=5432
Database=postgres
Username=aut_developer.booxbvhmiseiefiguarc
Password=<provided separately>
SSL Mode=Require
```



### Direct .NET Connection Info:


#### 1. Install the required dependencies
`
dotnet add package Microsoft.Extensions.Configuration.Json --version YOUR_DOTNET_VERSION
`

#### 2. Add the following files to your project
**File: appsettings.json**
```
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-1-ap-southeast-2.pooler.supabase.com;Database=postgres;Username=aut_developer.booxbvhmiseiefiguarc;Password=[YOUR-PASSWORD];SSL Mode=Require;Trust Server Certificate=true"
  }
}
```

**Connection parameters**
```
Host=aws-1-ap-southeast-2.pooler.supabase.com;
Port=5432;
Database=postgres;
User=aut_developer.booxbvhmiseiefiguarc;
Password=<provided separately>;
SSL Mode=Require;
Trust Server Certificate=true;
```




### Direct Python Connection Info:


#### 1. Install the required dependencies
`
pip install python-dotenv psycopg2
`

#### 2. Add the following files to your project
**File: main.py**
```
import psycopg2
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Connect to the database
connection = psycopg2.connect(DATABASE_URL)
```


**File: .env**
```
DATABASE_URL=postgresql://aut_developer.booxbvhmiseiefiguarc:[YOUR-PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
```


**Connection parameters**
```
Host=aws-1-ap-southeast-2.pooler.supabase.com;
Port=5432;
Database=postgres;
User=aut_developer.booxbvhmiseiefiguarc;
Password=<provided separately>;
```


### Database Schema

Primary schema:

public

Analytics view:

public."VW_PROJECT_OVERVIEW"


### Notes

- The database is shared across the development team.
- Do not modify the database schema without notifying the team.
- Database passwords are shared separately and should never be committed to Git.





