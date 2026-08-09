"""Add persisted analysis history metrics to analysis_history table

Revision ID: 20260730_0002
Revises: 20260717_0001
Create Date: 2026-07-30
"""

from alembic import op
import sqlalchemy as sa

revision = '20260730_0002'
down_revision = '20260717_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('analysis_history', sa.Column('balance_score', sa.Float(), nullable=True))
    op.add_column('analysis_history', sa.Column('stability_score', sa.Float(), nullable=True))
    op.add_column('analysis_history', sa.Column('pose_quality_score', sa.Float(), nullable=True))
    op.add_column('analysis_history', sa.Column('total_issues_detected', sa.Integer(), nullable=True))
    op.add_column('analysis_history', sa.Column('detected_issues', sa.JSON(), nullable=True))
    op.add_column('analysis_history', sa.Column('recommendations', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('analysis_history', 'recommendations')
    op.drop_column('analysis_history', 'detected_issues')
    op.drop_column('analysis_history', 'total_issues_detected')
    op.drop_column('analysis_history', 'pose_quality_score')
    op.drop_column('analysis_history', 'stability_score')
    op.drop_column('analysis_history', 'balance_score')
