from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
 
from database.database import get_db
from database import models
from services import dashboard_service
from services.auth_service import require_admin
 
router = APIRouter(tags=["Admin"])
 
 
@router.get("/admin/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin),
):
    """
    Full Admin Analytics Dashboard payload - KPI cards, user/sports/risk
    distributions, injury type breakdown, monthly trends, highest-risk
    sports table, and recent platform activity. Protected to the
    Administrator role only - anyone else gets a 403 (require_admin
    returns 401 first if not logged in at all, 403 if logged in as a
    non-admin - see services/auth_service.py).
    """
    return dashboard_service.build_admin_dashboard(db)
 