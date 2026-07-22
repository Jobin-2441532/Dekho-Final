import os

file_path = r'c:\DEKHO FINAL\Ask_Dekho\ml_service\main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import psycopg2\nimport psycopg2.extras', 'import sqlite3')

get_conn_old = """def get_conn():
    \"\"\"Return a psycopg2 connection using DATABASE_URL from environment.\"\"\"
    try:
        conn = psycopg2.connect(_DB_URL)
        return conn
    except Exception as e:
        raise HTTPException(503, f"Database connection failed: {e}")"""

get_conn_new = """def get_conn():
    try:
        import os
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "dekho.db"))
        import sqlite3
        conn = sqlite3.connect(db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        raise HTTPException(503, f"Database connection failed: {e}")"""

content = content.replace(get_conn_old, get_conn_new)

content = content.replace('conn.cursor(psycopg2.extras.RealDictCursor)', 'conn.cursor()')
content = content.replace('%s', '?')
content = content.replace("to_char(date::date, 'YYYY-MM')", "strftime('%Y-%m', date)")
content = content.replace('NOW()', "datetime('now')")

# Fix RETURNING id
content = content.replace("            RETURNING id", "")
content = content.replace("tx_id = cur.fetchone()[0]  # RETURNING id", "tx_id = cur.lastrowid")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done fixing main.py")
