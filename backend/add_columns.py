from app.database.connection import get_connection


def add_user_columns():

    connection = get_connection()

    if connection is None:
        print("Database connection failed.")
        return

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS age INTEGER,
            ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS sport VARCHAR(100),
            ADD COLUMN IF NOT EXISTS experience INTEGER;
        """)

        connection.commit()

        print("====================================")
        print("Database updated successfully!")
        print("Added/verified:")
        print("- age")
        print("- height")
        print("- weight")
        print("- sport")
        print("- experience")
        print("====================================")

    except Exception as e:

        connection.rollback()

        print("Database update failed!")
        print(e)

    finally:

        if cursor:
            cursor.close()

        connection.close()


if __name__ == "__main__":
    add_user_columns()