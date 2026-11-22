import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';

import EmptyState from '../components/common/EmptyState';
import RuleResultCard from '../components/inspection/RuleResultCard';
import { getApiErrorMessage } from '../services/apiError';
import {
  fetchComplianceResults,
  isComplianceResultsNotFound,
  runComplianceChecks,
} from '../services/complianceService';
import { MOCK_COMPLIANCE_RESULTS } from '../services/mockComplianceResults';

const cardClass =
  'rounded-2xl border border-[#E5EDE6] bg-white shadow-[0_2px_8px_rgba(21,128,61,0.03)] dark:border-[#29382D] dark:bg-[#19241C]';
const titleClass =
  'text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]';
const secondaryTextClass =
  'text-xs text-[#647067] dark:text-[#A3B3A6]';

const parseIdentifier = (value) => {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const identifier = Number(value);
  return Number.isSafeInteger(identifier) && identifier > 0
    ? identifier
    : null;
};

const stateDetails = {
  loading: {
    icon: LoaderCircle,
    title: 'Loading compliance results',
    classes:
      'border-[#E5EDE6] bg-white text-[#647067] dark:border-[#29382D] dark:bg-[#19241C] dark:text-[#A3B3A6]',
    role: 'status',
    iconClass: 'animate-spin text-[#15803D] dark:text-[#4ADE80]',
  },
  error: {
    icon: AlertCircle,
    title: 'Unable to load compliance results',
    classes:
      'border-red-500/20 bg-red-50/70 text-[#DC2626] dark:bg-red-950/20 dark:text-red-400',
    role: 'alert',
    iconClass: '',
  },
  empty: {
    icon: FileText,
    title: 'No compliance results to display',
    classes:
      'border-[#E5EDE6] bg-white text-[#647067] dark:border-[#29382D] dark:bg-[#19241C] dark:text-[#A3B3A6]',
    role: 'status',
    iconClass: '',
  },
  unavailable: {
    icon: Info,
    title: 'Compliance results unavailable',
    classes:
      'border-amber-500/20 bg-amber-500/5 text-[#92400E] dark:text-amber-300',
    role: 'status',
    iconClass: '',
  },
};

function ComplianceStatePanel({ state, description, action }) {
  const details = stateDetails[state] || stateDetails.unavailable;
  const Icon = details.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${details.classes}`}
      role={details.role}
      aria-live={state === 'loading' ? 'polite' : undefined}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${details.iconClass}`} />
      <div>
        <p className="text-sm font-semibold">{details.title}</p>
        <p className="mt-1 text-xs leading-relaxed">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

