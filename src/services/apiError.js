const formatDetail = (detail) => {
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item?.msg === 'string' ? item.msg.trim() : ''
      )
      .filter(Boolean)
      .join(' ');
  }

  return '';
};

export const getApiErrorMessage = (error, resource = 'request') => {
  const status =
    error?.status ??
    error?.originalError?.response?.status ??
    error?.response?.status;
  const detail = formatDetail(
    error?.originalError?.response?.data?.detail ??
      error?.response?.data?.detail ??
      error?.message
  );

  if (
    error?.isNetworkError ||
    (status == null &&
      error?.originalError?.request &&
      !error?.originalError?.response)
  ) {
    return 'Could not connect to the backend. Check your connection and try again.';
  }

  if (status === 401) {
    return 'Your session is missing, invalid, or expired. Sign in again and retry.';
  }

  if (status === 403) {
    return `You do not have permission to ${resource}.`;
  }

  if (status === 404) {
    return 'The inspection or requested resource could not be found or is not accessible.';
  }

  if (status === 422) {
    return detail
      ? `The request could not be validated: ${detail}`
      : 'The request could not be validated. Check the inspection and submitted values.';
  }

  if (status >= 500) {
    return `The backend could not ${resource}. Please try again.`;
  }

  if (!Number.isInteger(status)) {
    return detail || error?.message || `Could not ${resource}. Please try again.`;
  }

  return detail || `The request to ${resource} failed with status ${status}.`;
};
