
import React from 'react';
import { X, CheckCircle, ArrowRight } from 'lucide-react';
import { SEOStrategyReport } from '../../types';

interface StrategyModalProps {
  report: SEOStrategyReport;
  onClose: () => void;
  title: string;
  labels: { close: string };
}

export const StrategyModal: React.FC<StrategyModalProps> = ({
  report,
  onClose,
  title,
  labels,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="text-emerald-500 w-6 h-6" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Info */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Target Keyword
                </label>
                <div className="text-2xl font-black text-slate-900">
                  {report.targetKeyword}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Main Title (H1)
                </label>
                <div className="text-lg font-bold text-slate-800 bg-slate-50 p-3 rounded border border-slate-100">
                  {report.pageTitleH1}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                Meta Description
              </label>
              <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded border border-slate-100">
                {report.metaDescription}
              </div>
            </div>
          </div>

          {/* Structure */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                01
              </span>
              CONTENT STRUCTURE (H2/H3)
            </h3>
            <div className="space-y-3">
              {report.contentStructure.map((section, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-emerald-500/30 transition-colors shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-emerald-500 font-bold text-sm pt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 mb-1">
                        {section.header}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        {section.description}
                      </p>
                      {section.subsections && section.subsections.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {section.subsections.map((sub, sidx) => (
                            <span
                              key={sidx}
                              className="px-2 py-1 bg-slate-50 text-[10px] text-slate-500 rounded border border-slate-100 flex items-center gap-1"
                            >
                              <ArrowRight className="w-2 h-2 text-emerald-400" />
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                02
              </span>
              LSI & LONG-TAIL KEYWORDS
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-bold text-slate-700 mb-2">
                  Semantic Core
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.longTailKeywords?.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-emerald-500/10 text-emerald-700 rounded text-xs font-medium border border-emerald-500/20"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 mb-2">
                  Translated Keywords
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.longTailKeywords_trans?.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-xs font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="text-sm font-bold text-slate-700 mb-2">
              User Intent Summary
            </div>
            <p className="text-sm text-slate-600">{report.userIntentSummary}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100">
            <span>Recommended Length:</span>
            <span className="font-bold text-slate-900">
              {report.recommendedWordCount} words
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm font-medium"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
};
