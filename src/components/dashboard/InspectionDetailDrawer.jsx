import { useNavigate } from 'react-router-dom';
import { fetchInspectionEvidence } from '../../services/inspectionService';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Printer,
  Download,
  Calendar,
  User,
  Package,
  Hash,
  ClipboardCheck,
  FileText,
} from 'lucide-react';

import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import {
  printDocument,
  exportToCSV,
} from '../../utils/exportUtils';

export default function InspectionDetailDrawer({
  inspection,
  isOpen,
  onClose,
}) {
  const navigate = useNavigate();

  if (!isOpen || !inspection) return null;

  const openReport = () => {
    onClose();
    navigate(`/inspections/${inspection.id}/report`);
  };

  const handleExportSingle = () => {
    exportToCSV(
      [
        {
          DatabaseID: inspection.id,
          InspectionID: inspection.inspection_number,
          ProductName: inspection.product_name || 'Unnamed Product',
          Inspector: inspection.inspector_name || 'Not available',
          InspectionDate: inspection.inspection_date,
          WorkflowStatus: inspection.status,
          ReviewStatus: inspection.review_status,
          ComplianceResult: inspection.overall_result || 'Not Analyzed',
          CreatedAt: inspection.created_at,
        },
      ],
      `inspection-${inspection.inspection_number}.csv`
    );
  };

  const handleViewOCR = async () => {
  try {
    const response = await fetchInspectionEvidence(inspection.id);
    const evidenceList = Array.isArray(response.data)
      ? response.data
      : [];

    const completedEvidence = evidenceList
      .filter((item) => item.ocr_status === 'completed')
      .sort(
        (a, b) =>
          new Date(b.uploaded_at) - new Date(a.uploaded_at)
      );

    if (completedEvidence.length === 0) {
      alert('No completed OCR result is available for this inspection.');
      return;
    }

    const latestEvidence = completedEvidence[0];

    onClose();

    navigate(
      `/ocr-results?inspectionId=${inspection.id}&evidenceId=${latestEvidence.id}`
    );
  } catch (error) {
    console.error('Failed to fetch inspection evidence:', error);
    alert('Unable to load inspection evidence. Please try again.');
  }
};

  const details = [
    {
      label: 'Inspection Number',
      value: inspection.inspection_number || 'Not available',
      icon: Hash,
    },
    {
      label: 'Product Name',
      value: inspection.product_name || 'Not provided',
      icon: Package,
    },
    {
      label: 'Auditing Inspector',
      value: inspection.inspector_name || 'Not available',
      icon: User,
    },
    {
      label: 'Inspection Date',
      value: inspection.inspection_date
        ? formatDate(inspection.inspection_date)
        : 'Not available',
      icon: Calendar,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#141D17] border-l border-[#E5EDE6] dark:border-[#29382D] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="p-5 border-b border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border border-[#E5EDE6] dark:border-[#29382D]">
                {inspection.inspection_number}
              </span>

              <StatusBadge
                status={inspection.status}
                size="sm"
              />
            </div>

            <h2 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-2 truncate">
              {inspection.product_name || 'Unnamed Product'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">

            <button
  onClick={handleViewOCR}
  className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#15803D] hover:bg-[#166534] text-white transition-colors"
>
  View OCR Results
</button>

            <button
              onClick={printDocument}
              className="p-2 rounded-xl text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
              title="Print inspection sheet"
              aria-label="Print inspection sheet"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportSingle}
              className="p-2 rounded-xl text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
              title="Export to CSV"
              aria-label="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#647067] hover:text-[#17211B] dark:hover:text-[#F0FDF4] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
              title="Close"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">

          {/* Inspection Information */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6] mb-3">
              Inspection Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {details.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="p-3.5 rounded-xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D]"
                  >
                    <div className="flex items-center gap-2 text-[#647067] dark:text-[#A3B3A6] text-[11px] mb-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </div>

                    <p className="font-medium text-xs text-[#17211B] dark:text-[#F0FDF4] break-words">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Compliance Result */}
          <section className="p-4 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C]">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />

              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
                Compliance Result
              </h3>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#647067] dark:text-[#A3B3A6]">
                Overall Result
              </span>

              <StatusBadge
                status={inspection.overall_result || 'Not Analyzed'}
                size="sm"
              />
            </div>

            {!inspection.overall_result && (
              <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-3 leading-relaxed">
                No compliance analysis result has been recorded for this inspection yet.
              </p>
            )}
          </section>

          {/* Workflow and Review Status */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6] mb-3">
              Processing & Review
            </h3>

            <div className="space-y-3">

              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E5EDE6] dark:border-[#29382D]">
                <span className="text-xs text-[#647067] dark:text-[#A3B3A6]">
                  Inspection Workflow
                </span>

                <StatusBadge
                  status={inspection.status}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E5EDE6] dark:border-[#29382D]">
                <span className="text-xs text-[#647067] dark:text-[#A3B3A6]">
                  Review Status
                </span>

                <StatusBadge
                  status={inspection.review_status}
                  size="sm"
                />
              </div>

            </div>
          </section>

          {/* Database Record */}
          <section className="p-4 rounded-xl bg-[#F7FAF7] dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6] mb-3">
              Database Record
            </h3>

            <div className="space-y-2 text-xs">

              <div className="flex justify-between gap-3">
                <span className="text-[#647067] dark:text-[#A3B3A6]">
                  Database ID
                </span>

                <span className="font-mono text-[#17211B] dark:text-[#F0FDF4]">
                  {inspection.id}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-[#647067] dark:text-[#A3B3A6]">
                  Created At
                </span>

                <span className="text-[#17211B] dark:text-[#F0FDF4]">
                  {inspection.created_at
                    ? formatDate(inspection.created_at)
                    : 'Not available'}
                </span>
              </div>

            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7]/60 dark:bg-[#19241C]/60 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">
            Recorded in PCCIS Compliance Database
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#15803D] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#166534] dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
            >
              <FileText className="h-3.5 w-3.5" />
              Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#173D26] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/80 text-[#17211B] dark:text-[#F0FDF4] border border-[#E5EDE6] dark:border-[#29382D] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
