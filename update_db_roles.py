import sqlite3

def update_db():
    conn = sqlite3.connect('webdiner.db')
    cursor = conn.cursor()
    
    # Create departments table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR UNIQUE,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        print("Created departments table.")
    except Exception as e:
        print(f"Error creating departments table: {e}")

    # Add role column to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'")
        print("Added role column to users.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column 'role' already exists.")
        else:
            print(f"Error adding role column: {e}")

    # Migrate existing admins to sysadmin
    try:
        cursor.execute("UPDATE users SET role = 'sysadmin' WHERE is_admin = 1")
        conn.commit()
        print("Migrated existing admins to sysadmin role.")
    except Exception as e:
        print(f"Error migrating roles: {e}")

    conn.close()

if __name__ == "__main__":
    update_db()
