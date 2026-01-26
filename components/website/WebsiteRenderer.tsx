import React from 'react';
import {
  HeroSection,
  FeaturesSection,
  ContentSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  type Theme,
  type HeroProps,
  type FeaturesProps,
  type ContentProps,
  type TestimonialsProps,
  type FAQProps,
  type CTAProps,
} from './SeoComponents';
import type { WebsiteData, WebsiteSection } from '../../types';

interface WebsiteRendererProps {
  data: WebsiteData;
}

export const WebsiteRenderer: React.FC<WebsiteRendererProps> = ({ data }) => {
  const { theme, sections } = data;
  const themeTyped = theme as Theme;

  const renderSection = (section: WebsiteSection, index: number) => {
    const { type, props } = section;

    switch (type) {
      case 'hero':
        return <HeroSection key={index} {...(props as unknown as HeroProps)} theme={themeTyped} />;

      case 'features':
        return <FeaturesSection key={index} {...(props as unknown as FeaturesProps)} theme={themeTyped} />;

      case 'content':
        return <ContentSection key={index} {...(props as unknown as ContentProps)} theme={themeTyped} />;

      case 'testimonials':
        return <TestimonialsSection key={index} {...(props as unknown as TestimonialsProps)} theme={themeTyped} />;

      case 'faq':
        return <FAQSection key={index} {...(props as unknown as FAQProps)} theme={themeTyped} />;

      case 'cta':
        return <CTASection key={index} {...(props as unknown as CTAProps)} theme={themeTyped} />;

      default:
        console.warn(`Unknown section type: ${type}`);
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {sections.map((section, index) => renderSection(section, index))}
    </div>
  );
};
