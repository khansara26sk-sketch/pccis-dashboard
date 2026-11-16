import React, { useState } from 'react';
import { Send } from 'lucide-react';
import Modal from '../common/Modal';

export default function SubmitReviewModal({
  isOpen,
  onClose,
  packageData,
  onSubmit,
  isSubmitting = false
}) {
  const [decision, setDecision] = useState('Compliant');
  const [notes, setNotes] = useState('');
  const [officerName, setOfficerName] = useState('Officer A. Sharma');
  const [department, setDepartment] = useState('Legal Metrology Directorate');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      decision,
      notes,
      officerName,
      department,
      submittedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Inspector Sign-Off & Submission"
      subtitle="Corroborate automated OCR findings and record official inspection determination."
      maxWidth="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] transition-colors"
          >
            Back to Review
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting Record...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Submit Inspection</span>
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product summary card */}
        <div className="p-3.5 rounded-xl bg-[#F7FAF7] dark:bg-[#141D17] border border-[#E5EDE6] dark:border-[#29382D] text-xs">
          <p className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">
            {packageData?.name || 'Inspected Package'}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
            <span>Category: {packageData?.category || 'Packaged Commodity'}</span>
            <span>•</span>
            <span>ID: {packageData?.id || 'PKG-NEW'}</span>
          </div>
        </div>

        {/* Inspector Decision Radios */}
        <div>
          <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-2">
            Official Compliance Determination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                decision === 'Compliant'
                  ? 'border-[#15803D] bg-[#F0FDF4] dark:bg-[#173D26]/40 text-[#15803D] dark:text-[#4ADE80] ring-1 ring-[#15803D]'
                  : 'border-[#E5EDE6] dark:border-[#29382D] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/30'
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="Compliant"
                checked={decision === 'Compliant'}
                onChange={() => setDecision('Compliant')}
                className="mt-0.5 accent-[#15803D]"
              />
              <div className="text-xs">
                <span className="font-semibold block text-[#17211B] dark:text-[#F0FDF4]">Compliant (No Issue)</span>
                <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">All mandatory rules satisfied.</span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                decision === 'Potential Issue'
                  ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20 text-[#DC2626] ring-1 ring-red-500'
                  : 'border-[#E5EDE6] dark:border-[#29382D] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/30'
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="Potential Issue"
                checked={decision === 'Potential Issue'}
                onChange={() => setDecision('Potential Issue')}
                className="mt-0.5 accent-red-600"
              />
              <div className="text-xs">
                <span className="font-semibold block text-[#17211B] dark:text-[#F0FDF4]">Potential Issue</span>
                <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">Flag for Senior Officer inquiry.</span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                decision === 'Manual Review'
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-[#D97706] ring-1 ring-amber-500'
                  : 'border-[#E5EDE6] dark:border-[#29382D] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/30'
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="Manual Review"
                checked={decision === 'Manual Review'}
                onChange={() => setDecision('Manual Review')}
                className="mt-0.5 accent-amber-600"
              />
              <div className="text-xs">
                <span className="font-semibold block text-[#17211B] dark:text-[#F0FDF4]">Manual Review Required</span>
                <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">Optical blur or secondary physical check.</span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                decision === 'Re-inspection'
                  ? 'border-[#15803D] bg-[#F0FDF4] dark:bg-[#173D26]/40 text-[#15803D] dark:text-[#4ADE80] ring-1 ring-[#15803D]'
                  : 'border-[#E5EDE6] dark:border-[#29382D] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/30'
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="Re-inspection"
                checked={decision === 'Re-inspection'}
                onChange={() => setDecision('Re-inspection')}
                className="mt-0.5 accent-[#15803D]"
              />
              <div className="text-xs">
                <span className="font-semibold block text-[#17211B] dark:text-[#F0FDF4]">Order Re-inspection</span>
                <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6]">Request clear fresh sample image.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
            Inspector Findings & Justification
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document rationale, specific rule clauses cited, or physical corroboration details..."
            className="w-full p-3 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-white dark:bg-[#19241C] text-[#17211B] dark:text-[#F0FDF4] text-xs focus:border-[#15803D] dark:focus:border-[#4ADE80] focus:outline-none transition-colors"
          />
        </div>

        {/* Signer credentials */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-medium text-[#647067] dark:text-[#A3B3A6] mb-1">
              Signing Officer
            </label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#647067] dark:text-[#A3B3A6] mb-1">
              Authority / Directorate
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 text-xs rounded-lg border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4]"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
