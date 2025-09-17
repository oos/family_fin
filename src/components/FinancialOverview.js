import React from 'react';

const FinancialOverview = ({ 
  type, // 'loans' or 'accounts'
  items, // loans or accounts array
  balances, // balance entries array
  title,
  icon,
  colorClass,
  borderClass
}) => {
  const getCurrentBalance = (itemId) => {
    const balance = balances.find(b => 
      type === 'loans' ? b.loan_id === itemId : b.account_id === itemId
    );
    return balance ? balance.balance : 0;
  };

  const getLastUpdated = (itemId) => {
    const balance = balances.find(b => 
      type === 'loans' ? b.loan_id === itemId : b.account_id === itemId
    );
    return balance ? balance.date_entered : null;
  };

  const getBalanceCount = (itemId) => {
    return balances.filter(b => 
      type === 'loans' ? b.loan_id === itemId : b.account_id === itemId
    ).length;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'Not set';
    }
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (!items || items.length === 0) {
    return (
      <div className="col-md-6">
        <h4 style={{ color: colorClass === 'text-danger' ? '#dc3545' : '#28a745', marginBottom: '15px' }}>
          <i className={`fas ${icon} me-2`}></i>{title}
        </h4>
        <p className="text-muted">No {type} available</p>
      </div>
    );
  }

  return (
    <div className="col-md-6">
      <h4 style={{ color: colorClass === 'text-danger' ? '#dc3545' : '#28a745', marginBottom: '15px' }}>
        <i className={`fas ${icon} me-2`}></i>{title}
      </h4>
      <div className="row">
        {items.map((item) => {
          const currentBalance = getCurrentBalance(item.id);
          const lastUpdated = getLastUpdated(item.id);
          const balanceCount = getBalanceCount(item.id);
          
          return (
            <div key={item.id} className="col-md-6 col-lg-4 mb-3">
              <div className={`card h-100 border-start border-4 ${borderClass}`}>
                <div className="card-body">
                  <h6 className={`card-title ${colorClass}`}>
                    {type === 'loans' ? item.loan_name : item.account_name}
                  </h6>
                  <p className="card-text mb-1">
                    <small className="text-muted">
                      {type === 'loans' ? 'Lender:' : 'Account Number:'}
                    </small> {type === 'loans' ? item.lender : item.account_number}
                  </p>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">Current Balance:</small><br />
                      <span className={`fw-bold ${currentBalance ? colorClass : 'text-muted'}`}>
                        {currentBalance ? formatCurrency(currentBalance) : 'Not set'}
                      </span>
                    </div>
                    <div className="text-end">
                      <small className="text-muted">Entries:</small><br />
                      <span className={`badge ${colorClass === 'text-danger' ? 'bg-danger' : 'bg-success'}`}>
                        {balanceCount}
                      </span>
                    </div>
                  </div>
                  {lastUpdated && (
                    <div className="mt-2">
                      <small className="text-muted">
                        Last updated: {new Date(lastUpdated).toLocaleDateString()}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FinancialOverview;
