"""create users and athletes

Revision ID: 20260717_0001
Revises:
Create Date: 2026-07-17
"""

from alembic import op
import sqlalchemy as sa

revision = '20260717_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('user_id', sa.Integer(), primary_key=True),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'athletes',
        sa.Column('athlete_id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('gender', sa.String(length=50), nullable=False),
        sa.Column('height', sa.String(length=50), nullable=False),
        sa.Column('weight', sa.String(length=50), nullable=False),
        sa.Column('sport', sa.String(length=100), nullable=False),
        sa.Column('playing_position', sa.String(length=100), nullable=False),
        sa.Column('dominant_side', sa.String(length=50), nullable=False),
        sa.Column('experience_years', sa.Integer(), nullable=False),
        sa.Column('previous_injuries', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_athletes_athlete_id'), 'athletes', ['athlete_id'], unique=False)
    op.create_index(op.f('ix_athletes_user_id'), 'athletes', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_athletes_user_id'), table_name='athletes')
    op.drop_index(op.f('ix_athletes_athlete_id'), table_name='athletes')
    op.drop_table('athletes')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_user_id'), table_name='users')
    op.drop_table('users')
