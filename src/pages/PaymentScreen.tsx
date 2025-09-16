import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import LanguageSelector from '@/components/LanguageSelector';

type PaymentMethod = 'card' | 'mobile' | 'qr' | 'cash';

interface PaymentStatus {
  step: 'select' | 'processing' | 'complete' | 'error';
  message: string;
  progress: number;
}

const PaymentScreen: React.FC = () => {
  const { t } = useTranslation();
  const { 
    currentOrder,
    setCurrentStep,
    resetIdleTimer
  } = useAppStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    step: 'select',
    message: '',
    progress: 0
  });

  // 결제 방법 옵션들
  const paymentMethods = [
    {
      id: 'card' as PaymentMethod,
      name: t('payment.methods.card'),
      icon: '💳',
      description: t('payment.methods.cardDescription'),
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'mobile' as PaymentMethod,
      name: t('payment.methods.mobile'),
      icon: '📱',
      description: t('payment.methods.mobileDescription'),
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'qr' as PaymentMethod,
      name: t('payment.methods.qr'),
      icon: '🔳',
      description: t('payment.methods.qrDescription'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'cash' as PaymentMethod,
      name: t('payment.methods.cash'),
      icon: '💵',
      description: t('payment.methods.cashDescription'),
      color: 'from-orange-500 to-orange-600'
    }
  ];

  // 결제 시뮬레이션
  const simulatePayment = async (): Promise<boolean> => {
    const steps = [
      { message: t('payment.status.connecting'), progress: 20 },
      { message: t('payment.status.processing'), progress: 50 },
      { message: t('payment.status.verifying'), progress: 80 },
      { message: t('payment.status.completing'), progress: 100 }
    ];

    setPaymentStatus({
      step: 'processing',
      message: t('payment.status.initializing'),
      progress: 0
    });

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPaymentStatus({
        step: 'processing',
        message: step.message,
        progress: step.progress
      });
    }

    // 성공 시뮬레이션 (95% 확률)
    const success = Math.random() > 0.05;
    
    if (success) {
      setPaymentStatus({
        step: 'complete',
        message: t('payment.status.success'),
        progress: 100
      });
      
      // 2초 후 다음 단계로 이동
      setTimeout(() => {
        setCurrentStep('dispensing');
      }, 2000);
      
      return true;
    } else {
      setPaymentStatus({
        step: 'error',
        message: t('payment.status.error'),
        progress: 0
      });
      
      // 3초 후 다시 선택 화면으로
      setTimeout(() => {
        setPaymentStatus({
          step: 'select',
          message: '',
          progress: 0
        });
      }, 3000);
      
      return false;
    }
  };

  // 결제 진행 핸들러
  const handlePayment = async () => {
    resetIdleTimer();
    await simulatePayment();
  };

  // 뒤로 가기
  const handleGoBack = () => {
    if (paymentStatus.step === 'processing') return; // 처리 중에는 뒤로가기 불가
    setCurrentStep('cart');
  };

  // 결제 방법 선택 핸들러
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    resetIdleTimer();
  };

  // 다시 시도 핸들러
  const handleRetry = () => {
    setPaymentStatus({
      step: 'select',
      message: '',
      progress: 0
    });
  };

  // 주문이 없으면 홈으로 리다이렉트
  if (!currentOrder) {
    setCurrentStep('home');
    return null;
  }

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <button 
          onClick={handleGoBack}
          disabled={paymentStatus.step === 'processing'}
          className={`flex items-center transition-colors p-2 rounded-lg ${
            paymentStatus.step === 'processing' 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {t('payment.title')}
          </h1>
          <p className="text-sm text-gray-600">
            {t('payment.subtitle')}
          </p>
        </div>
        
        <LanguageSelector size="sm" />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* 주문 요약 */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {t('payment.orderSummary')}
            </h2>
            
            <div className="space-y-3">
              {currentOrder.items.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">
                        {item.product.category.includes('스킨케어') || item.product.category.includes('클렌징') ? '🧴' : '💄'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-600">{item.product.brand}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₩{(item.product.price * item.quantity).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('payment.quantity', { count: item.quantity })}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">
                    {t('payment.total')}
                  </span>
                  <span className="text-2xl font-bold text-purple-600">
                    ₩{currentOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 결제 방법 선택 */}
          {paymentStatus.step === 'select' && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {t('payment.selectMethod')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedMethod === method.id
                        ? 'border-purple-500 bg-purple-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-3">{method.icon}</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {method.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {method.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 결제 처리 중 */}
          {paymentStatus.step === 'processing' && (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center animate-fade-in">
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {t('payment.processing')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {paymentStatus.message}
                </p>
                
                {/* 진행률 표시 */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${paymentStatus.progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {paymentStatus.progress}% {t('payment.complete')}
                </p>
              </div>
            </div>
          )}

          {/* 결제 완료 */}
          {paymentStatus.step === 'complete' && (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center animate-fade-in">
              <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-3xl font-bold text-green-600 mb-4">
                {t('payment.success')}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {t('payment.successMessage')}
              </p>
              
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  {t('payment.nextStep')}
                </p>
              </div>
            </div>
          )}

          {/* 결제 실패 */}
          {paymentStatus.step === 'error' && (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center animate-fade-in">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h3 className="text-3xl font-bold text-red-600 mb-4">
                {t('payment.failed')}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {t('payment.failedMessage')}
              </p>
              
              <button
                onClick={handleRetry}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105"
              >
                {t('payment.retry')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      {paymentStatus.step === 'select' && (
        <div className="bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">{t('payment.selectedMethod')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {paymentMethods.find(m => m.id === selectedMethod)?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{t('payment.amountToPay')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₩{currentOrder.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={handlePayment}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {t('payment.payNow')}
            </button>
            
            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t('payment.securePayment')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentScreen; 