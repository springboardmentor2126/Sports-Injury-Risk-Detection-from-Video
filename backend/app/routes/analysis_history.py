from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.analysis_history import get_analysis_history_by_user, save_analysis_history
from app.database.database import get_db
from app.schemas.analysis_history import AnalysisHistoryCreate, AnalysisHistoryResponse

router = APIRouter(prefix='/api/v1/analysis-history', tags=['analysis-history'])


def get_current_user_id(x_current_user_id: int | None = Header(default=None, alias='X-Current-User-Id')) -> int:
    if x_current_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentication required.')
    return x_current_user_id


@router.post('', response_model=AnalysisHistoryResponse, status_code=status.HTTP_201_CREATED)
def create_analysis_history(
    payload: AnalysisHistoryCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> AnalysisHistoryResponse:
    payload = payload.model_copy(update={'user_id': current_user_id})
    entry = save_analysis_history(db, payload)
    return AnalysisHistoryResponse.model_validate(entry)


@router.get('/me', response_model=list[AnalysisHistoryResponse])
def list_analysis_history_for_current_user(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> list[AnalysisHistoryResponse]:
    entries = get_analysis_history_by_user(db, current_user_id)
    if not entries:
        return []
    return [AnalysisHistoryResponse.model_validate(entry) for entry in entries]


@router.get('/{user_id}', response_model=list[AnalysisHistoryResponse])
def list_analysis_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> list[AnalysisHistoryResponse]:
    if user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden.')

    entries = get_analysis_history_by_user(db, user_id)
    if not entries:
        return []
    return [AnalysisHistoryResponse.model_validate(entry) for entry in entries]
