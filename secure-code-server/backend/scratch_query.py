import sqlite3
import json

conn = sqlite3.connect('database.sqlite')
c = conn.cursor()
c.execute("SELECT memberRestrictions FROM projects WHERE name='FinalTest'")
row = c.fetchone()
if row:
    print(row[0])
else:
    print("Project not found")
conn.close()
