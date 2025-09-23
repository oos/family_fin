import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency, getChartConfig } from '../utils/chartConfig';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function Loans() {
  const [loans, setLoans] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanSchedule, setLoanSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [ercEntries, setErcEntries] = useState([]);
  const [showErcModal, setShowErcModal] = useState(false);
  const [editingErc, setEditingErc] = useState(null);
  const [ercFormData, setErcFormData] = useState({
    start_date: '',
    end_date: '',
    erc_rate: '',
    description: ''
  });
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    actual_payment: '',
    lump_sum_payment: '',
    payment_date: '',
    notes: ''
  });
  const [formData, setFormData] = useState({
    property_id: '',
    loan_name: '',
    lender: '',
    loan_type: 'mortgage',
    principal_amount: '',
    interest_rate: '',
    term_years: '',
    start_date: '',
    current_balance: '',
    is_active: true,
    regular_overpayment: '',
    overpayment_start_month: '1',
    overpayment_end_month: '',
    max_extra_payment: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Update selectedLoan when loans array changes (e.g., after update)
  useEffect(() => {
    if (selectedLoan && loans.length > 0) {
      const updatedLoan = loans.find(loan => loan.id === selectedLoan.id);
      if (updatedLoan) {
        setSelectedLoan(updatedLoan);
      }
    }
  }, [loans, selectedLoan]);

  // Cleanup modal class when component unmounts
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching loans data...');
      const [loansRes, propertiesRes] = await Promise.all([
        axios.get('/api/loans'),
        axios.get('/api/properties')
      ]);
      console.log('Loans fetched:', loansRes.data.length, 'loans');
      setLoans(loansRes.data);
      setProperties(propertiesRes.data);
    } catch (err) {
      setError('Failed to load loans data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanSchedule = async (loanId) => {
    try {
      // Get the full loan term in months
      const loan = loans.find(l => l.id === parseInt(loanId));
      if (loan) {
        const totalMonths = loan.term_years * 12;
        const response = await axios.get(`/loans/${loanId}/schedule?months=${totalMonths}`);
        console.log('Schedule response:', response.data);
        setLoanSchedule(response.data.schedule);
      }
    } catch (err) {
      console.error('Failed to load loan schedule:', err);
    }
  };

  const handleLoanSelect = (loanId) => {
    const loan = loans.find(l => l.id === parseInt(loanId));
    if (loan) {
      setSelectedLoan(loan);
      setSelectedLoanId(loanId);
      fetchLoanSchedule(loanId);
      fetchErcEntries(loanId);
      fetchPaymentRecords(loanId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.loan_name || !formData.lender || !formData.principal_amount || !formData.interest_rate || !formData.term_years || !formData.start_date) {
        setError('Please fill in all required fields');
        return;
      }

      const data = {
        ...formData,
        property_id: formData.property_id || null,
        principal_amount: parseFloat(formData.principal_amount) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        term_years: parseInt(formData.term_years) || 0,
        start_date: formData.start_date,
        current_balance: parseFloat(formData.current_balance) || parseFloat(formData.principal_amount) || 0,
        regular_overpayment: parseFloat(formData.regular_overpayment) || 0,
        overpayment_start_month: parseInt(formData.overpayment_start_month) || 1,
        overpayment_end_month: formData.overpayment_end_month ? parseInt(formData.overpayment_end_month) : null,
        max_extra_payment: parseFloat(formData.max_extra_payment) || 0
      };

      if (editingLoan) {
        await axios.put(`/loans/${editingLoan.id}`, data);
      } else {
        await axios.post('/api/loans', data);
      }
      
      setShowModal(false);
      setEditingLoan(null);
      resetForm();
      setError('');
      document.body.classList.remove('modal-open');
      console.log('Update successful, refreshing data...');
      await fetchData();
      console.log('Data refreshed after update');
    } catch (err) {
      console.error('Error saving loan:', err);
      setError(`Failed to save loan: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setError('');
    setFormData({
      property_id: loan.property_id || '',
      loan_name: loan.loan_name,
      lender: loan.lender,
      loan_type: loan.loan_type,
      principal_amount: loan.principal_amount.toString(),
      interest_rate: loan.interest_rate.toString(),
      term_years: loan.term_years.toString(),
      start_date: loan.start_date || '',
      current_balance: loan.current_balance.toString(),
      is_active: loan.is_active,
      regular_overpayment: loan.regular_overpayment ? loan.regular_overpayment.toString() : '',
      overpayment_start_month: loan.overpayment_start_month ? loan.overpayment_start_month.toString() : '1',
      overpayment_end_month: loan.overpayment_end_month ? loan.overpayment_end_month.toString() : '',
      max_extra_payment: loan.max_extra_payment ? loan.max_extra_payment.toString() : '',
      erc_rate: loan.erc_rate ? loan.erc_rate.toString() : '',
      erc_end_date: loan.erc_end_date || ''
    });
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        await axios.delete(`/loans/${id}`);
        fetchData();
        if (selectedLoan && selectedLoan.id === id) {
          setSelectedLoan(null);
          setLoanSchedule([]);
        }
      } catch (err) {
        setError('Failed to delete loan');
        console.error(err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingLoan(null);
    resetForm();
    setError('');
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

  const resetForm = () => {
    setFormData({
      property_id: '',
      loan_name: '',
      lender: '',
      loan_type: 'mortgage',
      principal_amount: '',
      interest_rate: '',
      term_years: '',
      start_date: '',
      current_balance: '',
      is_active: true,
      regular_overpayment: '',
      overpayment_start_month: '1',
      overpayment_end_month: '',
      max_extra_payment: '',
      erc_rate: '',
      erc_end_date: ''
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLoan(null);
    resetForm();
    document.body.classList.remove('modal-open');
  };

  // ERC Management Functions
  const fetchErcEntries = async (loanId) => {
    try {
      const response = await axios.get(`/loans/${loanId}/erc`);
      setErcEntries(response.data);
    } catch (err) {
      console.error('Error fetching ERC entries:', err);
    }
  };

  const handleAddErc = () => {
    setEditingErc(null);
    setErcFormData({
      start_date: '',
      end_date: '',
      erc_rate: '',
      description: ''
    });
    setShowErcModal(true);
  };

  const handleEditErc = (erc) => {
    setEditingErc(erc);
    setErcFormData({
      start_date: erc.start_date,
      end_date: erc.end_date,
      erc_rate: erc.erc_rate.toString(),
      description: erc.description || ''
    });
    setShowErcModal(true);
  };

  const handleErcSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        start_date: ercFormData.start_date,
        end_date: ercFormData.end_date,
        erc_rate: parseFloat(ercFormData.erc_rate),
        description: ercFormData.description
      };

      if (editingErc) {
        await axios.put(`/erc/${editingErc.id}`, data);
      } else {
        await axios.post(`/loans/${selectedLoan.id}/erc`, data);
      }
      
      setShowErcModal(false);
      setEditingErc(null);
      setErcFormData({
        start_date: '',
        end_date: '',
        erc_rate: '',
        description: ''
      });
      await fetchErcEntries(selectedLoan.id);
    } catch (err) {
      console.error('Error saving ERC entry:', err);
      setError(`Failed to save ERC entry: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteErc = async (ercId) => {
    if (window.confirm('Are you sure you want to delete this ERC entry?')) {
      try {
        await axios.delete(`/erc/${ercId}`);
        await fetchErcEntries(selectedLoan.id);
      } catch (err) {
        console.error('Error deleting ERC entry:', err);
        setError(`Failed to delete ERC entry: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleCloseErcModal = () => {
    setShowErcModal(false);
    setEditingErc(null);
    setErcFormData({
      start_date: '',
      end_date: '',
      erc_rate: '',
      description: ''
    });
  };

  // Payment Management Functions
  const fetchPaymentRecords = async (loanId) => {
    try {
      const response = await axios.get(`/loans/${loanId}/payments`);
      setPaymentRecords(response.data);
    } catch (err) {
      console.error('Error fetching payment records:', err);
    }
  };

  const handleEditPayment = (month, payment) => {
    setEditingPayment({ month, payment });
    setPaymentFormData({
      actual_payment: payment?.actual_payment?.toString() || '',
      lump_sum_payment: payment?.lump_sum_payment?.toString() || '0',
      payment_date: payment?.payment_date || '',
      notes: payment?.notes || ''
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        month: editingPayment.month,
        actual_payment: paymentFormData.actual_payment ? parseFloat(paymentFormData.actual_payment) : null,
        lump_sum_payment: parseFloat(paymentFormData.lump_sum_payment) || 0,
        payment_date: paymentFormData.payment_date || null,
        notes: paymentFormData.notes
      };

      if (editingPayment.payment) {
        // Update existing payment
        await axios.put(`/payments/${editingPayment.payment.id}`, data);
      } else {
        // Create new payment record
        await axios.post(`/loans/${selectedLoan.id}/payments`, data);
      }
      
      setEditingPayment(null);
      setPaymentFormData({
        actual_payment: '',
        lump_sum_payment: '',
        payment_date: '',
        notes: ''
      });
      await fetchPaymentRecords(selectedLoan.id);
      await fetchLoanSchedule(selectedLoan.id); // Recalculate schedule
    } catch (err) {
      console.error('Error saving payment record:', err);
      setError(`Failed to save payment record: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleCancelPaymentEdit = () => {
    setEditingPayment(null);
    setPaymentFormData({
      actual_payment: '',
      lump_sum_payment: '',
      payment_date: '',
      notes: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading loans...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Loans</h1>
        <button className="btn btn-primary" onClick={handleAddNew}>
          Add New Loan
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* All Loans Table */}
      <div className="card mb-3">
        <h3>All Loans</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Loan Name</th>
              <th>Lender</th>
              <th>Property</th>
              <th>Type</th>
              <th>Principal</th>
              <th>Current Balance</th>
              <th>Interest Rate</th>
              <th>Monthly Payment</th>
              <th>Term</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => {
              const property = properties.find(p => p.id === loan.property_id);
              return (
                <tr key={loan.id} style={{ cursor: 'pointer' }} onClick={() => handleLoanSelect(loan.id)}>
                  <td style={{ fontWeight: '600' }} className="db-data">{loan.loan_name}</td>
                  <td className="db-data">{loan.lender}</td>
                  <td className="db-data">{property ? property.nickname : 'N/A'}</td>
                  <td>
                    <span style={{
                      backgroundColor: loan.loan_type === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                      color: loan.loan_type === 'mortgage' ? '#1976d2' : '#7b1fa2',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {loan.loan_type}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="db-data">{formatCurrency(loan.principal_amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }} className="db-data">{formatCurrency(loan.current_balance)}</td>
                  <td style={{ textAlign: 'right' }} className="db-data">{loan.interest_rate}%</td>
                  <td style={{ textAlign: 'right', color: '#d32f2f', fontWeight: '600' }} className="calculated-data">{formatCurrency(loan.monthly_payment)}</td>
                  <td style={{ textAlign: 'right' }} className="db-data">{loan.term_years} years</td>
                  <td>
                    <span style={{
                      backgroundColor: loan.is_active ? '#e8f5e8' : '#ffebee',
                      color: loan.is_active ? '#2e7d32' : '#c62828',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {loan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(loan);
                        }}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(loan.id);
                        }}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Loan Selector for Details View */}
      <div className="card mb-3">
        <div className="d-flex gap-3 align-items-center flex-wrap">
          <div style={{ minWidth: '300px' }}>
            <label htmlFor="loan-select" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Select Loan to View Detailed Schedule:
            </label>
            <select
              id="loan-select"
              key={loans.length} // Force re-render when loans change
              value={selectedLoanId}
              onChange={(e) => handleLoanSelect(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Choose a loan to view detailed schedule...</option>
              {loans.map(loan => (
                <option key={loan.id} value={loan.id}>
                  {loan.loan_name} - {loan.lender} ({formatCurrency(loan.current_balance)} balance)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Full Width Loan Details */}
      {selectedLoan ? (
        <div className="card">
          <h3>{selectedLoan.loan_name} - Complete Payment Schedule</h3>
          
          {/* Loan Summary */}
          <div className="loan-summary-row" style={{ 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div className="loan-summary-item wide">
              <div className="loan-summary-label">Monthly Payment</div>
              <div className="loan-summary-value large" style={{ color: '#d32f2f' }}>
                {formatCurrency(selectedLoan.monthly_payment)}
              </div>
            </div>
            <div className="loan-summary-item wide">
              <div className="loan-summary-label">Current Balance</div>
              <div className="loan-summary-value large" style={{ color: '#1976d2' }}>
                {formatCurrency(selectedLoan.current_balance)}
              </div>
            </div>
            <div className="loan-summary-item">
              <div className="loan-summary-label">Interest Rate</div>
              <div className="loan-summary-value large" style={{ color: '#333' }}>
                {selectedLoan.interest_rate}%
              </div>
            </div>
            <div className="loan-summary-item">
              <div className="loan-summary-label">Term</div>
              <div className="loan-summary-value large" style={{ color: '#333' }}>
                {selectedLoan.term_years} years
              </div>
            </div>
            <div className="loan-summary-item">
              <div className="loan-summary-label">Lender</div>
              <div className="loan-summary-value medium" style={{ color: '#333' }}>
                {selectedLoan.lender}
              </div>
            </div>
            <div className="loan-summary-item">
              <div className="loan-summary-label">Property</div>
              <div className="loan-summary-value medium" style={{ color: '#333' }}>
                {selectedLoan.property_name || 'No property linked'}
              </div>
            </div>
            {selectedLoan.regular_overpayment > 0 && (
              <div className="loan-summary-item">
                <div className="loan-summary-label">Over-payment</div>
                <div className="loan-summary-value large" style={{ color: '#2196f3' }}>
                  {formatCurrency(selectedLoan.regular_overpayment)}/month
                </div>
              </div>
            )}
            {selectedLoan.max_extra_payment > 0 && (
              <div className="loan-summary-item">
                <div className="loan-summary-label">Max Extra Payment</div>
                <div className="loan-summary-value large" style={{ color: '#ff9800' }}>
                  {formatCurrency(selectedLoan.max_extra_payment)} before ERC
                </div>
              </div>
            )}
          </div>

          {/* ERC Management Section */}
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#856404' }}>Early Repayment Charge (ERC) Entries</h4>
              <button className="btn btn-primary btn-sm" onClick={handleAddErc}>
                Add ERC Entry
              </button>
            </div>
            
            {ercEntries.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No ERC entries configured for this loan.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>ERC Rate</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ercEntries.map((erc) => (
                      <tr key={erc.id}>
                        <td>{erc.description || 'N/A'}</td>
                        <td>{new Date(erc.start_date).toLocaleDateString()}</td>
                        <td>{new Date(erc.end_date).toLocaleDateString()}</td>
                        <td>{erc.erc_rate}%</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEditErc(erc)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteErc(erc.id)}
                            style={{ marginLeft: '5px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Schedule Chart - Full Term */}
          {loanSchedule.length > 0 ? (
            <div style={{ marginBottom: '30px' }}>
              <h4>Payment Breakdown - Complete Loan Term</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={loanSchedule} margin={getChartConfig().margin}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    {...getChartConfig().xAxis}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                    {...getChartConfig().yAxis}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="interest" fill="#ffc658" name="Interest" />
                  <Bar dataKey="principal" fill="#82ca9d" name="Principal" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <h4>Payment Breakdown - Complete Loan Term</h4>
              <p>No payment schedule data available. Please select a loan to view details.</p>
            </div>
          )}

          {/* Payment Schedule Table - Full Term */}
          {loanSchedule.length > 0 ? (
            <div>
              <h4>Complete Payment Schedule</h4>
              <div className="table-container" style={{ marginBottom: '20px' }}>
                <table className="table loan-schedule-table" style={{ 
                  margin: 0, 
                  minWidth: '100%',
                  tableLayout: 'fixed'
                }}>
                  <thead style={{ 
                    position: 'sticky', 
                    top: 0, 
                    backgroundColor: '#f8f9fa', 
                    zIndex: 1 
                  }}>
                    <tr>
                      <th style={{ width: '5%', minWidth: '50px' }}><span>Month</span></th>
                      <th style={{ width: '10%', minWidth: '90px' }}><span>Due Date</span></th>
                      <th style={{ width: '10%', minWidth: '90px' }}><span>Base<br/>Payment</span></th>
                      <th style={{ width: '8%', minWidth: '70px' }}><span>Over-<br/>payment</span></th>
                      <th style={{ width: '6%', minWidth: '60px' }}><span>ERC</span></th>
                      <th style={{ width: '10%', minWidth: '90px' }}><span>Total<br/>Payment</span></th>
                      <th style={{ width: '10%', minWidth: '90px' }}><span>Interest</span></th>
                      <th style={{ width: '10%', minWidth: '90px' }}><span>Principal</span></th>
                      <th style={{ width: '10%', minWidth: '90px' }}><span>Balance</span></th>
                      <th style={{ width: '12%', minWidth: '100px' }}><span>Cumulative<br/>Interest</span></th>
                      <th style={{ width: '7%', minWidth: '60px' }}><span>Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanSchedule.map((payment, index) => {
                      const cumulativeInterest = loanSchedule
                        .slice(0, index + 1)
                        .reduce((sum, p) => sum + p.interest, 0);
                      
                      // Determine payment status
                      const today = new Date();
                      const paymentDate = payment.payment_due_date ? new Date(payment.payment_due_date) : null;
                      const isOverdue = paymentDate && paymentDate < today;
                      const isCurrent = paymentDate && paymentDate.toDateString() === today.toDateString();
                      
                      return (
                        <tr key={index} style={{
                          backgroundColor: isOverdue ? '#ffebee' : isCurrent ? '#e8f5e8' : 'transparent',
                          borderLeft: isOverdue ? '4px solid #f44336' : isCurrent ? '4px solid #4caf50' : '4px solid transparent'
                        }}>
                          <td style={{ textAlign: 'center', fontWeight: '500' }}>{payment.month}</td>
                          <td style={{ textAlign: 'center', fontWeight: '500', fontSize: '12px' }}>
                            {payment.payment_due_date ? new Date(payment.payment_due_date).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: '2-digit' 
                            }) : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>
                            {formatCurrency(payment.base_payment || payment.payment)}
                          </td>
                          <td style={{ 
                            color: '#2196f3', 
                            textAlign: 'right',
                            fontWeight: '500'
                          }}>
                            {formatCurrency(payment.overpayment || 0)}
                          </td>
                          <td style={{ 
                            color: '#f44336', 
                            textAlign: 'right',
                            fontWeight: '500'
                          }}>
                            {formatCurrency(payment.erc || 0)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>
                            {formatCurrency(payment.payment)}
                          </td>
                          <td style={{ 
                            color: '#ff9800', 
                            textAlign: 'right',
                            fontWeight: '500'
                          }}>
                            {formatCurrency(payment.interest)}
                          </td>
                          <td style={{ 
                            color: '#4caf50', 
                            textAlign: 'right',
                            fontWeight: '500'
                          }}>
                            {formatCurrency(payment.principal)}
                          </td>
                          <td style={{ 
                            textAlign: 'right',
                            fontWeight: '600',
                            color: payment.balance <= 0 ? '#28a745' : '#333'
                          }}>
                            {formatCurrency(payment.balance)}
                          </td>
                          <td style={{ 
                            textAlign: 'right',
                            fontWeight: '500',
                            color: '#6c757d'
                          }}>
                            {formatCurrency(cumulativeInterest)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                const existingPayment = paymentRecords.find(p => p.month === payment.month);
                                handleEditPayment(payment.month, existingPayment);
                              }}
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ 
                    backgroundColor: '#f8f9fa', 
                    fontWeight: '700',
                    borderTop: '2px solid #dee2e6'
                  }}>
                    <tr>
                      <td style={{ textAlign: 'center' }}>TOTAL</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + (p.base_payment || p.payment), 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#2196f3' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + (p.overpayment || 0), 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#f44336' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + (p.erc || 0), 0))}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + p.payment, 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ff9800' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + p.interest, 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#4caf50' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + p.principal, 0))}
                      </td>
                      <td style={{ textAlign: 'right', color: '#28a745' }}>
                        {formatCurrency(loanSchedule[loanSchedule.length - 1]?.balance || 0)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#6c757d' }}>
                        {formatCurrency(loanSchedule.reduce((sum, p) => sum + p.interest, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <h4>Complete Payment Schedule</h4>
              <p>No payment schedule data available. Please select a loan to view details.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
          <h3>Select a Loan</h3>
          <p>Choose a loan from the dropdown above to view its complete payment schedule and details.</p>
        </div>
      )}

      {/* Add/Edit Loan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal();
          }
        }}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLoan ? 'Edit Loan' : 'Add New Loan'}</h2>
              <button className="close" onClick={handleCloseModal}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1000 }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '15px' 
                }}>
                  <div className="form-group">
                  <label htmlFor="loan_name">Loan Name</label>
                  <input
                    type="text"
                    id="loan_name"
                    value={formData.loan_name}
                    onChange={(e) => setFormData({ ...formData, loan_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lender">Lender</label>
                  <input
                    type="text"
                    id="lender"
                    value={formData.lender}
                    onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="loan_type">Loan Type</label>
                  <select
                    id="loan_type"
                    value={formData.loan_type}
                    onChange={(e) => setFormData({ ...formData, loan_type: e.target.value })}
                  >
                    <option value="mortgage">Mortgage</option>
                    <option value="interest_only">Interest Only</option>
                    <option value="personal">Personal Loan</option>
                    <option value="business">Business Loan</option>
                    <option value="credit_line">Credit Line</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="property_id">Property (Optional)</label>
                  <select
                    id="property_id"
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  >
                    <option value="">No property linked</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.nickname} - {property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="principal_amount">Principal Amount (€)</label>
                  <input
                    type="number"
                    id="principal_amount"
                    value={formData.principal_amount}
                    onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                    required
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="interest_rate">Interest Rate (%)</label>
                  <input
                    type="number"
                    id="interest_rate"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    required
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="term_years">Term (Years)</label>
                  <input
                    type="number"
                    id="term_years"
                    value={formData.term_years}
                    onChange={(e) => setFormData({ ...formData, term_years: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="start_date">Start Date</label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="current_balance">Current Balance (€)</label>
                  <input
                    type="number"
                    id="current_balance"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Active Loan
                  </label>
                </div>
                
                {/* Over-payment Fields */}
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Over-payment Settings</h4>
                  <div className="form-group">
                    <label htmlFor="regular_overpayment">Regular Over-payment (€)</label>
                    <input
                      type="number"
                      id="regular_overpayment"
                      value={formData.regular_overpayment}
                      onChange={(e) => setFormData({ ...formData, regular_overpayment: e.target.value })}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="overpayment_start_month">Start Month</label>
                    <input
                      type="number"
                      id="overpayment_start_month"
                      value={formData.overpayment_start_month}
                      onChange={(e) => setFormData({ ...formData, overpayment_start_month: e.target.value })}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="overpayment_end_month">End Month (Optional)</label>
                    <input
                      type="number"
                      id="overpayment_end_month"
                      value={formData.overpayment_end_month}
                      onChange={(e) => setFormData({ ...formData, overpayment_end_month: e.target.value })}
                      min="1"
                      placeholder="Leave empty for indefinite"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="max_extra_payment">Max Extra Payment Before ERC (€)</label>
                    <input
                      type="number"
                      id="max_extra_payment"
                      value={formData.max_extra_payment}
                      onChange={(e) => setFormData({ ...formData, max_extra_payment: e.target.value })}
                      step="0.01"
                      min="0"
                      placeholder="0"
                    />
                    <small className="form-text">Maximum extra payment allowed before ERC charges apply</small>
                  </div>
                  </div>
                  
                  {/* ERC Fields - Now handled separately in loan details */}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                  >
                    {editingLoan ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ERC Modal */}
      {showErcModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingErc ? 'Edit ERC Entry' : 'Add New ERC Entry'}</h3>
              <button onClick={handleCloseErcModal} className="btn-close">&times;</button>
            </div>
            <form onSubmit={handleErcSubmit} className="modal-body">
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={ercFormData.description}
                  onChange={(e) => setErcFormData({...ercFormData, description: e.target.value})}
                  placeholder="e.g., Year 1, Year 2, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={ercFormData.start_date}
                  onChange={(e) => setErcFormData({...ercFormData, start_date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={ercFormData.end_date}
                  onChange={(e) => setErcFormData({...ercFormData, end_date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>ERC Rate (%) *</label>
                <input
                  type="number"
                  value={ercFormData.erc_rate}
                  onChange={(e) => setErcFormData({...ercFormData, erc_rate: e.target.value})}
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="5.00"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseErcModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingErc ? 'Update' : 'Add'} ERC Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Edit Modal */}
      {editingPayment && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Payment - Month {editingPayment.month}</h3>
              <button onClick={handleCancelPaymentEdit} className="btn-close">&times;</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="modal-body">
              <div className="form-group">
                <label>Actual Payment Amount (€)</label>
                <input
                  type="number"
                  value={paymentFormData.actual_payment}
                  onChange={(e) => setPaymentFormData({...paymentFormData, actual_payment: e.target.value})}
                  step="0.01"
                  min="0"
                  placeholder="Enter actual amount paid"
                />
                <small className="form-text">Leave empty to use calculated amount</small>
              </div>

              <div className="form-group">
                <label>Lump Sum Payment (€)</label>
                <input
                  type="number"
                  value={paymentFormData.lump_sum_payment}
                  onChange={(e) => setPaymentFormData({...paymentFormData, lump_sum_payment: e.target.value})}
                  step="0.01"
                  min="0"
                  placeholder="0"
                />
                <small className="form-text">Additional payment that reduces principal</small>
              </div>

              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentFormData.payment_date}
                  onChange={(e) => setPaymentFormData({...paymentFormData, payment_date: e.target.value})}
                />
                <small className="form-text">When this payment was actually made</small>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                  placeholder="Additional notes about this payment"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancelPaymentEdit} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPayment.payment ? 'Update' : 'Save'} Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Loans;