function OverallStatus({ status }) {
  const normalizedStatus =
    typeof status === 'string' ? status.trim().toLowerCase() : '';
  const isPass = normalizedStatus === 'pass';
  const isPotentialIssue = normalizedStatus === 'potential issue';
  const Icon = isPass ? CheckCircle2 : ShieldAlert;
  const statusClassName = isPass
    ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] dark:border-[#245B35] dark:bg-[#173D26] dark:text-[#4ADE80]'
    : 'border-amber-500/20 bg-amber-500/10 text-[#B45309] dark:text-amber-300';
  const label =
    typeof status === 'string' && status.trim()
      ? status.trim()
      : 'Status unavailable';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClassName}`}
      role="status"
    >
      <Icon className="h-4 w-4" />
      {isPotentialIssue ? 'Potential Issue' : label}
    </span>
  );
}

export default function ComplianceResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  const rawInspectionId = searchParams.get('inspectionId');
  const inspectionId = parseIdentifier(rawInspectionId);
  const hasInvalidInspectionId =
    rawInspectionId !== null && !inspectionId;
  const evidenceId = parseIdentifier(searchParams.get('evidenceId'));
  const demoResults = isDemoMode ? MOCK_COMPLIANCE_RESULTS : null;
  const demoRules = Array.isArray(demoResults?.rules)
    ? demoResults.rules
    : [];
  const demoIssues = Array.isArray(demoResults?.potentialIssues)
    ? demoResults.potentialIssues
    : [];
  const ocrParams = new URLSearchParams();

  if (isDemoMode) {
    ocrParams.set('demo', 'true');
  } else {
    if (inspectionId) {
      ocrParams.set('inspectionId', String(inspectionId));
    }

    if (evidenceId) {
      ocrParams.set('evidenceId', String(evidenceId));
    }
  }

  const ocrResultsUrl = ocrParams.size
    ? `/ocr-results?${ocrParams.toString()}`
    : '/ocr-results';

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settledInspectionId, setSettledInspectionId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [runRetryAction, setRunRetryAction] = useState('run');
  const runLockRef = useRef(false);

  const isResultsLoading =
    Boolean(inspectionId && !isDemoMode) &&
    (isLoading || settledInspectionId !== inspectionId);
  const currentResults =
    results?.inspection_id === inspectionId ? results : null;
  const currentLoadError =
    settledInspectionId === inspectionId ? loadError : null;

  const handleLoadError = useCallback((error) => {
    setResults(null);
    setLoadError(
      isComplianceResultsNotFound(error)
        ? null
        : getApiErrorMessage(error, 'load compliance results')
    );
  }, []);

  const loadResults = useCallback(async () => {
    if (!inspectionId) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const loadedResults = await fetchComplianceResults(inspectionId);
      setResults(loadedResults);
      setRunError(null);
    } catch (error) {
      handleLoadError(error);
    } finally {
      setIsLoading(false);
      setSettledInspectionId(inspectionId);
    }
  }, [handleLoadError, inspectionId]);

  useEffect(() => {
    if (isDemoMode || !inspectionId) {
      return undefined;
    }

    const controller = new AbortController();
    fetchComplianceResults(inspectionId, { signal: controller.signal })
      .then((loadedResults) => {
        if (!controller.signal.aborted) {
          setResults(loadedResults);
          setLoadError(null);
          setRunError(null);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          handleLoadError(error);
          setRunError(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setSettledInspectionId(inspectionId);
        }
      });

    return () => controller.abort();
  }, [handleLoadError, inspectionId, isDemoMode]);

  const handleRunCompliance = useCallback(async () => {
    if (!inspectionId || runLockRef.current || isResultsLoading) {
      return;
    }

    runLockRef.current = true;
    setIsRunning(true);
    setRunError(null);
    setLoadError(null);
    let runCompleted = false;

    try {
      await runComplianceChecks(inspectionId);
      runCompleted = true;
      const refreshedResults = await fetchComplianceResults(inspectionId);
      setResults(refreshedResults);
    } catch (error) {
      const resource = runCompleted
        ? 'reload saved compliance results'
        : 'run compliance checks';
      const message = getApiErrorMessage(error, resource);
      setRunRetryAction(runCompleted ? 'load' : 'run');
      setRunError(
        runCompleted
          ? `Compliance checks completed, but saved results could not be loaded. ${message}`
          : message
      );
    } finally {
      runLockRef.current = false;
      setIsRunning(false);
    }
  }, [inspectionId, isResultsLoading]);

  const retryRunAction = useCallback(() => {
    setRunError(null);

    if (runRetryAction === 'load') {
      loadResults();
    } else {
      handleRunCompliance();
    }
  }, [handleRunCompliance, loadResults, runRetryAction]);

  return (
    <div className="space-y-6">
      <header
        className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
      >
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            Compliance Review
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] sm:text-2xl">
            Compliance Results
          </h2>
          <p className={`${secondaryTextClass} mt-1`}>
            {inspectionId
              ? `Results for inspection #${inspectionId}`
              : 'Review the compliance outcome and rule-wise findings.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isDemoMode && inspectionId && (
            <button
              type="button"
              onClick={handleRunCompliance}
              disabled={
                isResultsLoading || isRunning || Boolean(currentLoadError)
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
            >
              {isRunning ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isRunning
                ? 'Running checks...'
                : currentResults
                  ? 'Run checks again'
                  : 'Run compliance checks'}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(ocrResultsUrl)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5EDE6] px-3.5 py-2.5 text-xs font-semibold text-[#647067] transition-colors hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#A3B3A6] dark:hover:bg-[#173D26]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to OCR Results
          </button>
        </div>
      </header>

      {isDemoMode ? (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-800 dark:text-amber-300">
            <Beaker className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">SAMPLE / DEMO ONLY</p>
              <p className="mt-1 text-xs leading-relaxed">
                These illustrative examples are not real inspection results,
                statutory rules, or legal determinations.
              </p>
            </div>
          </div>

          <section
            className={`${cardClass} p-5 sm:p-6`}
            aria-labelledby="overall-compliance-heading"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#F0FDF4] p-2.5 text-[#15803D] dark:bg-[#173D26] dark:text-[#4ADE80]">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="overall-compliance-heading" className={titleClass}>
                    Overall compliance status
                  </h3>
                  <p className={`${secondaryTextClass} mt-1`}>
                    Illustrative status from the preview fixture.
                  </p>
                </div>
              </div>
              <OverallStatus status={demoResults.overallStatus} />
            </div>
          </section>

          <section
            className={`${cardClass} p-5 sm:p-6`}
            aria-labelledby="potential-issues-heading"
          >
            <div className="flex items-center gap-2 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-300" />
              <h3 id="potential-issues-heading" className={titleClass}>
                Potential issues
              </h3>
              <span className="ml-auto rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-[#B45309] dark:text-amber-300">
                {demoIssues.length} sample
              </span>
            </div>

            {demoIssues.length === 0 ? (
              <p className={`${secondaryTextClass} mt-4`}>
                No sample issues are included in this preview.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {demoIssues.map((issue, index) => (
                  <li
                    key={issue?.id ?? index}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
                  >
                    <p className="text-xs font-semibold text-[#92400E] dark:text-amber-300">
                      {typeof issue?.title === 'string' && issue.title.trim()
                        ? issue.title.trim()
                        : 'Sample issue'}
                    </p>
                    <p className={`${secondaryTextClass} mt-1`}>
                      {typeof issue?.explanation === 'string' &&
                      issue.explanation.trim()
                        ? issue.explanation.trim()
                        : 'No sample explanation was provided.'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="space-y-3"
            aria-labelledby="rule-results-heading"
          >
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
              <h3 id="rule-results-heading" className={titleClass}>
                Rule-wise results
              </h3>
              <span className={`${secondaryTextClass} ml-auto`}>
                {demoRules.length} sample checks
              </span>
            </div>

            {demoRules.length === 0 ? (
              <div className={cardClass}>
                <ComplianceStatePanel
                  state="empty"
                  description="The demo fixture does not include any sample checks."
                />
              </div>
            ) : (
              demoRules.map((rule, index) => (
                <RuleResultCard
                  key={rule?.id ?? index}
                  name={rule?.name}
                  status={rule?.status}
                  explanation={rule?.explanation}
                  evidenceText={rule?.evidenceText}
                  isSample={isDemoMode}
                />
              ))
            )}
          </section>
        </>
      ) : !inspectionId ? (
        <EmptyState
          icon={FileText}
          title={hasInvalidInspectionId ? 'Invalid inspection ID' : 'Select an inspection'}
          description={
            hasInvalidInspectionId
              ? 'The inspection ID in the URL is invalid. Open Compliance Results from an inspection with a valid ID.'
              : 'Open Compliance Results from an OCR Results page to carry its inspection ID. No sample results are shown unless demo mode is explicitly selected.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/ocr-results')}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E5EDE6] px-4 py-2.5 text-xs font-semibold text-[#15803D] transition-colors hover:bg-[#F0FDF4] dark:border-[#29382D] dark:text-[#4ADE80] dark:hover:bg-[#173D26]"
              >
                <ArrowLeft className="h-4 w-4" />
                OCR Results
              </button>
              <button
                type="button"
                onClick={() => navigate('/compliance-results?demo=true')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#166534] dark:bg-[#22C55E] dark:text-[#101713] dark:hover:bg-[#16A34A]"
              >
                <Beaker className="h-4 w-4" />
                View sample demo
              </button>
            </div>
          }
        />
      ) : (
        <>
          {isResultsLoading ? (
            <ComplianceStatePanel
              state="loading"
              description="Loading saved screening results from the backend."
            />
          ) : currentLoadError ? (
            <ComplianceStatePanel
              state="error"
              description={currentLoadError}
              action={
                <button
                  type="button"
                  onClick={() => loadResults()}
                  disabled={isResultsLoading || isRunning}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry loading results
                </button>
              }
            />
          ) : null}

          {isRunning && !isResultsLoading && (
            <ComplianceStatePanel
              state="loading"
              description={
                currentResults
                  ? 'Running checks. The previously saved results remain visible until the refreshed results are loaded.'
                  : 'Running the requested screening checks and loading the saved results.'
              }
            />
          )}

          {runError && !isResultsLoading && (
            <ComplianceStatePanel
              state="error"
              description={runError}
              action={
                <button
                  type="button"
                  onClick={retryRunAction}
                  disabled={isRunning || isResultsLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {runRetryAction === 'load'
                    ? 'Retry loading results'
                    : 'Retry compliance run'}
                </button>
              }
            />
          )}

          {!isResultsLoading &&
            !currentLoadError &&
            !currentResults &&
            !isRunning &&
            !runError && (
            <ComplianceStatePanel
              state="empty"
              description="No saved compliance results are available for this inspection yet. Select “Run compliance checks” to request a screening run."
            />
            )}

          {!isResultsLoading && !currentLoadError && currentResults && (
            <>
              <section
                className={`${cardClass} p-5 sm:p-6`}
                aria-labelledby="overall-compliance-heading"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 id="overall-compliance-heading" className={titleClass}>
                      Overall screening result
                    </h3>
                    <p className={`${secondaryTextClass} mt-1`}>
                      Inspection #{currentResults.inspection_id}
                    </p>
                  </div>
                  <OverallStatus status={currentResults.overall_result} />
                </div>
                <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
                  {currentResults.disclaimer}
                </p>
              </section>

              {currentResults.rules.length === 0 ? (
                <ComplianceStatePanel
                  state="empty"
                  description="The backend returned no rule results for this screening run."
                />
              ) : (
                <>
                  <section
                    className={`${cardClass} p-5 sm:p-6`}
                    aria-labelledby="potential-issues-heading"
                  >
                    <div className="flex items-center gap-2 border-b border-[#E5EDE6] pb-4 dark:border-[#29382D]">
                      <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                      <h3 id="potential-issues-heading" className={titleClass}>
                        Potential issues
                      </h3>
                      <span className="ml-auto rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-[#B45309] dark:text-amber-300">
                        {currentResults.potential_issues.length}
                      </span>
                    </div>

                    {currentResults.potential_issues.length === 0 ? (
                      <p className={`${secondaryTextClass} mt-4`}>
                        The backend returned no potential issues for this
                        screening run.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {currentResults.potential_issues.map((rule) => (
                          <RuleResultCard
                            key={rule.rule_id}
                            ruleId={rule.rule_id}
                            fieldName={rule.field_name}
                            ruleVersion={rule.rule_version}
                            status={rule.status}
                            explanation={rule.explanation}
                            evidenceText={rule.evidence_text}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  <section
                    className="space-y-3"
                    aria-labelledby="rule-results-heading"
                  >
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
                      <h3 id="rule-results-heading" className={titleClass}>
                        Rule-wise results
                      </h3>
                      <span className={`${secondaryTextClass} ml-auto`}>
                        {currentResults.rules.length} checks
                      </span>
                    </div>

                    {currentResults.rules.map((rule) => (
                      <RuleResultCard
                        key={rule.rule_id}
                        ruleId={rule.rule_id}
                        fieldName={rule.field_name}
                        ruleVersion={rule.rule_version}
                        status={rule.status}
                        explanation={rule.explanation}
                        evidenceText={rule.evidence_text}
                      />
                    ))}
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
