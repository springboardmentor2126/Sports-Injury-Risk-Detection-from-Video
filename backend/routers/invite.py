from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from database import crud, models
from services.auth_service import get_current_user

router = APIRouter(tags=["Invites"])

FRONTEND_BASE_URL = "http://localhost:3000"


@router.post("/athlete-profile/{athlete_id}/invite")
def create_athlete_invite(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generates a shareable invite link for this athlete. ONLY the athlete's
    owner can generate one - this is a write/management action, so it uses
    the strict ownership check (crud.get_athlete_for_user), not the
    broadened viewable check used for read-only routes.

    Whoever opens the link and accepts it gets READ-ONLY access to this
    athlete's full analysis history - they can never edit the profile,
    delete it, or upload videos for this athlete.
    """
    athlete = crud.get_athlete_for_user(db, athlete_id, current_user.id)
    if not athlete:
        if crud.athlete_id_exists_for_any_user(db, athlete_id):
            raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
        raise HTTPException(status_code=404, detail="Athlete profile not found")

    invite = crud.create_invite(db, athlete_pk_id=athlete.id, invited_by_user_id=current_user.id)

    return {
        "invite_link": f"{FRONTEND_BASE_URL}/invite/{invite.token}",
        "token": invite.token,
        "athlete_id": athlete.athlete_id,
    }


@router.get("/athlete-profile/{athlete_id}/invites")
def list_athlete_invites(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Owner-only: see who's been invited and who has accepted, so they
    know who currently has view access to their data."""
    athlete = crud.get_athlete_for_user(db, athlete_id, current_user.id)
    if not athlete:
        if crud.athlete_id_exists_for_any_user(db, athlete_id):
            raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
        raise HTTPException(status_code=404, detail="Athlete profile not found")

    invites = crud.get_invites_for_athlete(db, athlete.id)

    return {
        "athlete_id": athlete.athlete_id,
        "invites": [
            {
                "token": inv.token,
                "status": inv.status,
                "accepted_by_user_id": inv.accepted_by_user_id,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "accepted_at": inv.accepted_at.isoformat() if inv.accepted_at else None,
            }
            for inv in invites
        ],
    }


@router.get("/invite/{token}")
def preview_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Shows basic info about an invite BEFORE accepting it (which athlete,
    current status) - the frontend uses this to render a confirmation
    screen. Requires login (so we know who'd be accepting), but does not
    grant access or mark anything accepted yet.
    """
    invite = crud.get_invite_by_token(db, token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link not found or invalid")

    athlete = invite.athlete

    if invite.status == "accepted" and invite.accepted_by_user_id == current_user.id:
        message = "You already have access to this athlete's data."
    elif invite.status == "accepted":
        message = "This invite has already been used by someone else."
    elif invite.status == "revoked":
        message = "This invite has been revoked and is no longer valid."
    else:
        message = "This invite is valid and ready to accept."

    return {
        "token": invite.token,
        "status": invite.status,
        "athlete_id": athlete.athlete_id if athlete else None,
        "sport_type": athlete.sport_type if athlete else None,
        "message": message,
        "can_accept": invite.status == "pending" and athlete.user_id != current_user.id,
    }


@router.post("/invite/{token}/accept")
def accept_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Accepts an invite, granting the CURRENT user read-only access to the
    associated athlete's data. Anyone logged in can accept - by design,
    this is meant for coaches/physios/sports scientists/admins the athlete
    has chosen to share the link with; there's no separate role check here
    since the invite link itself (a random unguessable token) is the access
    control.
    """
    invite = crud.get_invite_by_token(db, token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link not found or invalid")

    if invite.status == "revoked":
        raise HTTPException(status_code=400, detail="This invite has been revoked and is no longer valid")

    if invite.status == "accepted":
        if invite.accepted_by_user_id == current_user.id:
            return {"message": "You already have access to this athlete's data."}
        raise HTTPException(status_code=400, detail="This invite has already been used by someone else")

    athlete = invite.athlete
    if athlete and athlete.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this athlete profile")

    crud.accept_invite(db, invite, accepted_by_user_id=current_user.id)

    return {
        "message": f"You now have read-only access to {athlete.athlete_id}'s analysis history.",
        "athlete_id": athlete.athlete_id if athlete else None,
    }