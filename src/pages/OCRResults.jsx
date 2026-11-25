
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Beaker,
  CheckCircle2,
  Clipboard,
  Eye,
  FileText,
  LoaderCircle,
  RefreshCw,
  Scale,
  ScanLine,
  Search,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

import EmptyState from '../components/common/EmptyState';
import ProductFields from '../components/inspection/ProductFields';

import { MOCK_OCR_RESPONSE } from '../services/mockOcrResponse';
import { MOCK_PRODUCT_FIELDS_PREVIEW } from '../services/mockProductFields';

import {
  fetchInspectionsList,
  fetchInspectionEvidence,
} from '../services/inspectionService';

import {
  fetchOcrResult,
  fetchExtractedFields,
  updateExtractedFields,
} from '../services/ocrService';

const cardClass =
  'bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]';

const titleClass =
  'text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]';

const secondaryTextClass =
  'text-xs text-[#647067] dark:text-[#A3B3A6]';

const getResponseItems = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const statusDetails = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    classes:
      'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[#245B35]',
  },
  success: {
    label: 'Completed',
    icon: CheckCircle2,
    classes:
      'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#BBF7D0] dark:border-[#245B35]',
  },
  processing: {
    label: 'Processing',
    icon: LoaderCircle,
    classes:
      'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
  },
  pending: {
    label: 'Pending',
    icon: LoaderCircle,
    classes:
      'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    classes:
      'bg-red-500/10 text-[#DC2626] dark:text-red-400 border-red-500/20',
  },
  error: {
    label: 'Failed',
    icon: XCircle,
    classes:
      'bg-red-500/10 text-[#DC2626] dark:text-red-400 border-red-500/20',
  },
};

function OcrStatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase().trim();

  const details = statusDetails[normalized] || {
    label: status || 'Not available',
    icon: AlertCircle,
    classes:
      'bg-neutral-500/10 text-[#647067] dark:text-[#A3B3A6] border-neutral-300 dark:border-neutral-700',
  };

  const Icon = details.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${details.classes}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          normalized === 'processing' || normalized === 'pending'
            ? 'animate-spin'
            : ''
        }`}
      />
      {details.label}
    </span>
  );
}

function ConfidenceDisplay({ confidence }) {
  const valid =
    typeof confidence === 'number' && Number.isFinite(confidence);

  const percentage = valid
    ? Math.min(100, Math.max(0, confidence))
    : null;

  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex items-center gap-2">
        <ScanLine className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
        <h3 className={titleClass}>OCR confidence</h3>
      </div>

      {percentage === null ? (
        <p className={`${secondaryTextClass} mt-4`}>
          No confidence score available.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#17211B] dark:text-[#F0FDF4]">
              {percentage.toFixed(1)}%
            </span>
            <span className={secondaryTextClass}>
              Average confidence
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5EDE6] dark:bg-[#29382D]">
            <div
              className="h-full rounded-full bg-[#15803D] dark:bg-[#22C55E]"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </>
      )}
    </section>
  );
}

export default function OCRResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isDemoMode = searchParams.get('demo') === 'true';

  // History state
  const [records, setRecords] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  // Selected OCR record
  const inspectionId = Number(searchParams.get('inspectionId'));
  const evidenceId = Number(searchParams.get('evidenceId'));

  const hasIdentifiers =
    Number.isSafeInteger(inspectionId) &&
    inspectionId > 0 &&
    Number.isSafeInteger(evidenceId) &&
    evidenceId > 0;

  const [ocrResult, setOcrResult] = useState(null);
  const [extractedFields, setExtractedFields] = useState(null);

  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [fieldsError, setFieldsError] = useState('');

  const [isSavingFields, setIsSavingFields] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Load all inspection and evidence records
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError('');

    try {
      const response = await fetchInspectionsList({
        skip: 0,
        limit: 100,
      });

      const inspections = getResponseItems(response);

      const evidenceResults = await Promise.all(
        inspections.map(async (inspection) => {
          try {
            const evidenceResponse = await fetchInspectionEvidence(
              inspection.id
            );

            const evidenceList = getResponseItems(evidenceResponse);

            return evidenceList.map((evidence) => ({
              ...evidence,
              inspection_id: inspection.id,
              inspection_number:
                inspection.inspection_number || `#${inspection.id}`,
              product_name:
                inspection.product_name || 'Unnamed product',
              inspection_date: inspection.inspection_date,
            }));
          } catch (error) {
            console.error(
              `Failed to load evidence for inspection ${inspection.id}:`,
              error
            );

            return [];
          }
        })
      );

      const allRecords = evidenceResults.flat();

      allRecords.sort(
        (a, b) =>
          new Date(b.uploaded_at || 0) -
          new Date(a.uploaded_at || 0) ||
          b.id - a.id
      );

      setRecords(allRecords);
    } catch (error) {
      console.error('Failed to load OCR history:', error);

      setHistoryError(
        error.message || 'Could not load OCR history from the database.'
      );

      setRecords([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Open an individual OCR result
  const openResult = (record) => {
    setOcrResult(null);
    setExtractedFields(null);
    setLoadError('');
    setFieldsError('');
    setSaveMessage('');
    setSaveError('');

    setSearchParams({
      inspectionId: String(record.inspection_id),
      evidenceId: String(record.id),
    });
  };

  const returnToHistory = () => {
    setOcrResult(null);
    setExtractedFields(null);
    setLoadError('');
    setFieldsError('');
    setSaveMessage('');
    setSaveError('');
    setSearchParams({});
  };

  // Load selected OCR result
  const loadOcrResult = useCallback(async () => {
    if (!hasIdentifiers) return;

    setIsLoadingResult(true);
    setLoadError('');
    setFieldsError('');

    try {
      const result = await fetchOcrResult(
        inspectionId,
        evidenceId
      );

      setOcrResult(result);

      if (String(result.status).toLowerCase() === 'completed') {
        try {
          const fields = await fetchExtractedFields(
            inspectionId,
            evidenceId
          );

          setExtractedFields(fields);
        } catch (error) {
          console.error('Failed to load extracted fields:', error);
          setFieldsError(
            error.message || 'Product fields could not be loaded.'
          );
        }
      } else {
        setExtractedFields(null);
      }
    } catch (error) {
      console.error('Failed to load OCR result:', error);

      setLoadError(
        error.message || 'The OCR result could not be loaded.'
      );

      setOcrResult(null);
    } finally {
      setIsLoadingResult(false);
    }
  }, [hasIdentifiers, inspectionId, evidenceId]);

  useEffect(() => {
    if (isDemoMode) {
      setOcrResult(MOCK_OCR_RESPONSE);
      setExtractedFields(null);
      setLoadError('');
      setIsLoadingResult(false);
      return;
    }

    if (hasIdentifiers) {
      loadOcrResult();
    } else {
      setOcrResult(null);
      setExtractedFields(null);
      setLoadError('');
      setIsLoadingResult(false);
    }
  }, [hasIdentifiers, isDemoMode, loadOcrResult]);

  const normalizedStatus = String(ocrResult?.status || '')
    .toLowerCase()
    .trim();

  const isProcessing =
    normalizedStatus === 'processing' ||
    normalizedStatus === 'pending';

  const isFailed =
    normalizedStatus === 'failed' ||
    normalizedStatus === 'error';

  // Poll while OCR is processing
  useEffect(() => {
    if (!hasIdentifiers || isDemoMode || !isProcessing) {
      return undefined;
    }

    const timer = setTimeout(loadOcrResult, 2500);

    return () => clearTimeout(timer);
  }, [hasIdentifiers, isDemoMode, isProcessing, loadOcrResult]);

  // Save corrected product fields
  const handleSaveCorrections = async (draftValues) => {
    if (!extractedFields?.fields || !hasIdentifiers) return;

    setIsSavingFields(true);
    setSaveMessage('');
    setSaveError('');

    try {
      const corrections = {};

      Object.entries(draftValues).forEach(([key, value]) => {
        const originalValue = extractedFields.fields[key] ?? '';
        const correctedValue = value.trim();

        if (correctedValue !== originalValue.trim()) {
          corrections[key] = correctedValue || null;
        }
      });

      if (Object.keys(corrections).length === 0) {
        setSaveMessage('No changes to save.');
        return;
      }

      const updated = await updateExtractedFields(
        inspectionId,
        evidenceId,
        corrections
      );

      setExtractedFields(updated);
      setSaveMessage('Corrections saved successfully.');
    } catch (error) {
      console.error('Failed to save corrections:', error);
      setSaveError(error.message || 'Could not save corrections.');
    } finally {
      setIsSavingFields(false);
    }
  };

  // History filtering
  const filteredRecords = records.filter((record) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      !keyword ||
      String(record.product_name || '').toLowerCase().includes(keyword) ||
      String(record.inspection_number || '').toLowerCase().includes(keyword) ||
      String(record.inspection_id || '').includes(keyword) ||
      String(record.id || '').includes(keyword);

    const status = String(record.ocr_status || 'pending')
      .toLowerCase()
      .trim();

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Completed' && status === 'completed') ||
      (statusFilter === 'Pending' &&
        ['pending', 'processing'].includes(status)) ||
      (statusFilter === 'Failed' &&
        ['failed', 'error'].includes(status));

    return matchesSearch && matchesStatus;
  });

  const totalPages =
    Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Demo mode
  if (isDemoMode) {
    return (
      <div className="space-y-6">
        <header className={`${cardClass} flex items-center justify-between p-5`}>
          <div>
            <h2 className="text-xl font-bold text-[#17211B] dark:text-[#F0FDF4]">
              OCR Results - Demo
            </h2>
            <p className={secondaryTextClass}>
              Sample data for interface preview.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/compliance-results?demo=true')}
            className="rounded-xl bg-[#15803D] px-4 py-2 text-xs font-semibold text-white"
          >
            <Scale className="mr-1 inline h-4 w-4" />
            Compliance Results
          </button>
        </header>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-300">
          <Beaker className="mr-2 inline h-4 w-4" />
          Demo data only. This is not a real inspection result.
        </div>

        <ProductFields
          items={MOCK_PRODUCT_FIELDS_PREVIEW}
          isPreview
        />

        <section className={`${cardClass} p-5`}>
          <h3 className={titleClass}>Extracted text</h3>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-7">
            {MOCK_OCR_RESPONSE.extracted_text}
          </pre>
        </section>

        <button
          type="button"
          onClick={() => setSearchParams({})}
          className="rounded-xl border px-4 py-2 text-xs font-semibold"
        >
          Exit demo
        </button>
      </div>
    );
  }

  // Individual OCR result view
  if (hasIdentifiers) {
    return (
      <div className="space-y-6">
        <header className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
              OCR Analysis
            </span>

            <h2 className="mt-1 text-xl font-bold text-[#17211B] dark:text-[#F0FDF4]">
              OCR Result Details
            </h2>

            <p className={`${secondaryTextClass} mt-1`}>
              Inspection #{inspectionId} · Evidence #{evidenceId}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={returnToHistory}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#647067] dark:border-[#29382D] dark:text-[#A3B3A6]"
            >
              <ArrowLeft className="h-4 w-4" />
              All OCR Results
            </button>

            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({
                  inspectionId: String(inspectionId),
                  evidenceId: String(evidenceId),
                });

                navigate(`/compliance-results?${params.toString()}`);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#15803D] dark:border-[#29382D] dark:text-[#4ADE80]"
            >
              <Scale className="h-4 w-4" />
              Compliance Results
            </button>

            <button
              type="button"
              onClick={loadOcrResult}
              disabled={isLoadingResult}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingResult ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {loadError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {loadError}
          </div>
        )}

        {isLoadingResult ? (
          <div className={`${cardClass} flex min-h-56 flex-col items-center justify-center p-8`}>
            <LoaderCircle className="h-8 w-8 animate-spin text-[#15803D]" />
            <h3 className={`${titleClass} mt-3`}>Loading OCR results</h3>
            <p className={`${secondaryTextClass} mt-1`}>
              Please wait while the result is prepared.
            </p>
          </div>
        ) : !ocrResult ? (
          <EmptyState
            icon={FileText}
            title="OCR result unavailable"
            description="The selected evidence does not have an available OCR response."
            action={
              <button
                type="button"
                onClick={returnToHistory}
                className="rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white"
              >
                Back to OCR History
              </button>
            }
          />
        ) : (
          <>
            <section className={`${cardClass} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className={titleClass}>Extraction status</h3>
                  <p className={`${secondaryTextClass} mt-1`}>
                    Current state of OCR extraction.
                  </p>
                </div>

                <OcrStatusBadge status={ocrResult.status} />
              </div>

              {isProcessing && (
                <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
                  OCR is still processing. This page will check again automatically.
                </p>
              )}

              {isFailed && (
                <p className="mt-4 text-xs text-red-600 dark:text-red-400">
                  {ocrResult.error || 'OCR processing failed.'}
                </p>
              )}
            </section>

            <ProductFields
              items={
                extractedFields?.fields
                  ? Object.entries(extractedFields.fields).map(([key, value]) => ({
                      key,
                      label: key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (char) => char.toUpperCase()),
                      value: value ?? '',
                      status:
                        extractedFields.field_statuses?.[key] ||
                        'not_detected',
                      confidence:
                        extractedFields.field_confidences?.[key] ?? null,
                    }))
                  : []
              }
              isLoading={isLoadingResult}
              isProcessing={isProcessing}
              error={
                isFailed
                  ? ocrResult.error || 'OCR processing failed.'
                  : fieldsError
              }
              onSave={handleSaveCorrections}
              isSaving={isSavingFields}
            />

            {saveMessage && (
              <p className="text-sm text-green-600">{saveMessage}</p>
            )}

            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className={`${cardClass} min-w-0 p-5`}>
                <div className="flex items-center gap-2 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
                  <Clipboard className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
                  <h3 className={titleClass}>Extracted text</h3>
                </div>

                {isProcessing ? (
                  <p className={`${secondaryTextClass} mt-4`}>
                    Text will appear when OCR processing is complete.
                  </p>
                ) : isFailed ? (
                  <p className={`${secondaryTextClass} mt-4`}>
                    Extracted text is unavailable.
                  </p>
                ) : ocrResult.extracted_text ? (
                  <pre className="mt-4 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#F7FAF7] p-4 text-sm leading-7 dark:bg-[#141D17]">
                    {ocrResult.extracted_text}
                  </pre>
                ) : (
                  <p className={`${secondaryTextClass} mt-4`}>
                    No extracted text was returned.
                  </p>
                )}
              </section>

              <ConfidenceDisplay confidence={ocrResult.confidence} />
            </div>
          </>
        )}
      </div>
    );
  }

  // Complete OCR history view
  return (
    <div className="space-y-6">
      <header className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            Inspection Records
          </span>

          <h2 className="mt-1 text-xl font-bold text-[#17211B] dark:text-[#F0FDF4] sm:text-2xl">
            OCR Results History
          </h2>

          <p className={`${secondaryTextClass} mt-1`}>
            OCR records retrieved from all uploaded inspection evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          disabled={isLoadingHistory}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[#E5EDE6] px-4 py-2.5 text-xs font-semibold text-[#647067] disabled:opacity-50 dark:border-[#29382D] dark:text-[#A3B3A6]"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {historyError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {historyError}
          <button
            type="button"
            onClick={loadHistory}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <section className={`${cardClass} space-y-4 p-4`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#647067]" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product or inspection ID..."
              className="w-full rounded-xl border border-[#E5EDE6] bg-[#F7FAF7] py-2.5 pl-9 pr-3 text-xs dark:border-[#29382D] dark:bg-[#141D17] dark:text-[#F0FDF4]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#E5EDE6] bg-[#F7FAF7] p-2.5 text-xs dark:border-[#29382D] dark:bg-[#141D17] dark:text-[#F0FDF4]"
          >
            <option value="All">All OCR statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending / Processing</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5EDE6] pt-3 dark:border-[#29382D]">
          <p className={secondaryTextClass}>
            {filteredRecords.length} OCR record(s) found
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('All');
              setCurrentPage(1);
            }}
            className="text-xs font-semibold text-[#15803D] dark:text-[#4ADE80]"
          >
            Clear filters
          </button>
        </div>
      </section>

      {isLoadingHistory ? (
        <div className={`${cardClass} flex min-h-48 flex-col items-center justify-center p-8`}>
          <LoaderCircle className="h-8 w-8 animate-spin text-[#15803D]" />
          <p className={`${secondaryTextClass} mt-3`}>
            Loading OCR history from database...
          </p>
        </div>
      ) : records.length === 0 && !historyError ? (
        <EmptyState
          icon={FileText}
          title="No OCR records yet"
          description="Uploaded inspection evidence will appear here once it is available in the database."
          action={
            <button
              type="button"
              onClick={() => navigate('/new-inspection')}
              className="rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white"
            >
              <ScanLine className="mr-2 inline h-4 w-4" />
              New Inspection
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {paginatedRecords.map((record) => (
              <article
                key={`${record.inspection_id}-${record.id}`}
                className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#E5EDE6] bg-[#F0FDF4] px-2 py-1 font-mono text-[11px] font-semibold text-[#15803D] dark:border-[#29382D] dark:bg-[#173D26] dark:text-[#4ADE80]">
                      {record.inspection_number}
                    </span>

                    <span className={secondaryTextClass}>
                      Evidence #{record.id}
                    </span>
                  </div>

                  <h3 className="mt-2 truncate text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
                    {record.product_name}
                  </h3>

                  <p className={`${secondaryTextClass} mt-1`}>
                    {record.uploaded_at
                      ? `Uploaded: ${new Date(record.uploaded_at).toLocaleString()}`
                      : 'Upload date unavailable'}
                  </p>

                  <div className="mt-3">
                    <OcrStatusBadge
                      status={record.ocr_status || 'pending'}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openResult(record)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534] dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
                >
                  <Eye className="h-4 w-4" />
                  View Results
                </button>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-[#E5EDE6] bg-white p-4 dark:border-[#29382D] dark:bg-[#19241C]">
              <p className={secondaryTextClass}>
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                  className="rounded-lg border border-[#E5EDE6] px-3 py-2 text-xs disabled:opacity-40 dark:border-[#29382D]"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  className="rounded-lg border border-[#E5EDE6] px-3 py-2 text-xs disabled:opacity-40 dark:border-[#29382D]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
