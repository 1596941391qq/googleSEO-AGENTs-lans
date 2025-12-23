import React from 'react';
import { ArrowRight, Check, Star, Zap, Shield, Clock, ChevronDown } from 'lucide-react';

// Theme configuration
export type Theme = 'blue' | 'green' | 'purple' | 'orange' | 'red';

const themeColors = {
  blue: {
    primary: 'from-blue-600 to-cyan-600',
    accent: 'bg-blue-600 hover:bg-blue-700',
    text: 'text-blue-600',
    border: 'border-blue-500',
  },
  green: {
    primary: 'from-green-600 to-emerald-600',
    accent: 'bg-green-600 hover:bg-green-700',
    text: 'text-green-600',
    border: 'border-green-500',
  },
  purple: {
    primary: 'from-purple-600 to-pink-600',
    accent: 'bg-purple-600 hover:bg-purple-700',
    text: 'text-purple-600',
    border: 'border-purple-500',
  },
  orange: {
    primary: 'from-orange-600 to-red-600',
    accent: 'bg-orange-600 hover:bg-orange-700',
    text: 'text-orange-600',
    border: 'border-orange-500',
  },
  red: {
    primary: 'from-red-600 to-rose-600',
    accent: 'bg-red-600 hover:bg-red-700',
    text: 'text-red-600',
    border: 'border-red-500',
  },
};

// ============================================
// 1. Hero Section
// ============================================
export interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  theme?: Theme;
}

export const HeroSection: React.FC<HeroProps> = ({
  title,
  subtitle,
  ctaText = 'Get Started',
  theme = 'blue',
}) => {
  const colors = themeColors[theme];

  return (
    <header className={`relative bg-gradient-to-r ${colors.primary} text-white py-20 px-4 overflow-hidden`}>
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">{subtitle}</p>
          )}
          <button className={`${colors.accent} text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2`}>
            {ctaText}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

// ============================================
// 2. Features Section
// ============================================
export interface Feature {
  icon: 'Zap' | 'Shield' | 'Clock' | 'Star' | 'Check';
  title: string;
  description: string;
}

export interface FeaturesProps {
  title?: string;
  features: Feature[];
  theme?: Theme;
}

const iconMap = {
  Zap,
  Shield,
  Clock,
  Star,
  Check,
};

export const FeaturesSection: React.FC<FeaturesProps> = ({
  title = 'Features',
  features,
  theme = 'blue',
}) => {
  const colors = themeColors[theme];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">{title}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={i}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`w-16 h-16 ${colors.accent} rounded-xl flex items-center justify-center mb-6`}>
                  <Icon size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================
// 3. Content Section
// ============================================
export interface ContentProps {
  heading: string;
  content: string;
  imagePosition?: 'left' | 'right';
  theme?: Theme;
}

export const ContentSection: React.FC<ContentProps> = ({
  heading,
  content,
  imagePosition = 'right',
  theme = 'blue',
}) => {
  const colors = themeColors[theme];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className={`flex flex-col ${imagePosition === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center`}>
          <div className="flex-1">
            <h2 className={`text-4xl font-bold mb-6 ${colors.text}`}>{heading}</h2>
            <div className="prose prose-lg text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
          <div className="flex-1">
            <div className={`aspect-video bg-gradient-to-br ${colors.primary} rounded-2xl shadow-xl`}></div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// 4. Testimonials Section
// ============================================
export interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating?: number;
}

export interface TestimonialsProps {
  title?: string;
  testimonials: Testimonial[];
  theme?: Theme;
}

export const TestimonialsSection: React.FC<TestimonialsProps> = ({
  title = 'What Our Customers Say',
  testimonials,
  theme = 'blue',
}) => {
  const colors = themeColors[theme];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">{title}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating || 5)].map((_, j) => (
                  <Star key={j} size={20} className={`fill-current ${colors.text}`} />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.content}</p>
              <div>
                <div className="font-bold text-gray-900">{testimonial.name}</div>
                <div className="text-sm text-gray-600">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// 5. FAQ Section
// ============================================
export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQProps {
  title?: string;
  faqs: FAQ[];
  theme?: Theme;
}

export const FAQSection: React.FC<FAQProps> = ({
  title = 'Frequently Asked Questions',
  faqs,
  theme = 'blue',
}) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const colors = themeColors[theme];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">{title}</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold text-lg text-gray-900">{faq.question}</span>
                <ChevronDown
                  size={24}
                  className={`transition-transform ${openIndex === i ? 'rotate-180' : ''} ${colors.text}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-8 pb-6 text-gray-700 leading-relaxed">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// 6. CTA Section
// ============================================
export interface CTAProps {
  title: string;
  subtitle?: string;
  buttonText?: string;
  theme?: Theme;
}

export const CTASection: React.FC<CTAProps> = ({
  title,
  subtitle,
  buttonText = 'Get Started Now',
  theme = 'blue',
}) => {
  const colors = themeColors[theme];

  return (
    <section className={`py-20 px-4 bg-gradient-to-r ${colors.primary} text-white`}>
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">{title}</h2>
        {subtitle && <p className="text-xl mb-8 text-white/90">{subtitle}</p>}
        <button className="bg-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2 text-gray-900 hover:scale-105">
          {buttonText}
          <ArrowRight size={20} />
        </button>
      </div>
    </section>
  );
};
