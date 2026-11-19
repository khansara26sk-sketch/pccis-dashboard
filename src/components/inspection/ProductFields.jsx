import React from 'react';
import {
  AlertCircle,
  CircleHelp,
  Info,
  LoaderCircle,
  Tag,
} from 'lucide-react';

const cardClass =
  'bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]';
const titleClass =
  'text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]';
const secondaryTextClass =
  'text-xs text-[#647067] dark:text-[#A3B3A6]';

const unavailableFields = [
  { id: 'product-name', label: 'Product name' },
  { id: 'batch-number', label: 'Batch number' },
  { id: 'manufacturing-date', label: 'Manufacturing date' },
  { id: 'expiry-date', label: 'Expiry date' },
];

const getDisplayValue = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

function ProductFieldCard({ field, index }) {
  const label =
    typeof field?.label === 'string' && field.label.trim()
      ? field.label.trim()
      : `Field ${index + 1}`;
  const value = getDisplayValue(field?.value);
  const hasConfidence =
    typeof field?.confidence === 'number' &&
    Number.isFinite(field.confidence);

  return (
    <article
      className={`min-w-0 rounded-xl border p-4 ${
        value
          ? 'border-[#E5EDE6] bg-[#F7FAF7]/70 dark:border-[#29382D] dark:bg-[#141D17]/60'
          : 'border-dashed border-[#D5DFD7] bg-[#F7FAF7]/50 dark:border-[#35463A] dark:bg-[#141D17]/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="min-w-0 break-words text-xs font-semibold leading-5 text-[#17211B] dark:text-[#F0FDF4]">
          {label}
        </h4>
        {!value && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E5EDE6] px-2 py-0.5 text-[10px] font-medium text-[#647067] dark:border-[#29382D] dark:text-[#A3B3A6]">
            <CircleHelp className="h-3 w-3" />
            Unavailable
          </span>
        )}
      </div>

      <p
        className={`mt-3 break-words text-sm leading-6 ${
          value
            ? 'font-medium text-[#17211B] dark:text-[#F0FDF4]'
            : 'italic text-[#647067] dark:text-[#A3B3A6]'
        }`}
      >
        {value || 'No value provided'}
      </p>

      {hasConfidence && (
        <p className="mt-3 border-t border-[#E5EDE6] pt-2 text-[11px] text-[#647067] dark:border-[#29382D] dark:text-[#A3B3A6]">
          Field confidence: {field.confidence.toFixed(1)}%
        </p>
      )}
    </article>
  );
}

export default function ProductFields({
  items = [],
  isLoading = false,
  isProcessing = false,
  error = null,
  isPreview = false,
}) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const fieldsToRender = hasItems
    ? items
    : unavailableFields.map((field) => ({ ...field, value: null }));

  return (
    <section
      className={`${cardClass} min-w-0 p-5 sm:p-6`}
      aria-labelledby="product-fields-heading"
    >
      <div className="flex flex-col gap-3 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80]" />
          <div>
            <h3 id="product-fields-heading" className={titleClass}>
              Product fields
            </h3>
            <p className={`${secondaryTextClass} mt-1`}>
              Structured details identified from the package label.
            </p>
          </div>
        </div>
        {hasItems && (
          <span className="w-fit rounded-full border border-[#E5EDE6] bg-[#F0FDF4] px-2.5 py-1 text-[11px] font-semibold text-[#15803D] dark:border-[#29382D] dark:bg-[#173D26] dark:text-[#4ADE80]">
            {items.length} {items.length === 1 ? 'field' : 'fields'}
          </span>
        )}
      </div>

      {isPreview && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-800 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs leading-relaxed">
            Preview sample only. These values are not extracted from an uploaded
            image and are not actual inspection results.
          </p>
        </div>
      )}

      {error ? (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-50/70 p-4 text-xs text-[#DC2626] dark:bg-red-950/20 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Product fields unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div
          className="mt-5 flex min-h-32 flex-col items-center justify-center rounded-xl bg-[#F7FAF7] p-5 text-center dark:bg-[#141D17]"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="h-6 w-6 animate-spin text-[#15803D] dark:text-[#4ADE80]" />
          <p className={`${titleClass} mt-2`}>Loading product fields</p>
          <p className={`${secondaryTextClass} mt-1`}>
            Please wait while the OCR result is retrieved.
          </p>
        </div>
      ) : isProcessing ? (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-[#92400E] dark:text-amber-300"
          role="status"
        >
          <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
          <p>Product fields will be available when OCR processing completes.</p>
        </div>
      ) : (
        <>
          {!hasItems && !isPreview && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#E5EDE6] bg-[#F7FAF7] p-3 text-[#647067] dark:border-[#29382D] dark:bg-[#141D17] dark:text-[#A3B3A6]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">
                Structured fields are not included in the current OCR response.
                Values will appear here once the API provides them.
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {fieldsToRender.map((field, index) => (
              <ProductFieldCard
                key={field?.id ?? field?.key ?? index}
                field={field}
                index={index}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
