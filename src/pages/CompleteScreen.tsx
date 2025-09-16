import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { printerService } from '@/services/PrinterService';

const CompleteScreen: React.FC = () => {
  const { 
    currentOrder,
    completeOrder,
    resetApp,
    setCurrentStep 
  } = useAppStore();

  const [countdown, setCountdown] = useState(15); // 15초 후 자동 홈 복귀
  const [showThankYou, setShowThankYou] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [receiptPrinted, setReceiptPrinted] = useState(false);

  // 카운트다운 및 자동 홈 복귀
  useEffect(() => {
    // 감사 메시지 애니메이션
    const thankYouTimer = setTimeout(() => {
      setShowThankYou(true);
    }, 1000);

    // 카운트다운 타이머
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handleGoHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(thankYouTimer);
      clearInterval(countdownInterval);
    };
  }, []);

  // 홈으로 복귀
  const handleGoHome = () => {
    completeOrder(); // 주문 완료 처리 (이미 장바구니와 주문 상태 정리됨)
    setCurrentStep('home');
  };

  // 영수증 출력 (실제 프린터)
  const handlePrintReceipt = async () => {
    if (!currentOrder || isPrintingReceipt) return;

    setIsPrintingReceipt(true);
    try {
      // 영수증 내용 생성
      const receiptContent = generateReceiptContent();
      
      // 실제 DP-QW410 프린터로 인쇄
      const result = await printerService.printReceipt(receiptContent, {
        copies: 1,
        priority: 'high'
      });

      if (result.success) {
        setReceiptPrinted(true);
        console.log('DP-QW410 영수증 인쇄 성공');
      } else {
        console.error('영수증 인쇄 실패:', result.message);
        alert('영수증 인쇄에 실패했습니다. 고객센터에 문의하세요.');
      }
    } catch (error) {
      console.error('영수증 인쇄 오류:', error);
      alert('영수증 인쇄 중 오류가 발생했습니다.');
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  // 영수증 내용 생성
  const generateReceiptContent = (): string => {
    if (!currentOrder) return '';

    const orderDate = new Date().toLocaleString('ko-KR');
    const orderNumber = `#TXN${Date.now()}`;
    
    let content = `
========================================
      🌟 BeautiBox CVM 키오스크 🌟
         화장품 자동판매기
========================================

📅 거래일시: ${orderDate}
🆔 거래번호: ${orderNumber}
💳 결제방법: ${currentOrder.paymentMethod === 'card' ? '신용카드' : '현금'}

----------------------------------------
📦 구매 상품
----------------------------------------
`;

    // 상품 목록 추가
    currentOrder.items.forEach((item, index) => {
      const productName = item.name.length > 20 ? item.name.substring(0, 18) + '..' : item.name;
      const itemTotal = (item.price * item.quantity).toLocaleString();
      content += `${index + 1}. ${productName}`;
      content += `\n   ${item.quantity}개 × ${item.price.toLocaleString()}원 = ${itemTotal}원\n\n`;
    });

    content += `
----------------------------------------
💰 결제 정보
----------------------------------------
상품 금액                   ${currentOrder.subtotal.toLocaleString()}원
할인 금액                           0원
부가세 (10%)              ${Math.floor(currentOrder.subtotal * 0.1).toLocaleString()}원
총 결제금액                 ${currentOrder.total.toLocaleString()}원

`;

    if (currentOrder.paymentMethod === 'card') {
      content += `💳 승인번호: ${Math.random().toString().substr(2, 8)}\n`;
    }

    content += `
----------------------------------------
📍 매장 정보
----------------------------------------
BeautiBox CVM Store #001
서울특별시 강남구 테헤란로 123
📞 고객센터: 1588-0000
🌐 www.beautibox.com

          🙏 감사합니다! 🙏
       다음에도 이용해 주세요!

========================================
`;

    return content;
  };

  return (
    <div className="h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/4 -right-8 w-32 h-32 bg-secondary-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 -left-8 w-20 h-20 bg-accent-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-4 right-1/4 w-28 h-28 bg-primary-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        {/* 감사 메시지 */}
        <div className={`text-center mb-12 transition-all duration-1000 ${showThankYou ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">감사합니다!</h1>
            <p className="text-xl text-gray-600 mb-2">BeautyLab을 이용해주셔서 감사합니다</p>
            <p className="text-lg text-gray-500">특별한 포토카드와 함께 즐거운 하루 되세요!</p>
          </div>
        </div>

        {/* 주문 완료 정보 */}
        {currentOrder && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl max-w-md w-full mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">주문 완료</h2>
            
            {/* 주문 번호 */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">주문 번호</p>
              <p className="text-lg font-mono font-bold text-primary-600">
                #{currentOrder.id.slice(-8).toUpperCase()}
              </p>
            </div>

            {/* 포토카드 미리보기 */}
            <div className="mb-6">
              <div className="bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl p-6 text-center">
                <div className="w-24 h-32 bg-white rounded-xl mx-auto mb-4 shadow-md flex items-center justify-center">
                  {currentOrder.customerPhoto ? (
                    <img 
                      src={currentOrder.customerPhoto} 
                      alt="포토카드" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700">🎁 특별 포토카드</p>
              </div>
            </div>

            {/* 주문 상품 목록 */}
            <div className="space-y-3 mb-6">
              {currentOrder.items.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-bold text-sm">{item.quantity}</span>
                    </div>
                    <span className="text-gray-800 font-medium">{item.product.name}</span>
                  </div>
                  <span className="text-gray-600 font-semibold">
                    ₩{(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* 총 결제 금액 */}
            <div className="border-t-2 border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-800">총 결제 금액</span>
                <span className="text-2xl font-bold text-primary-600">
                  ₩{currentOrder.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={handlePrintReceipt}
            className="bg-white/80 backdrop-blur-sm text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-md"
          >
            📄 영수증 출력
          </button>
          <button
            onClick={handleGoHome}
            className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors shadow-md"
          >
            🏠 홈으로
          </button>
        </div>

        {/* 자동 복귀 카운트다운 */}
        <div className="text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 shadow-md">
            <p className="text-gray-700 font-medium">
              {countdown}초 후 자동으로 홈 화면으로 돌아갑니다
            </p>
          </div>
        </div>
      </div>

      {/* 하단 브랜드 정보 */}
      <div className="bg-white/80 backdrop-blur-sm p-4 text-center relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="text-lg font-bold text-gray-800">BeautyLab</span>
        </div>
        <p className="text-sm text-gray-600">
          K-Beauty 자동판매기 | 언제나 아름다운 당신을 위해
        </p>
      </div>

      {/* 축하 효과 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            <span className="text-2xl opacity-60">
              {['🎉', '✨', '💄', '💋', '🌟'][Math.floor(Math.random() * 5)]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompleteScreen; 