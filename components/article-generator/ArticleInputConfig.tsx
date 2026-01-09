import React, { useState, useRef, useEffect } from "react";
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
  Rocket,
  CheckCircle2,
  ChevronDown,
  Layout,
  MousePointer2,
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
  userId?: number | string;
  initialKeyword?: string;
  initialTone?: string;
  initialVisualStyle?: string;
  initialAudience?: "beginner" | "expert";
  initialTargetMarket?: string;
  initialPromotedWebsites?: string[];
  initialPromotionIntensity?: "natural" | "strong";
}

export interface ArticleConfig {
  keyword: string;
  tone: string;
  visualStyle: string;
  targetAudience: "beginner" | "expert";
  targetMarket: string;
  promotedWebsites?: string[]; // 推广网站 URL 或已绑定网站 ID
  promotionIntensity?: "natural" | "strong"; // 推广强度
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
  userId,
  initialKeyword = "",
  initialTone = "professional",
  initialVisualStyle = "realistic",
  initialAudience = "beginner",
  initialTargetMarket = "global",
  initialPromotedWebsites = [],
  initialPromotionIntensity = "natural",
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [tone, setTone] = useState(initialTone);
  const [visualStyle, setVisualStyle] = useState(initialVisualStyle);
  const [audience, setAudience] = useState<"beginner" | "expert">(
    initialAudience
  );
  const [targetMarket, setTargetMarket] = useState(initialTargetMarket);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Promotion state
  const [promotedWebsites, setPromotedWebsites] = useState<string[]>(initialPromotedWebsites);
  const [newPromoUrl, setNewPromoUrl] = useState("");
  const [promotionIntensity, setPromotionIntensity] = useState<"natural" | "strong">(initialPromotionIntensity);
  const [boundWebsites, setBoundWebsites] = useState<Array<{id: string, url: string, domain: string, title?: string}>>([]);
  const [isLoadingWebsites, setIsLoadingWebsites] = useState(false);

