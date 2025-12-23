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

  const renderSection = (section: WebsiteSection, index: number) => {
    const { type, props } = section;

    switch (type) {
      case 'hero':
        return <HeroSection key={index} {...(props as HeroProps)} theme={theme} />;

      case 'features':
        return <FeaturesSection key={index} {...(props as FeaturesProps)} theme={theme} />;

      case 'content':
        return <ContentSection key={index} {...(props as ContentProps)} theme={theme} />;

      case 'testimonials':
        return <TestimonialsSection key={index} {...(props as TestimonialsProps)} theme={theme} />;

      case 'faq':
        return <FAQSection key={index} {...(props as FAQProps)} theme={theme} />;

      case 'cta':
        return <CTASection key={index} {...(props as CTAProps)} theme={theme} />;

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
