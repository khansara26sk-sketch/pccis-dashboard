export const MOCK_COMPLIANCE_RESULTS = Object.freeze({
  overallStatus: 'Potential Issue',
  potentialIssues: Object.freeze([
    Object.freeze({
      id: 'sample-issue-a',
      title: 'Sample issue only',
      explanation:
        'Illustrative preview content only. This is not a real inspection finding.',
    }),
  ]),
  rules: Object.freeze([
    Object.freeze({
      id: 'sample-check-a',
      name: 'Sample check A',
      status: 'Pass',
      explanation:
        'Illustrative sample outcome. No statutory rule or criterion is represented.',
      evidenceText: 'SAMPLE evidence text',
    }),
    Object.freeze({
      id: 'sample-check-b',
      name: 'Sample check B',
      status: 'Potential Issue',
      explanation:
        'Illustrative sample outcome. No statutory rule or criterion is represented.',
      evidenceText: null,
    }),
  ]),
});
