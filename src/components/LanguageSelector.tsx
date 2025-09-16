import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  size = 'md',
  showLabel = true
}) => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-2 py-1';
      case 'lg':
        return 'text-lg px-4 py-3';
      default:
        return 'text-base px-3 py-2';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        {showLabel && (
          <div className="flex items-center space-x-1 text-gray-600">
            <Globe className="w-4 h-4" />
            <span className="text-sm">{t('accessibility.languageSelect')}</span>
          </div>
        )}
        
        <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`
                ${getSizeClasses()}
                flex items-center space-x-2 transition-colors duration-200
                ${language.code === i18n.language
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                ${language.code === 'ko' ? 'border-r border-gray-300' : ''}
              `}
            >
              <span className="text-lg">{language.flag}</span>
              <span className="font-medium">{language.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector; 