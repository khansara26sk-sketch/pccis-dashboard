import React from 'react';
import { Edit3 } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatConfidence, getConfidenceColorClass } from '../../utils/formatters';

const fieldLabels = {
  productName: { label: 'Product / Common Generic Name', ruleRef: 'Rule 6(1)(a)' },
  manufacturer: { label: 'Manufacturer / Packer / Importer', ruleRef: 'Rule 6(1)(b)' },
  address: { label: 'Registered Premises / Full Address', ruleRef: 'Rule 6(1)(b)' },
  netQuantity: { label: 'Net Quantity (Weight / Measure / Count)', ruleRef: 'Rule 6(1)(d)' },
  mrp: { label: 'Maximum Retail Price (MRP)', ruleRef: 'Rule 6(1)(e)' },
  packagingDate: { label: 'Month & Year of Manufacture / Packing', ruleRef: 'Rule 6(1)(f)' },
  consumerCare: { label: 'Consumer Care & Grievance Helpline', ruleRef: 'Rule 6(1)(n)' },
  countryOfOrigin: { label: 'Country of Origin', ruleRef: 'Rule 6(10)' },
};

export default function ExtractedFieldsList({
  fields = {},
  onEditField,
  activeFieldKey,
  onHoverField
}) {
  return (
    <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-5 shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5EDE6] dark:border-[#29382D]">
        <div>
          <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
            Extracted Statutory Declarations
          </h3>
          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
            OCR entity extraction mapped to Legal Metrology Rule 6 mandatory requirements.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border border-[#E5EDE6] dark:border-[#29382D]">
          {Object.keys(fields).length} Fields Monitored
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(fieldLabels).map(([key, meta]) => {
          const item = fields[key] || { value: 'Not Detected', confidence: 0, status: 'Not Detected' };
          const isHovered = activeFieldKey === key;

          return (
            <div
              key={key}
              onMouseEnter={() => onHoverField && onHoverField(key)}
              onMouseLeave={() => onHoverField && onHoverField(null)}
              className={`p-3.5 rounded-xl border transition-all ${
                isHovered
                  ? 'border-[#15803D] bg-[#F0FDF4] dark:bg-[#173D26]/40 shadow-xs'
                  : 'border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7]/60 dark:bg-[#141D17]/40 hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                    {meta.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#647067] dark:text-[#A3B3A6] bg-[#E5EDE6]/60 dark:bg-[#29382D] px-1.5 py-0.5 rounded">
                    {meta.ruleRef}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.confidence > 0 && (
                    <span
                      className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border ${getConfidenceColorClass(
                        item.confidence
                      )}`}
                    >
                      {formatConfidence(item.confidence)}
                    </span>
                  )}
                  <StatusBadge status={item.status} size="sm" />
                  <button
                    type="button"
                    onClick={() => onEditField && onEditField(key, item, meta.label)}
                    className="p-1 rounded-md text-[#647067] hover:text-[#15803D] dark:hover:text-[#4ADE80] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors ml-1"
                    title={`Edit ${meta.label}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#19241C] p-2.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] text-xs font-mono text-[#17211B] dark:text-[#F0FDF4] leading-relaxed break-all">
                {item.value || <span className="text-[#647067] italic">No value detected</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
