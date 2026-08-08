from fastapi import APIRouter, HTTPException

from app.database.connection import get_connection
from app.schemas.athlete_schema import AthleteProfileCreate


router = APIRouter(
    prefix="/athlete-profile",
    tags=["Athlete Profile"]
)


# =========================================================
# GET ATHLETE PROFILE
# =========================================================

@router.get("/{user_id}")
def get_athlete_profile(user_id: int):

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
                user_id,
                age,
                height,
                weight,
                sport,
                experience
            FROM athlete_profiles
            WHERE user_id = %s;
            """,
            (user_id,)
        )

        profile = cursor.fetchone()

        if profile is None:

            return {
                "profile": None,
                "message": "Athlete profile not found"
            }

        return {

            "profile": {

                "id": profile[0],
                "user_id": profile[1],
                "age": profile[2],
                "height": profile[3],
                "weight": profile[4],
                "sport": profile[5],
                "experience": profile[6]

            }

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch profile: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# CREATE ATHLETE PROFILE
# =========================================================

@router.post("/")
def create_athlete_profile(profile: AthleteProfileCreate):

    connection = get_connection()

    if connection is None:

        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    cursor = None

    try:

        cursor = connection.cursor()

        # Check whether profile already exists

        cursor.execute(
            """
            SELECT id
            FROM athlete_profiles
            WHERE user_id = %s;
            """,
            (profile.user_id,)
        )

        existing_profile = cursor.fetchone()

        if existing_profile:

            raise HTTPException(
                status_code=400,
                detail="Athlete profile already exists"
            )

        cursor.execute(
            """
            INSERT INTO athlete_profiles
            (
                user_id,
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
                %s
            )
            RETURNING id;
            """,
            (
                profile.user_id,
                profile.age,
                profile.height,
                profile.weight,
                profile.sport,
                profile.experience
            )
        )

        profile_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Athlete profile saved successfully",
            "profile_id": profile_id
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create profile: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()


# =========================================================
# UPDATE ATHLETE PROFILE
# =========================================================

@router.put("/{user_id}")
def update_athlete_profile(
    user_id: int,
    profile: AthleteProfileCreate
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

        cursor.execute(
            """
            UPDATE athlete_profiles
            SET
                age = %s,
                height = %s,
                weight = %s,
                sport = %s,
                experience = %s
            WHERE user_id = %s
            RETURNING id;
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

        updated_profile = cursor.fetchone()

        if updated_profile is None:

            raise HTTPException(
                status_code=404,
                detail="Athlete profile not found"
            )

        connection.commit()

        return {
            "message": "Athlete profile updated successfully"
        }

    except HTTPException:

        connection.rollback()
        raise

    except Exception as e:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )

    finally:

        if cursor:
            cursor.close()

        connection.close()