
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShieldAlert,
  BookOpen,
  Scale,
  Database
} from 'lucide-react';

import apiClient from '../services/api';

export default function ComplianceRules() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Rules API is not implemented in the backend yet.
  // Do not display sample or fabricated regulatory rules.
  useEffect(() => {
  const loadRules = async () => {
    try {
      setIsLoading(true);

      const response = await apiClient.get('/api/rules');

      setRules(response.data);
    } catch (error) {
      console.error('Failed to load compliance rules:', error);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  loadRules();
}, []);

  const filteredRules = rules.filter((rule) => {
  const searchTerm = search.toLowerCase();

  const matchesSearch =
    !searchTerm ||
    rule.name?.toLowerCase().includes(searchTerm) ||
    rule.rule_id?.toLowerCase().includes(searchTerm) ||
    rule.rule_type?.toLowerCase().includes(searchTerm) ||
    rule.description?.toLowerCase().includes(searchTerm);

  const matchesCategory =
    categoryFilter === 'All' ||
    rule.rule_type === categoryFilter;

  return matchesSearch && matchesCategory;
});

const categories = [
  'All',
  ...new Set(
    rules.map((rule) => rule.rule_type).filter(Boolean)
  )
];

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            Regulatory Rule Engine
          </span>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-0.5">
            Compliance Rules & Legal Metrology Directives
          </h2>

          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Regulatory rule definitions for evaluating packaged commodity declarations against applicable legal metrology standards.
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

      {/* Search and Category Filter */}
      <div className="bg-white dark:bg-[#19241C] rounded-2xl p-4 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3">

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by rule reference, name, or keywords..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />

          <span className="text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]">
            Category:
          </span>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
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
      ) : rules.length === 0 ? (

        /* Empty State */
        <div className="p-10 sm:p-12 text-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">

          <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
            No Compliance Rules Found
          </h3>

          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-2 max-w-md mx-auto leading-relaxed">
            The backend rules module has not been implemented yet. No sample or unverified regulatory rules are being displayed. Once the rules API and database module are developed, verified rules will appear here.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7FAF7] dark:bg-[#141D17] border border-[#E5EDE6] dark:border-[#29382D]">
            <Database className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />

            <span className="text-[11px] font-semibold text-[#647067] dark:text-[#A3B3A6]">
              Backend endpoint: /api/rules
            </span>
          </div>
        </div>

      ) : filteredRules.length === 0 ? (

        /* No Search Results */
        <div className="p-10 text-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D]">
          <Search className="w-8 h-8 text-[#647067] dark:text-[#A3B3A6] mx-auto mb-3" />

          <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
            No matching rules found
          </h3>

          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-1">
            Try changing your search keyword or category.
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
                    {rule.ref}
                  </span>

                  <span className="text-xs font-semibold text-[#647067] dark:text-[#A3B3A6]">
                    {rule.category}
                  </span>
                </div>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-[#D97706] border border-amber-500/20">
                  {rule.riskLevel || 'Standard'} Risk
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                {rule.name}
              </h3>

              <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}
