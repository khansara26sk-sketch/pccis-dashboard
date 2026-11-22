import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  FileImage,
  FileText,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';

import InspectionReviewPanel from '../components/inspection/InspectionReviewPanel';
import ProductFields from '../components/inspection/ProductFields';
import RuleResultCard from '../components/inspection/RuleResultCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  fetchInspectionEvidenceFile,
  fetchInspectionReport,
  isValidInspectionEvidenceUrl,
} from '../services/inspectionReportService';
import { getApiErrorMessage } from '../services/apiError';
import { formatDate } from '../utils/formatters';

const cardClass =
  'rounded-2xl border border-[#E5EDE6] bg-white shadow-[0_2px_8px_rgba(21,128,61,0.03)] dark:border-[#29382D] dark:bg-[#19241C]';
const titleClass = 'text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]';
const secondaryTextClass = 'text-xs text-[#647067] dark:text-[#A3B3A6]';

const parseInspectionId = (value) => {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const humanizeFieldName = (value) =>
  typeof value === 'string' && value.trim()
    ? value
        .trim()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Unnamed field';

const formatFileSize = (size) => {
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
    return 'Not provided';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

function OverviewItem({ label, children }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E5EDE6] bg-[#F7FAF7]/70 p-3.5 dark:border-[#29382D] dark:bg-[#141D17]/60">
      <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">{label}</p>
      <div className="mt-1 break-words text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
        {children || 'Not provided'}
      </div>
    </div>
  );
}

function EvidenceFileButton({ url, label }) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState('');

  if (!isValidInspectionEvidenceUrl(url)) {
    return null;
  }

  const handleOpen = async () => {
    setError('');
    const popup = window.open('about:blank', '_blank');

    if (!popup) {
      setError('Allow pop-ups to open this authenticated evidence file.');
      return;
    }

    popup.opener = null;
    setIsOpening(true);

    try {
      const blob = await fetchInspectionEvidenceFile(url);
      const objectUrl = URL.createObjectURL(blob);
      popup.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (requestError) {
      popup.close();
      setError(
        getApiErrorMessage(requestError, 'open this evidence file')
      );
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isOpening}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5EDE6] px-3 py-2 text-[11px] font-semibold text-[#15803D] transition-colors hover:bg-[#F0FDF4] disabled:cursor-wait disabled:opacity-50 dark:border-[#29382D] dark:text-[#4ADE80] dark:hover:bg-[#173D26]"
      >
        {isOpening ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ExternalLink className="h-3.5 w-3.5" />
        )}
        {isOpening ? 'Opening…' : label}
      </button>
      {error && (
        <p className="mt-2 text-[11px] text-[#DC2626] dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReportLoadState({ isLoading, error, onRetry }) {
  return (
    <div
      className={`${cardClass} flex min-h-64 flex-col items-center justify-center p-8 text-center`}
      role={error ? 'alert' : 'status'}
      aria-live={isLoading ? 'polite' : undefined}
    >
      {isLoading ? (
        <LoaderCircle className="h-8 w-8 animate-spin text-[#15803D] dark:text-[#4ADE80]" />
      ) : (
        <AlertCircle className="h-8 w-8 text-[#DC2626] dark:text-red-400" />
      )}
      <h2 className={`${titleClass} mt-3`}>
        {isLoading ? 'Loading inspection report' : 'Unable to load inspection report'}
      </h2>
      <p className={`${secondaryTextClass} mt-2 max-w-lg`}>
        {isLoading ? 'Retrieving inspection data and review history.' : error}
      </p>
      {!isLoading && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2 text-xs font-semibold text-[#15803D] hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#4ADE80] dark:hover:bg-[#173D26]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}

export default function InspectionReport() {
  const { inspectionId: routeInspectionId } = useParams();
  const navigate = useNavigate();
  const inspectionId = parseInspectionId(routeInspectionId);
  const [requestResult, setRequestResult] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${inspectionId ?? 'invalid'}-${reloadKey}`;

  useEffect(() => {
    if (!inspectionId) {
      return undefined;
    }

    const controller = new AbortController();
    fetchInspectionReport(inspectionId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setRequestResult({ key: requestKey, data });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRequestResult({
            key: requestKey,
            error: getApiErrorMessage(error, 'load this inspection report'),
          });
        }
      });

    return () => controller.abort();
  }, [inspectionId, requestKey]);

  const currentResult =
    requestResult?.key === requestKey ? requestResult : null;
  const report = currentResult?.data || null;
  const errorMessage = inspectionId
    ? currentResult?.error || ''
    : 'A valid inspection ID is required to view this report.';
  const isLoading = Boolean(inspectionId) && currentResult === null;

  const handleReviewsUpdated = (history) => {
    setRequestResult((current) => {
      if (current?.key !== requestKey || !current.data) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          inspection: {
            ...current.data.inspection,
            review_status:
              history?.review_status ??
              current.data.inspection?.review_status,
          },
          reviews: Array.isArray(history?.reviews)
            ? history.reviews
            : current.data.reviews,
        },
      };
    });
  };

  if (isLoading || errorMessage || !report) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-xs font-semibold text-[#15803D] hover:underline dark:text-[#4ADE80]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to inspection history
        </button>
        <ReportLoadState
          isLoading={isLoading}
          error={errorMessage}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      </div>
    );
  }

  const inspection = report.inspection || {};
  const evidence = Array.isArray(report.evidence) ? report.evidence : [];
  const extractedFields = Array.isArray(report.extracted_fields)
    ? report.extracted_fields
    : [];
  const complianceResults = Array.isArray(report.compliance_results)
    ? report.compliance_results
    : [];
  const reviews = Array.isArray(report.reviews) ? report.reviews : [];

  const productFields = extractedFields.map((field) => ({
    id: field?.id,
    label: `${humanizeFieldName(field?.field_name)}${
      field?.manually_corrected ? ' (corrected)' : ''
    }`,
    value:
      typeof field?.extracted_value === 'string' &&
      field.extracted_value.trim()
        ? field.extracted_value
        : null,
    ...(typeof field?.confidence === 'number' &&
    Number.isFinite(field.confidence)
      ? { confidence: field.confidence }
      : {}),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            Inspection report
          </span>
          <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] sm:text-2xl">
            {inspection.inspection_number || `Inspection #${inspectionId}`}
          </h1>
          <p className={`${secondaryTextClass} mt-1`}>
            {inspection.product_name || 'Product name not provided'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#647067] transition-colors hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#A3B3A6] dark:hover:bg-[#173D26]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inspection history
        </button>
      </header>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
          <FileText className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
          <h2 className={titleClass}>Inspection overview</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <OverviewItem label="Inspection number">
            {inspection.inspection_number}
          </OverviewItem>
          <OverviewItem label="Product name">{inspection.product_name}</OverviewItem>
          <OverviewItem label="Inspector">{inspection.inspector_name}</OverviewItem>
          <OverviewItem label="Inspection date">
            {inspection.inspection_date
              ? formatDate(inspection.inspection_date)
              : 'Not provided'}
          </OverviewItem>
          <OverviewItem label="Inspection status">
            {inspection.status ? (
              <StatusBadge status={inspection.status} size="sm" />
            ) : (
              'Not provided'
            )}
          </OverviewItem>
          <OverviewItem label="Review status">
            {inspection.review_status ? (
              <StatusBadge status={inspection.review_status} size="sm" />
            ) : (
              'Not provided'
            )}
          </OverviewItem>
          <OverviewItem label="Overall result">
            {inspection.overall_result ? (
              <StatusBadge
                status={inspection.overall_result}
                displayLabel={inspection.overall_result}
                size="sm"
              />
            ) : (
              'Not provided'
            )}
          </OverviewItem>
        </div>
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
          <FileImage className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
          <h2 className={titleClass}>Evidence</h2>
          <span className={`${secondaryTextClass} ml-auto`}>
            {evidence.length} {evidence.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        {evidence.length === 0 ? (
          <p className={`${secondaryTextClass} mt-4`}>
            No evidence files are attached to this inspection.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {evidence.map((item, index) => (
              <li
                key={item?.id ?? `evidence-${index}`}
                className="rounded-xl border border-[#E5EDE6] p-4 dark:border-[#29382D]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                      {item?.original_filename || 'Filename not provided'}
                    </p>
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[11px] sm:grid-cols-2">
                      <div>
                        <dt className="text-[#647067] dark:text-[#A3B3A6]">Content type</dt>
                        <dd className="mt-0.5 break-all font-medium text-[#17211B] dark:text-[#F0FDF4]">
                          {item?.content_type || 'Not provided'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#647067] dark:text-[#A3B3A6]">File size</dt>
                        <dd className="mt-0.5 font-medium text-[#17211B] dark:text-[#F0FDF4]">
                          {formatFileSize(item?.file_size_bytes)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#647067] dark:text-[#A3B3A6]">Upload record</dt>
                        <dd className="mt-0.5 font-medium text-[#17211B] dark:text-[#F0FDF4]">
                          {item?.uploaded_at
                            ? `Uploaded ${formatDate(item.uploaded_at)}`
                            : 'Upload date not provided'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#647067] dark:text-[#A3B3A6]">Preprocessing</dt>
                        <dd className="mt-0.5">
                          <StatusBadge
                            status={item?.preprocessing_status || 'Unknown'}
                            size="sm"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#647067] dark:text-[#A3B3A6]">OCR</dt>
                        <dd className="mt-0.5">
                          <StatusBadge status={item?.ocr_status || 'Unknown'} size="sm" />
                        </dd>
                      </div>
                    </dl>
                    {(item?.preprocessing_error || item?.ocr_error) && (
                      <div className="mt-3 space-y-1 text-[11px] text-[#DC2626] dark:text-red-400">
                        {item?.preprocessing_error && (
                          <p>Preprocessing error: {item.preprocessing_error}</p>
                        )}
                        {item?.ocr_error && <p>OCR error: {item.ocr_error}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <EvidenceFileButton
                      url={item?.original_url}
                      label="View original"
                    />
                    <EvidenceFileButton
                      url={item?.processed_url}
                      label="View processed"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
          <h2 className={titleClass}>Extracted product fields</h2>
          <p className={`${secondaryTextClass} mt-1`}>
            Values and confidence are shown only when provided by the backend.
          </p>
        </div>
        {productFields.length === 0 ? (
          <p className={`${secondaryTextClass} mt-4`}>
            No extracted product fields are available for this inspection.
          </p>
        ) : (
          <div className="mt-4">
            <ProductFields items={productFields} />
          </div>
        )}
      </section>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
          <h2 className={titleClass}>Compliance findings</h2>
          <p className={`${secondaryTextClass} mt-1`}>
            Saved screening results only; this report does not run new checks.
          </p>
        </div>
        {complianceResults.length === 0 ? (
          <p className={`${secondaryTextClass} mt-4`}>
            No compliance findings are included in this report.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {complianceResults.map((result, index) => (
              <RuleResultCard
                key={`${result?.rule_id || 'rule'}-${index}`}
                name={`${result?.rule_id || 'Rule'}${
                  result?.field_name ? ` · ${result.field_name}` : ''
                }`}
                status={result?.status}
                explanation={result?.explanation}
                evidenceText={result?.evidence_text}
              />
            ))}
          </div>
        )}
      </section>

      <InspectionReviewPanel
        inspectionId={inspectionId}
        inspectionOwnerId={inspection.inspector_id}
        reviewStatus={inspection.review_status}
        initialReviews={reviews}
        onReviewsUpdated={handleReviewsUpdated}
        key={inspectionId}
      />

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-[#92400E] dark:text-amber-300">
          Backend disclaimer
        </h2>
        {typeof report.disclaimer === 'string' && report.disclaimer ? (
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#92400E] dark:text-amber-200">
            {report.disclaimer}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#92400E] dark:text-amber-200">
            No disclaimer was provided in this report response.
          </p>
        )}
      </section>
    </div>
  );
}
