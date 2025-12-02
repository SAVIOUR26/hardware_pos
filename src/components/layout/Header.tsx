import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { format } from 'date-fns';

function Header() {
  const location = useLocation();

  // Get page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/sales/not-taken')) return 'Not Taken Report ⭐';
    if (path.startsWith('/sales')) return 'Sales';
    if (path.startsWith('/purchase')) return 'Purchase';
    if (path.startsWith('/inventory')) return 'Inventory';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/suppliers')) return 'Suppliers';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/tally')) return 'Tally Integration';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Hardware Manager Pro';
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-semibold">{getPageTitle()}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search (placeholder) */}
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Search className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notifications (placeholder) */}
        <button className="p-2 hover:bg-accent rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </button>
      </div>
    </header>
  );
}

export default Header;
