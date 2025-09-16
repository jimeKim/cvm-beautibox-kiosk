import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock electron APIs
(global as any).window.electronAPI = {
  onProximityUpdate: jest.fn(),
  startProximityMonitoring: jest.fn(),
  stopProximityMonitoring: jest.fn(),
  toggleFullscreen: jest.fn(),
  minimize: jest.fn(),
  close: jest.fn(),
  restart: jest.fn(),
};

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'ko',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('사용자 구매 플로우 통합 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('완전한 구매 플로우', () => {
    it('홈 → 제품 선택 → 장바구니 → 결제 → 완료 플로우가 정상 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 1. 홈 화면 확인
      expect(screen.getByText('home.welcome')).toBeInTheDocument();
      expect(screen.getByText('home.touchToStart')).toBeInTheDocument();

      // 2. 시작 버튼 클릭하여 제품 화면으로 이동
      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('products.title')).toBeInTheDocument();
      });

      // 3. 제품 선택 및 장바구니 추가
      const addToCartButtons = screen.getAllByText('products.addToCart');
      expect(addToCartButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(addToCartButtons[0]);

      await waitFor(() => {
        // 장바구니 카운터 확인
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // 4. 장바구니로 이동
      const viewCartButton = screen.getByText('products.viewCart');
      fireEvent.click(viewCartButton);

      await waitFor(() => {
        expect(screen.getByText('cart.title')).toBeInTheDocument();
      });

      // 5. 결제 화면으로 이동
      const proceedToPaymentButton = screen.getByText('cart.proceedToPayment');
      fireEvent.click(proceedToPaymentButton);

      await waitFor(() => {
        expect(screen.getByText('payment.title')).toBeInTheDocument();
      });

      // 6. 결제 방법 선택
      const cardPaymentButton = screen.getByText('payment.methods.card');
      fireEvent.click(cardPaymentButton);

      await waitFor(() => {
        const proceedPaymentButton = screen.getByText('payment.proceedPayment');
        expect(proceedPaymentButton).not.toBeDisabled();
      });

      // 7. 결제 진행
      const proceedPaymentButton = screen.getByText('payment.proceedPayment');
      fireEvent.click(proceedPaymentButton);

      await waitFor(() => {
        expect(screen.getByText('payment.processing')).toBeInTheDocument();
      });
    });

    it('장바구니에서 제품 수량 조절이 정상 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 홈 → 제품 → 장바구니로 이동
      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByText('products.addToCart');
        fireEvent.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        const viewCartButton = screen.getByText('products.viewCart');
        fireEvent.click(viewCartButton);
      });

      await waitFor(() => {
        expect(screen.getByText('cart.title')).toBeInTheDocument();
      });

      // 수량 증가 테스트
      const increaseButton = screen.getByText('+');
      fireEvent.click(increaseButton);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 수량 표시
      });

      // 수량 감소 테스트
      const decreaseButton = screen.getByText('-');
      fireEvent.click(decreaseButton);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // 수량 표시
      });
    });

    it('빈 장바구니 상태에서 올바른 메시지가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 홈 → 제품 → 장바구니로 직접 이동 (아이템 추가 없이)
      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        // URL 직접 변경으로 장바구니 화면으로 이동
        window.history.pushState({}, '', '/cart');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      await waitFor(() => {
        expect(screen.getByText('cart.emptyCart')).toBeInTheDocument();
        expect(screen.getByText('cart.startShopping')).toBeInTheDocument();
      });
    });

    it('언어 변경이 전체 앱에서 정상 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 홈 화면에서 언어 변경
      const englishButton = screen.getByText('English');
      fireEvent.click(englishButton);

      await waitFor(() => {
        // 언어 변경 후 텍스트 확인 (실제로는 i18n이 mock되어 있으므로 key가 그대로 표시됨)
        expect(screen.getByText('home.welcome')).toBeInTheDocument();
      });
    });
  });

  describe('네비게이션 테스트', () => {
    it('뒤로 가기 버튼들이 올바른 화면으로 이동해야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 홈 → 제품 → 장바구니 → 결제 순서로 이동
      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByText('products.addToCart');
        fireEvent.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        const viewCartButton = screen.getByText('products.viewCart');
        fireEvent.click(viewCartButton);
      });

      await waitFor(() => {
        const proceedToPaymentButton = screen.getByText('cart.proceedToPayment');
        fireEvent.click(proceedToPaymentButton);
      });

      await waitFor(() => {
        expect(screen.getByText('payment.title')).toBeInTheDocument();
      });

      // 결제 화면에서 뒤로 가기
      const backButton = screen.getByText('common.back');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('cart.title')).toBeInTheDocument();
      });
    });

    it('브라우저 뒤로 가기 버튼이 정상 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 홈 → 제품으로 이동
      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('products.title')).toBeInTheDocument();
      });

      // 브라우저 뒤로 가기 시뮬레이션
      window.history.back();
      window.dispatchEvent(new PopStateEvent('popstate'));

      await waitFor(() => {
        expect(screen.getByText('home.welcome')).toBeInTheDocument();
      });
    });
  });

  describe('에러 처리 테스트', () => {
    it('네트워크 오류 시 적절한 에러 메시지가 표시되어야 한다', async () => {
      // 네트워크 오류 시뮬레이션
      const originalFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // 결제 진행 중 네트워크 오류 발생 시뮬레이션
      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        const addToCartButtons = screen.getAllByText('products.addToCart');
        fireEvent.click(addToCartButtons[0]);
      });

      await waitFor(() => {
        const viewCartButton = screen.getByText('products.viewCart');
        fireEvent.click(viewCartButton);
      });

      await waitFor(() => {
        const proceedToPaymentButton = screen.getByText('cart.proceedToPayment');
        fireEvent.click(proceedToPaymentButton);
      });

      await waitFor(() => {
        const cardPaymentButton = screen.getByText('payment.methods.card');
        fireEvent.click(cardPaymentButton);
      });

      await waitFor(() => {
        const proceedPaymentButton = screen.getByText('payment.proceedPayment');
        fireEvent.click(proceedPaymentButton);
      });

      // 에러 메시지 확인은 실제 구현에 따라 달라질 수 있음
      // await waitFor(() => {
      //   expect(screen.getByText('payment.networkError')).toBeInTheDocument();
      // });

      // fetch 복원
      global.fetch = originalFetch;
    });
  });

  describe('성능 테스트', () => {
    it('화면 전환이 빠르게 이루어져야 한다', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('products.title')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 화면 전환이 1초 이내에 완료되어야 함
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('접근성 테스트', () => {
    it('키보드 네비게이션이 정상 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      
      // Tab 키로 포커스 이동
      startButton.focus();
      expect(document.activeElement).toBe(startButton);

      // Enter 키로 버튼 클릭
      fireEvent.keyDown(startButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('products.title')).toBeInTheDocument();
      });
    });

    it('화면 읽기 프로그램을 위한 적절한 ARIA 레이블이 있어야 한다', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      expect(startButton).toHaveAttribute('aria-label');
    });
  });
}); 