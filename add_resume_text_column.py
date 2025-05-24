import sqlite3

db_path = "interview_platform.db"
conn = sqlite3.connect(db_path)
try:
    conn.execute("ALTER TABLE candidates ADD COLUMN resume_text TEXT;")
    print("Column 'resume_text' added successfully.")
except sqlite3.OperationalError as e:
    print("Error:", e)
finally:
    conn.commit()
    conn.close()