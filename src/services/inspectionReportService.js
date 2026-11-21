import apiClient, { getApiBaseUrl } from './api';

const validateInspectionId = (inspectionId) => {
  if (!Number.isSafeInteger(inspectionId) || inspectionId <= 0) {
    throw new Error('A valid inspection ID is required.');
  }
};

const resolveEvidencePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const apiBase = new URL(getApiBaseUrl());
    const url = new URL(value, apiBase);

    if (
      url.origin !== apiBase.origin ||
      !/^\/api\/inspections\/\d+\/evidence\/\d+\/(original|processed)$/.test(
        url.pathname
      )
    ) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};

export const isValidInspectionEvidenceUrl = (value) =>
  resolveEvidencePath(value) !== null;

export const fetchInspectionReport = async (
  inspectionId,
  { signal } = {}
) => {
  validateInspectionId(inspectionId);

  const response = await apiClient.get(
    `/api/inspections/${inspectionId}/report`,
    { signal }
  );

  if (
    !response?.data ||
    typeof response.data !== 'object' ||
    Array.isArray(response.data)
  ) {
    throw new Error('The backend returned an empty or invalid inspection report.');
  }

  return response.data;
};

export const fetchInspectionEvidenceFile = async (url) => {
  const path = resolveEvidencePath(url);

  if (!path) {
    throw new Error('The evidence file URL is invalid.');
  }

  const response = await apiClient.get(path, { responseType: 'blob' });
  return response.data;
};
