import React, { useState, useEffect } from 'react';
import {
  User,
  Moon,
  Sun,
  Cpu,
  Server,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { checkBackendHealth } from '../services/inspectionService';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();
  const { user } = useAuth();

  // Profile State populated from live authenticated user
  const [inspectorName, setInspectorName] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [department, setDepartment] = useState('Directorate of Legal Metrology');
  const [region, setRegion] = useState('Zone 1 Central Jurisdiction');

  // Backend Integration State
  const [apiUrl, setApiUrl] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);

  // Inspection Preferences
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [autoFlagUncertain, setAutoFlagUncertain] = useState(true);
  const [strictPriceFormat, setStrictPriceFormat] = useState(true);

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
    if (user) {
      setInspectorName(user.name || '');
      setBadgeId(user.badgeId || `LM-${user.id || 'OFFICER'}`);
      if (user.department) setDepartment(user.department);
      if (user.region) setRegion(user.region);
    }
  }, [user]);

  const handleTestConnection = async () => {
    setIsTestingApi(true);
    setApiStatus(null);
    try {
      setApiBaseUrl(apiUrl);
      const res = await checkBackendHealth();
      if (res.online) {
        setApiStatus({ success: true, message: 'FastAPI Backend reachable and responding healthy at ' + apiUrl });
        addToast({
          title: 'Backend Connected',
          message: `Successfully connected to FastAPI server at ${apiUrl}`,
          type: 'success',
        });
      } else {
        setApiStatus({
          success: false,
          message: `Could not connect to ${apiUrl}. Ensure your FastAPI server (uvicorn main:app --reload) is running.`,
        });
        addToast({
          title: 'Backend Connection Failed',
          message: `Server at ${apiUrl} did not respond. Check if the process is running.`,
          type: 'warning',
        });
      }
    } catch (err) {
      setApiStatus({ success: false, message: err.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveAll = (e) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    addToast({
      title: 'Settings Saved',
      message: 'All inspector preferences and system configurations have been updated.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#19241C] rounded-2xl p-6 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80]">
            System Preferences
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mt-0.5">
            Inspector & Platform Settings
          </h2>
          <p className="text-xs sm:text-sm text-[#647067] dark:text-[#A3B3A6] mt-1">
            Configure officer credentials, live FastAPI backend connectivity, and OCR compliance thresholds.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] dark:bg-[#22C55E] dark:hover:bg-[#16A34A] text-white dark:text-[#101713] font-semibold text-xs shadow-xs transition-colors shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: FastAPI Backend Integration */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#E5EDE6] dark:border-[#29382D]">
              <Server className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
              <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                FastAPI Backend Endpoint Configuration
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                  Backend API Base URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-[#647067] dark:text-[#A3B3A6] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="http://127.0.0.1:8000"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D] dark:focus:border-[#4ADE80]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingApi}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#173D26] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/80 text-[#17211B] dark:text-[#F0FDF4] border border-[#E5EDE6] dark:border-[#29382D] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                    <span>Ping Backend</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-1.5">
                  Default: <span className="font-mono text-[#15803D] dark:text-[#4ADE80]">http://127.0.0.1:8000</span> (managed by Python FastAPI).
                </p>
              </div>

              {/* Status Alert */}
              {apiStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    apiStatus.success
                      ? 'bg-[#DCFCE7] dark:bg-[#173D26]/40 border-[#E5EDE6] dark:border-[#29382D] text-[#15803D] dark:text-[#4ADE80]'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/20 text-[#D97706]'
                  }`}
                >
                  {apiStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed">{apiStatus.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Officer Profile Settings */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#E5EDE6] dark:border-[#29382D]">
              <User className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
              <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                Inspector Credentials & Jurisdictional Zone
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                  Inspector Full Name
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="Officer Full Name"
                  className="w-full p-2.5 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                  Official Badge / Officer ID
                </label>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="LM-OFFICER-001"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                  Department / Directorate
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">
                  Jurisdiction Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-[#17211B] dark:text-[#F0FDF4] focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: OCR Engine Sensitivity Preferences */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#E5EDE6] dark:border-[#29382D]">
              <Cpu className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
              <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                AI Optical Detection Sensitivity
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">
                    Minimum OCR Confidence Threshold
                  </span>
                  <span className="font-mono font-bold text-[#15803D] dark:text-[#4ADE80]">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E5EDE6] dark:bg-[#29382D] rounded-lg appearance-none cursor-pointer accent-[#15803D] dark:accent-[#4ADE80]"
                />
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-1">
                  Extracted text scoring below this threshold will automatically be flagged as "Uncertain" for physical corroboration.
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5EDE6] dark:border-[#29382D] space-y-3">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div>
                    <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4] block">
                      Auto-flag borderline declarations
                    </span>
                    <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6] block mt-0.5">
                      Mark unreadable characters for officer review instead of silent acceptance.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFlagUncertain}
                    onChange={(e) => setAutoFlagUncertain(e.target.checked)}
                    className="w-4 h-4 accent-[#15803D] rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <div>
                    <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4] block">
                      Enforce strict MRP tax syntax
                    </span>
                    <span className="text-[11px] text-[#647067] dark:text-[#A3B3A6] block mt-0.5">
                      Flag any retail price missing explicit "(Incl. of all taxes)" statement.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={strictPriceFormat}
                    onChange={(e) => setStrictPriceFormat(e.target.checked)}
                    className="w-4 h-4 accent-[#15803D] rounded"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Theme & System Specs */}
        <div className="space-y-6">
          {/* Theme Mode Toggle Box */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans'] mb-3">
              Appearance & Theme Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-[#15803D] bg-[#DCFCE7] text-[#15803D] ring-1 ring-[#15803D]'
                    : 'border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]'
                }`}
              >
                <Sun className="w-5 h-5 text-[#15803D]" />
                <span className="text-xs font-semibold">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-[#4ADE80] bg-[#173D26] text-[#4ADE80] ring-1 ring-[#4ADE80]'
                    : 'border-[#E5EDE6] dark:border-[#29382D] text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]'
                }`}
              >
                <Moon className="w-5 h-5 text-[#4ADE80]" />
                <span className="text-xs font-semibold">Dark Mode</span>
              </button>
            </div>
          </div>

          {/* System Spec Box */}
          <div className="bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#E5EDE6] dark:border-[#29382D]">
              <Shield className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
              <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
                System Specification
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E5EDE6]/60 dark:border-[#29382D]/60">
                <span className="text-[#647067] dark:text-[#A3B3A6]">Application</span>
                <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">PCCIS Enterprise</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5EDE6]/60 dark:border-[#29382D]/60">
                <span className="text-[#647067] dark:text-[#A3B3A6]">Release Build</span>
                <span className="font-mono text-[#15803D] dark:text-[#4ADE80] font-semibold">v1.2.0 (Emerald)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5EDE6]/60 dark:border-[#29382D]/60">
                <span className="text-[#647067] dark:text-[#A3B3A6]">Statutory Framework</span>
                <span className="text-[#17211B] dark:text-[#F0FDF4]">PCR 2011 Standards</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#647067] dark:text-[#A3B3A6]">Engine Protocol</span>
                <span className="font-mono text-[#15803D] dark:text-[#4ADE80] font-semibold">FastAPI Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
