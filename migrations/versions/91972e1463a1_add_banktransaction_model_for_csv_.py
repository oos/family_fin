"""Add BankTransaction model for CSV imports

Revision ID: 91972e1463a1
Revises: 207256e4b99b
Create Date: 2025-09-10 12:00:48.462459

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '91972e1463a1'
down_revision = '207256e4b99b'
branch_labels = None
depends_on = None


def upgrade():
    # Create bank_transaction table
    op.create_table('bank_transaction',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_account_id', sa.Integer(), nullable=False),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=True),
        sa.Column('reference', sa.String(length=100), nullable=True),
        sa.Column('transaction_type', sa.String(length=50), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['business_account_id'], ['business_account.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop bank_transaction table
    op.drop_table('bank_transaction')
