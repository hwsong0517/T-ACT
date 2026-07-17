/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, ChevronRight, MessageSquareCode, Check, ArrowRight } from 'lucide-react';
import { AnalysisResult, AIResponse, AISuggestion } from '../types';
import Markdown from 'react-markdown';

interface AIGuideProps {
  analysisData: AnalysisResult;
  targetGap: { min: number; max: number };
  onApplySuggestions: (suggestions: AISuggestion[]) => void;
}

export default function AIGuide({ analysisData, targetGap, onApplySuggestions }: AIGuideProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisData, targetGap }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Optimization failed');
      }

      const data: AIResponse = await res.json();
      setResponse(data);
    } catch (error: any) {
      console.error('AI Guide Error:', error);
      setError(error.message || '가이드를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 bg-indigo-100/50 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-600">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">AI 설계 최적화 가이드</span>
        </div>
        <button
          onClick={handleOptimize}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
          최적화 제안 받기
        </button>
      </div>

      <div className="p-6 min-h-[200px] flex flex-col items-center justify-center relative">
        {!response && !loading && !error && (
          <div className="text-center space-y-3 opacity-50">
            <MessageSquareCode className="w-8 h-8 mx-auto text-indigo-400/50" />
            <p className="text-sm text-slate-400 max-w-[200px]">
              버튼을 클릭하여 현재 설계 데이터에 대한 AI 엔지니어링 자문을 받아보세요.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center space-y-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-red-400 text-sm font-medium">{error}</div>
            <button 
              onClick={handleOptimize}
              className="text-xs text-red-400 underline hover:text-red-300 transition-colors"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs text-indigo-400 font-mono animate-pulse">누적 공차 및 MIL-STD 규격 검토 중...</p>
          </div>
        )}

        {response && !loading && (
          <div className="w-full space-y-6">
            {/* Analysis Text */}
            <div className="prose prose-sm max-w-none prose-indigo">
              <div className="markdown-body text-slate-700 leading-relaxed font-sans">
                <Markdown>{response.analysisMarkdown}</Markdown>
              </div>
            </div>

            {/* Suggestions Table */}
            {response.suggestions && response.suggestions.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-600" />
                    수정 제안 일람 (Optimization Table)
                  </h3>
                  <button
                    onClick={() => onApplySuggestions(response.suggestions)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-2 shadow-md shadow-emerald-600/10"
                  >
                    제안 사항 일괄 적용
                  </button>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-mono text-[10px]">
                      <tr>
                        <th className="px-4 py-2 border-b border-slate-200">대상 부품</th>
                        <th className="px-4 py-2 border-b border-slate-200">치수(Nominal)</th>
                        <th className="px-4 py-2 border-b border-slate-200 text-emerald-600">공차(Tolerance)</th>
                        <th className="px-4 py-2 border-b border-slate-200">최적화 사유</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {response.suggestions.map((s, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{s.partName}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            <div className="flex flex-col">
                              <span className="text-[10px] line-through opacity-40">{s.currentNominal.toFixed(2)}</span>
                              <span className={s.currentNominal !== s.suggestedNominal ? "text-cyan-600 font-bold" : "text-slate-600"}>
                                {s.suggestedNominal.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 font-mono font-bold">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 line-through opacity-40">
                                {s.currentUpper >= 0 ? `+${s.currentUpper}` : s.currentUpper}/{s.currentLower}
                              </span>
                              <span>
                                {s.suggestedUpper >= 0 ? `+${s.suggestedUpper}` : s.suggestedUpper}/{s.suggestedLower}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 italic text-[11px] leading-snug">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
