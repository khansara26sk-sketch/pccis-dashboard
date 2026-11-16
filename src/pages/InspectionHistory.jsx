
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  Eye,
  RefreshCw,
  X,
  AlertCircle,
  PlusCircle,
  PackageSearch
} from 'lucide-react';

import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import InspectionDetailDrawer from '../components/dashboard/InspectionDetailDrawer';

import {
  fetchInspectionsList,
  fetchInspectionById
} from '../services/inspectionService';

import { formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/exportUtils';

export default function InspectionHistory() {
  const navigate = useNavigate();

  // Inspection records
  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  // Detail drawer
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load inspection records from FastAPI
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setConnectionError(null);

    try {
      const params = {
        skip: 0,
        limit: 100
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }

      const response = await fetchInspectionsList(params);

      const records = Array.isArray(response.data)
        ? response.data
        : [];

      setInspections(records);
    } catch (err) {
      console.error('Failed to load inspection history:', err);

      setConnectionError(
        err.isNetworkError
          ? 'Cannot connect to FastAPI backend at http://127.0.0.1:8000.'
          : err.message || 'Failed to fetch inspection records.'
      );

      setInspections([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  // Reload when search or status changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadData]);

  // Apply date filter locally
  const filtered = inspections.filter((item) => {
    const matchesDate =
      !dateFilter ||
      item.inspection_date?.startsWith(dateFilter);

    return matchesDate;
  });

  // Client-side pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Open inspection details and fetch latest record
  const handleRowClick = async (item) => {
    setSelectedInspection(item);
    setDrawerOpen(true);

    try {
      const response = await fetchInspectionById(item.id);

      if (response.data) {
        setSelectedInspection(response.data);
      }
    } catch (err) {
      console.error('Failed to load inspection details:', err);
    }
  };

  // Export filtered records to CSV
  const handleExportAll = () => {
    if (filtered.length === 0) return;

    const rows = filtered.map((item) => ({
      InspectionID: item.inspection_number,
      ProductName: item.product_name || 'Unnamed product',
      InspectorID: item.inspector_id,
      InspectionDate: item.inspection_date,
      InspectionStatus: item.status,
      ReviewStatus: item.review_status || 'not_reviewed',
      OverallResult: item.overall_result || 'Not evaluated'
    }));

    exportToCSV(
      rows,
      `PCCIS-Inspection-History-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setDateFilter('');
    setCurrentPage(1);
  };

  // Table columns use actual backend field names
  const columns = [
    {
      key: 'inspection_number',
      header: 'Inspection ID',
      className: 'w-36 font-mono text-xs',
      render: (row) => (
        <span className="font-mono font-medium text-[#15803D] dark:text-[#4ADE80] bg-[#F0FDF4] dark:bg-[#173D26] border border-[#E5EDE6] dark:border-[#29382D] px-2 py-0.5 rounded">
          {row.inspection_number || `#${row.id}`}
        </span>
      )
    },
    {
      key: 'product_name',
      header: 'Product Name',
      className: 'min-w-[200px]',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-[#17211B] dark:text-[#F0FDF4] truncate text-xs">
            {row.product_name || 'Unnamed product'}
          </p>

          <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] truncate">
            {row.overall_result || 'Not evaluated'}
          </p>
        </div>
      )
    },
    {
      key: 'inspection_date',
      header: 'Date',
      className: 'w-36 text-xs text-[#647067] dark:text-[#A3B3A6] font-mono',
      render: (row) => formatDate(row.inspection_date)
    },
    {
      key: 'inspector_id',
      header: 'Inspector',
      className: 'w-40 text-xs font-medium',
      render: (row) => `Inspector #${row.inspector_id}`
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-36',
      render: (row) => (
        <StatusBadge status={row.status} size="sm" />
      )
    },
    {
      key: 'review_status',
      header: 'Review Status',
      className: 'w-36 text-xs text-[#647067] dark:text-[#A3B3A6] font-medium',
      render: (row) => (
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border border-[#E5EDE6] dark:border-[#29382D] font-medium">
          {row.review_status || 'not_reviewed'}
        </span>
      )
    },
    {
      key: 'actions',
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
          <span>View</span>
          <Eye className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  // Show initial empty state only when there are no records
  const showInitialEmptyState =
    inspections.length === 0 &&
    !isLoading &&
    !connectionError &&
    !search &&
    statusFilter === 'All' &&
    !dateFilter;

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
            Inspection Records
          </span>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-0.5">
            Inspection History & Audit Archive
          </h2>

          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Historical inspection records retrieved from the PCCIS database.
          </p>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>

          {filtered.length > 0 && (
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] font-semibold text-xs shadow-xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="p-4 rounded-2xl border border-red-500/20 bg-red-50/70 dark:bg-red-950/20 text-xs text-[#DC2626] flex items-start gap-3 shadow-xs">

          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

          <div className="leading-relaxed flex-1">
            <p className="font-semibold text-sm mb-0.5">
              Database Connection Error
            </p>

            <p>{connectionError}</p>

            <button
              onClick={loadData}
              className="mt-2 text-xs font-semibold underline text-[#15803D] dark:text-[#4ADE80]"
            >
              Retry Database Query
            </button>
          </div>

        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#19241C] rounded-2xl p-4 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] space-y-3">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5" />

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product or inspection ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80]"
            />
          </div>

          {/* Inspection Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80]"
            >
              <option value="All">All Inspection Statuses</option>
              <option value="draft">Draft</option>
              <option value="image_uploaded">Image Uploaded</option>
              <option value="analyzing">Analyzing</option>
              <option value="analyzed">Analyzed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80]"
            />
          </div>

        </div>

        {/* Active Filters */}
        {(search || statusFilter !== 'All' || dateFilter) && (
          <div className="flex items-center justify-between pt-2 border-t border-[#E5EDE6] dark:border-[#29382D] text-xs">

            <div className="flex items-center gap-2 flex-wrap">

              <span className="text-[#647067] dark:text-[#A3B3A6] font-medium">
                Active filters:
              </span>

              {search && (
                <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] text-[11px] border border-[#E5EDE6] dark:border-[#29382D]">
                  Keyword: "{search}"
                </span>
              )}

              {statusFilter !== 'All' && (
                <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] text-[11px] border border-[#E5EDE6] dark:border-[#29382D]">
                  Status: {statusFilter}
                </span>
              )}

              {dateFilter && (
                <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] text-[11px] border border-[#E5EDE6] dark:border-[#29382D]">
                  Date: {dateFilter}
                </span>
              )}

            </div>

            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>

          </div>
        )}

      </div>

      {/* Initial Empty State */}
      {showInitialEmptyState ? (

        <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-12 flex flex-col items-center justify-center text-center shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

          <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mb-3.5 border border-[#E5EDE6] dark:border-[#29382D]">
            <PackageSearch className="w-7 h-7 stroke-[1.75]" />
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
          columns={columns}
          data={paginatedData}
          onRowClick={handleRowClick}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          isLoading={isLoading}
          emptyMessage="No inspection records match the selected filters."
        />

      )}

      {/* Inspection Detail Drawer */}
      <InspectionDetailDrawer
        inspection={selectedInspection}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  );
}
