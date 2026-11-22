import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Layers,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  Eye,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  PackageSearch
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import DataTable from '../components/common/DataTable';
import ActivityLineChart from '../components/charts/ActivityLineChart';
import ComplianceDonutChart from '../components/charts/ComplianceDonutChart';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import InspectionDetailDrawer from '../components/dashboard/InspectionDetailDrawer';
import {
  fetchDashboardMetrics,
  fetchReportsData
} from '../services/dashboardService';
import { fetchInspectionsList } from '../services/inspectionService';
import { formatDate } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      const [metricRes, inspectRes, reportsRes] = await Promise.all([
  fetchDashboardMetrics(),
  fetchInspectionsList({ limit: 5 }),
  fetchReportsData({ range: 'Last 30 Days', category: 'All' })
]);

const reportData = reportsRes.data || {};

setMetrics({
  ...(metricRes.data || {}),
  activityHistory: reportData.trends || [],
  complianceStatusBreakdown: reportData.statusBreakdown || [],
  categoryViolationBreakdown: reportData.categories || []
});

setRecentInspections(inspectRes.data?.items || inspectRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data from backend:', err);
      const isOffline = err.isNetworkError || !err.status || err.status === 404;
      setConnectionError(
        isOffline
          ? 'FastAPI backend is offline or unreachable at http://127.0.0.1:8000. Start your FastAPI server or update API endpoint in Settings.'
          : err.message || 'Error loading dashboard statistics.'
      );
      // Reset data to empty so no fake records ever display
      setMetrics(null);
      setRecentInspections([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRowClick = (inspection) => {
    setSelectedInspection(inspection);
    setDrawerOpen(true);
  };

  const filteredInspections = recentInspections.filter((item) => {
  const result = item.overall_result || 'Not Analyzed';

  const normalizedResult =
    result === 'Pass' ? 'Compliant' : result;

  const matchesStatus =
    statusFilter === 'All' ||
    normalizedResult.toLowerCase() === statusFilter.toLowerCase();

  const query = searchQuery.toLowerCase().trim();

  const matchesSearch =
    !query ||
    item.inspection_number?.toLowerCase().includes(query) ||
    item.product_name?.toLowerCase().includes(query) ||
    item.inspector_name?.toLowerCase().includes(query);

  return matchesStatus && matchesSearch;
});

  const tableColumns = [
  {
    key: 'inspection_number',
    header: 'Inspection ID',
    className: 'w-44 font-mono font-medium text-[#17211B] dark:text-[#F0FDF4]',
    render: (row) => (
      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border border-[#E5EDE6] dark:border-[#29382D]">
        {row.inspection_number}
      </span>
    ),
  },
  {
    key: 'product_name',
    header: 'Product Name',
    className: 'min-w-[220px]',
    render: (row) => (
      <div className="min-w-0">
        <p className="font-semibold text-[#17211B] dark:text-[#F0FDF4] truncate text-xs">
          {row.product_name || 'Unnamed Product'}
        </p>
        <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
          {row.review_status === 'reviewed'
            ? 'Review completed'
            : 'Review pending'}
        </p>
      </div>
    ),
  },
  {
    key: 'inspector_name',
    header: 'Auditing Inspector',
    className: 'w-44 text-xs font-medium',
  },
  {
    key: 'inspection_date',
    header: 'Date & Time',
    className: 'w-40 text-xs font-mono text-[#647067] dark:text-[#A3B3A6]',
    render: (row) => formatDate(row.inspection_date),
  },
  {
    key: 'overall_result',
    header: 'Compliance Status',
    className: 'w-36',
    render: (row) => (
      <StatusBadge
        status={row.overall_result || 'Not Analyzed'}
        size="sm"
      />
    ),
  },
  {
    key: 'action',
    header: 'Action',
    className: 'w-24 text-right',
    render: (row) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRowClick(row);
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] dark:text-[#4ADE80] hover:text-[#166534] p-1.5 rounded-lg hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
      >
        <span>Review</span>
        <Eye className="w-3.5 h-3.5" />
      </button>
    ),
  },
];

  const totalCount = metrics?.totalInspections || 0;
  const todayCount = metrics?.inspectionsToday || 0;
  const issuesCount = metrics?.potentialIssues || 0;
  const pendingCount = metrics?.pendingReviews || 0;
  const passRate = metrics?.complianceRate ? `${metrics.complianceRate}% Pass Rate` : null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#4ADE80]"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
              Legal Metrology Compliance Portal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-1">
            Good Morning, Inspector
          </h2>
          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Here's your compliance inspection overview and mandatory declaration audits.
          </p>
        </div>

        <button
          onClick={() => navigate('/new-inspection')}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] font-semibold text-xs sm:text-sm shadow-md shadow-[#15803D]/20 hover:shadow-lg transition-all transform active:scale-98 shrink-0"
        >
          <ScanLine className="w-4 h-4" />
          <span>New Inspection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Backend API Connection Alert if offline */}
      {connectionError && (
        <div className="p-4 rounded-2xl border border-red-500/20 bg-red-50/70 dark:bg-red-950/20 text-xs text-[#DC2626] flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="leading-relaxed flex-1">
            <p className="font-semibold text-sm mb-0.5">Database Connection Offline</p>
            <p>{connectionError}</p>
            <div className="mt-2.5 flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] text-[#17211B] dark:text-[#F0FDF4] font-semibold hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="font-semibold underline text-[#15803D] dark:text-[#4ADE80] hover:opacity-80"
              >
                Change Backend Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Statistics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inspections"
          value={totalCount}
          trend={metrics?.trends?.totalInspections || (totalCount > 0 ? 'Actual database records' : 'No inspections recorded')}
          trendType={totalCount > 0 ? 'positive' : 'neutral'}
          icon={Layers}
        />
        <StatCard
          title="Inspections Today"
          value={todayCount}
          trend={metrics?.trends?.inspectionsToday || 'Live daily tally'}
          trendType={todayCount > 0 ? 'positive' : 'neutral'}
          icon={Calendar}
        />
        <StatCard
          title="Potential Issues"
          value={issuesCount}
          trend={metrics?.trends?.potentialIssues || (issuesCount > 0 ? 'Requires action' : 'No potential issues recorded')}
          trendType={issuesCount > 0 ? 'negative' : 'positive'}
          icon={AlertTriangle}
          badgeText={issuesCount > 0 ? 'Requires Action' : undefined}
        />
        <StatCard
          title="Pending Reviews"
          value={pendingCount}
          trend={metrics?.trends?.pendingReviews || 'Awaiting sign-off'}
          trendType={pendingCount > 0 ? 'neutral' : 'positive'}
          icon={Clock}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspection Activity Trend Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5EDE6] dark:border-[#29382D]">
            <div>
              <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                Inspection Activity & Compliance Trends
              </h3>
              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                Daily volume of audited packages vs detected infractions from database
              </p>
            </div>
            {passRate && (
              <div className="flex items-center gap-1.5 text-xs text-[#15803D] dark:text-[#4ADE80] font-semibold bg-[#DCFCE7] dark:bg-[#173D26] px-2.5 py-1 rounded-full border border-[#E5EDE6] dark:border-[#29382D]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{passRate}</span>
              </div>
            )}
          </div>
          {metrics?.activityHistory && metrics.activityHistory.length > 0 ? (
            <ActivityLineChart data={metrics.activityHistory} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#647067] dark:text-[#A3B3A6]">
              <PackageSearch className="w-8 h-8 mb-2 stroke-[1.5] text-[#15803D] dark:text-[#4ADE80]" />
              <p className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">No inspection activity recorded yet</p>
              <p className="text-[11px] mt-0.5 max-w-xs">Perform commodity package inspections to generate historical activity charts.</p>
            </div>
          )}
        </div>

        {/* Compliance Status Donut Chart */}
        <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col justify-between">
          <div className="pb-3 mb-2 border-b border-[#E5EDE6] dark:border-[#29382D]">
            <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
              Compliance Status Distribution
            </h3>
            <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
              Breakdown across verified commodity labels
            </p>
          </div>
          {metrics?.complianceStatusBreakdown && metrics.complianceStatusBreakdown.length > 0 ? (
            <ComplianceDonutChart data={metrics.complianceStatusBreakdown} />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#647067] dark:text-[#A3B3A6]">
              <PackageSearch className="w-8 h-8 mb-2 stroke-[1.5] text-[#15803D] dark:text-[#4ADE80]" />
              <p className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">No compliance records found</p>
              <p className="text-[11px] mt-0.5 max-w-xs">Compliance ratios will appear here as you log inspections.</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Violations Bar Chart */}
      <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5EDE6] dark:border-[#29382D]">
          <div>
            <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
              Category Inspection & Infraction Audit
            </h3>
            <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
              Comparison of inspected units and potential issues across market commodity categories
            </p>
          </div>
          <span className="text-xs font-medium text-[#647067] dark:text-[#A3B3A6]">
            Legal Metrology Act, 2009 Standards
          </span>
        </div>
        {metrics?.categoryViolationBreakdown && metrics.categoryViolationBreakdown.length > 0 ? (
          <CategoryBarChart data={metrics.categoryViolationBreakdown} />
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-[#647067] dark:text-[#A3B3A6]">
            <PackageSearch className="w-7 h-7 mb-2 stroke-[1.5] text-[#15803D] dark:text-[#4ADE80]" />
            <p className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">No category data yet</p>
            <p className="text-[11px] mt-0.5">Category-wise metrics will display as commodities are cataloged.</p>
          </div>
        )}
      </div>

      {/* Recent Inspections Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
              Recent Inspections
            </h3>
            <p className="text-xs text-[#647067] dark:text-[#A3B3A6]">
              Real-time audit log of packaging declarations and automated verification results from the database.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter table..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80] w-44"
              />
            </div>

            <div className="flex p-0.5 rounded-xl bg-[#F0FDF4] dark:bg-[#173D26]/60 border border-[#E5EDE6] dark:border-[#29382D] text-xs">
              {['All', 'Compliant', 'Potential Issue', 'Manual Review'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-white dark:bg-[#19241C] text-[#15803D] dark:text-[#4ADE80] shadow-xs'
                      : 'text-[#647067] dark:text-[#A3B3A6] hover:text-[#17211B] dark:hover:text-[#F0FDF4]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-[#15803D] dark:text-[#4ADE80] hover:underline px-2"
            >
              View Full History →
            </button>
          </div>
        </div>

        {/* Table or Requested Beautiful Empty State */}
        {recentInspections.length === 0 && !isLoading ? (
          <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-10 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-3.5 border border-[#E5EDE6] dark:border-[#29382D]">
              <PackageSearch className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h4 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
              No inspections yet
            </h4>
            <p className="text-xs text-[#647067] dark:text-[#A3B3A6] max-w-sm mt-1 mb-5">
              Start your first inspection to see your activity here.
            </p>
            <button
              onClick={() => navigate('/new-inspection')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-semibold shadow-md shadow-[#15803D]/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Inspection</span>
            </button>
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredInspections}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage="No inspections match your filter."
          />
        )}
      </div>

      {/* Slide-out Inspection Details Drawer */}
      <InspectionDetailDrawer
        inspection={selectedInspection}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
