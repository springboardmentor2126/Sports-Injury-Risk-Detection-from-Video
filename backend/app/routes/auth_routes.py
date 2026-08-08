from fastapi import APIRouter, HTTPException

from app.database.connection import get_connection


router = APIRouter(
    prefix="/users",
    tags=["Authentication"]
)


@router.post("/login")
def login_user(data: dict):

    email = data.get("email")
    password = data.get("password")


    connection = get_connection()

    if connection is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT id, full_name, email, role
            FROM users
            WHERE email=%s AND password=%s;
            """,
            (
                email,
                password
            )
        )


        user = cursor.fetchone()


        cursor.close()
        connection.close()


        if user is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )


        return {

            "message": "Login successful",

            "user_id": user[0],

            "full_name": user[1],

            "email": user[2],

            "role": user[3]

        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )