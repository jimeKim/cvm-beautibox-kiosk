import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

const DispensingScreen: React.FC = () => {
  const { 
    setCurrentStep,
    resetIdleTimer
  } = useAppStore();

  const [dispensingProgress, setDispensingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // 배출 시뮬레이션
    const interval = setInterval(() => {
      setDispensingProgress(prev => {
        if (prev >= 100) {
          setIsComplete(true);
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleComplete = () => {
    resetIdleTimer();
    setCurrentStep('photo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6 border-b text-center">
            <h1 className="text-2xl font-bold text-purple-800">
              포토카드 배출 중
            </h1>
            <p className="text-gray-600">잠시만 기다려주세요...</p>
          </div>
          <div className="p-6 space-y-6">
            <div className="text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-purple-600" />
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${dispensingProgress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {dispensingProgress}% 완료
              </p>
            </div>

            {isComplete && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                <h3 className="text-xl font-semibold text-green-600">
                  배출 완료!
                </h3>
                <p className="text-gray-600">
                  포토카드를 수령해주세요
                </p>
                <button
                  onClick={handleComplete}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center mx-auto"
                >
                  처음으로 돌아가기
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispensingScreen; 