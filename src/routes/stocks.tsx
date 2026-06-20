import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Search, TrendingUp, DollarSign, Activity, AlertCircle, BarChart3 } from 'lucide-react';

export const Route = createFileRoute('/stocks')({
  component: StocksDashboard,
});

function StocksDashboard() {
  const [searchInput, setSearchInput] = useState('RELIANCE.NS');
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStockData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput) return;

    setLoading(true);
    setError('');
    setStockData(null);

    try {
      // Fetch data from your local Python FastAPI backend
      const response = await fetch(`http://127.0.0.1:8000/api/stock/${searchInput.toUpperCase()}`);
      
      if (!response.ok) {
        throw new Error('Stock not found. Make sure to use the correct ticker (e.g., RELIANCE.NS, TCS.NS)');
      }
      
      const data = await response.json();
      setStockData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Live Stock Analysis</h1>
        <p className="text-muted-foreground">
          Track fundamental metrics and live prices for NSE/BSE equities.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={fetchStockData} className="mb-8 flex w-full max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search ticker (e.g., RELIANCE.NS)"
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Analyze'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-8 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Dashboard Grid */}
      {stockData && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Main Price Card */}
          <div className="col-span-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm lg:col-span-2">
            <div className="flex flex-col justify-between h-full gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stockData.symbol}</p>
                <h2 className="text-2xl font-bold">{stockData.name}</h2>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Price</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">₹{stockData.current_price?.toLocaleString('en-IN') || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <MetricCard 
            title="P/E Ratio" 
            value={stockData.pe_ratio ? stockData.pe_ratio.toFixed(2) : 'N/A'} 
            icon={<Activity className="h-4 w-4 text-blue-500" />} 
          />
          <MetricCard 
            title="Market Cap" 
            value={stockData.market_cap ? `₹${(stockData.market_cap / 10000000).toFixed(2)} Cr` : 'N/A'} 
            icon={<DollarSign className="h-4 w-4 text-green-500" />} 
          />
          <MetricCard 
            title="Debt to Equity" 
            value={stockData.debt_to_equity ? (stockData.debt_to_equity / 100).toFixed(2) : 'N/A'} 
            icon={<BarChart3 className="h-4 w-4 text-orange-500" />} 
          />
          <MetricCard 
            title="52 Week Range" 
            value={`₹${stockData.fifty_two_week_low} - ₹${stockData.fifty_two_week_high}`} 
            icon={<TrendingUp className="h-4 w-4 text-purple-500" />} 
          />
          
        </div>
      )}
    </div>
  );
}

// Reusable UI Component for metrics
function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-4 text-2xl font-bold">{value}</div>
    </div>
  );
}