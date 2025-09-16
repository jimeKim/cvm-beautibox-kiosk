import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const LoadingScreen: React.FC = () => {
  // 로딩 화면을 완전히 무효화 - 즉시 리다이렉트
  console.log('LoadingScreen이 호출되었지만 무시됩니다.');
  
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">⚠️ 디버그 모드</h1>
        <p className="text-xl mb-4">LoadingScreen이 호출되었습니다</p>
        <p className="text-lg">이 화면이 보이면 다른 컴포넌트에서 LoadingScreen을 호출하고 있습니다</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold"
        >
          새로고침
        </button>
      </div>
    </div>
  );
};

export default LoadingScreen; 