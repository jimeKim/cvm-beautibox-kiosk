import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { CartItem } from '@/types';
import ProductImage from '@/components/ProductImage';
import LanguageSelector from '@/components/LanguageSelector';

const CartScreen: React.FC = () => {
  const { t } = useTranslation();
  const { 
    cart, 
    updateCartQuantity, 
    removeFromCart, 
    setCurrentStep, 
    createOrder,
    resetIdleTimer 
  } = useAppStore();

  // 총 금액 계산
  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // 수량 변경 핸들러
  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) return;
    updateCartQuantity(productId, quantity);
    resetIdleTimer();
  };

  // 상품 제거 핸들러
  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
    resetIdleTimer();
  };

  // 결제 진행 핸들러
  const handleProceedToPayment = () => {
    if (cart.length === 0) return;
    
    createOrder('card'); // 기본 결제 방식: 카드
    setCurrentStep('payment');
    resetIdleTimer();
  };

  // 쇼핑 계속하기
  const handleContinueShopping = () => {
    setCurrentStep('products');
  };

  // 뒤로 가기
  const handleGoBack = () => {
    setCurrentStep('products');
  };

  // 장바구니 비우기
  const handleClearCart = () => {
    cart.forEach(item => removeFromCart(item.product.id));
    resetIdleTimer();
  };

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <button 
          onClick={handleGoBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {t('cart.title')}
          </h1>
          <p className="text-sm text-gray-600">
            {t('cart.itemCount', { count: totalItems })}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <LanguageSelector size="sm" />
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50"
              title={t('cart.clearCart')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 장바구니 내용 */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          // 빈 장바구니
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
              <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('cart.empty')}</h2>
            <p className="text-gray-600 mb-8 text-lg">{t('cart.emptyDescription')}</p>
            <button
              onClick={handleContinueShopping}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {t('cart.continueShopping')}
            </button>
          </div>
        ) : (
          // 장바구니 아이템들
          <div className="p-6 space-y-4">
            {cart.map((item: CartItem, index) => (
              <div 
                key={item.product.id} 
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center space-x-6">
                  {/* 상품 이미지 */}
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImage
                      src={item.product.image}
                      alt={item.product.name}
                      category={item.product.category}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* 상품 정보 */}
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {t(`products.categories.${item.product.category}`)}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                      {item.product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {item.product.brand}
                    </p>
                    <p className="text-xl font-bold text-purple-600">
                      ₩{item.product.price.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* 수량 조절 */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-2">
                      <button
                        onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                        disabled={item.quantity <= 1}
                        aria-label={t('cart.decreaseQuantity')}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      
                      <span className="text-xl font-bold text-gray-800 min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                        aria-label={t('cart.increaseQuantity')}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* 소계 */}
                    <div className="text-center">
                      <p className="text-sm text-gray-500">{t('cart.subtotal')}</p>
                      <p className="text-xl font-bold text-gray-900">
                        ₩{(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleRemoveItem(item.product.id)}
                    className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors border border-red-200"
                    aria-label={t('cart.removeItem')}
                  >
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 결제 영역 */}
      {cart.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-6 shadow-lg">
          {/* 주문 요약 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">{t('cart.itemsTotal')}</span>
              <span className="text-gray-900 font-semibold">
                ₩{totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">{t('cart.deliveryFee')}</span>
              <span className="text-green-600 font-semibold">
                {t('cart.free')}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{t('cart.total')}</span>
                <span className="text-2xl font-bold text-purple-600">
                  ₩{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* 액션 버튼들 */}
          <div className="flex space-x-4">
            <button
              onClick={handleContinueShopping}
              className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 border border-gray-300"
            >
              {t('cart.continueShopping')}
            </button>
            
            <button
              onClick={handleProceedToPayment}
              className="flex-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {t('cart.proceedToPayment')}
            </button>
          </div>
          
          {/* 보안 정보 */}
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t('cart.securePayment')}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartScreen; 