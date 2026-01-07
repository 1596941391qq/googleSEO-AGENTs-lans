import React, { useState, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Type,
  Image as ImageIcon,
  Users,
  Globe,
  FileText,
  Link as LinkIcon,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Tone Options
const getToneOptions = (uiLanguage: "en" | "zh" = "en") => [
  {
    id: "professional",
    label: uiLanguage === "zh" ? "专业" : "Professional",
    emoji: "👔",
  },
  { id: "casual", label: uiLanguage === "zh" ? "随意" : "Casual", emoji: "☕" },
  {
    id: "persuasive",
    label: uiLanguage === "zh" ? "说服性" : "Persuasive",
    emoji: "🔥",
  },
  {
    id: "educational",
    label: uiLanguage === "zh" ? "教育性" : "Educational",
    emoji: "📚",
  },
];

// Visual Styles
const getVisualStyles = (uiLanguage: "en" | "zh" = "en") => [
  {
    id: "realistic",
    label: uiLanguage === "zh" ? "写实照片" : "Realistic Photo",
    emoji: "📷",
  },
  {
    id: "minimalist",
    label: uiLanguage === "zh" ? "极简主义" : "Minimalist",
    emoji: "🎨",
  },
  {
    id: "cyberpunk",
    label: uiLanguage === "zh" ? "赛博朋克" : "Cyberpunk",
    emoji: "🤖",
  },
  {
    id: "watercolor",
    label: uiLanguage === "zh" ? "水彩画" : "Watercolor",
    emoji: "🖌️",
  },
];

// Target Market Options
const getTargetMarketOptions = (uiLanguage: "en" | "zh" = "en") => [
  {
    id: "global",
    label: uiLanguage === "zh" ? "全球市场" : "Global Market",
    emoji: "🌍",
  },
  {
    id: "us",
    label: uiLanguage === "zh" ? "美国市场" : "US Market",
    emoji: "🇺🇸",
  },
  {
    id: "uk",
    label: uiLanguage === "zh" ? "英国市场" : "UK Market",
    emoji: "🇬🇧",
  },
  {
    id: "ca",
    label: uiLanguage === "zh" ? "加拿大市场" : "Canada Market",
    emoji: "🇨🇦",
  },
  {
    id: "au",
    label: uiLanguage === "zh" ? "澳大利亚市场" : "Australia Market",
    emoji: "🇦🇺",
  },
  {
    id: "de",
    label: uiLanguage === "zh" ? "德国市场" : "Germany Market",
    emoji: "🇩🇪",
  },
  {
    id: "fr",
    label: uiLanguage === "zh" ? "法国市场" : "France Market",
    emoji: "🇫🇷",
  },
  {
    id: "jp",
    label: uiLanguage === "zh" ? "日本市场" : "Japan Market",
    emoji: "🇯🇵",
  },
  {
    id: "cn",
    label: uiLanguage === "zh" ? "中国市场" : "China Market",
    emoji: "🇨🇳",
  },
];

interface ArticleInputConfigProps {
  onStart: (config: ArticleConfig) => void;
  isDarkTheme?: boolean;
  uiLanguage?: "en" | "zh";
}

export interface ArticleConfig {
  keyword: string;
  tone: string;
  visualStyle: string;
  targetAudience: "beginner" | "expert";
  targetMarket: string;
  reference?: {
    type: "document" | "url";
    document?: {
      filename: string;
      content: string;
    };
    url?: {
      url: string;
      content?: string;
      screenshot?: string;
    };
  };
}

export const ArticleInputConfig: React.FC<ArticleInputConfigProps> = ({
  onStart,
  isDarkTheme,
  uiLanguage = "en",
}) => {
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState("professional");
  const [visualStyle, setVisualStyle] = useState("realistic");
  const [audience, setAudience] = useState<"beginner" | "expert">("beginner");
  const [targetMarket, setTargetMarket] = useState("global");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reference state
  const [referenceType, setReferenceType] = useState<"document" | "url" | null>(
    null
  );
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentContent, setDocumentContent] = useState<string>("");
  const [documentFilename, setDocumentFilename] = useState<string>("");
  const [referenceUrl, setReferenceUrl] = useState<string>("");
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toneOptions = getToneOptions(uiLanguage as "en" | "zh");
  const visualStyles = getVisualStyles(uiLanguage as "en" | "zh");
  const targetMarketOptions = getTargetMarketOptions(uiLanguage as "en" | "zh");

  // Handle document upload
  const handleDocumentUpload = async (file: File) => {
    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert(
        uiLanguage === "zh"
          ? "文件大小不能超过2MB"
          : "File size must be less than 2MB"
      );
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".txt", ".md", ".docx"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      alert(
        uiLanguage === "zh"
          ? "不支持的文件格式。支持：PDF, TXT, MD, DOCX"
          : "Unsupported file format. Supported: PDF, TXT, MD, DOCX"
      );
      return;
    }

    setDocumentFile(file);
    setDocumentFilename(file.name);
    setIsProcessingDocument(true);

    try {
      let extractedText = "";

      // Extract text based on file type
      if (fileExtension === ".txt" || fileExtension === ".md") {
        // For text files, read directly
        extractedText = await file.text();
      } else if (fileExtension === ".pdf") {
        // For PDF, try basic extraction first, then fallback to backend
        // Note: For better PDF support, consider using pdf.js library
        try {
          // Try to read as text (works for some PDFs)
          extractedText = await file.text();

          // Basic validation - if text is mostly non-printable, extraction likely failed
          const printableChars =
            extractedText.match(/[\x20-\x7E\n\r]/g)?.length || 0;
          if (printableChars < extractedText.length * 0.3) {
            throw new Error("PDF text extraction needs backend processing");
          }
        } catch (pdfError) {
          // Send to backend for processing
          const fileContent = await file.text();
          const response = await fetch("/api/extract-document-text", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filename: file.name,
              content: fileContent,
            }),
          });

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Unknown error" }));
            throw new Error(errorData.error || "Failed to extract PDF text");
          }

          const data = await response.json();
          extractedText = data.content || "";
        }
      } else if (fileExtension === ".docx") {
        // For DOCX, send to backend
        // Note: DOCX requires special parsing, frontend extraction is complex
        const fileContent = await file.text();
        const response = await fetch("/api/extract-document-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            content: fileContent,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || "Failed to extract DOCX text");
        }

        const data = await response.json();
        extractedText = data.content || "";
      }

      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error(
          uiLanguage === "zh"
            ? "文档提取的文本内容过少，请检查文档格式。PDF和DOCX文件需要特殊处理。"
            : "Extracted text is too short, please check document format. PDF and DOCX files require special processing."
        );
      }

      // Clean up text
      extractedText = extractedText
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Limit to 50000 characters
      if (extractedText.length > 50000) {
        extractedText = extractedText.substring(0, 50000) + "...";
      }

      setDocumentContent(extractedText);
      setReferenceType("document");
    } catch (error) {
      console.error("Document processing error:", error);
      alert(
        uiLanguage === "zh"
          ? "文档处理失败，请重试"
          : "Failed to process document, please try again"
      );
      setDocumentFile(null);
      setDocumentFilename("");
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDocumentUpload(file);
    }
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentContent("");
    setDocumentFilename("");
    setReferenceType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlChange = (url: string) => {
    setReferenceUrl(url);
    if (url.trim()) {
      setReferenceType("url");
    } else {
      setReferenceType(null);
    }
  };

  const removeUrl = () => {
    setReferenceUrl("");
    setReferenceType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    const config: ArticleConfig = {
      keyword,
      tone,
      visualStyle,
      targetAudience: audience,
      targetMarket,
    };

    // Add reference if provided
    if (referenceType === "document" && documentContent) {
      config.reference = {
        type: "document",
        document: {
          filename: documentFilename,
          content: documentContent,
        },
      };
    } else if (referenceType === "url" && referenceUrl.trim()) {
      config.reference = {
        type: "url",
        url: {
          url: referenceUrl.trim(),
        },
      };
    }

    onStart(config);
  };

  return (
    <div className="flex flex-col items-center justify-start pt-24 min-h-screen max-w-2xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <Wand2 className="text-emerald-500 w-8 h-8" />
        </div>
        <h1 className={cn(
          "text-4xl font-black tracking-tight mb-2",
          isDarkTheme ? "text-white" : "text-gray-900"
        )}>
          {uiLanguage === "zh" ? "AI 图文工场" : "AI Visual Article Generator"}
        </h1>
        <p className={cn(
          "text-lg max-w-md mx-auto",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}>
          {uiLanguage === "zh"
            ? "将单个关键词转换为包含 AI 生成配图的丰富结构化文章。"
            : "Transform a single keyword into a rich, structured article with AI-generated visuals."}
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* Settings Summary - Display above input */}
        {(tone !== "professional" ||
          visualStyle !== "realistic" ||
          targetMarket !== "global" ||
          audience !== "beginner") && (
          <div className={cn(
            "border rounded-xl p-4 space-y-3 animate-in slide-in-from-top-4 duration-300",
            isDarkTheme 
              ? "bg-[#111] border-white/5" 
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-xs font-bold uppercase tracking-widest",
                isDarkTheme ? "text-gray-400" : "text-gray-600"
              )}>
                {uiLanguage === "zh" ? "当前设置" : "Current Settings"}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {uiLanguage === "zh" ? "编辑" : "Edit"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tone !== "professional" && (
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-2">
                  <Type size={12} className="text-emerald-400" />
                  <span className="text-xs text-emerald-300">
                    {uiLanguage === "zh" ? "语调" : "Tone"}:{" "}
                    {toneOptions.find((o) => o.id === tone)?.emoji}{" "}
                    {toneOptions.find((o) => o.id === tone)?.label}
                  </span>
                </div>
              )}
              {visualStyle !== "realistic" && (
                <div className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center space-x-2">
                  <ImageIcon size={12} className="text-purple-400" />
                  <span className="text-xs text-purple-300">
                    {uiLanguage === "zh" ? "视觉风格" : "Visual"}:{" "}
                    {visualStyles.find((s) => s.id === visualStyle)?.emoji}{" "}
                    {visualStyles.find((s) => s.id === visualStyle)?.label}
                  </span>
                </div>
              )}
              {targetMarket !== "global" && (
                <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center space-x-2">
                  <Globe size={12} className="text-blue-400" />
                  <span className="text-xs text-blue-300">
                    {uiLanguage === "zh" ? "目标市场" : "Market"}:{" "}
                    {
                      targetMarketOptions.find((m) => m.id === targetMarket)
                        ?.emoji
                    }{" "}
                    {
                      targetMarketOptions.find((m) => m.id === targetMarket)
                        ?.label
                    }
                  </span>
                </div>
              )}
              {audience !== "beginner" && (
                <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center space-x-2">
                  <Users size={12} className="text-amber-400" />
                  <span className="text-xs text-amber-300">
                    {uiLanguage === "zh" ? "目标受众" : "Audience"}:{" "}
                    {audience === "expert"
                      ? uiLanguage === "zh"
                        ? "专家"
                        : "Expert"
                      : uiLanguage === "zh"
                      ? "初学者"
                      : "Beginner"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Input */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                uiLanguage === "zh"
                  ? "输入您的主题关键词"
                  : "Enter your topic keyword"
              }
              className={cn(
                "w-full text-xl p-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-2xl",
                isDarkTheme
                  ? "bg-[#111] border border-white/10 text-white placeholder:text-gray-600"
                  : "bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400"
              )}
              autoFocus
            />
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="absolute right-3 top-3 bottom-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <span>{uiLanguage === "zh" ? "生成" : "Generate"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Reference Materials Section - Always Visible */}
        <div className={cn(
          "border rounded-xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-300",
          isDarkTheme 
            ? "bg-[#111] border-white/5" 
            : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileText className="text-emerald-400" size={16} />
            </div>
            <div>
              <label className={cn(
                "text-sm font-bold",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}>
                {uiLanguage === "zh"
                  ? "参考资料（可选）"
                  : "Reference Materials (Optional)"}
              </label>
              <p className={cn(
                "text-[10px] mt-0.5",
                isDarkTheme ? "text-gray-500" : "text-gray-500"
              )}>
                {uiLanguage === "zh"
                  ? "上传文档或输入URL以指导文章生成"
                  : "Upload document or enter URL to guide article generation"}
              </p>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            {!documentFile ? (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isProcessingDocument || !!referenceUrl}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingDocument || !!referenceUrl}
                  className={cn(
                    "w-full p-4 border-2 border-dashed rounded-lg transition-all flex flex-col items-center justify-center space-y-2 group",
                    isProcessingDocument || referenceUrl
                      ? "border-gray-700 bg-gray-900/30 cursor-not-allowed"
                      : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer"
                  )}
                >
                  {isProcessingDocument ? (
                    <>
                      <Loader2
                        className="text-emerald-400 animate-spin"
                        size={20}
                      />
                      <span className="text-xs text-emerald-400 font-medium">
                        {uiLanguage === "zh" ? "处理中..." : "Processing..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload
                        className={cn(
                          "transition-colors",
                          referenceUrl
                            ? "text-gray-600"
                            : "text-emerald-400 group-hover:text-emerald-300"
                        )}
                        size={20}
                      />
                      <div className="text-center">
                        <div
                          className={cn(
                            "text-xs font-medium transition-colors",
                            referenceUrl
                              ? "text-gray-500"
                              : "text-emerald-400 group-hover:text-emerald-300"
                          )}
                        >
                          {uiLanguage === "zh"
                            ? "点击上传文档"
                            : "Click to upload document"}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {uiLanguage === "zh"
                            ? "支持 PDF, TXT, MD, DOCX (最大 2MB)"
                            : "PDF, TXT, MD, DOCX (Max 2MB)"}
                        </div>
                      </div>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between group hover:bg-emerald-500/15 transition-colors">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-emerald-500/20 rounded-lg flex-shrink-0">
                    <FileText className="text-emerald-400" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-emerald-300 truncate">
                      {documentFilename}
                    </div>
                    <div className="text-xs text-emerald-400/70 mt-0.5">
                      {documentContent.length > 0
                        ? uiLanguage === "zh"
                          ? `已提取 ${documentContent.length.toLocaleString()} 字`
                          : `${documentContent.length.toLocaleString()} chars extracted`
                        : ""}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeDocument}
                  className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all flex-shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="text-[10px] text-gray-500 uppercase">
              {uiLanguage === "zh" ? "或" : "OR"}
            </span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            {!referenceUrl ? (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <LinkIcon className={cn(
                    isDarkTheme ? "text-gray-500" : "text-gray-500"
                  )} size={16} />
                </div>
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={
                    uiLanguage === "zh"
                      ? "https://example.com"
                      : "https://example.com"
                  }
                  disabled={isProcessingDocument || !!documentFile}
                  className={cn(
                    cn(
                      "w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all",
                      isDarkTheme
                        ? "bg-black/40 text-white placeholder:text-gray-600"
                        : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    ),
                    isProcessingDocument || documentFile
                      ? "border-gray-700 cursor-not-allowed"
                      : "border-blue-500/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                  )}
                />
                {referenceUrl && (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400/80">
                    📸{" "}
                    {uiLanguage === "zh"
                      ? "页面截图将作为文章配图之一"
                      : "Page screenshot will be used as one of the article images"}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between group hover:bg-blue-500/15 transition-colors">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                    <LinkIcon className="text-blue-400" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-blue-300 truncate">
                      {referenceUrl}
                    </div>
                    <div className="text-xs text-blue-400/70 mt-0.5 flex items-center space-x-1">
                      <span>📸</span>
                      <span>
                        {uiLanguage === "zh"
                          ? "将生成截图"
                          : "Screenshot will be generated"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeUrl}
                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all flex-shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* More Options Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-all flex items-center space-x-2"
          >
            <Sparkles size={14} />
            <span>{uiLanguage === "zh" ? "更多选项" : "More Options"}</span>
          </button>
        </div>

        {/* More Options Modal */}
        {isModalOpen && (
          <div
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200",
              isDarkTheme ? "bg-black/80" : "bg-black/50"
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
              }
            }}
          >
            <div
              className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={cn(
                "sticky top-0 border-b p-6 flex items-center justify-between z-10",
                isDarkTheme 
                  ? "bg-[#111] border-white/10" 
                  : "bg-white border-gray-200"
              )}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Sparkles className="text-emerald-400" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {uiLanguage === "zh" ? "更多选项" : "More Options"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isDarkTheme
                      ? "hover:bg-white/5 text-gray-400 hover:text-white"
                      : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tone */}
                  <div className="space-y-3">
                    <label className={cn(
                      "text-xs font-bold uppercase tracking-widest flex items-center",
                      isDarkTheme ? "text-gray-500" : "text-gray-600"
                    )}>
                      <Type size={12} className="mr-2" />{" "}
                      {uiLanguage === "zh" ? "语调" : "Tone"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {toneOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTone(opt.id)}
                          className={cn(
                            "p-2 rounded border text-xs font-medium transition-all text-left flex items-center space-x-2",
                            tone === opt.id
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                              : isDarkTheme
                                ? "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                                : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Style */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                      <ImageIcon size={12} className="mr-2" />{" "}
                      {uiLanguage === "zh" ? "视觉风格" : "Visual Style"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {visualStyles.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setVisualStyle(style.id)}
                          className={cn(
                            "p-2 rounded border text-xs font-medium transition-all text-left flex items-center space-x-2",
                            visualStyle === style.id
                              ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                              : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                          )}
                        >
                          <span>{style.emoji}</span>
                          <span>{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Market */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                    <Globe size={12} className="mr-2" />{" "}
                    {uiLanguage === "zh" ? "目标市场" : "Target Market"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {targetMarketOptions.map((market) => (
                      <button
                        key={market.id}
                        type="button"
                        onClick={() => setTargetMarket(market.id)}
                        className={cn(
                          "p-2 rounded border text-xs font-medium transition-all text-center flex flex-col items-center space-y-1",
                          targetMarket === market.id
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                            : isDarkTheme
                              ? "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                              : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <span className="text-base">{market.emoji}</span>
                        <span>{market.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience Slider (Simple Toggle for now) */}
                <div className={cn(
                  "space-y-3 pt-2 border-t",
                  isDarkTheme ? "border-white/5" : "border-gray-200"
                )}>
                  <label className={cn(
                    "text-xs font-bold uppercase tracking-widest flex items-center",
                    isDarkTheme ? "text-gray-500" : "text-gray-600"
                  )}>
                    <Users size={12} className="mr-2" />{" "}
                    {uiLanguage === "zh" ? "目标受众" : "Target Audience"}
                  </label>
                  <div className={cn(
                    "flex p-1 rounded-lg w-full max-w-md mx-auto border",
                    isDarkTheme
                      ? "bg-black/40 border-white/5"
                      : "bg-gray-100 border-gray-300"
                  )}>
                    <button
                      type="button"
                      onClick={() => setAudience("beginner")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                        audience === "beginner"
                          ? "bg-white/10 text-white shadow"
                          : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {uiLanguage === "zh" ? "初学者" : "Beginner"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudience("expert")}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                        audience === "expert"
                          ? isDarkTheme
                            ? "bg-white/10 text-white shadow"
                            : "bg-emerald-100 text-emerald-700 shadow"
                          : isDarkTheme
                            ? "text-gray-500 hover:text-gray-300"
                            : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {uiLanguage === "zh" ? "专家" : "Expert"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={cn(
                "sticky bottom-0 border-t p-6 flex justify-end space-x-3",
                isDarkTheme 
                  ? "bg-[#111] border-white/10" 
                  : "bg-white border-gray-200"
              )}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "px-4 py-2 border rounded-lg text-sm font-medium transition-all",
                    isDarkTheme
                      ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white"
                      : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 hover:text-gray-900"
                  )}
                >
                  {uiLanguage === "zh" ? "取消" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-sm transition-all"
                >
                  {uiLanguage === "zh" ? "确认" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
