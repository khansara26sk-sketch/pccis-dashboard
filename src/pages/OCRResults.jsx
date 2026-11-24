import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Beaker,
  CheckCircle2,
  Clipboard,
  FileText,
  LoaderCircle,
  RefreshCw,
  Scale,
  ScanLine,
  XCircle,
} from 'lucide-react';

import EmptyState from '../components/common/EmptyState';
import ProductFields from '../components/inspection/ProductFields';
import { MOCK_OCR_RESPONSE } from '../services/mockOcrResponse';
import { MOCK_PRODUCT_FIELDS_PREVIEW } from '../services/mockProductFields';
import { fetchInspectionEvidence } from '../services/inspectionService';
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


const parseIdentifier = (value) => {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const identifier = Number(value);
  return Number.isSafeInteger(identifier) && identifier > 0
    ? identifier
    : null;
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
    label: 'Processing',
    icon: LoaderCircle,
    classes:
      'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    classes: 'bg-red-500/10 text-[#DC2626] dark:text-red-400 border-red-500/20',
  },
  error: {
    label: 'Failed',
    icon: XCircle,
    classes: 'bg-red-500/10 text-[#DC2626] dark:text-red-400 border-red-500/20',
  },
};

function OcrStatusBadge({ status }) {
  const normalizedStatus = String(status ?? '').toLowerCase().trim();
  const details = statusDetails[normalizedStatus] || {
    label: status || 'Unknown',
    icon: AlertCircle,
    classes:
      'bg-neutral-500/10 text-[#647067] dark:text-[#A3B3A6] border-neutral-300 dark:border-neutral-700',
  };
  const Icon = details.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${details.classes}`}
      role="status"
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${
          normalizedStatus === 'processing' || normalizedStatus === 'pending'
            ? 'animate-spin'
            : ''
        }`}
      />
      {details.label}
    </span>
  );
}

