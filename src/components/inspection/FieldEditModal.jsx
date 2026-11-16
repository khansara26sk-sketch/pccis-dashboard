import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

export default function FieldEditModal({
  isOpen,
  onClose,
  fieldKey,
  fieldData,
  fieldLabel,
  onSave
}) {
  const [val, setVal] = useState('');
  const [status, setStatus] = useState('Detected');

  useEffect(() => {
    if (fieldData) {
      setVal(fieldData.value || '');
      setStatus(fieldData.status || 'Detected');
    }
  }, [fieldData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(fieldKey, {
      ...fieldData,
      value: val,
      status: status,
      confidence: 100, // Manually verified by inspector
      manuallyEdited: true,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Verify & Edit: ${fieldLabel || fieldKey}`}
      subtitle="Update the extracted field based on physical verification of the package label."
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] shadow-xs transition-colors"
          >
            Save Verification
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
            Verified Declaration Text
          </label>
          <textarea
            rows={3}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full p-3 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] text-[#17211B] dark:text-[#F0FDF4] text-xs font-mono focus:border-[#15803D] dark:focus:border-[#4ADE80] focus:outline-none transition-colors"
            placeholder="Enter verified label declaration..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
            Field Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] text-[#17211B] dark:text-[#F0FDF4] text-xs focus:border-[#15803D] dark:focus:border-[#4ADE80] focus:outline-none transition-colors"
          >
            <option value="Detected">Detected / Verified Present</option>
            <option value="Uncertain">Uncertain / Partially Legible</option>
            <option value="Unreadable">Unreadable / Damaged Label</option>
            <option value="Not Detected">Not Detected / Omitted</option>
            <option value="Not Applicable">Not Applicable</option>
          </select>
        </div>

        <div className="p-3 rounded-xl bg-[#F0FDF4] dark:bg-[#173D26]/40 border border-[#E5EDE6] dark:border-[#29382D] text-[11px] text-[#647067] dark:text-[#A3B3A6]">
          <span className="font-semibold text-[#15803D] dark:text-[#4ADE80]">Audit trail:</span> Manual corrections are tagged as human-verified and locked in the inspection ledger with 100% corroboration.
        </div>
      </form>
    </Modal>
  );
}
