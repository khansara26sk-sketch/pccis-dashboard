import apiClient from './api';

const OCR_STATUSES = new Set(['pending', 'completed', 'failed']);

const isPositiveInteger = (value) =>
  Number.isSafeInteger(value) && value > 0;

const formatErrorDetail = (detail) => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item?.msg === 'string' ? item.msg.trim() : ''
      )
      .filter(Boolean);

    return messages.length > 0 ? messages.join(' ') : null;
  }

  return null;
};

const isCancellation = (error) => {
  const originalError = error?.originalError || error;

  return (
    originalError?.code === 'ERR_CANCELED' ||
    originalError?.name === 'CanceledError' ||
    originalError?.name === 'AbortError'
  );
};

const toUserFacingApiError = (error) => {
  const status =
    error?.status ??
    error?.originalError?.response?.status ??
    error?.response?.status;
  const responseData =
    error?.originalError?.response?.data ?? error?.response?.data;
  const detail = formatErrorDetail(
    responseData?.detail ?? error?.message
  );

  if (error?.isNetworkError || !Number.isInteger(status)) {
    return new Error(
      'Could not connect to the backend. Check your connection and try again.'
    );
  }

  if (status === 401) {
    return new Error(
      'Your session may have expired. Sign in again, then retry the OCR result.'
    );
  }

  if (status === 403) {
    return new Error(
      'You do not have permission to view this OCR result.'
    );
  }

  if (status === 404) {
    return new Error(
      'The inspection or evidence image could not be found or is not accessible.'
    );
  }

  if (status === 400) {
    return new Error(
      detail || 'The OCR result request was invalid. Check the inspection and evidence identifiers.'
    );
  }

  if (status === 422) {
    return new Error(
      detail || 'The OCR result request could not be validated.'
    );
  }

  if (status >= 500) {
    return new Error(
      'The backend could not retrieve the OCR result. Please try again.'
    );
  }

  return new Error(
    detail || `The OCR result request failed with status ${status}.`
  );
};

const validateOcrResponse = (data, inspectionId, evidenceId) => {
  const hasValidIds =
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    isPositiveInteger(data.inspection_id) &&
    isPositiveInteger(data.evidence_id);

  if (
    !hasValidIds ||
    data.inspection_id !== inspectionId ||
    data.evidence_id !== evidenceId ||
    !OCR_STATUSES.has(data.status) ||
    (data.error !== null &&
      data.error !== undefined &&
      typeof data.error !== 'string') ||
    (data.extracted_text !== null &&
      data.extracted_text !== undefined &&
      typeof data.extracted_text !== 'string') ||
    (data.confidence !== null &&
      data.confidence !== undefined &&
      (typeof data.confidence !== 'number' ||
        !Number.isFinite(data.confidence) ||
        data.confidence < 0 ||
        data.confidence > 100))
  ) {
    throw new Error(
      'The backend returned an unexpected OCR response. Please retry.'
    );
  }

  return {
    inspection_id: data.inspection_id,
    evidence_id: data.evidence_id,
    status: data.status,
    error: data.error ?? null,
    extracted_text: data.extracted_text ?? null,
    confidence: data.confidence ?? null,
  };
};

export const fetchOcrResult = async (
  inspectionId,
  evidenceId,
  { signal } = {}
) => {
  if (!isPositiveInteger(inspectionId) || !isPositiveInteger(evidenceId)) {
    throw new Error(
      'A valid inspection and evidence identifier are required to load OCR results.'
    );
  }

  let response;

  try {
    response = await apiClient.get(
      `/api/inspections/${inspectionId}/evidence/${evidenceId}/ocr`,
      { signal }
    );
  } catch (error) {
    if (isCancellation(error)) {
      throw error;
    }

    throw toUserFacingApiError(error);
  }

  return validateOcrResponse(response?.data, inspectionId, evidenceId);
};


export const fetchExtractedFields = async (
  inspectionId,
  evidenceId,
  { signal } = {}
) => {
  if (!isPositiveInteger(inspectionId) || !isPositiveInteger(evidenceId)) {
    throw new Error(
      'A valid inspection and evidence identifier are required to load extracted fields.'
    );
  }

  try {
    const response = await apiClient.get(
      `/api/inspections/${inspectionId}/evidence/${evidenceId}/fields`,
      { signal }
    );

    const data = response?.data;

    if (
      !data ||
      data.inspection_id !== inspectionId ||
      data.evidence_id !== evidenceId ||
      !data.fields ||
      !data.field_statuses
    ) {
      throw new Error('The backend returned an unexpected extracted-fields response.');
    }

    return data;
  } catch (error) {
    if (isCancellation(error)) {
      throw error;
    }

    if (error.message?.includes('unexpected extracted-fields response')) {
      throw error;
    }

    throw toUserFacingApiError(error);
  }
};


export const updateExtractedFields = async (
  inspectionId,
  evidenceId,
  corrections
) => {
  const response = await apiClient.patch(
    `/api/inspections/${inspectionId}/evidence/${evidenceId}/fields`,
    corrections
  );

  return response.data;
};
