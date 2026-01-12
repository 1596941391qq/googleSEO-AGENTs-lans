import React, { useState } from 'react';
import {
  Target,
  Lightbulb,
  ChevronRight,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';

/**
 * 挖词指导组件（简化版 - 移除了语言选择）
 *
 * 在用户开始挖词前提供友好的引导界面
 * 包含：行业选择、其他建议输入、AI建议
 */

export interface MiningConfig {
  industry: string;
  additionalSuggestions?: string; // 用户的其他建议
}

interface KeywordMiningGuideProps {
  onStart: (config: MiningConfig) => void;
  onCancel: () => void;
  uiLanguage: 'zh' | 'en';
  isDarkTheme?: boolean;
}

const INDUSTRIES = [
  { id: 'ai', label: { zh: 'AI & 机器学习', en: 'AI & Machine Learning' }, icon: '🤖' },
  { id: 'ecommerce', label: { zh: '电子商务 / DTC品牌', en: 'E-commerce / DTC Brands' }, icon: '🛍️' },
  { id: 'saas', label: { zh: 'SaaS / 软件服务', en: 'SaaS / Software Services' }, icon: '💻' },
  { id: 'fintech', label: { zh: '金融科技', en: 'FinTech' }, icon: '💰' },
  { id: 'health', label: { zh: '健康与医疗', en: 'Health & Medical' }, icon: '🏥' },
  { id: 'education', label: { zh: '教育与培训', en: 'Education & Training' }, icon: '📚' },
  { id: 'travel', label: { zh: '旅游与酒店', en: 'Travel & Hospitality' }, icon: '✈️' },
  { id: 'b2b', label: { zh: 'B2B 营销与咨询', en: 'B2B Marketing & Consulting' }, icon: '🤝' },
  { id: 'content', label: { zh: '内容创作者 / 博客', en: 'Content Creator / Blog' }, icon: '✍️' },
];

const INDUSTRY_ADVICE: Record<string, { zh: string; en: string }> = {
  ai: {
    zh: "AI行业关键词策略：关注技术趋势词（如'GPT-4应用'）、痛点词（如'AI落地困难'）、竞品对比词。建议先挖掘长尾问题型关键词。",
    en: "AI industry keyword strategy: Focus on tech trends (e.g., 'GPT-4 applications'), pain points (e.g., 'AI implementation challenges'), and competitor comparisons. Start with long-tail question-based keywords."
  },
  ecommerce: {
    zh: "电商行业关键词策略：关注产品词+修饰词（如'环保咖啡杯'）、购买意图词（如'哪里买'）、评价对比词。",
    en: "E-commerce keyword strategy: Focus on product + modifier (e.g., 'eco-friendly coffee cup'), purchase intent (e.g., 'where to buy'), and comparison keywords."
  },
  saas: {
    zh: "SaaS行业关键词策略：关注功能词（如'项目管理工具'）、替代方案词（如'Trello替代'）、集成词（如'Notion与Slack集成'）。",
    en: "SaaS industry keyword strategy: Focus on feature keywords (e.g., 'project management tool'), alternative searches (e.g., 'Trello alternative'), and integration terms (e.g., 'Notion Slack integration')."
  },
  fintech: {
    zh: "金融科技关键词策略：关注信任相关词（如'安全投资'）、教育类词（如'如何理财'）、产品对比词。",
    en: "FinTech keyword strategy: Focus on trust terms (e.g., 'secure investment'), educational keywords (e.g., 'how to invest'), and product comparisons."
  },
  health: {
    zh: "健康医疗关键词策略：关注症状词（如'头痛原因'）、治疗方案词（如'自然缓解'）、专业问题词。",
    en: "Health & Medical keyword strategy: Focus on symptom keywords (e.g., 'headache causes'), treatment options (e.g., 'natural relief'), and professional questions."
  },
  education: {
    zh: "教育培训关键词策略：关注学习目标词（如'如何学习Python'）、课程对比词、技能提升词。",
    en: "Education keyword strategy: Focus on learning goals (e.g., 'how to learn Python'), course comparisons, and skill enhancement terms."
  },
  travel: {
    zh: "旅游酒店关键词策略：关注目的地词（如'最佳海滩'）、季节性词（如'夏季旅行'）、体验类词。",
    en: "Travel keyword strategy: Focus on destination keywords (e.g., 'best beaches'), seasonal terms (e.g., 'summer travel'), and experience-based keywords."
  },
  b2b: {
    zh: "B2B营销关键词策略：关注解决方案词（如'提高效率'）、行业问题词、专业服务词。",
    en: "B2B Marketing keyword strategy: Focus on solution keywords (e.g., 'improve efficiency'), industry problems, and professional services."
  },
  content: {
    zh: "内容创作关键词策略：关注创作技巧词（如'如何写出爆款'）、平台特定词（如'YouTube SEO'）、受众词。",
    en: "Content Creation keyword strategy: Focus on technique keywords (e.g., 'how to write viral content'), platform-specific terms (e.g., 'YouTube SEO'), and audience keywords."
  },
};

export function KeywordMiningGuide({ onStart, onCancel, uiLanguage, isDarkTheme = true }: KeywordMiningGuideProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [customIndustry, setCustomIndustry] = useState<string>('');
  const [additionalSuggestions, setAdditionalSuggestions] = useState<string>('');

  const t = (zh: string, en: string) => (uiLanguage === 'zh' ? zh : en);

  const handleStart = () => {
    const industry = customIndustry || selectedIndustry;
    if (!industry) return;

    onStart({
      industry,
      additionalSuggestions: additionalSuggestions.trim() || undefined,
    });
  };

  const getIndustryLabel = (industry: typeof INDUSTRIES[0]) => {
    return uiLanguage === 'zh' ? industry.label.zh : industry.label.en;
  };

  return (
    <div className={`fixed inset-0 ${isDarkTheme ? 'bg-black/80' : 'bg-black/50'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
      <div className={`${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar`}>
        {/* Header */}
        <div className={`sticky top-0 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'} border-b p-6 rounded-t-2xl z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                  {t('精确您的行业', 'Refine Your Industry')}
                </h2>
                <p className={`text-sm ${isDarkTheme ? 'text-zinc-400' : 'text-gray-600'} mt-0.5`}>
                  {t('选择行业并添加建议以获得更精准的关键词', 'Select industry and add suggestions for targeted keywords')}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className={`p-2 ${isDarkTheme ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
            >
              <X className={`w-5 h-5 ${isDarkTheme ? 'text-zinc-400' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Industry Selection */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <h3 className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {t('选择您的行业', 'Choose Your Industry')}
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => {
                    setSelectedIndustry(industry.id);
                    setCustomIndustry('');
                  }}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all duration-200 group
                    ${selectedIndustry === industry.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : isDarkTheme
                        ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{industry.icon}</span>
                    <span className={`text-sm font-medium ${isDarkTheme ? 'text-zinc-100 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {getIndustryLabel(industry)}
                    </span>
                  </div>
                  {selectedIndustry === industry.id && (
                    <Check className="w-4 h-4 text-emerald-500 ml-auto mt-2" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Industry Input */}
            <div className="mt-4">
              <input
                type="text"
                placeholder={t('或输入其他行业...', 'Or enter another industry...')}
                value={customIndustry}
                onChange={(e) => {
                  setCustomIndustry(e.target.value);
                  setSelectedIndustry('');
                }}
                className={`w-full px-4 py-3 ${isDarkTheme ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
              />
            </div>
          </div>

          {/* Step 2: Additional Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <h3 className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {t('其他建议（可选）', 'Additional Suggestions (Optional)')}
              </h3>
            </div>

            <div className={`p-4 ${isDarkTheme ? 'bg-zinc-800/50 border-zinc-700' : 'bg-gray-50 border-gray-200'} border rounded-lg`}>
              <div className="flex items-start gap-3 mb-3">
                <MessageSquare className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className={`text-sm ${isDarkTheme ? 'text-zinc-300' : 'text-gray-700'} mb-2`}>
                    {t(
                      '给AI的其他建议或要求，例如：关注哪些类型的关键词、避免什么、目标受众等。',
                      'Add any specific suggestions for AI, such as: focus on certain keyword types, what to avoid, target audience, etc.'
                    )}
                  </p>
                  <textarea
                    placeholder={t(
                      '例如：\n- 重点关注长尾问题词\n- 避免过于通用的词\n- 目标受众是企业主',
                      'Example:\n- Focus on long-tail question keywords\n- Avoid overly generic terms\n- Target audience: business owners'
                    )}
                    value={additionalSuggestions}
                    onChange={(e) => setAdditionalSuggestions(e.target.value)}
                    rows={4}
                    className={`w-full px-4 py-3 ${isDarkTheme ? 'bg-zinc-900 border-zinc-600 text-white placeholder-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Advice */}
          {(selectedIndustry || customIndustry) && (
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-400 mb-2">
                    💡 {t('AI行业建议', 'AI Industry Insights')}
                  </p>
                  <p className={`text-sm ${isDarkTheme ? 'text-zinc-300' : 'text-gray-700'} leading-relaxed`}>
                    {selectedIndustry && INDUSTRY_ADVICE[selectedIndustry]
                      ? INDUSTRY_ADVICE[selectedIndustry][uiLanguage]
                      : t(
                          `很好！${customIndustry}是一个充满机会的行业。我们将帮您发现低竞争、高价值的关键词。`,
                          `Great! ${customIndustry} is an industry full of opportunities. We'll help you discover low-competition, high-value keywords.`
                        )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleStart}
              disabled={!selectedIndustry && !customIndustry}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {t('确认', 'Confirm')}
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={onCancel}
              className={`px-6 py-3 border ${isDarkTheme ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'} rounded-lg transition-colors`}
            >
              {t('取消', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
