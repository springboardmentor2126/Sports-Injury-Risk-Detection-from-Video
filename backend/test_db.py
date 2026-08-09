from app.database.database import SessionLocal
from app.models.user import User

db = SessionLocal()

users = db.query(User).all()

for user in users:
    print(
        user.user_id,
        user.full_name,
        user.email,
        user.role,
        user.created_at
    )

db.close()