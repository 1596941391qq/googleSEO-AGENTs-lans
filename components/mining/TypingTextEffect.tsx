import React, { useState, useEffect } from "react";

interface TypingTextEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  isDarkTheme?: boolean;
}

export const TypingTextEffect: React.FC<TypingTextEffectProps> = ({
  text,
  speed = 25,
  onComplete,
  isDarkTheme = true,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text || text.length === 0) {
      setDisplayedText(text || "");
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      {!isComplete && (
        <span
          className={`inline-block w-1.5 h-3.5 ml-0.5 animate-pulse ${isDarkTheme ? "bg-emerald-400" : "bg-emerald-600"
            }`}
        />
      )}
    </span>
  );
};
