"""Add all Revolut export columns to BankTransaction

Revision ID: 86ae2c044354
Revises: 91972e1463a1
Create Date: 2025-09-10 12:10:31.383986

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '86ae2c044354'
down_revision = '91972e1463a1'
branch_labels = None
depends_on = None


def upgrade():
    # Add all Revolut export columns to bank_transaction table
    op.add_column('bank_transaction', sa.Column('date_started_utc', sa.DateTime(), nullable=True))
    op.add_column('bank_transaction', sa.Column('date_completed_utc', sa.DateTime(), nullable=True))
    op.add_column('bank_transaction', sa.Column('date_started_dublin', sa.DateTime(), nullable=True))
    op.add_column('bank_transaction', sa.Column('date_completed_dublin', sa.DateTime(), nullable=True))
    op.add_column('bank_transaction', sa.Column('transaction_id', sa.String(length=100), nullable=True))
    op.add_column('bank_transaction', sa.Column('state', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('payer', sa.String(length=200), nullable=True))
    op.add_column('bank_transaction', sa.Column('card_number', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('card_label', sa.String(length=100), nullable=True))
    op.add_column('bank_transaction', sa.Column('card_state', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('orig_currency', sa.String(length=10), nullable=True))
    op.add_column('bank_transaction', sa.Column('orig_amount', sa.Float(), nullable=True))
    op.add_column('bank_transaction', sa.Column('payment_currency', sa.String(length=10), nullable=True))
    op.add_column('bank_transaction', sa.Column('total_amount', sa.Float(), nullable=True))
    op.add_column('bank_transaction', sa.Column('exchange_rate', sa.Float(), nullable=True))
    op.add_column('bank_transaction', sa.Column('fee', sa.Float(), nullable=True))
    op.add_column('bank_transaction', sa.Column('fee_currency', sa.String(length=10), nullable=True))
    op.add_column('bank_transaction', sa.Column('account', sa.String(length=100), nullable=True))
    op.add_column('bank_transaction', sa.Column('beneficiary_account_number', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('beneficiary_sort_code', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('beneficiary_iban', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('beneficiary_bic', sa.String(length=50), nullable=True))
    op.add_column('bank_transaction', sa.Column('mcc', sa.String(length=20), nullable=True))
    op.add_column('bank_transaction', sa.Column('related_transaction_id', sa.String(length=100), nullable=True))
    op.add_column('bank_transaction', sa.Column('spend_program', sa.String(length=200), nullable=True))


def downgrade():
    # Remove all Revolut export columns from bank_transaction table
    op.drop_column('bank_transaction', 'spend_program')
    op.drop_column('bank_transaction', 'related_transaction_id')
    op.drop_column('bank_transaction', 'mcc')
    op.drop_column('bank_transaction', 'beneficiary_bic')
    op.drop_column('bank_transaction', 'beneficiary_iban')
    op.drop_column('bank_transaction', 'beneficiary_sort_code')
    op.drop_column('bank_transaction', 'beneficiary_account_number')
    op.drop_column('bank_transaction', 'account')
    op.drop_column('bank_transaction', 'fee_currency')
    op.drop_column('bank_transaction', 'fee')
    op.drop_column('bank_transaction', 'exchange_rate')
    op.drop_column('bank_transaction', 'total_amount')
    op.drop_column('bank_transaction', 'payment_currency')
    op.drop_column('bank_transaction', 'orig_amount')
    op.drop_column('bank_transaction', 'orig_currency')
    op.drop_column('bank_transaction', 'card_state')
    op.drop_column('bank_transaction', 'card_label')
    op.drop_column('bank_transaction', 'card_number')
    op.drop_column('bank_transaction', 'payer')
    op.drop_column('bank_transaction', 'state')
    op.drop_column('bank_transaction', 'transaction_id')
    op.drop_column('bank_transaction', 'date_completed_dublin')
    op.drop_column('bank_transaction', 'date_started_dublin')
    op.drop_column('bank_transaction', 'date_completed_utc')
    op.drop_column('bank_transaction', 'date_started_utc')
