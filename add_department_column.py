import sqlite3

def add_column():
    conn = sqlite3.connect('webdiner.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN department VARCHAR")
        conn.commit()
        print("Successfully added 'department' column to 'users' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column 'department' already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