  // Fetch bound websites
  useEffect(() => {
    const fetchWebsites = async () => {
      if (!userId) return;
      setIsLoadingWebsites(true);
      try {
        const response = await fetch(`/api/websites/list?user_id=${userId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.websites) {
            setBoundWebsites(result.data.websites);
          }
        }
      } catch (error) {
        console.error("Failed to fetch bound websites:", error);
      } finally {
        setIsLoadingWebsites(false);
      }
    };
    fetchWebsites();
  }, [userId]);

  const handleAddPromoUrl = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (newPromoUrl.trim() && !promotedWebsites.includes(newPromoUrl.trim())) {
      setPromotedWebsites([...promotedWebsites, newPromoUrl.trim()]);
      setNewPromoUrl("");
    }
  };

  const removePromoUrl = (url: string) => {
    setPromotedWebsites(promotedWebsites.filter(u => u !== url));
  };

  const toggleBoundWebsite = (url: string) => {
    if (promotedWebsites.includes(url)) {
      setPromotedWebsites(promotedWebsites.filter(u => u !== url));
    } else {
      setPromotedWebsites([...promotedWebsites, url]);
    }
  };

  // Update local state when initial props change
  React.useEffect(() => {
    if (initialKeyword) {
      setKeyword(initialKeyword);
    }
  }, [initialKeyword]);

  React.useEffect(() => {
    if (initialTone) setTone(initialTone);
  }, [initialTone]);

  React.useEffect(() => {
    if (initialVisualStyle) setVisualStyle(initialVisualStyle);
  }, [initialVisualStyle]);

  React.useEffect(() => {
    if (initialAudience) setAudience(initialAudience);
  }, [initialAudience]);

  React.useEffect(() => {
    if (initialTargetMarket) setTargetMarket(initialTargetMarket);
  }, [initialTargetMarket]);

  // Reference state
  const [referenceType, setReferenceType] = useState<"document" | "url" | null>(
    null
  );
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentContent, setDocumentContent] = useState<string>("");
  const [documentFilename, setDocumentFilename] = useState<string>("");
  const [referenceUrl, setReferenceUrl] = useState<string>("");
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [urlError, setUrlError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

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
    setUrlError("");
    if (url.trim()) {
      setReferenceType("url");
      if (!isValidUrl(url.trim())) {
        setUrlError(
          uiLanguage === "zh"
            ? "请输入有效的 URL (以 http/https 开头)"
            : "Please enter a valid URL starting with http/https"
        );
      }
    } else {
      setReferenceType(null);
    }
  };

  const removeUrl = () => {
    setReferenceUrl("");
    setUrlError("");
    setReferenceType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    // Validate URL if provided
    if (referenceType === "url" && referenceUrl.trim()) {
      if (!isValidUrl(referenceUrl.trim())) {
        setUrlError(
          uiLanguage === "zh"
            ? "请先修正无效的 URL"
            : "Please fix the invalid URL first"
        );
        return;
      }
    }

    // Validate document if in progress
    if (isProcessingDocument) {
      alert(
        uiLanguage === "zh"
          ? "请等待文档处理完成"
          : "Please wait for document processing"
      );
      return;
    }

    // Validate document content if selected
    if (referenceType === "document" && !documentContent) {
      alert(
        uiLanguage === "zh"
          ? "文档解析失败，请重新上传或更换文档"
          : "Document extraction failed, please re-upload or choose another file"
      );
      return;
    }

    const config: ArticleConfig = {
      keyword,
      tone,
      visualStyle,
      targetAudience: audience,
      targetMarket,
      promotedWebsites: promotedWebsites.length > 0 ? promotedWebsites : undefined,
      promotionIntensity,
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
    <div className="flex flex-col items-center justify-start pt-8 pb-12 min-h-screen max-w-[90rem] mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Header - More Compact */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center p-2 bg-emerald-500/10 rounded-xl mb-2 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <Wand2 className="text-emerald-500 w-6 h-6" />
        </div>
        <h1 className={cn(
          "text-3xl font-black tracking-tight",
          isDarkTheme ? "text-white" : "text-gray-900"
        )}>
          {uiLanguage === "zh" ? "AI 图文工场" : "AI Visual Article Generator"}
        </h1>
        <p className={cn(
          "text-sm max-w-xl mx-auto opacity-70",
          isDarkTheme ? "text-gray-300" : "text-gray-600"
        )}>
          {uiLanguage === "zh"
            ? "将关键词转化为包含 AI 视觉、深度 SEO 策略和品牌推广的高质量文章。"
            : "Transform keywords into high-quality articles with AI visuals, deep SEO strategy, and brand promotion."}
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* Step 1: Core Keyword (More Balanced Size) */}
        <div className="relative group max-w-4xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                uiLanguage === "zh"
                  ? "输入您要创作的主题关键词..."
                  : "Enter the topic keyword you want to create..."
              }
              className={cn(
                "w-full text-xl font-bold p-6 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-2xl",
                isDarkTheme
                  ? "bg-black/40 border border-white/10 text-white placeholder:text-gray-600"
                  : "bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400"
              )}
              autoFocus
            />
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="absolute right-3 top-3 bottom-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 rounded-xl transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              <span>{uiLanguage === "zh" ? "立即生成" : "Generate"}</span>
              <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Step 2: Three-Column Grid Layout ( 平铺展示 ) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Website Promotion */}
          <div className={cn(
            "p-5 rounded-2xl border transition-all flex flex-col",
            isDarkTheme ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"
          )}>
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Rocket className="text-blue-400" size={16} />
              </div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", isDarkTheme ? "text-white" : "text-gray-900")}>
                {uiLanguage === "zh" ? "网站推广" : "Promotion"}
              </h3>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newPromoUrl}
                  onChange={(e) => setNewPromoUrl(e.target.value)}
                  onKeyDown={handleAddPromoUrl}
                  placeholder={uiLanguage === "zh" ? "输入推广 URL" : "URL"}
                  className={cn(
                    "flex-1 text-[11px] p-2.5 rounded-lg border focus:outline-none",
                    isDarkTheme ? "bg-black/40 border-white/5 text-white" : "bg-gray-50 border-gray-200"
                  )}
                />
                <button
                  type="button"
                  onClick={handleAddPromoUrl}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-bold border border-white/5"
                >
                  {uiLanguage === "zh" ? "添加" : "Add"}
                </button>
              </div>

              {promotedWebsites.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {promotedWebsites.map(url => (
                    <div key={url} className="flex items-center space-x-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-[9px] text-blue-300">
                      <span className="truncate max-w-[80px]">{url}</span>
                      <button onClick={() => removePromoUrl(url)} className="hover:text-white">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {boundWebsites.length > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <div className="grid grid-cols-1 gap-1.5 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                    {boundWebsites.map(site => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => toggleBoundWebsite(site.url)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-left transition-all",
                          promotedWebsites.includes(site.url)
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                            : "bg-black/20 border-white/5 text-gray-400 hover:border-white/20"
                        )}
                      >
                        <span className="text-[10px] font-medium truncate">{site.domain}</span>
                        {promotedWebsites.includes(site.url) && <CheckCircle2 size={10} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/5 mt-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-gray-500 uppercase">{uiLanguage === "zh" ? "推广强度" : "Intensity"}</span>
                  <div className="flex p-0.5 bg-black/40 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setPromotionIntensity("natural")}
                      className={cn("px-2 py-1 text-[9px] font-bold rounded-md transition-all", promotionIntensity === "natural" ? "bg-white/10 text-white" : "text-gray-500")}
                    >
                      {uiLanguage === "zh" ? "自然" : "Natural"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromotionIntensity("strong")}
                      className={cn("px-2 py-1 text-[9px] font-bold rounded-md transition-all", promotionIntensity === "strong" ? "bg-blue-500/20 text-blue-400" : "text-gray-500")}
                    >
                      {uiLanguage === "zh" ? "重点" : "Strong"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Reference & Market */}
          <div className={cn(
            "p-5 rounded-2xl border transition-all flex flex-col",
            isDarkTheme ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"
          )}>
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <FileText className="text-emerald-400" size={16} />
              </div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", isDarkTheme ? "text-white" : "text-gray-900")}>
                {uiLanguage === "zh" ? "参考系与市场" : "Reference & Market"}
              </h3>
            </div>

            <div className="space-y-5 flex-1">
              <div className="space-y-3">
                {!documentFile && !referenceUrl ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 border border-dashed border-white/10 bg-black/20 rounded-xl hover:border-emerald-500/50 transition-all flex flex-col items-center space-y-1"
                    >
                      <Upload size={14} className="text-emerald-400/50" />
                      <span className="text-[9px] font-bold text-gray-500 uppercase">{uiLanguage === "zh" ? "文档" : "File"}</span>
                    </button>
                    <div className="relative">
                      <input
                        type="url"
                        value={referenceUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="URL..."
                        className="w-full p-3 pl-8 border border-dashed border-white/10 bg-black/20 rounded-xl text-[10px] text-white focus:outline-none"
                      />
                      <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentFile && (
                      <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <span className="text-[10px] text-emerald-300 truncate max-w-[150px]">{documentFilename}</span>
                        <button onClick={removeDocument}><X size={12} className="text-emerald-400" /></button>
                      </div>
                    )}
                    {referenceUrl && (
                      <div className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <span className="text-[10px] text-blue-300 truncate max-w-[150px]">{referenceUrl}</span>
                        <button onClick={removeUrl}><X size={12} className="text-blue-400" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4 mt-auto">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase">{uiLanguage === "zh" ? "目标市场" : "Target Market"}</label>
                  <div className="relative">
                    <select
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value)}
                      className="w-full appearance-none bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-300 focus:outline-none"
                    >
                      {targetMarketOptions.map(m => (
                        <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase">{uiLanguage === "zh" ? "内容深度" : "Content Depth"}</label>
                  <div className="flex p-0.5 bg-black/40 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setAudience("beginner")}
                      className={cn("flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all", audience === "beginner" ? "bg-white/10 text-white" : "text-gray-500")}
                    >
                      {uiLanguage === "zh" ? "初学者" : "Junior"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudience("expert")}
                      className={cn("flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all", audience === "expert" ? "bg-emerald-500/20 text-emerald-400" : "text-gray-500")}
                    >
                      {uiLanguage === "zh" ? "专业" : "Expert"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Narrative & Style */}
          <div className={cn(
            "p-5 rounded-2xl border transition-all flex flex-col",
            isDarkTheme ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"
          )}>
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Layout className="text-purple-400" size={16} />
              </div>
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", isDarkTheme ? "text-white" : "text-gray-900")}>
                {uiLanguage === "zh" ? "风格偏好" : "Style Preferences"}
              </h3>
            </div>

            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-gray-500 uppercase">{uiLanguage === "zh" ? "叙事语调" : "Tone"}</label>
                  <span className="text-[9px] text-emerald-400 font-bold">{toneOptions.find(o => o.id === tone)?.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {toneOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTone(opt.id)}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-lg border transition-all text-left",
                        tone === opt.id ? "bg-emerald-500/10 border-emerald-500/40" : "bg-black/20 border-white/5"
                      )}
                    >
                      <span className="text-sm">{opt.emoji}</span>
                      <span className={cn("text-[10px] font-bold", tone === opt.id ? "text-emerald-300" : "text-gray-500")}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/5 mt-auto">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-gray-500 uppercase">{uiLanguage === "zh" ? "配图风格" : "Visuals"}</label>
                  <span className="text-[9px] text-purple-400 font-bold">{visualStyles.find(s => s.id === visualStyle)?.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {visualStyles.map(style => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setVisualStyle(style.id)}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-lg border transition-all text-left",
                        visualStyle === style.id ? "bg-purple-500/10 border-purple-500/40" : "bg-black/20 border-white/5"
                      )}
                    >
                      <span className="text-sm">{style.emoji}</span>
                      <span className={cn("text-[10px] font-bold", visualStyle === style.id ? "text-purple-300" : "text-gray-500")}>{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Quick Settings Info (Only show when modified) */}
        {(tone !== "professional" || visualStyle !== "realistic" || targetMarket !== "global" || promotedWebsites.length > 0) && (
          <div className="flex justify-center pt-2">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center space-x-3">
              <MousePointer2 size={10} className="text-emerald-400" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                {uiLanguage === "zh" ? "自定义配置已激活" : "Custom Config Active"}
              </span>
              <div className="flex -space-x-1.5">
                {promotedWebsites.length > 0 && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] ring-2 ring-black font-black">P</div>}
                {tone !== "professional" && <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] ring-2 ring-black font-black">T</div>}
                {visualStyle !== "realistic" && <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] ring-2 ring-black font-black">V</div>}
              </div>
            </div>
          </div>
        )}
      </form>
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.docx" onChange={handleFileInputChange} className="hidden" />
    </div>
  );
};
