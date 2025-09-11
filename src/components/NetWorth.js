import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/chartConfig';

// Tooltip component
const Tooltip = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const elementRef = React.useRef(null);
  const timeoutRef = React.useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 10,
          left: rect.left + rect.width / 2
        });
      }
    }, 10);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      style={{ position: 'relative', display: 'inline-block', zIndex: 100000 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          transform: 'translateX(-50%)',
          backgroundColor: '#333',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 99999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          marginBottom: '5px',
          maxWidth: '300px',
          whiteSpace: 'normal'
        }}>
          {content}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent',
            borderTopColor: '#333',
            zIndex: 99999
          }}></div>
        </div>
      )}
    </div>
  );
};

function NetWorth() {
  const [people, setPeople] = useState([]);
  const [netWorthData, setNetWorthData] = useState({});
  const [loading, setLoading] = useState(true);
  const [netWorthLoading, setNetWorthLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCalculations, setShowCalculations] = useState({});

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/people');
      setPeople(response.data);
    } catch (err) {
      setError('Failed to load people');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllNetWorth = useCallback(async () => {
    try {
      setNetWorthLoading(true);
      
      const netWorthPromises = people.map(person =>
        axios.get(`/people/${person.id}/networth`)
          .then(response => ({ personId: person.id, data: response.data }))
          .catch(err => {
            console.error(`Failed to load net worth for ${person.name}:`, err);
            return { personId: person.id, data: null };
          })
      );

      const results = await Promise.all(netWorthPromises);
      const netWorthMap = {};
      results.forEach(result => {
        netWorthMap[result.personId] = result.data;
      });
      
      setNetWorthData(netWorthMap);
    } catch (err) {
      setError('Failed to load net worth data');
      console.error('Error in fetchAllNetWorth:', err);
    } finally {
      setNetWorthLoading(false);
    }
  }, [people]);

  useEffect(() => {
    fetchPeople();
  }, []);

  useEffect(() => {
    if (people.length > 0) {
      fetchAllNetWorth();
    }
  }, [people, fetchAllNetWorth]);

  const toggleCalculations = (personId) => {
    setShowCalculations(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }));
  };

  if (loading) {
    return <div className="loading">Loading people...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Net Worth Overview</h1>
        <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
          Comprehensive financial overview of all family members
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* All People Net Worth Table */}
      <div className="card">
        <h3>All People Net Worth Overview</h3>
        {netWorthLoading ? (
          <div className="loading">Loading net worth data for all people...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: '14px',
              minWidth: '1200px'
            }}>
              <thead style={{ position: 'relative', zIndex: 0 }}>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6', fontWeight: '600' }}>Person</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Total Net Worth</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Property Equity</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Business Value</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Total Assets</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Loan Liabilities</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Property Value</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Mortgages</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Annual Income</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Monthly Income</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map(person => {
                  const personNetWorth = netWorthData[person.id];
                  return (
                    <React.Fragment key={person.id}>
                      <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#333' }}>{person.name}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{person.relationship}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>
                              {person.is_director ? 'Director' : 'Non-Director'} • {person.is_deceased ? 'Deceased' : 'Active'}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content={`Total Net Worth = Total Assets - Total Liabilities = ${formatCurrency(personNetWorth.net_worth.assets.total_assets)} - ${formatCurrency(personNetWorth.net_worth.liabilities.total_liabilities)} = ${formatCurrency(personNetWorth.net_worth.total_net_worth)}`}>
                              <div style={{ 
                                fontWeight: '600', 
                                color: personNetWorth.net_worth.total_net_worth >= 0 ? '#28a745' : '#dc3545',
                                cursor: 'help'
                              }} className="calculated-data">
                                {formatCurrency(personNetWorth.net_worth.total_net_worth)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content={`Property Equity = Total Property Value - Total Mortgages = ${formatCurrency(personNetWorth.net_worth.property_details.total_property_value)} - ${formatCurrency(personNetWorth.net_worth.property_details.total_mortgages)} = ${formatCurrency(personNetWorth.net_worth.assets.property_equity)}`}>
                              <div style={{ fontWeight: '600', color: '#28a745', cursor: 'help' }} className="calculated-data">
                                {formatCurrency(personNetWorth.net_worth.assets.property_equity)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content="Business Value = Sum of all business account values (currently €0 as business accounts require additional data fields)">
                              <div style={{ fontWeight: '600', color: '#28a745', cursor: 'help' }} className="calculated-data">
                                {formatCurrency(personNetWorth.net_worth.assets.business_value)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content={`Total Assets = Property Equity + Business Value = ${formatCurrency(personNetWorth.net_worth.assets.property_equity)} + ${formatCurrency(personNetWorth.net_worth.assets.business_value)} = ${formatCurrency(personNetWorth.net_worth.assets.total_assets)}`}>
                              <div style={{ fontWeight: '600', color: '#155724', cursor: 'help' }} className="calculated-data">
                                {formatCurrency(personNetWorth.net_worth.assets.total_assets)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content="Loan Liabilities = Sum of all personal loans not tied to specific properties (includes personal loans, credit cards, etc.)">
                              <div style={{ fontWeight: '600', color: '#dc3545', cursor: 'help' }} className="calculated-data">
                                {formatCurrency(personNetWorth.net_worth.liabilities.loan_liabilities)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content="Total Property Value = Sum of all property values × individual ownership percentage for each property">
                              <div style={{ fontWeight: '600', color: '#6f42c1', cursor: 'help' }}>
                                {formatCurrency(personNetWorth.net_worth.property_details.total_property_value)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content="Total Mortgages = Sum of all mortgage balances × individual ownership percentage for each property">
                              <div style={{ fontWeight: '600', color: '#6f42c1', cursor: 'help' }}>
                                {formatCurrency(personNetWorth.net_worth.property_details.total_mortgages)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content="Annual Income = Sum of all income records for this person (salary, rental income, etc.)">
                              <div style={{ fontWeight: '600', color: '#6f42c1', cursor: 'help' }}>
                                {formatCurrency(personNetWorth.net_worth.income.total_annual_income)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {personNetWorth ? (
                            <Tooltip content={`Monthly Income = Annual Income ÷ 12 = ${formatCurrency(personNetWorth.net_worth.income.total_annual_income)} ÷ 12 = ${formatCurrency(personNetWorth.net_worth.income.monthly_income)}`}>
                              <div style={{ fontWeight: '600', color: '#6f42c1', cursor: 'help' }}>
                                {formatCurrency(personNetWorth.net_worth.income.monthly_income)}
                              </div>
                            </Tooltip>
                          ) : (
                            <span style={{ color: '#999' }}>Loading...</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => toggleCalculations(person.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              backgroundColor: showCalculations[person.id] ? '#dc3545' : '#007bff',
                              borderColor: showCalculations[person.id] ? '#dc3545' : '#007bff'
                            }}
                          >
                            {showCalculations[person.id] ? 'Hide' : 'Explain'}
                          </button>
                        </td>
                      </tr>
                      {showCalculations[person.id] && personNetWorth && (
                        <tr>
                          <td colSpan="10" style={{ padding: '0', border: 'none' }}>
                            <div style={{
                              backgroundColor: '#f8f9fa',
                              padding: '20px',
                              border: '1px solid #dee2e6',
                              borderTop: 'none',
                              margin: '0'
                            }}>
                              <h4 style={{ color: '#495057', marginBottom: '15px' }}>
                                Detailed Explanation for {person.name}
                              </h4>
                              
                              {/* Total Net Worth Calculation */}
                              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                                <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Total Net Worth Calculation</h5>
                                <div style={{ fontSize: '14px', color: '#495057', fontFamily: 'monospace' }}>
                                  <div><strong>Formula:</strong> Total Net Worth = Total Assets - Total Liabilities</div>
                                  <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                                    = {formatCurrency(personNetWorth.net_worth.assets.total_assets)} - {formatCurrency(personNetWorth.net_worth.liabilities.total_liabilities)}
                                  </div>
                                  <div style={{ marginLeft: '20px', fontWeight: 'bold', color: personNetWorth.net_worth.total_net_worth >= 0 ? '#28a745' : '#dc3545' }}>
                                    = {formatCurrency(personNetWorth.net_worth.total_net_worth)}
                                  </div>
                                </div>
                                
                                {/* Detailed Assets Breakdown */}
                                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                  <h6 style={{ color: '#495057', marginBottom: '8px' }}>📊 Total Assets Breakdown:</h6>
                                  <div style={{ marginLeft: '10px' }}>
                                    <div><strong>Property Equity:</strong> {formatCurrency(personNetWorth.net_worth.assets.property_equity)}</div>
                                    <div><strong>Business Value:</strong> {formatCurrency(personNetWorth.net_worth.assets.business_value)}</div>
                                    <div style={{ fontWeight: 'bold', borderTop: '1px solid #dee2e6', paddingTop: '5px', marginTop: '5px' }}>
                                      <strong>Total Assets:</strong> {formatCurrency(personNetWorth.net_worth.assets.total_assets)}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Detailed Liabilities Breakdown */}
                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                  <h6 style={{ color: '#495057', marginBottom: '8px' }}>💳 Total Liabilities Breakdown:</h6>
                                  <div style={{ marginLeft: '10px' }}>
                                    <div><strong>Loan Liabilities:</strong> {formatCurrency(personNetWorth.net_worth.liabilities.loan_liabilities)}</div>
                                    <div style={{ fontWeight: 'bold', borderTop: '1px solid #dee2e6', paddingTop: '5px', marginTop: '5px' }}>
                                      <strong>Total Liabilities:</strong> {formatCurrency(personNetWorth.net_worth.liabilities.total_liabilities)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Property Equity Calculation */}
                              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                                <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Property Equity Calculation</h5>
                                <div style={{ fontSize: '14px', color: '#495057', fontFamily: 'monospace' }}>
                                  <div><strong>Formula:</strong> Property Equity = Total Property Value - Total Mortgages</div>
                                  <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                                    = {formatCurrency(personNetWorth.net_worth.property_details.total_property_value)} - {formatCurrency(personNetWorth.net_worth.property_details.total_mortgages)}
                                  </div>
                                  <div style={{ marginLeft: '20px', fontWeight: 'bold', color: '#28a745' }}>
                                    = {formatCurrency(personNetWorth.net_worth.assets.property_equity)}
                                  </div>
                                </div>
                                
                                {/* Detailed Property Breakdown */}
                                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                  <h6 style={{ color: '#495057', marginBottom: '8px' }}>🏠 Individual Property Breakdown:</h6>
                                  {personNetWorth.net_worth.assets.breakdown?.properties?.map((prop, index) => (
                                    <div key={index} style={{ marginLeft: '10px', marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                      <div style={{ fontWeight: 'bold', color: '#495057' }}>{prop.property_name}</div>
                                      <div style={{ fontSize: '12px', color: '#666' }}>Ownership: {prop.ownership_percentage.toFixed(1)}%</div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                        <div>Value: {formatCurrency(prop.property_value)}</div>
                                        <div>Mortgage: {formatCurrency(prop.mortgage_balance)}</div>
                                        <div style={{ fontWeight: 'bold', color: prop.equity >= 0 ? '#28a745' : '#dc3545' }}>
                                          Equity: {formatCurrency(prop.equity)}
                                        </div>
                                      </div>
                                    </div>
                                  )) || <div style={{ color: '#666', fontStyle: 'italic' }}>No property ownership data available</div>}
                                </div>
                                
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                  <strong>Note:</strong> Property values and mortgages are calculated based on individual ownership percentages in each property.
                                </div>
                              </div>

                              {/* Total Assets Calculation */}
                              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                                <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Total Assets Calculation</h5>
                                <div style={{ fontSize: '14px', color: '#495057', fontFamily: 'monospace' }}>
                                  <div><strong>Formula:</strong> Total Assets = Property Equity + Business Value</div>
                                  <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                                    = {formatCurrency(personNetWorth.net_worth.assets.property_equity)} + {formatCurrency(personNetWorth.net_worth.assets.business_value)}
                                  </div>
                                  <div style={{ marginLeft: '20px', fontWeight: 'bold', color: '#155724' }}>
                                    = {formatCurrency(personNetWorth.net_worth.assets.total_assets)}
                                  </div>
                                </div>
                                
                                {/* Detailed Business Accounts Breakdown */}
                                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                  <h6 style={{ color: '#495057', marginBottom: '8px' }}>🏢 Business Accounts Breakdown:</h6>
                                  {personNetWorth.net_worth.assets.breakdown?.business_accounts?.map((account, index) => (
                                    <div key={index} style={{ marginLeft: '10px', marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                      <div style={{ fontWeight: 'bold', color: '#495057' }}>{account.account_name}</div>
                                      <div style={{ color: '#666' }}>Value: {formatCurrency(account.value)}</div>
                                      {account.note && <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>{account.note}</div>}
                                    </div>
                                  )) || <div style={{ color: '#666', fontStyle: 'italic' }}>No business account data available</div>}
                                </div>
                                
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                  <strong>Note:</strong> Business Value is currently €0 as it requires additional data fields in the business account model.
                                </div>
                              </div>

                              {/* Monthly Income Calculation */}
                              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                                <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Monthly Income Calculation</h5>
                                <div style={{ fontSize: '14px', color: '#495057', fontFamily: 'monospace' }}>
                                  <div><strong>Formula:</strong> Monthly Income = Annual Income ÷ 12</div>
                                  <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                                    = {formatCurrency(personNetWorth.net_worth.income.total_annual_income)} ÷ 12
                                  </div>
                                  <div style={{ marginLeft: '20px', fontWeight: 'bold', color: '#6f42c1' }}>
                                    = {formatCurrency(personNetWorth.net_worth.income.monthly_income)}
                                  </div>
                                </div>
                                
                                {/* Detailed Income Breakdown */}
                                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                  <h6 style={{ color: '#495057', marginBottom: '8px' }}>💰 Income Sources Breakdown:</h6>
                                  {personNetWorth.net_worth.income.breakdown?.map((income, index) => (
                                    <div key={index} style={{ marginLeft: '10px', marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                      <div style={{ fontWeight: 'bold', color: '#495057' }}>{income.source}</div>
                                      <div style={{ fontSize: '12px', color: '#666' }}>Category: {income.category}</div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                        <div>Annual: {formatCurrency(income.amount_yearly)}</div>
                                        <div>Monthly: {formatCurrency(income.amount_monthly)}</div>
                                      </div>
                                    </div>
                                  )) || <div style={{ color: '#666', fontStyle: 'italic' }}>No income data available</div>}
                                </div>
                                
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                  <strong>Note:</strong> Annual Income includes all income records for this person (salary, rental income, etc.).
                                </div>
                              </div>

                              {/* Detailed Liabilities Breakdown */}
                              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                                <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Loan Liabilities Breakdown</h5>
                                <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                  <h6 style={{ color: '#495057', marginBottom: '8px' }}>💳 Individual Loan Breakdown:</h6>
                                  {personNetWorth.net_worth.liabilities.breakdown?.map((loan, index) => (
                                    <div key={index} style={{ marginLeft: '10px', marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '3px', border: '1px solid #dee2e6' }}>
                                      <div style={{ fontWeight: 'bold', color: '#495057' }}>{loan.loan_name}</div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                                        <div>Balance: {formatCurrency(loan.current_balance)}</div>
                                        <div>Rate: {loan.interest_rate}%</div>
                                        <div>Monthly: {formatCurrency(loan.monthly_payment)}</div>
                                      </div>
                                    </div>
                                  )) || <div style={{ color: '#666', fontStyle: 'italic' }}>No loan data available</div>}
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                  <strong>Total Loan Liabilities:</strong> {formatCurrency(personNetWorth.net_worth.liabilities.loan_liabilities)}
                                </div>
                              </div>

                              {/* Summary */}
                              <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                                <h5 style={{ color: '#155724', marginBottom: '10px' }}>Financial Summary</h5>
                                <div style={{ fontSize: '14px', color: '#155724' }}>
                                  <div><strong>Total Net Worth:</strong> {formatCurrency(personNetWorth.net_worth.total_net_worth)}</div>
                                  <div><strong>Property Equity:</strong> {formatCurrency(personNetWorth.net_worth.assets.property_equity)}</div>
                                  <div><strong>Business Value:</strong> {formatCurrency(personNetWorth.net_worth.assets.business_value)}</div>
                                  <div><strong>Total Assets:</strong> {formatCurrency(personNetWorth.net_worth.assets.total_assets)}</div>
                                  <div><strong>Loan Liabilities:</strong> {formatCurrency(personNetWorth.net_worth.liabilities.loan_liabilities)}</div>
                                  <div><strong>Annual Income:</strong> {formatCurrency(personNetWorth.net_worth.income.total_annual_income)}</div>
                                  <div><strong>Monthly Income:</strong> {formatCurrency(personNetWorth.net_worth.income.monthly_income)}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default NetWorth;
