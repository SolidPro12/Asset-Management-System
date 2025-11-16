import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, AlertCircle, Calendar } from 'lucide-react';

interface Asset {
  id: string;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_end_date: string | null;
  category: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export function AssetLifecycleDashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, purchase_date, purchase_cost, warranty_end_date, category');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate asset age distribution
  const getAgeDistribution = () => {
    const distribution: Record<string, number> = {
      '0-1 years': 0,
      '1-2 years': 0,
      '2-3 years': 0,
      '3-5 years': 0,
      '5+ years': 0,
    };

    assets.forEach(asset => {
      if (asset.purchase_date) {
        const years = (new Date().getTime() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
        if (years < 1) distribution['0-1 years']++;
        else if (years < 2) distribution['1-2 years']++;
        else if (years < 3) distribution['2-3 years']++;
        else if (years < 5) distribution['3-5 years']++;
        else distribution['5+ years']++;
      }
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  // Calculate depreciation (assuming 20% annual depreciation)
  const getDepreciationData = () => {
    const depreciationByYear: Record<string, number> = {};
    
    assets.forEach(asset => {
      if (asset.purchase_date && asset.purchase_cost) {
        const year = new Date(asset.purchase_date).getFullYear();
        const age = (new Date().getTime() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
        const currentValue = asset.purchase_cost * Math.pow(0.8, Math.floor(age));
        depreciationByYear[year] = (depreciationByYear[year] || 0) + currentValue;
      }
    });

    return Object.entries(depreciationByYear)
      .map(([year, value]) => ({ year, value: Math.round(value) }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  // Get upcoming warranty expirations (next 90 days)
  const getUpcomingExpirations = () => {
    const today = new Date();
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    return assets.filter(asset => {
      if (!asset.warranty_end_date) return false;
      const warrantyDate = new Date(asset.warranty_end_date);
      return warrantyDate > today && warrantyDate <= in90Days;
    });
  };

  // Calculate total cost of ownership
  const getTotalCostOfOwnership = () => {
    const totalPurchaseCost = assets.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0);
    const assetsByCategory = assets.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + (asset.purchase_cost || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(assetsByCategory).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value: Math.round(value) 
    }));
  };

  const ageDistribution = getAgeDistribution();
  const depreciationData = getDepreciationData();
  const upcomingExpirations = getUpcomingExpirations();
  const costByCategory = getTotalCostOfOwnership();
  const totalValue = assets.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0);

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warranties Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExpirations.length}</div>
            <p className="text-xs text-muted-foreground">Next 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Asset Age</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(assets.reduce((sum, asset) => {
                if (!asset.purchase_date) return sum;
                return sum + (new Date().getTime() - new Date(asset.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
              }, 0) / assets.filter(a => a.purchase_date).length || 0).toFixed(1)} yrs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Cost by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Depreciation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={depreciationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" name="Current Value (₹)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Warranty Expirations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {upcomingExpirations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No warranties expiring in the next 90 days</p>
              ) : (
                upcomingExpirations.map((asset) => (
                  <div key={asset.id} className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm font-medium">{asset.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(asset.warranty_end_date!).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}