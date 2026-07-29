import os
import psycopg2

conn = psycopg2.connect(
    host="aws-1-ap-southeast-2.pooler.supabase.com",
    port=5432,
    dbname="postgres",
    user="aut_developer.booxbvhmiseiefiguarc",
    password="t9!7U]0RD3CA",
    sslmode="require"
)

cur = conn.cursor()

cur.execute('SELECT COUNT("NAME") FROM "PROJ_MASTER";')
print(cur.fetchone())

cur.close()
conn.close()