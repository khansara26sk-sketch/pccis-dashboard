
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Search,
  Filter,
  ShieldAlert,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

import { getApiErrorMessage } from '../services/apiError';
import { fetchComplianceRules } from '../services/complianceService';

export default function ComplianceRules() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [ruleTypeFilter, setRuleTypeFilter] = useState('All');

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      setRules(await fetchComplianceRules());
    } catch (error) {
      setRules([]);
      setLoadError(getApiErrorMessage(error, 'load compliance rules'));
    } finally {
      setIsLoading(false);
    }
  }, []);

    useEffect(() => {
    loadRules();
  }, [loadRules]);

  const filteredRules = rules.filter((rule) => {
    const searchTerm = search.trim().toLowerCase();

    const searchableFields = [
      rule.rule_id,
      rule.name,
      rule.field_name,
      rule.description,
      rule.rule_version,
      rule.rule_type,
      rule.legal_verification,
    ];

    const matchesSearch =
      !searchTerm ||
      searchableFields.some((value) =>
        value?.toLowerCase().includes(searchTerm)
      );

    const matchesRuleType =
      ruleTypeFilter === 'All' || rule.rule_type === ruleTypeFilter;

    return matchesSearch && matchesRuleType;
  });

  const ruleTypes = [
    'All',
    ...new Set(
      rules.map((rule) => rule.rule_type).filter(Boolean)
    ),
  ];

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            Declaration Screening Rules
          </span>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-0.5">
            Compliance Rule Definitions
          </h2>

          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Backend-configured checks for detecting declaration text in extracted package data. These checks are administrative screening, not legal determinations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border border-[#E5EDE6] dark:border-[#29382D]">
            {rules.length} Configured Rules
          </span>
        </div>
      </div>

      {/* Regulatory Scope Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">

        <ShieldAlert className="w-5 h-5 text-[#D97706] dark:text-amber-400 shrink-0 mt-0.5" />

        <div className="leading-relaxed">
          <p className="font-semibold mb-0.5">
            Administrative Rule Engine Notice
          </p>

          <p className="text-amber-800/90 dark:text-amber-400/90">
            Automated rule evaluations are intended to assist authorized inspectors. They do not replace applicable legislation, official notifications, amendments, or decisions by authorized officers. Regulatory requirements must be verified against current official sources.
          </p>
        </div>
      </div>

      {/* Search and Rule Type Filter */}
      <div className="bg-white dark:bg-[#19241C] rounded-2xl p-4 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rule ID, name, field, or description..."
            aria-label="Search compliance rules"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />

          <span className="text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]">
            Rule type:
          </span>

          <select
            value={ruleTypeFilter}
            onChange={(e) => setRuleTypeFilter(e.target.value)}
            aria-label="Filter by rule type"
            className="text-xs p-2 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
          >
            {ruleTypes.map((ruleType) => (
              <option key={ruleType} value={ruleType}>
                {ruleType}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D]">

          <div className="w-10 h-10 border-4 border-[#DCFCE7] dark:border-[#173D26] border-t-[#15803D] dark:border-t-[#4ADE80] rounded-full animate-spin mb-3" />

          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] font-medium">
            Loading compliance rules...
          </p>
        </div>
      ) : loadError ? (
        <div
          className="p-6 bg-red-50/70 dark:bg-red-950/20 rounded-2xl border border-red-500/20 text-[#DC2626] dark:text-red-400"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">
                Unable to load compliance rules
              </h3>
              <p className="text-xs mt-1">{loadError}</p>
              <button
                type="button"
                onClick={loadRules}
                disabled={isLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                />
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : rules.length === 0 ? (

        /* Empty State */
        <div className="p-10 sm:p-12 text-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

          <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7" />
          </div>

          

          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-2 max-w-md mx-auto leading-relaxed">
            The backend returned an empty rules list. No sample or unverified regulatory rules are being displayed.
          </p>
        </div>

      ) : filteredRules.length === 0 ? (

        /* No Search Results */
        <div className="p-10 text-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D]">
          <Search className="w-8 h-8 text-[#647067] dark:text-[#A3B3A6] mx-auto mb-3" />

          <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
            No matching rules found
          </h3>

          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-1">
            Try changing your search keyword or rule type.
          </p>
        </div>

      ) : (

        /* Rules Directory */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {filteredRules.map((rule) => (
            <div
              key={rule.rule_id}
              className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-5 shadow-[0_2px_8px_rgba(21,128,61,0.03)] hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-[#173D26] px-2 py-0.5 rounded border border-[#E5EDE6] dark:border-[#29382D]">
                    {rule.rule_id}
                  </span>

                  <span className="text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]">
                    {rule.rule_type}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                {rule.name}
              </h3>

              <p className="mb-2 font-mono text-[11px] text-[#647067] dark:text-[#A3B3A6]">
                Field: {rule.field_name} · Version: {rule.rule_version}
              </p>

              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                {rule.description}
              </p>

              <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
                <span className="font-semibold">Legal verification: </span>
                {rule.legal_verification}
              </p>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}
