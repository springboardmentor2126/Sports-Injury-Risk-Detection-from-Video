import psycopg2
from psycopg2 import OperationalError

from app.database.config import (
    DB_HOST,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DB_PORT
)


def get_connection():
    """
    Create and return a PostgreSQL database connection.

    Returns:
        psycopg2 connection object if successful.
        None if the connection fails.
    """

    try:
        connection = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )

        print("Connected to PostgreSQL successfully!")

        return connection

    except OperationalError as e:

        print("Database connection failed!")
        print(f"Error: {e}")

        return None

    except Exception as e:

        print("Unexpected database connection error!")
        print(f"Error: {e}")

        return None