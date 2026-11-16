import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Scale,
  PlusCircle,
  WifiOff,
  RefreshCw,
  Loader2
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import ActivityLineChart from '../components/charts/ActivityLineChart';
import ComplianceDonutChart from '../components/charts/ComplianceDonutChart';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import { fetchReportsData } from '../services/dashboardService';
import { printDocument, exportToCSV } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';

export default function Reports() {
  const { addToast } = useToast();
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const loadReports = async () => {
    setIsLoading(true);
    setIsOffline(false);
    setErrorMessage(null);
    try {
      const res = await fetchReportsData({ range: dateRange, category: categoryFilter });
      setReportData(res.data);
    } catch (err) {
      console.warn('[Reports] API query failed:', err.message);
      setIsOffline(true);
      setErrorMessage(
        err.isNetworkError
          ? 'Cannot reach backend at http://127.0.0.1:8000. Start FastAPI server to generate live reports.'
          : err.message || 'Failed to fetch reporting analytics.'
      );
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [dateRange, categoryFilter]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.trends || reportData.trends.length === 0) {
      addToast({
        title: 'Export Unavailable',
        message: 'No live inspection records available to export.',
        type: 'warning',
      });
      return;
    }
    const exportRows = reportData.trends.map((t) => ({
      Date: t.date,
      TotalInspections: t.inspections,
      CompliantCount: t.compliant,
      IssuesFlagged: t.issues,
    }));
    exportToCSV(exportRows, `PCCIS-Compliance-Report-${dateRange.replace(/\s+/g, '_')}.csv`);
    addToast({
      title: 'Report Downloaded',
      message: 'Compliance metrics exported to CSV successfully.',
      type: 'success',
    });
  };

  const handlePrintPDF = () => {
    printDocument();
  };

  const totalAudited = reportData?.summary?.totalAudited ?? 0;
  const hasRecords = totalAudited > 0;

  return (
    <div className="space-y-6">
      {/* Page Header with Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            Regulatory Intelligence
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-0.5">
            Compliance Inspection Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Aggregated audit performance, statutory rule violation trends, and legal metrology summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            disabled={!hasRecords}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] text-[#17211B] dark:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Printer className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80]" />
            <span>Print Report (PDF)</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!hasRecords}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-semibold shadow-xs transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Backend Connection Error Banner if Offline */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#17211B] dark:text-[#F0FDF4]">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-[#D97706] shrink-0" />
            <div>
              <p className="font-semibold text-[#D97706] dark:text-amber-400">Database Connection Offline</p>
              <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                {errorMessage || 'FastAPI backend is offline. Compliance reports cannot be computed without live data.'}
              </p>
            </div>
          </div>
          <button
            onClick={loadReports}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] text-xs font-semibold text-[#15803D] dark:text-[#4ADE80] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Date & Category Filter Bar */}
      <div className="bg-white dark:bg-[#19241C] rounded-2xl p-4 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
          <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
            Reporting Period:
          </span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs p-1.5 px-2.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Current Quarter">Current Quarter (Q3 2026)</option>
            <option value="Year to Date">Year to Date (2026)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
          <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
            Category Scope:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-1.5 px-2.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
          >
            <option value="All">All Commodity Categories</option>
            <option value="Food">Packaged Food</option>
            <option value="Cosmetics">Cosmetics & Toiletries</option>
            <option value="Electronics">Consumer Electronics</option>
            <option value="Edible Oil">Edible Oils & Fats</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D]">
          <Loader2 className="w-8 h-8 text-[#15803D] dark:text-[#4ADE80] animate-spin mb-3" />
          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] font-medium">
            Aggregating statutory inspection metrics from database...
          </p>
        </div>
      ) : !hasRecords ? (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
          <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
            No inspections yet
          </h3>
          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-1 max-w-sm mx-auto">
            Start your first inspection to see your activity here.
          </p>
          <div className="mt-5">
            <Link
              to="/new-inspection"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] text-xs font-semibold shadow-md shadow-[#15803D]/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Inspection</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Audited"
              value={totalAudited}
              trend="Actual records"
              trendType="positive"
              icon={FileText}
            />
            <StatCard
              title="Compliance Rate"
              value={reportData?.summary?.complianceRate || '0%'}
              trend="From OCR evaluations"
              trendType="positive"
              icon={CheckCircle2}
            />
            <StatCard
              title="Critical Infractions"
              value={reportData?.summary?.criticalInfractions ?? 0}
              trend="Requiring notice"
              trendType="negative"
              icon={AlertTriangle}
            />
            <StatCard
              title="Avg Inspection Time"
              value={reportData?.summary?.avgInspectionTime || '—'}
              trend="Automated OCR speed"
              trendType="positive"
              icon={Clock}
            />
            <StatCard
              title="Notices Issued"
              value={reportData?.summary?.penaltiesRecommended ?? 0}
              trend="Pending adjudication"
              trendType="neutral"
              icon={Scale}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trend Area Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E5EDE6] dark:border-[#29382D]">
                <div>
                  <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                    Historical Compliance Activity Trend
                  </h3>
                  <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                    Evaluation results indexed across time intervals
                  </p>
                </div>
                <span className="text-xs font-mono text-[#15803D] dark:text-[#4ADE80] font-semibold">{dateRange}</span>
              </div>
              <ActivityLineChart data={reportData?.trends || []} />
            </div>

            {/* Donut Chart (4 cols) */}
            <div className="lg:col-span-4 bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
              <div className="pb-3 mb-3 border-b border-[#E5EDE6] dark:border-[#29382D]">
                <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                  Overall Compliance Ratio
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                  Aggregated across all verified packaging
                </p>
              </div>
              <ComplianceDonutChart data={reportData?.statusBreakdown || []} />
            </div>
          </div>

          {/* Category Breakdown Bar Chart */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5EDE6] dark:border-[#29382D]">
              <div>
                <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                  Commodity Category Infraction Analysis
                </h3>
                <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                  Comparative volume of inspected packaging labels vs rule violations by industry sector
                </p>
              </div>
            </div>
            <CategoryBarChart data={reportData?.categories || []} />
          </div>
        </>
      )}
    </div>
  );
}
