import apiClient from './api';

const REVIEW_DECISIONS = new Set(['approved', 'needs_correction']);

const validateInspectionId = (inspectionId) => {
  if (!Number.isSafeInteger(inspectionId) || inspectionId <= 0) {
    throw new Error('A valid inspection ID is required.');
  }
};

export const fetchInspectionReviews = async (inspectionId, { signal } = {}) => {
  validateInspectionId(inspectionId);

  const response = await apiClient.get(
    `/api/inspections/${inspectionId}/reviews`,
    { signal }
  );

  return response.data;
};

export const submitInspectionReview = async (
  inspectionId,
  { decision, comments = null } = {}
) => {
  validateInspectionId(inspectionId);

  if (!REVIEW_DECISIONS.has(decision)) {
    throw new Error('Select Approved or Needs Correction.');
  }

  if (comments !== null && typeof comments !== 'string') {
    throw new Error('Comments must be text or empty.');
  }

  if (typeof comments === 'string' && Array.from(comments).length > 2000) {
    throw new Error('Comments must be 2000 characters or fewer.');
  }

  const normalizedComments =
    typeof comments === 'string' ? comments.trim() || null : null;

  const response = await apiClient.post(
    `/api/inspections/${inspectionId}/reviews`,
    {
      decision,
      comments: normalizedComments,
    }
  );

  return response.data;
};
