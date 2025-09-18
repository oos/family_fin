import React, { useState } from 'react';

const IndividualItemHistory = ({ 
  type, // 'loans' or 'accounts'
  item, // single loan or account object
  balances, // balance entries array
  title,
  colorClass,
  onEditBalance, // function to handle editing a balance entry
  onDeleteBalance // function to handle deleting a balance entry
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Show by default
  const [showAllHistory, setShowAllHistory] = useState(false); // Show only last 8 by default
  const [sortField, setSortField] = useState('date_entered');
  const [sortDirection, setSortDirection] = useState('desc');

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getHistoricalBalances = (itemId) => {
    const filteredBalances = balances.filter(b => 
      type === 'loans' ? b.loan_id === itemId : b.account_id === itemId
    );
    
    const sortedBalances = filteredBalances.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'date_entered':
          aValue = new Date(a.date_entered);
          bValue = new Date(b.date_entered);
          break;
        case 'balance':
          aValue = parseFloat(a.balance);
          bValue = parseFloat(b.balance);
          break;
        case 'currency':
          aValue = (a.currency || 'EUR').toLowerCase();
          bValue = (b.currency || 'EUR').toLowerCase();
          break;
        case 'notes':
          aValue = (a.notes || '').toLowerCase();
          bValue = (b.notes || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Show only last 8 entries by default, or all if showAllHistory is true
    if (!showAllHistory && sortedBalances.length > 8) {
      return sortedBalances.slice(0, 8);
    }
    
    return sortedBalances;
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

  const currentBalance = getCurrentBalance(item.id);
  const lastUpdated = getLastUpdated(item.id);
  const balanceCount = getBalanceCount(item.id);
  const historicalBalances = getHistoricalBalances(item.id);

  return (
    <div>
      <style jsx>{`
        .sortable:hover {
          background-color: #f8f9fa !important;
        }
        .sortable i {
          transition: color 0.2s ease;
        }
        .sortable:hover i {
          color: #007bff !important;
        }
      `}</style>
      {title && (
        <h6 className="mb-3">{title}</h6>
      )}
      
      {/* Historical Data Table - Always shown by default */}
      {historicalBalances.length > 0 && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <h6 className="mb-0">Historical Balance Data</h6>
              <span className={`badge ${colorClass === 'text-danger' ? 'bg-danger' : 'bg-success'}`}>
                {balanceCount} entries
              </span>
            </div>
                    <div className="d-flex align-items-center gap-2">
                      <button 
                        className={`btn ${colorClass === 'text-danger' ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} me-2`}></i>
                        {isExpanded ? 'Hide History' : 'Show History'}
                      </button>
                    </div>
          </div>
          {isExpanded && (
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('date_entered')}
                        className="sortable"
                      >
                        Date
                        {sortField === 'date_entered' && (
                          <span className="ms-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                        {sortField !== 'date_entered' && (
                          <span className="ms-2 text-muted">↕️</span>
                        )}
                      </th>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('balance')}
                        className="sortable"
                      >
                        Balance
                        {sortField === 'balance' && (
                          <span className="ms-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                        {sortField !== 'balance' && (
                          <span className="ms-2 text-muted">↕️</span>
                        )}
                      </th>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('currency')}
                        className="sortable"
                      >
                        Currency
                        {sortField === 'currency' && (
                          <span className="ms-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                        {sortField !== 'currency' && (
                          <span className="ms-2 text-muted">↕️</span>
                        )}
                      </th>
                      <th 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('notes')}
                        className="sortable"
                      >
                        Notes
                        {sortField === 'notes' && (
                          <span className="ms-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                        {sortField !== 'notes' && (
                          <span className="ms-2 text-muted">↕️</span>
                        )}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalBalances.map((balance, index) => (
                      <tr key={balance.id || index}>
                        <td>{new Date(balance.date_entered).toLocaleDateString()}</td>
                        <td className={colorClass}>
                          {formatCurrency(balance.balance)}
                        </td>
                        <td>{balance.currency || 'EUR'}</td>
                        <td>{balance.notes || '-'}</td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => onEditBalance && onEditBalance(balance)}
                              title="Edit Balance Entry"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => onDeleteBalance && onDeleteBalance(balance)}
                              title="Delete Balance Entry"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {historicalBalances.length === 0 && (
        <div className="text-center py-4">
          <div className="text-muted mb-2" style={{ fontSize: '2rem' }}>📊</div>
          <p className="text-muted">No balance entries yet.</p>
        </div>
      )}
    </div>
  );
};

export default IndividualItemHistory;
