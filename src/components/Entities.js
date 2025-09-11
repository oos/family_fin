import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Families from './Families';
import Properties from './Properties';
import Loans from './Loans';
import BusinessAccounts from './BusinessAccounts';
import PensionAccounts from './PensionAccounts';

function Entities() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'families');

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  const tabs = [
    { id: 'families', label: 'Families', component: Families },
    { id: 'properties', label: 'Properties', component: Properties },
    { id: 'loans', label: 'Loans', component: Loans },
    { id: 'business-accounts', label: 'Bank Accounts', component: BusinessAccounts },
    { id: 'pension-accounts', label: 'Pension Accounts', component: PensionAccounts }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="container">
      <h1>Entities</h1>
      <p style={{ color: '#6c757d', marginBottom: '30px' }}>
        Manage all database entities used in calculations and reports.
      </p>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

export default Entities;
