import apiClient from './api';

const validateInspectionId = (inspectionId) => {
  if (!Number.isSafeInteger(inspectionId) || inspectionId <= 0) {
    throw new Error('A valid inspection ID is required.');
  }
};

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateRuleDefinition = (rule) => {
  const requiredFields = [
    'rule_id',
    'name',
    'field_name',
    'description',
    'rule_version',
    'rule_type',
    'legal_verification',
  ];

  if (
    !isRecord(rule) ||
    requiredFields.some((field) => typeof rule[field] !== 'string')
  ) {
    throw new Error('The backend returned an invalid compliance rule.');
  }

  return rule;
};

const validateRuleResult = (rule) => {
  if (
    !isRecord(rule) ||
    typeof rule.rule_id !== 'string' ||
    typeof rule.rule_version !== 'string' ||
    (rule.field_name !== undefined &&
      rule.field_name !== null &&
      typeof rule.field_name !== 'string') ||
    typeof rule.status !== 'string' ||
    typeof rule.explanation !== 'string' ||
    (rule.evidence_text !== undefined &&
      rule.evidence_text !== null &&
      typeof rule.evidence_text !== 'string')
  ) {
    throw new Error('The backend returned an invalid compliance result.');
  }

  return rule;
};

const validateComplianceResponse = (data, inspectionId) => {
  if (
    !isRecord(data) ||
    data.inspection_id !== inspectionId ||
    typeof data.overall_result !== 'string' ||
    !Array.isArray(data.rules) ||
    !Array.isArray(data.potential_issues) ||
    typeof data.disclaimer !== 'string'
  ) {
    throw new Error('The backend returned an invalid compliance response.');
  }

  data.rules.forEach(validateRuleResult);
  data.potential_issues.forEach(validateRuleResult);

  return data;
};

export const fetchComplianceRules = async ({ signal } = {}) => {
  const response = await apiClient.get('/api/rules', { signal });

  if (!Array.isArray(response.data)) {
    throw new Error('The backend returned an invalid compliance rules list.');
  }

  response.data.forEach(validateRuleDefinition);
  return response.data;
};

export const runComplianceChecks = async (inspectionId) => {
  validateInspectionId(inspectionId);

  const response = await apiClient.post(
    `/api/inspections/${inspectionId}/compliance/run`
  );

  return validateComplianceResponse(response.data, inspectionId);
};

export const fetchComplianceResults = async (
  inspectionId,
  { signal } = {}
) => {
  validateInspectionId(inspectionId);

  const response = await apiClient.get(
    `/api/inspections/${inspectionId}/compliance`,
    { signal }
  );

  return validateComplianceResponse(response.data, inspectionId);
};

export const isComplianceResultsNotFound = (error) => {
  const status =
    error?.status ??
    error?.originalError?.response?.status ??
    error?.response?.status;
  const detail =
    error?.originalError?.response?.data?.detail ??
    error?.response?.data?.detail ??
    error?.message;

  return (
    status === 404 &&
    detail === 'Compliance results not found. Run compliance checks first.'
  );
};
