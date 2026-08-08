from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.database.connection import get_connection
from app.schemas.user_schema import UserCreate


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


# =========================================================
# LOGIN SCHEMA
# =========================================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# =========================================================
# PROFILE UPDATE SCHEMA
# =========================================================

class UserProfileUpdate(BaseModel):
    age: int
    height: float
    weight: float
    sport: str
    experience: int


# =========================================================
# REGISTER USER
# =========================================================

@router.post("/register")
def register_user(user: UserCreate):

    connection = get_connection()

    if connection is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    cursor = None

    try:

        cursor = connection.cursor()

        # Check existing email
        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = %s;
            """,
            (user.email,)
        )

        existing_user = cursor.fetchone()

        if existing_user is not None:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        # Insert user
        cursor.execute(
            """
            INSERT INTO users
            (
                full_name,
                email,
                password,
                role,
                age,
                height,
                weight,
                sport,
                experience
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING id;
            """,
            (
                user.full_name,
                user.email,
                user.password,
                user.role,
                user.age,
                user.height,
                user.weight,
                user.sport,
                user.experience
            )
        )

        user_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "User registered successfully",
            "user_id": user_id
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# LOGIN USER
# =========================================================

@router.post("/login")
def login_user(data: UserLogin):

    connection = get_connection()

    if connection is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                age,
                height,
                weight,
                sport,
                experience
            FROM users
            WHERE email = %s
            AND password = %s;
            """,
            (
                data.email,
                data.password
            )
        )

        user = cursor.fetchone()

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        return {
            "message": "Login successful",
            "user": {
                "id": user[0],
                "full_name": user[1],
                "email": user[2],
                "role": user[3],
                "age": user[4],
                "height": user[5],
                "weight": user[6],
                "sport": user[7],
                "experience": user[8]
            }
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# GET ALL USERS
# =========================================================

@router.get("/")
def get_users():

    connection = get_connection()

    if connection is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                age,
                height,
                weight,
                sport,
                experience
            FROM users
            ORDER BY id;
            """
        )

        users = cursor.fetchall()

        return {
            "users": [
                {
                    "id": user[0],
                    "full_name": user[1],
                    "email": user[2],
                    "role": user[3],
                    "age": user[4],
                    "height": user[5],
                    "weight": user[6],
                    "sport": user[7],
                    "experience": user[8]
                }
                for user in users
            ]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# GET USER BY ID
# =========================================================

@router.get("/{user_id}")
def get_user(user_id: int):

    connection = get_connection()

    if connection is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    cursor = None

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                age,
                height,
                weight,
                sport,
                experience
            FROM users
            WHERE id = %s;
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        return {
            "id": user[0],
            "full_name": user[1],
            "email": user[2],
            "role": user[3],
            "age": user[4],
            "height": user[5],
            "weight": user[6],
            "sport": user[7],
            "experience": user[8]
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# UPDATE USER PROFILE
# =========================================================

@router.put("/{user_id}")
def update_user_profile(
    user_id: int,
    profile: UserProfileUpdate
):

    connection = get_connection()

    if connection is None:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    cursor = None

    try:

        cursor = connection.cursor()

        # Check user exists
        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE id = %s;
            """,
            (user_id,)
        )

        existing_user = cursor.fetchone()

        if existing_user is None:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Update profile
        cursor.execute(
            """
            UPDATE users
            SET
                age = %s,
                height = %s,
                weight = %s,
                sport = %s,
                experience = %s
            WHERE id = %s;
            """,
            (
                profile.age,
                profile.height,
                profile.weight,
                profile.sport,
                profile.experience,
                user_id
            )
        )

        connection.commit()

        return {
            "message": "Profile updated successfully",
            "id": user_id,
            "age": profile.age,
            "height": profile.height,
            "weight": profile.weight,
            "sport": profile.sport,
            "experience": profile.experience
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Profile update failed: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()