function ConfidenceDisplay({ confidence }) {
  const hasConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence);
  const percentage = hasConfidence
    ? Math.min(100, Math.max(0, confidence))
    : null;

  return (
    <section
      className={`${cardClass} p-5`}
      aria-labelledby="ocr-confidence-heading"
    >
      <div className="flex items-center gap-2">
        <ScanLine className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
        <h3 id="ocr-confidence-heading" className={titleClass}>
          OCR confidence
        </h3>
      </div>

      {percentage === null ? (
        <p className={`${secondaryTextClass} mt-4`}>
          Not available. No confidence score was provided.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <span className="text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4]">
              {percentage.toFixed(1)}%
            </span>
            <span className={secondaryTextClass}>Average confidence</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5EDE6] dark:bg-[#29382D]"
            role="progressbar"
            aria-label="OCR confidence"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <div
              className="h-full rounded-full bg-[#15803D] transition-all dark:bg-[#22C55E]"
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
  const inspectionId = parseIdentifier(searchParams.get('inspectionId'));
  const evidenceId = parseIdentifier(searchParams.get('evidenceId'));
  const hasIdentifiers = inspectionId !== null && evidenceId !== null;
  const [ocrResult, setOcrResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [extractedFields, setExtractedFields] = useState(null);
  const [fieldsError, setFieldsError] = useState(null);

  const [isSavingFields, setIsSavingFields] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const requestControllerRef = useRef(null);


const loadOcrResult = useCallback(async () => {
  if (!hasIdentifiers) return;
  if (
    requestControllerRef.current &&
    !requestControllerRef.current.signal.aborted
  ) {
    return;
  }

  const controller = new AbortController();
  requestControllerRef.current = controller;

  setIsLoading(true);
  setLoadError(null);
  setFieldsError(null);
  setOcrResult(null);
  setExtractedFields(null);

  try {
    const result = await fetchOcrResult(inspectionId, evidenceId, {
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;

    setOcrResult(result);

    if (result.status === 'completed') {
      try {
        const fields = await fetchExtractedFields(
          inspectionId,
          evidenceId,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        setExtractedFields(fields);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error('Failed to load extracted fields:', error);
        setFieldsError(
          error.message || 'Product fields could not be loaded.'
        );
      }
    }
  } catch (error) {
    if (controller.signal.aborted) return;

    console.error('Failed to load OCR results:', error);
    setLoadError(
      error.message || 'The OCR result could not be loaded. Please try again.'
    );
  } finally {
    if (!controller.signal.aborted) {
      setIsLoading(false);

      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    }
  }
}, [evidenceId, hasIdentifiers, inspectionId]);


const handleSaveCorrections = async (draftValues) => {
  if (!extractedFields?.fields) return;

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

    const updatedFields = await updateExtractedFields(
      inspectionId,
      evidenceId,
      corrections
    );

    setExtractedFields(updatedFields);
    setSaveMessage('Corrections saved successfully.');
  } catch (error) {
    console.error('Failed to save corrections:', error);
    setSaveError(error.message || 'Could not save corrections.');
  } finally {
    setIsSavingFields(false);
  }
};



  // If only inspectionId is provided in URL, auto-resolve the latest evidenceId
  useEffect(() => {
    if (isDemoMode || !inspectionId || evidenceId) return;

    let isMounted = true;
    (async () => {
      try {
        const response = await fetchInspectionEvidence(inspectionId);
        const evidenceList = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [];
        if (evidenceList.length > 0 && isMounted) {
          const sorted = [...evidenceList].sort(
            (a, b) =>
              new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0) ||
              b.id - a.id
          );
          const target =
            sorted.find(
              (e) => String(e.ocr_status).toLowerCase() === 'completed'
            ) || sorted[0];

          setSearchParams(
            (prev) => {
              const updated = new URLSearchParams(prev);
              updated.set('evidenceId', String(target.id));
              return updated;
            },
            { replace: true }
          );
        }
      } catch (err) {
        console.error('Failed to resolve evidence for inspection:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [evidenceId, inspectionId, isDemoMode, setSearchParams]);

  useEffect(() => {
    if (isDemoMode) {
      setOcrResult(MOCK_OCR_RESPONSE);
      setLoadError(null);
      setIsLoading(false);
      return undefined;
    }

    if (!hasIdentifiers) {
      setOcrResult(null);
      setLoadError(null);
      setIsLoading(false);
      return undefined;
    }

    loadOcrResult();
    return () => {
      requestControllerRef.current?.abort();
    };
  }, [hasIdentifiers, isDemoMode, loadOcrResult]);

  const normalizedStatus = String(ocrResult?.status ?? '')
    .toLowerCase()
    .trim();
  const isProcessing =
    normalizedStatus === 'processing' || normalizedStatus === 'pending';
  const isFailed =
    normalizedStatus === 'failed' || normalizedStatus === 'error';

  // Automatically poll while OCR is pending / processing
  useEffect(() => {
    if (!hasIdentifiers || isDemoMode || !isProcessing) return undefined;

    const timer = setTimeout(() => {
      loadOcrResult();
    }, 2500);

    return () => clearTimeout(timer);
  }, [hasIdentifiers, isDemoMode, isProcessing, loadOcrResult]);

  return (
    <div className="space-y-6">
      <header className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            OCR Analysis
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] sm:text-2xl">
            OCR Results
          </h2>
          <p className={`${secondaryTextClass} mt-1`}>
            {hasIdentifiers ? (
              <span>
                Viewing OCR output for <strong>Inspection #{inspectionId}</strong> (Evidence #{evidenceId})
              </span>
            ) : (
              'Review text extracted from a package label image.'
            )}
          </p>
        </div>
        {isDemoMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/compliance-results?demo=true')}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534] dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
            >
              <Scale className="h-3.5 w-3.5" />
              Demo Compliance
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#647067] transition-colors hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#A3B3A6] dark:hover:bg-[#173D26]"
            >
              Exit demo
            </button>
          </div>
        ) : hasIdentifiers ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({
                  inspectionId: String(inspectionId),
                  evidenceId: String(evidenceId),
                });
                navigate(`/compliance-results?${params.toString()}`);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#15803D] transition-colors hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#4ADE80] dark:hover:bg-[#173D26]"
            >
              <Scale className="h-3.5 w-3.5" />
              Compliance Results
            </button>
            <button
              type="button"
              onClick={loadOcrResult}
              disabled={isLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#647067] transition-colors hover:bg-[#F0FDF4] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#29382D] dark:text-[#A3B3A6] dark:hover:bg-[#173D26]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              Retry
            </button>
          </div>
        ) : null}
      </header>

      {ocrResult?.isMock && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-800 dark:text-amber-300">
          <Beaker className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Day 1 mock response</p>
            <p className="mt-1 text-xs leading-relaxed">
              This sample is for UI preview only. It was not extracted from an
              uploaded image and is not a real inspection result.
            </p>
          </div>
        </div>
      )}

      {loadError && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-50/70 p-4 text-xs text-[#DC2626] dark:bg-red-950/20 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Unable to load OCR results</p>
            <p className="mt-1">{loadError}</p>
            <button
              type="button"
              onClick={loadOcrResult}
              disabled={isLoading}
              className="mt-2 font-semibold underline disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <>
          <div
            className={`${cardClass} flex min-h-56 flex-col items-center justify-center p-8 text-center`}
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="h-8 w-8 animate-spin text-[#15803D] dark:text-[#4ADE80]" />
            <h3 className={`${titleClass} mt-3`}>Loading OCR results</h3>
            <p className={`${secondaryTextClass} mt-1`}>
              Please wait while the result is prepared.
            </p>
          </div>
          <ProductFields isLoading />
        </>
      ) : loadError ? (
        <ProductFields error="Product fields could not be loaded because the OCR result request failed." />
      ) : !ocrResult ? (
        <EmptyState
          icon={FileText}
          title="No OCR result available"
          description="There is no OCR response to display yet. Start an inspection to upload a package label."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/new-inspection')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534] dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
              >
                <ScanLine className="h-4 w-4" />
                New Inspection
              </button>
              <button
                type="button"
                onClick={() => setSearchParams({ demo: 'true' })}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E5EDE6] px-4 py-2.5 text-xs font-semibold text-[#15803D] transition-colors hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#4ADE80] dark:hover:bg-[#173D26]"
              >
                View Day 1 Demo
              </button>
            </div>
          }
        />
      ) : (
        <>
          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#DCFCE7] p-2.5 text-[#15803D] dark:bg-[#173D26] dark:text-[#4ADE80]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={titleClass}>Extraction status</h3>
                  <p className={`${secondaryTextClass} mt-1`}>
                    Current state of the OCR extraction process.
                  </p>
                </div>
              </div>
              <OcrStatusBadge status={ocrResult.status} />
            </div>

            {isProcessing && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-[#92400E] dark:text-amber-300">
                <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                <p>
                  OCR is still processing. The extracted text and confidence
                  will appear when processing is complete.
                </p>
              </div>
            )}

            {isFailed && (
              <div
                className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-50/70 p-4 text-xs text-[#DC2626] dark:bg-red-950/20 dark:text-red-400"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">OCR processing failed</p>
                  <p className="mt-1">
                    {ocrResult.error ||
                      'The image could not be processed. Retry when the image is ready.'}
                  </p>
                  <button
                    type="button"
                    onClick={loadOcrResult}
                    disabled={isLoading}
                    className="mt-2 font-semibold underline disabled:opacity-50"
                  >
                    Check OCR status again
                  </button>
                </div>
              </div>
            )}
          </section>

          <ProductFields
            items={
              isDemoMode
                ? MOCK_PRODUCT_FIELDS_PREVIEW
                : extractedFields?.fields
                  ? Object.entries(extractedFields.fields).map(([key, value]) => ({
                      key,
                      label: key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (char) => char.toUpperCase()),
                      value: value ?? '',
                      status: extractedFields.field_statuses?.[key] ?? 'not_detected',
                      confidence: extractedFields.field_confidences?.[key] ?? null,
                    }))
                  : []
            }
            isLoading={isLoading && !ocrResult}
            isProcessing={isProcessing}
            error={
              isFailed
                ? ocrResult.error ||
                  'Product fields are unavailable because OCR processing failed.'
                : fieldsError
            }
            isPreview={isDemoMode}
            onSave={handleSaveCorrections}
            isSaving={isSavingFields}
          />

{saveMessage && (
  <p className="mt-2 text-sm text-green-600">{saveMessage}</p>
)}

{saveError && (
  <p className="mt-2 text-sm text-red-600">{saveError}</p>
)}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section
              className={`${cardClass} min-w-0 p-5 sm:p-6`}
              aria-labelledby="extracted-text-heading"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
                <div className="flex min-w-0 items-center gap-2">
                  <Clipboard className="h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80]" />
                  <h3 id="extracted-text-heading" className={titleClass}>
                    Extracted text
                  </h3>
                </div>
                <span className="shrink-0 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                  OCR output
                </span>
              </div>
              {isProcessing ? (
                <p className={`${secondaryTextClass} mt-4`}>
                  Text will appear here when OCR processing is complete.
                </p>
              ) : isFailed ? (
                <p className={`${secondaryTextClass} mt-4`}>
                  Extracted text is unavailable because OCR processing failed.
                </p>
              ) : typeof ocrResult.extracted_text === 'string' &&
                ocrResult.extracted_text.trim() ? (
                <pre className="mt-4 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#F7FAF7] p-4 font-sans text-sm leading-7 text-[#17211B] dark:bg-[#141D17] dark:text-[#F0FDF4]">
                  {ocrResult.extracted_text}
                </pre>
              ) : (
                <p className={`${secondaryTextClass} mt-4`}>
                  No extracted text was returned for this image.
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
