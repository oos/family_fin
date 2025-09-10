import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [newBooking, setNewBooking] = useState({
    property: '',
    check_in_date: '',
    check_out_date: '',
    estimated_income: '',
    phone_last_4: '',
    status: 'reserved'
  });

  // Filter states
  const [filters, setFilters] = useState({
    property: 'all',
    platform: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  // Property configurations with platform support
  const properties = {
    '2SA': {
      name: '2SA',
      platforms: {
        airbnb: {
          ical_url: 'https://www.airbnb.ie/calendar/ical/22496407.ics?s=6aa918400190498285df9f68c5df5218',
          listing_id: '22496407'
        },
        vrbo: {
          ical_url: '', // Add VRBO iCal URL when available
          listing_id: ''
        }
      }
    },
    '67RR': {
      name: '67RR, Bristol',
      platforms: {
        airbnb: {
          ical_url: 'https://www.airbnb.ie/calendar/ical/1502215720507817033.ics?s=21559ddeb970f0520b9b391424016830',
          listing_id: '1502215720507817033'
        },
        vrbo: {
          ical_url: '', // Add VRBO iCal URL when available
          listing_id: ''
        }
      }
    },
    '87HP': {
      name: '87HP',
      platforms: {
        airbnb: {
          ical_url: 'https://www.airbnb.ie/calendar/ical/28297094.ics?s=5a09d674a09e9e3c39d1e58fb2a7f702',
          listing_id: '28297094'
        },
        vrbo: {
          ical_url: '', // Add VRBO iCal URL when available
          listing_id: ''
        }
      }
    },
    '28LC': {
      name: '28LC',
      platforms: {
        airbnb: {
          ical_url: 'https://www.airbnb.ie/calendar/ical/23610282.ics?s=3e228c099087245f14d0716c7c5603d6',
          listing_id: '23610282'
        },
        vrbo: {
          ical_url: '', // Add VRBO iCal URL when available
          listing_id: ''
        }
      }
    }
  };

  useEffect(() => {
    // Auto-sync data when page loads
    const autoSync = async () => {
      try {
        setAutoSyncing(true);
        setLoading(true);
        
        // Sync all available platforms for all properties
        const syncPromises = [];
        
        Object.entries(properties).forEach(([propertyKey, property]) => {
          // Sync Airbnb if available
          if (property.platforms.airbnb.ical_url) {
            syncPromises.push(
              axios.post('/bookings/sync', {
                ical_url: property.platforms.airbnb.ical_url,
                listing_id: property.platforms.airbnb.listing_id,
                platform: 'airbnb',
                property_id: 1
              })
            );
          }
          
          // Sync VRBO if available
          if (property.platforms.vrbo.ical_url) {
            syncPromises.push(
              axios.post('/bookings/sync', {
                ical_url: property.platforms.vrbo.ical_url,
                listing_id: property.platforms.vrbo.listing_id,
                platform: 'vrbo',
                property_id: 1
              })
            );
          }
        });
        
        // Wait for all sync operations to complete
        if (syncPromises.length > 0) {
          await Promise.allSettled(syncPromises);
        }
        
        // After sync, fetch the updated bookings
        await fetchBookings();
      } catch (err) {
        console.error('Auto-sync failed:', err);
        // If auto-sync fails, still try to fetch existing data
        await fetchBookings();
      } finally {
        setAutoSyncing(false);
      }
    };
    
    autoSync();
  }, []);

  // Filter bookings when filters or bookings change
  useEffect(() => {
    applyFilters();
  }, [filters, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/bookings');
      if (response.data.success) {
        setBookings(response.data.bookings);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to fetch bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to bookings
  const applyFilters = () => {
    let filtered = [...bookings];

    // Filter by property
    if (filters.property !== 'all') {
      const property = properties[filters.property];
      const propertyListingIds = [
        property.platforms.airbnb.listing_id,
        property.platforms.vrbo.listing_id
      ].filter(id => id);
      filtered = filtered.filter(booking => 
        propertyListingIds.includes(booking.listing_id)
      );
    }

    // Filter by platform
    if (filters.platform !== 'all') {
      filtered = filtered.filter(booking => 
        booking.platform?.toLowerCase() === filters.platform.toLowerCase()
      );
    }

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(booking => 
        booking.status?.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(booking => 
        new Date(booking.check_in_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(booking => 
        new Date(booking.check_in_date) <= new Date(filters.dateTo)
      );
    }

    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.property_name?.toLowerCase().includes(searchTerm) ||
        booking.phone_last_4?.includes(searchTerm) ||
        booking.booking_uid?.toLowerCase().includes(searchTerm) ||
        booking.confirmation_code?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredBookings(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      property: 'all',
      platform: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const syncBookings = async () => {
    try {
      setSyncLoading(true);
      setSyncMessage('');
      
      const syncPromises = [];
      const results = [];
      
      // Sync all properties and platforms
      Object.entries(properties).forEach(([propertyKey, property]) => {
        // Sync Airbnb if available
        if (property.platforms.airbnb.ical_url) {
          syncPromises.push(
            axios.post('/bookings/sync', {
              ical_url: property.platforms.airbnb.ical_url,
              listing_id: property.platforms.airbnb.listing_id,
              platform: 'airbnb',
              property_id: 1
            })
          );
        }
        
        // Sync VRBO if available
        if (property.platforms.vrbo.ical_url) {
          syncPromises.push(
            axios.post('/bookings/sync', {
              ical_url: property.platforms.vrbo.ical_url,
              listing_id: property.platforms.vrbo.listing_id,
              platform: 'vrbo',
              property_id: 1
            })
          );
        }
      });
      
      if (syncPromises.length > 0) {
        const responses = await Promise.allSettled(syncPromises);
        responses.forEach((response, index) => {
          if (response.status === 'fulfilled' && response.value.data.success) {
            results.push(`✅ ${response.value.data.message}`);
          } else {
            results.push(`❌ Sync ${index + 1} failed`);
          }
        });
        
        setSyncMessage(results.join('\n'));
        fetchBookings(); // Refresh the list
      } else {
        setSyncMessage('❌ No platforms configured');
      }
    } catch (err) {
      setSyncMessage(`❌ Failed to sync bookings: ${err.response?.data?.message || err.message}`);
      console.error('Error syncing bookings:', err);
    } finally {
      setSyncLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'reserved': 'bg-primary',
      'confirmed': 'bg-success',
      'cancelled': 'bg-danger'
    };
    
    return (
      <span className={`badge ${statusClasses[status] || 'bg-secondary'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Bookings</h1>
      
      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Filter Bookings</h3>
          <div className="row">
            <div className="col-md-2">
              <label className="form-label">Property</label>
              <select 
                className="form-select"
                value={filters.property}
                onChange={(e) => handleFilterChange('property', e.target.value)}
              >
                <option value="all">All Properties</option>
                {Object.entries(properties).map(([key, property]) => (
                  <option key={key} value={key}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Platform</label>
              <select 
                className="form-select"
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="all">All Platforms</option>
                <option value="airbnb">Airbnb</option>
                <option value="vrbo">VRBO</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="reserved">Reserved</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-12">
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={clearFilters}
              >
                Clear All Filters
              </button>
              <span className="ms-3 text-muted">
                Showing {filteredBookings.length} of {bookings.length} bookings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Section */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Sync Bookings</h3>
          <p className="text-muted">
            Sync the latest bookings from all property iCal feeds. 
            <strong>Note:</strong> iCal feeds typically only show future bookings and recent past bookings (last 30-90 days).
          </p>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary"
              onClick={syncBookings}
              disabled={syncLoading}
            >
              {syncLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Syncing...
                </>
              ) : (
                '🔄 Sync All Bookings'
              )}
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => alert('To get historical data from the last 10 years, you would need to:\n\n1. Export data from your Airbnb Host Dashboard\n2. Use Airbnb\'s official data export tools\n3. Manually enter key historical bookings\n\nAirbnb iCal feeds only show future and recent bookings.')}
            >
              📊 Get Historical Data
            </button>
          </div>
          {syncMessage && (
            <div className={`alert ${syncMessage.includes('✅') ? 'alert-success' : 'alert-danger'} mt-3`}>
              {syncMessage}
            </div>
          )}
        </div>
      </div>

      {/* Manual Booking Entry */}
      <div className="card mb-4">
        <div className="card-body">
          <h3>Add Historical Booking</h3>
          <p className="text-muted">Manually add historical bookings that aren't in the iCal feed</p>
          <button 
            className="btn btn-outline-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '❌ Cancel' : '➕ Add Historical Booking'}
          </button>
          
          {showAddForm && (
            <div className="mt-3">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Property</label>
                  <select
                    className="form-control"
                    value={newBooking.property}
                    onChange={(e) => setNewBooking({...newBooking, property: e.target.value})}
                  >
                    <option value="">Select Property</option>
                    {Object.entries(properties).map(([key, property]) => (
                      <option key={key} value={key}>{property.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Check-in Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newBooking.check_in_date}
                    onChange={(e) => setNewBooking({...newBooking, check_in_date: e.target.value})}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Check-out Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newBooking.check_out_date}
                    onChange={(e) => setNewBooking({...newBooking, check_out_date: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Estimated Income</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="€0.00"
                    value={newBooking.estimated_income}
                    onChange={(e) => setNewBooking({...newBooking, estimated_income: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Phone (Last 4)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="1234"
                    maxLength="4"
                    value={newBooking.phone_last_4}
                    onChange={(e) => setNewBooking({...newBooking, phone_last_4: e.target.value})}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={newBooking.status}
                    onChange={(e) => setNewBooking({...newBooking, status: e.target.value})}
                  >
                    <option value="reserved">Reserved</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <button 
                  className="btn btn-success me-2"
                  onClick={() => {
                    // Calculate nights
                    const nights = new Date(newBooking.check_out_date) - new Date(newBooking.check_in_date);
                    const nightsCount = Math.ceil(nights / (1000 * 60 * 60 * 24));
                    
                    // Create booking object
                    const property = properties[newBooking.property];
                    const booking = {
                      airbnb_listing_id: property.listing_id,
                      booking_uid: `manual-${Date.now()}`,
                      check_in_date: newBooking.check_in_date,
                      check_out_date: newBooking.check_out_date,
                      nights: nightsCount,
                      estimated_income: parseFloat(newBooking.estimated_income) || null,
                      phone_last_4: newBooking.phone_last_4,
                      status: newBooking.status
                    };
                    
                    // Add to local state (in a real app, you'd save to backend)
                    setBookings([booking, ...bookings]);
                    setNewBooking({
                      property: '',
                      check_in_date: '',
                      check_out_date: '',
                      estimated_income: '',
                      phone_last_4: '',
                      status: 'reserved'
                    });
                    setShowAddForm(false);
                    alert('Historical booking added! (Note: This is stored locally only)');
                  }}
                >
                  💾 Add Booking
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bookings List */}
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3>All Bookings ({filteredBookings.length} of {bookings.length})</h3>
            {autoSyncing && (
              <div className="d-flex align-items-center text-muted">
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                <small>Auto-syncing latest data...</small>
              </div>
            )}
          </div>
          {bookings.length > 0 && (
            <p className="text-muted mb-0">
              Date range: {formatDate(bookings[bookings.length - 1]?.check_in_date)} to {formatDate(bookings[0]?.check_in_date)}
            </p>
          )}
        </div>
        <div className="card-body">
          {error ? (
            <div className="alert alert-danger">{error}</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center text-muted">
              <p>
                {bookings.length === 0 
                  ? 'No bookings found. Click "Sync Bookings" to load your reservations.'
                  : 'No bookings match the current filters. Try adjusting your filter criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Platform</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Nights</th>
                    <th>Status</th>
                    <th>Phone (Last 4)</th>
                    <th>Estimated Income</th>
                    <th>Reservation</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(booking => (
                    <tr key={booking.id}>
                      <td>
                        <span className="badge bg-secondary">
                          {booking.listing_id === '22496407' ? '2SA' :
                           booking.listing_id === '1502215720507817033' ? '67RR' :
                           booking.listing_id === '28297094' ? '87HP' :
                           booking.listing_id === '23610282' ? '28LC' :
                           booking.listing_id}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${booking.booking_source === 'airbnb' ? 'bg-primary' : 
                                               booking.booking_source === 'vrbo' ? 'bg-success' : 
                                               'bg-secondary'}`}>
                          {booking.booking_source?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td>{formatDate(booking.check_in_date)}</td>
                      <td>{formatDate(booking.check_out_date)}</td>
                      <td>
                        <span className="badge bg-info">{booking.nights}</span>
                      </td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td>{booking.phone_last_4 || '-'}</td>
                      <td>
                        {booking.estimated_income ? formatCurrency(booking.estimated_income) : '-'}
                      </td>
                      <td>
                        {booking.reservation_url ? (
                          <a 
                            href={booking.reservation_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            View
                          </a>
                        ) : '-'}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-info"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDetailsModal(true);
                          }}
                        >
                          More
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* More Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Booking Details</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Basic Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Property:</strong></td>
                          <td>{selectedBooking.listing_id === '22496407' ? '2SA' :
                               selectedBooking.listing_id === '1502215720507817033' ? '67RR' :
                               selectedBooking.listing_id === '28297094' ? '87HP' :
                               selectedBooking.listing_id === '23610282' ? '28LC' :
                               selectedBooking.listing_id}</td>
                        </tr>
                        <tr>
                          <td><strong>Platform:</strong></td>
                          <td>
                            <span className={`badge ${selectedBooking.booking_source === 'airbnb' ? 'bg-primary' : 
                                               selectedBooking.booking_source === 'vrbo' ? 'bg-success' : 
                                               'bg-secondary'}`}>
                              {selectedBooking.booking_source?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Check-in:</strong></td>
                          <td>{formatDate(selectedBooking.check_in_date)}</td>
                        </tr>
                        <tr>
                          <td><strong>Check-out:</strong></td>
                          <td>{formatDate(selectedBooking.check_out_date)}</td>
                        </tr>
                        <tr>
                          <td><strong>Nights:</strong></td>
                          <td>{selectedBooking.nights}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>{getStatusBadge(selectedBooking.status)}</td>
                        </tr>
                        <tr>
                          <td><strong>Confirmation Code:</strong></td>
                          <td>{selectedBooking.confirmation_code || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Guest Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Guest Name:</strong></td>
                          <td>{selectedBooking.guest_name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone (Last 4):</strong></td>
                          <td>{selectedBooking.phone_last_4 || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Guest Phone:</strong></td>
                          <td>{selectedBooking.guest_phone || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Guest Email:</strong></td>
                          <td>{selectedBooking.guest_email || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Number of Guests:</strong></td>
                          <td>{selectedBooking.number_of_guests || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <h6>Financial Details</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Nightly Rate:</strong></td>
                          <td>{selectedBooking.nightly_rate ? formatCurrency(selectedBooking.nightly_rate) : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Cleaning Fee:</strong></td>
                          <td>{selectedBooking.cleaning_fee ? formatCurrency(selectedBooking.cleaning_fee) : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Service Fee:</strong></td>
                          <td>{selectedBooking.service_fee ? formatCurrency(selectedBooking.service_fee) : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Total Amount:</strong></td>
                          <td>{selectedBooking.total_amount ? formatCurrency(selectedBooking.total_amount) : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Estimated Income:</strong></td>
                          <td>{selectedBooking.estimated_income ? formatCurrency(selectedBooking.estimated_income) : 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Additional Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Booking Source:</strong></td>
                          <td>{selectedBooking.booking_source || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Cancellation Policy:</strong></td>
                          <td>{selectedBooking.cancellation_policy || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Summary:</strong></td>
                          <td>{selectedBooking.summary || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Created:</strong></td>
                          <td>{selectedBooking.dtstamp ? new Date(selectedBooking.dtstamp).toLocaleString() : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Last Synced:</strong></td>
                          <td>{selectedBooking.last_synced ? new Date(selectedBooking.last_synced).toLocaleString() : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Location:</strong></td>
                          <td>{selectedBooking.location || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Organizer:</strong></td>
                          <td>{selectedBooking.organizer || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Attendee:</strong></td>
                          <td>{selectedBooking.attendee || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Created:</strong></td>
                          <td>{selectedBooking.created ? new Date(selectedBooking.created).toLocaleString() : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Last Modified:</strong></td>
                          <td>{selectedBooking.last_modified ? new Date(selectedBooking.last_modified).toLocaleString() : 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedBooking.special_requests && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6>Special Requests</h6>
                      <p className="text-muted">{selectedBooking.special_requests}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.description && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6>Full Description</h6>
                      <pre className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedBooking.description}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedBooking.reservation_url && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6>Reservation Link</h6>
                      <a 
                        href={selectedBooking.reservation_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        View on Airbnb
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
