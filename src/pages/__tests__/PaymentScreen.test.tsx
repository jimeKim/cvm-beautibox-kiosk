import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PaymentScreen from '../PaymentScreen';

// Mock cart items
const mockCartItems = [
  {
    id: 'prod-001',
    name: '테스트 토너',
    nameKo: '테스트 토너',
    nameEn: 'Test Toner',
    brand: 'TEST BRAND',
    category: '스킨케어',
    price: 28000,
    image: '/test-image.jpg',
    description: '테스트 설명',
    descriptionKo: '테스트 설명',
    descriptionEn: 'Test description',
    slot: 1,
    stock: 12,
    isAvailable: true,
    tags: ['토너', '수분'],
    quantity: 2
  }
];

// Mock zustand store
const mockUseStore = {
  language: 'ko',
  cart: mockCartItems,
  currentOrder: null,
  createOrder: jest.fn(),
  updateOrder: jest.fn(),
  setCurrentStep: jest.fn(),
  resetIdleTimer: jest.fn(),
};

jest.mock('../../store', () => ({
  useStore: () => mockUseStore,
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('PaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.cart = mockCartItems;
    mockUseStore.currentOrder = null;
    mockUseStore.language = 'ko';
  });

  describe('렌더링 테스트', () => {
    it('결제 화면이 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.title')).toBeInTheDocument();
      expect(screen.getByText('payment.selectMethod')).toBeInTheDocument();
    });

    it('결제 방법 옵션들이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.methods.card')).toBeInTheDocument();
      expect(screen.getByText('payment.methods.mobile')).toBeInTheDocument();
      expect(screen.getByText('payment.methods.qr')).toBeInTheDocument();
      expect(screen.getByText('payment.methods.cash')).toBeInTheDocument();
    });

    it('주문 요약이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.orderSummary')).toBeInTheDocument();
      expect(screen.getByText('테스트 토너')).toBeInTheDocument();
      expect(screen.getByText('₩56,000')).toBeInTheDocument(); // 28000 * 2
    });

    it('빈 장바구니일 때 적절한 메시지가 표시되어야 한다', () => {
      mockUseStore.cart = [];

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.emptyCart')).toBeInTheDocument();
    });
  });

  describe('결제 방법 선택 테스트', () => {
    it('카드 결제 선택이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const cardButton = screen.getByText('payment.methods.card');
      fireEvent.click(cardButton);

      await waitFor(() => {
        expect(cardButton.parentElement).toHaveClass('ring-2', 'ring-blue-500');
      });
    });

    it('모바일 결제 선택이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const mobileButton = screen.getByText('payment.methods.mobile');
      fireEvent.click(mobileButton);

      await waitFor(() => {
        expect(mobileButton.parentElement).toHaveClass('ring-2', 'ring-green-500');
      });
    });

    it('QR 결제 선택이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const qrButton = screen.getByText('payment.methods.qr');
      fireEvent.click(qrButton);

      await waitFor(() => {
        expect(qrButton.parentElement).toHaveClass('ring-2', 'ring-purple-500');
      });
    });

    it('현금 결제 선택이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const cashButton = screen.getByText('payment.methods.cash');
      fireEvent.click(cashButton);

      await waitFor(() => {
        expect(cashButton.parentElement).toHaveClass('ring-2', 'ring-yellow-500');
      });
    });
  });

  describe('결제 진행 테스트', () => {
    it('결제 방법 선택 후 결제 진행 버튼이 활성화되어야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const cardButton = screen.getByText('payment.methods.card');
      fireEvent.click(cardButton);

      await waitFor(() => {
        const proceedButton = screen.getByText('payment.proceedPayment');
        expect(proceedButton).not.toBeDisabled();
      });
    });

    it('결제 진행 버튼 클릭 시 주문이 생성되어야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const cardButton = screen.getByText('payment.methods.card');
      fireEvent.click(cardButton);

      await waitFor(() => {
        const proceedButton = screen.getByText('payment.proceedPayment');
        fireEvent.click(proceedButton);
      });

      await waitFor(() => {
        expect(mockUseStore.createOrder).toHaveBeenCalledWith('card');
      });
    });

    it('결제 진행 중 로딩 상태가 표시되어야 한다', async () => {
      mockUseStore.currentOrder = {
        id: 'order-001',
        items: mockCartItems,
        total: 56000,
        paymentMethod: 'card',
        status: 'processing',
        createdAt: new Date()
      };

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.processing')).toBeInTheDocument();
      expect(screen.getByText('payment.pleaseWait')).toBeInTheDocument();
    });

    it('결제 완료 시 성공 메시지가 표시되어야 한다', async () => {
      mockUseStore.currentOrder = {
        id: 'order-001',
        items: mockCartItems,
        total: 56000,
        paymentMethod: 'card',
        status: 'completed',
        createdAt: new Date()
      };

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.success')).toBeInTheDocument();
      expect(screen.getByText('payment.successMessage')).toBeInTheDocument();
    });

    it('결제 실패 시 에러 메시지와 재시도 버튼이 표시되어야 한다', async () => {
      mockUseStore.currentOrder = {
        id: 'order-001',
        items: mockCartItems,
        total: 56000,
        paymentMethod: 'card',
        status: 'failed',
        createdAt: new Date()
      };

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.failed')).toBeInTheDocument();
      expect(screen.getByText('payment.failedMessage')).toBeInTheDocument();
      expect(screen.getByText('payment.retry')).toBeInTheDocument();
    });
  });

  describe('진행 상태 표시 테스트', () => {
    it('진행 상태 인디케이터가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.step1')).toBeInTheDocument();
      expect(screen.getByText('payment.step2')).toBeInTheDocument();
      expect(screen.getByText('payment.step3')).toBeInTheDocument();
    });

    it('현재 단계가 하이라이트되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const step1 = screen.getByText('payment.step1');
      expect(step1.parentElement).toHaveClass('bg-blue-600');
    });
  });

  describe('네비게이션 테스트', () => {
    it('뒤로 가기 버튼 클릭 시 장바구니 화면으로 이동해야 한다', async () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const backButton = screen.getByText('common.back');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('cart');
        expect(mockNavigate).toHaveBeenCalledWith('/cart');
      });
    });

    it('결제 완료 후 다음 단계로 이동해야 한다', async () => {
      mockUseStore.currentOrder = {
        id: 'order-001',
        items: mockCartItems,
        total: 56000,
        paymentMethod: 'card',
        status: 'completed',
        createdAt: new Date()
      };

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const nextButton = screen.getByText('payment.continue');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('photo');
        expect(mockNavigate).toHaveBeenCalledWith('/photo');
      });
    });
  });

  describe('보안 기능 테스트', () => {
    it('결제 정보 보안 메시지가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.securityMessage')).toBeInTheDocument();
    });

    it('타임아웃 경고가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      expect(screen.getByText('payment.timeoutWarning')).toBeInTheDocument();
    });
  });

  describe('접근성 테스트', () => {
    it('결제 방법 버튼들에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const cardButton = screen.getByText('payment.methods.card');
      expect(cardButton).toHaveAttribute('aria-label');
    });

    it('진행 상태 인디케이터에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const progressIndicator = screen.getByTestId('payment-progress');
      expect(progressIndicator).toHaveAttribute('aria-label');
    });
  });

  describe('에러 처리 테스트', () => {
    it('네트워크 오류 시 적절한 메시지가 표시되어야 한다', async () => {
      // 네트워크 오류 시뮬레이션
      mockUseStore.createOrder.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const cardButton = screen.getByText('payment.methods.card');
      fireEvent.click(cardButton);

      const proceedButton = screen.getByText('payment.proceedPayment');
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText('payment.networkError')).toBeInTheDocument();
      });
    });

    it('재시도 버튼 클릭 시 결제가 다시 시도되어야 한다', async () => {
      mockUseStore.currentOrder = {
        id: 'order-001',
        items: mockCartItems,
        total: 56000,
        paymentMethod: 'card',
        status: 'failed',
        createdAt: new Date()
      };

      render(
        <TestWrapper>
          <PaymentScreen />
        </TestWrapper>
      );

      const retryButton = screen.getByText('payment.retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockUseStore.updateOrder).toHaveBeenCalledWith({ status: 'pending' });
      });
    });
  });
}); 