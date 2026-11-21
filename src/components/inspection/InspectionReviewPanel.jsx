import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';
import { getApiErrorMessage } from '../../services/apiError';
import {
  fetchInspectionReviews,
  submitInspectionReview,
} from '../../services/reviewService';

const cardClass =
  'rounded-2xl border border-[#E5EDE6] bg-white shadow-[0_2px_8px_rgba(21,128,61,0.03)] dark:border-[#29382D] dark:bg-[#19241C]';

const decisionLabels = {
  approved: 'Approved',
  needs_correction: 'Needs Correction',
};

export default function InspectionReviewPanel({
  inspectionId,
  inspectionOwnerId,
  reviewStatus,
  initialReviews = [],
  onReviewsUpdated,
}) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(
    Array.isArray(initialReviews) ? initialReviews : []
  );
  const [decision, setDecision] = useState('approved');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner =
    user?.id != null &&
    inspectionOwnerId != null &&
    Number(user.id) === Number(inspectionOwnerId);
  const hasReviewerRole = ['Senior Officer', 'Admin'].includes(user?.role);
  const canSubmitReview =
    hasReviewerRole &&
    user?.id != null &&
    inspectionOwnerId != null &&
    !isOwner;
  const commentCharacterCount = Array.from(comments).length;

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort((left, right) => {
        const leftTime = Date.parse(left?.created_at || '');
        const rightTime = Date.parse(right?.created_at || '');
        if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
          return 0;
        }
        return rightTime - leftTime;
      }),
    [reviews]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (commentCharacterCount > 2000) {
      setErrorMessage('Comments must be 2000 characters or fewer.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitInspectionReview(inspectionId, { decision, comments });
      setSuccessMessage('Review submitted successfully.');
      setComments('');

      try {
        const refreshedHistory = await fetchInspectionReviews(inspectionId);
        const refreshedReviews = Array.isArray(refreshedHistory?.reviews)
          ? refreshedHistory.reviews
          : [];

        setReviews(refreshedReviews);
        onReviewsUpdated?.(refreshedHistory);
      } catch (refreshError) {
        setErrorMessage(
          `Review submitted, but history could not be refreshed. ${getApiErrorMessage(
            refreshError,
            'refresh review history'
          )}`
        );
      }
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'submit this inspection review')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex flex-col gap-3 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
            Inspector review
          </h2>
          <p className="mt-1 text-xs text-[#647067] dark:text-[#A3B3A6]">
            Review status: {reviewStatus || 'Not available'}
          </p>
        </div>
        {reviewStatus && <StatusBadge status={reviewStatus} size="sm" />}
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
          Review history
        </h3>

        {sortedReviews.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-[#D5DFD7] p-4 text-xs text-[#647067] dark:border-[#35463A] dark:text-[#A3B3A6]">
            No reviews have been submitted yet.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {sortedReviews.map((review, index) => {
              const label =
                decisionLabels[review?.decision] || review?.decision || 'Unknown';

              return (
                <li
                  key={review?.id ?? `${review?.created_at || 'review'}-${index}`}
                  className="rounded-xl border border-[#E5EDE6] bg-[#F7FAF7]/70 p-4 dark:border-[#29382D] dark:bg-[#141D17]/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        review?.decision === 'approved'
                          ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] dark:border-[#245B35] dark:bg-[#173D26] dark:text-[#4ADE80]'
                          : 'border-amber-500/20 bg-amber-500/10 text-[#B45309] dark:text-amber-300'
                      }`}
                    >
                      {review?.decision === 'approved' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {label}
                    </span>
                    <time
                      className="text-[11px] text-[#647067] dark:text-[#A3B3A6]"
                      dateTime={review?.created_at || undefined}
                    >
                      {review?.created_at
                        ? formatDate(review.created_at)
                        : 'Date unavailable'}
                    </time>
                  </div>
                  <p className="mt-2 text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                    Reviewer{' '}
                    {review?.reviewer_id != null
                      ? `#${review.reviewer_id}`
                      : 'not available'}
                  </p>
                  {review?.comments ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#17211B] dark:text-[#F0FDF4]">
                      {review.comments}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs italic text-[#647067] dark:text-[#A3B3A6]">
                      No comments provided.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {canSubmitReview ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 border-t border-[#E5EDE6] pt-5 dark:border-[#29382D]"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
            Submit a review
          </h3>

          {successMessage && (
            <div
              className="mt-3 flex items-start gap-2 rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] p-3 text-xs text-[#15803D] dark:border-[#245B35] dark:bg-[#173D26] dark:text-[#4ADE80]"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}
          {errorMessage && (
            <div
              className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-50/70 p-3 text-xs text-[#DC2626] dark:bg-red-950/20 dark:text-red-400"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(decisionLabels).map(([value, label]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition-colors ${
                  decision === value
                    ? 'border-[#15803D] bg-[#F0FDF4] text-[#15803D] dark:border-[#4ADE80] dark:bg-[#173D26]/40 dark:text-[#4ADE80]'
                    : 'border-[#E5EDE6] hover:bg-[#F7FAF7] dark:border-[#29382D] dark:hover:bg-[#141D17]'
                }`}
              >
                <input
                  type="radio"
                  name={`review-decision-${inspectionId}`}
                  value={value}
                  checked={decision === value}
                  onChange={() => setDecision(value)}
                  disabled={isSubmitting}
                  required
                />
                <span className="font-semibold">{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label
              htmlFor={`review-comments-${inspectionId}`}
              className="mb-1.5 block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4]"
            >
              Comments <span className="font-normal text-[#647067]">(optional)</span>
            </label>
            <textarea
              id={`review-comments-${inspectionId}`}
              value={comments}
              onChange={(event) =>
                setComments(
                  Array.from(event.target.value)
                    .slice(0, 2000)
                    .join('')
                )
              }
              maxLength={4000}
              rows={4}
              disabled={isSubmitting}
              aria-describedby={`review-comments-count-${inspectionId}`}
              className="w-full resize-y rounded-xl border border-[#E5EDE6] bg-white p-3 text-xs text-[#17211B] outline-none transition-colors focus:border-[#15803D] disabled:opacity-60 dark:border-[#29382D] dark:bg-[#141D17] dark:text-[#F0FDF4] dark:focus:border-[#4ADE80]"
            />
            <p
              id={`review-comments-count-${inspectionId}`}
              className="mt-1 text-right text-[11px] text-[#647067] dark:text-[#A3B3A6]"
              aria-live="polite"
            >
              {2000 - commentCharacterCount} characters remaining
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || commentCharacterCount > 2000}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
          >
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isSubmitting ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      ) : (
        <p className="mt-5 border-t border-[#E5EDE6] pt-4 text-xs text-[#647067] dark:border-[#29382D] dark:text-[#A3B3A6]">
          {isOwner
            ? 'You can view this inspection and its review history, but you cannot review your own inspection.'
            : user?.id == null && hasReviewerRole
              ? 'Review submission is unavailable because your account identity could not be verified.'
            : inspectionOwnerId == null && hasReviewerRole
              ? 'Review submission is unavailable because inspection ownership could not be verified.'
              : 'Review submission is available to Senior Officers and Admins only.'}
        </p>
      )}
    </section>
  );
}
