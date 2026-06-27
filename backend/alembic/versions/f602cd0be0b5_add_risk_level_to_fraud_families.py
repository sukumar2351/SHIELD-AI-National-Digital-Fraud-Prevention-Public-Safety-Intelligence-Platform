"""Add risk_level to fraud_families

Revision ID: f602cd0be0b5
Revises: None
Create Date: 2026-06-23 09:03:24.955577

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f602cd0be0b5'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('fraud_families', sa.Column('risk_level', sa.String(), nullable=True, server_default='Medium Risk'))


def downgrade() -> None:
    op.drop_column('fraud_families', 'risk_level')
