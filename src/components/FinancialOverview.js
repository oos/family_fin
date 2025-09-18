import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FinancialOverview = ({ 
  type, // 'loans' or 'accounts'
  items, // loans or accounts array
  balances, // balance entries array
  title,
  icon,
  colorClass,
  borderClass,
  showHistory = true, // New prop to control history functionality
  showViewButton = false // New prop to show view button instead
}) => {
  const [expandedItems, setExpandedItems] = useState({});
  const navigate = useNavigate();

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleViewClick = (itemId) => {
    const item = items.find(i => i.id === itemId);
    const itemName = item ? encodeURIComponent(item.loan_name || item.account_name) : '';
    
    if (type === 'loans') {
      navigate(`/user-loans?tab=${itemName}`);
    } else if (type === 'accounts') {
      navigate(`/user-accounts?tab=${itemName}`);
    }
  };

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

  const getBestEverComparison = (itemId) => {
    const itemBalances = balances.filter(b => 
      type === 'loans' ? b.loan_id === itemId : b.account_id === itemId
    ).sort((a, b) => new Date(b.date_entered) - new Date(a.date_entered));
    
    if (itemBalances.length === 0) return null;
    
    // Find the best balance (highest)
    const bestBalance = itemBalances.reduce((best, current) => 
      current.balance > best.balance ? current : best
    );
    
    // Get the most recent balance
    const currentBalance = itemBalances[0];
    
    return currentBalance.balance - bestBalance.balance;
  };

  const getHistoricalBalances = (itemId) => {
    return balances.filter(b => 
      type === 'loans' ? b.loan_id === itemId : b.account_id === itemId
    ).sort((a, b) => new Date(b.date_entered) - new Date(a.date_entered));
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

  const formatComparison = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return { value: '-', isPositive: false, isNegative: false, isZero: true };
    }
    const formatted = new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      signDisplay: 'always'
    }).format(amount);
    
    return {
      value: formatted,
      isPositive: amount > 0,
      isNegative: amount < 0,
      isZero: amount === 0
    };
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-3">
        {title && (
          <h4 style={{ color: colorClass === 'text-danger' ? '#dc3545' : '#28a745', marginBottom: '10px' }}>
            <span className="me-2" style={{ fontSize: '1.2em' }}>
              {type === 'loans' ? '💳' : '🏦'}
            </span>
            {title}
          </h4>
        )}
        <div className="empty-state">
          <div className="empty-state-icon mb-2">
            <div className="icon-placeholder" style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: colorClass === 'text-danger' ? '#f8d7da' : '#d1edff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <span style={{
                fontSize: '24px',
                color: colorClass === 'text-danger' ? '#dc3545' : '#28a745'
              }}>
                {type === 'loans' ? '💳' : '🏦'}
              </span>
            </div>
          </div>
          <h5 className="text-muted mb-1">No {type} available</h5>
          <p className="text-muted mb-0">
            {type === 'loans' 
              ? 'No loans have been set up yet. Contact an administrator to add loan accounts.'
              : 'No bank accounts have been set up yet. Contact an administrator to add business accounts.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h4 style={{ color: colorClass === 'text-danger' ? '#dc3545' : '#28a745', marginBottom: '10px' }}>
          <span className="me-2" style={{ fontSize: '1.2em' }}>
            {type === 'loans' ? '💳' : '🏦'}
          </span>
          {title}
        </h4>
      )}
      <div className="row">
        {items.map((item) => {
          const currentBalance = getCurrentBalance(item.id);
          const lastUpdated = getLastUpdated(item.id);
          const balanceCount = getBalanceCount(item.id);
          const bestEverComparison = getBestEverComparison(item.id);
          const comparison = formatComparison(bestEverComparison);
          
          // Calculate column size based on number of items to fit all on one row
          const colSize = items.length <= 2 ? 'col-md-6' : 
                         items.length <= 3 ? 'col-md-4' : 
                         items.length <= 4 ? 'col-md-3' : 
                         items.length <= 6 ? 'col-md-2' : 'col-md-1';
          
          return (
            <div key={item.id} className={`${colSize} mb-2`}>
              <div className={`card h-100 border-start border-4 ${borderClass}`}>
                <div className="card-body py-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className={`card-title ${colorClass} mb-0`}>
                      {type === 'loans' ? item.loan_name : `${item.account_name} (${item.account_number ? item.account_number.slice(-3) : ''})`}
                    </h6>
                    {showViewButton && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleViewClick(item.id)}
                        style={{ 
                          fontSize: '0.8rem',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          minWidth: '80px'
                        }}
                      >
                        View
                      </button>
                    )}
                  </div>
                  <hr className="my-1" />
                  <div className="mb-1">
                    <small className="text-muted">Current Balance: <span className={`fw-bold ${currentBalance ? colorClass : 'text-muted'}`}>
                      {currentBalance ? formatCurrency(currentBalance) : 'Not set'}
                    </span></small>
                  </div>
                  {lastUpdated && (
                    <div className="mb-1">
                      <small className="text-muted">Last updated: {new Date(lastUpdated).toLocaleDateString()}</small>
                    </div>
                  )}
                  {bestEverComparison !== null && (
                    <div className="mb-1">
                      <small className="text-muted">Better/Worse: <span className={`fw-bold ${
                        comparison.isPositive ? 'text-success' : 
                        comparison.isNegative ? 'text-danger' : 
                        'text-warning'
                      }`}>
                        {comparison.value}
                      </span></small>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <small className="text-muted">Entries: <span className={`badge ${colorClass === 'text-danger' ? 'bg-danger' : 'bg-success'}`}>
                        {balanceCount}
                      </span></small>
                    </div>
                  </div>
                  
                </div>
              </div>
              
              {/* Historical Data Table */}
              {expandedItems[item.id] && showHistory && (
                <div className="mt-3">
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">Historical Balance Data</h6>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table table-sm table-striped mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Date</th>
                              <th>Balance</th>
                              <th>Currency</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getHistoricalBalances(item.id).map((balance, index) => (
                              <tr key={balance.id || index}>
                                <td>{new Date(balance.date_entered).toLocaleDateString()}</td>
                                <td className={colorClass}>
                                  {formatCurrency(balance.balance)}
                                </td>
                                <td>{balance.currency || 'EUR'}</td>
                                <td>{balance.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FinancialOverview;
