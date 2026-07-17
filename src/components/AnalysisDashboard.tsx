/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, ShieldAlert, Thermometer, BarChart3, AlertTriangle } from 'lucide-react';
import { AnalysisResult, EnvironmentCondition } from '../types';
import { motion } from 'motion/react';

interface AnalysisDashboardProps {
  result: AnalysisResult;
  targetGap: { min: number; max: number };
  onEnvChange: (env: EnvironmentCondition) => void;
}

export default function AnalysisDashboard({ result, targetGap, onEnvChange }: AnalysisDashboardProps) {
  const statusColor = result.isCompliant ? 'text-emerald-600' : 'text-rose-600';
  const statusBg = result.isCompliant ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100';

  return (
    <div className="space-y-6">
      {/* Header & Status */}
      <div className={`p-6 rounded-xl border shadow-sm ${statusBg} flex items-center justify-between`}>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">MIL-STD-810H 환경 적합성</p>
          <div className="flex items-center gap-3">
            {result.isCompliant ? (
              <ShieldCheck className={`w-8 h-8 ${statusColor}`} />
            ) : (
              <ShieldAlert className={`w-8 h-8 ${statusColor}`} />
            )}
            <h1 className={`text-4xl font-bold tracking-tight ${statusColor}`}>
              {result.isCompliant ? '합격 (PASS)' : '불합격 (FAIL)'}
            </h1>
          </div>
        </div>

        <div className="text-right space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">최악 조건 유격 범위 (Worst-Case)</p>
          <p className="text-3xl font-mono font-bold text-slate-900">
            {result.worstCaseMin.toFixed(3)} ~ {result.worstCaseMax.toFixed(3)} <span className="text-sm font-normal text-slate-400">mm</span>
          </p>
        </div>
      </div>

      {/* Grid: Target & Env */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-400">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">설계 사양 요약</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">최종 설계 유격 (Nominal)</span>
            <span className="text-slate-900 font-mono">{result.nominalGap.toFixed(3)} mm</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-sm">목표 범위 (Target)</span>
            <span className="text-indigo-600 font-mono font-semibold">{targetGap.min} ~ {targetGap.max} mm</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Thermometer className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">환경 시뮬레이션</span>
          </div>
          <div className="flex gap-2">
            {[EnvironmentCondition.STANDARD, EnvironmentCondition.HIGH_TEMP, EnvironmentCondition.LOW_TEMP].map((env) => (
              <button
                key={env}
                onClick={() => onEnvChange(env)}
                className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all ${
                  result.environment === env
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {env === EnvironmentCondition.STANDARD ? '상온 (20℃)' : env === EnvironmentCondition.HIGH_TEMP ? '고온 (71℃)' : '저온 (-40℃)'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            *MIL-STD-810H에 따른 재질별 열팽창 계수 반영
          </p>
        </div>
      </div>

      {/* Sensitivity List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">공차 기여도 분석 (Sensitivity)</span>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {result.parts.map((part) => (
            <div key={part.partId} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${part.isCritical ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {part.partName}
                  </span>
                  {!part.isMachined && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase font-mono">
                      구매품
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">{part.sensitivity.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${part.sensitivity}%` }}
                  className={`h-full rounded-full ${part.isCritical ? 'bg-indigo-500 shadow-sm' : 'bg-slate-300'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
