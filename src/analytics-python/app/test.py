import os
import psycopg2

conn = psycopg2.connect(
    host="host",
    port=5432,
    dbname="postgres",
    user="user",
    password="password",
    sslmode="require"
)

cur = conn.cursor()

cur.execute('SELECT COUNT("NAME") FROM "PROJ_MASTER";')
print(cur.fetchone())

cur.close()
conn.close()
