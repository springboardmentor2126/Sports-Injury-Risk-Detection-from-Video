from app.schemas.profile import AthleteProfileCreate


def build_profile_summary(profile: AthleteProfileCreate) -> dict:
    return {
        'fullName': profile.full_name,
        'sport': profile.sport,
        'dominantSide': profile.dominant_side,
        'experienceYears': profile.experience_years,
    }
