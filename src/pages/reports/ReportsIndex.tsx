import { useState } from 'react';
import { BarChart3, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import SalesReport from './SalesReport';
import PurchaseReport from './PurchaseReport';

type ReportType = 'sales' | 'purchases';

function ReportsIndex() {
  const [activeTab, setActiveTab] = useState<ReportType>('sales');

  const tabs = [
    { id: 'sales' as ReportType, name: 'Sales Report', icon: ShoppingCart },
    { id: 'purchases' as ReportType, name: 'Purchase Report', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Business Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate and analyze sales and purchase reports
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'sales' && <SalesReport />}
          {activeTab === 'purchases' && <PurchaseReport />}
        </div>
      </div>
    </div>
  );
}

export default ReportsIndex;
