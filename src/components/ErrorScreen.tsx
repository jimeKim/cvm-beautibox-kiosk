import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import LanguageSelector from './LanguageSelector';

interface ErrorScreenProps {
  error: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => {
  const { t } = useTranslation();
  const { resetApp } = useAppStore();

  const handleRetry = () => {
    resetApp();
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-500 to-red-600">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{t('system.error')}</h2>
          <p className="text-white/90 text-lg mb-6">
            {error || t('errors.hardware')}
          </p>
          <button
            onClick={handleRetry}
            className="bg-white text-red-600 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors touch-feedback"
          >
            {t('common.retry')}
          </button>
        </div>
        
        {/* 언어 선택 버튼 */}
        <div className="absolute top-4 right-4">
          <LanguageSelector showLabel={false} size="sm" />
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen; 