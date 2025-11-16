import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatPrice } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [metricsData, salesReport] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.getAnalytics({ period: 'month' }).catch(() => []),
      ]);

      setMetrics(metricsData);
      setSalesData(salesReport || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Events</p>
            <p className="text-3xl font-bold">{metrics.totalEvents || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Page Views</p>
            <p className="text-3xl font-bold">{metrics.pageViews || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Conversions</p>
            <p className="text-3xl font-bold">{metrics.conversions || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
            <p className="text-3xl font-bold">
              {metrics.pageViews > 0
                ? `${((metrics.conversions / metrics.pageViews) * 100).toFixed(2)}%`
                : '0%'}
            </p>
          </div>
        </div>
      )}

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-6">Sales Overview</h2>

        {salesData.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No sales data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatPrice(value)} />
              <Legend />
              <Bar dataKey="total" fill="#0ea5e9" name="Sales" />
              <Bar dataKey="orders" fill="#8b5cf6" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sales Table */}
      {salesData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Sales Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-right py-3 px-4">Orders</th>
                  <th className="text-right py-3 px-4">Total Sales</th>
                  <th className="text-right py-3 px-4">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((data, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{data.date}</td>
                    <td className="py-3 px-4 text-right">{data.orders}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatPrice(data.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatPrice(data.total / data.orders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
