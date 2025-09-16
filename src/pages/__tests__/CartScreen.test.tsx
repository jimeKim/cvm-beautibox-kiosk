import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CartScreen from '../CartScreen';

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
  },
  {
    id: 'prod-002',
    name: '테스트 립스틱',
    nameKo: '테스트 립스틱',
    nameEn: 'Test Lipstick',
    brand: 'TEST BRAND',
    category: '메이크업',
    price: 35000,
    image: '/test-lipstick.jpg',
    description: '테스트 립스틱 설명',
    descriptionKo: '테스트 립스틱 설명',
    descriptionEn: 'Test lipstick description',
    slot: 2,
    stock: 8,
    isAvailable: true,
    tags: ['립스틱', '메이크업'],
    quantity: 1
  }
];

// Mock zustand store
const mockUseStore = {
  language: 'ko',
  cart: mockCartItems,
  updateCartQuantity: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
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

describe('CartScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.cart = mockCartItems;
    mockUseStore.language = 'ko';
  });

  describe('렌더링 테스트', () => {
    it('장바구니 화면이 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      expect(screen.getByText('cart.title')).toBeInTheDocument();
      expect(screen.getByText('cart.reviewItems')).toBeInTheDocument();
    });

    it('장바구니 아이템들이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      expect(screen.getByText('테스트 토너')).toBeInTheDocument();
      expect(screen.getByText('테스트 립스틱')).toBeInTheDocument();
    });

    it('총 금액이 올바르게 계산되어 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      // 28000 * 2 + 35000 * 1 = 91000
      expect(screen.getByText('₩91,000')).toBeInTheDocument();
    });

    it('빈 장바구니 상태가 표시되어야 한다', () => {
      mockUseStore.cart = [];

      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      expect(screen.getByText('cart.emptyCart')).toBeInTheDocument();
      expect(screen.getByText('cart.startShopping')).toBeInTheDocument();
    });
  });

  describe('수량 조절 테스트', () => {
    it('수량 증가 버튼이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const increaseButtons = screen.getAllByText('+');
      fireEvent.click(increaseButtons[0]);

      await waitFor(() => {
        expect(mockUseStore.updateCartQuantity).toHaveBeenCalledWith('prod-001', 3);
      });
    });

    it('수량 감소 버튼이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const decreaseButtons = screen.getAllByText('-');
      fireEvent.click(decreaseButtons[0]);

      await waitFor(() => {
        expect(mockUseStore.updateCartQuantity).toHaveBeenCalledWith('prod-001', 1);
      });
    });

    it('수량이 1일 때 감소 버튼이 비활성화되어야 한다', () => {
      const singleItemCart = [{ ...mockCartItems[0], quantity: 1 }];
      mockUseStore.cart = singleItemCart;

      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const decreaseButton = screen.getByText('-');
      expect(decreaseButton).toBeDisabled();
    });

    it('수량이 재고와 같을 때 증가 버튼이 비활성화되어야 한다', () => {
      const maxStockCart = [{ ...mockCartItems[0], quantity: 12 }]; // stock과 같음
      mockUseStore.cart = maxStockCart;

      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const increaseButton = screen.getByText('+');
      expect(increaseButton).toBeDisabled();
    });
  });

  describe('아이템 제거 테스트', () => {
    it('아이템 제거 버튼이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const removeButtons = screen.getAllByText('cart.remove');
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockUseStore.removeFromCart).toHaveBeenCalledWith('prod-001');
      });
    });

    it('장바구니 비우기 버튼이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const clearButton = screen.getByText('cart.clearCart');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockUseStore.clearCart).toHaveBeenCalled();
      });
    });
  });

  describe('네비게이션 테스트', () => {
    it('뒤로 가기 버튼 클릭 시 제품 화면으로 이동해야 한다', async () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const backButton = screen.getByText('common.back');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('products');
        expect(mockNavigate).toHaveBeenCalledWith('/products');
      });
    });

    it('결제하기 버튼 클릭 시 결제 화면으로 이동해야 한다', async () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const checkoutButton = screen.getByText('cart.proceedToPayment');
      fireEvent.click(checkoutButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('payment');
        expect(mockNavigate).toHaveBeenCalledWith('/payment');
      });
    });

    it('빈 장바구니에서 쇼핑 계속하기 버튼이 작동해야 한다', async () => {
      mockUseStore.cart = [];

      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const continueButton = screen.getByText('cart.continueShopping');
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('products');
        expect(mockNavigate).toHaveBeenCalledWith('/products');
      });
    });
  });

  describe('가격 계산 테스트', () => {
    it('개별 아이템 가격이 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      expect(screen.getByText('₩56,000')).toBeInTheDocument(); // 28000 * 2
      expect(screen.getByText('₩35,000')).toBeInTheDocument(); // 35000 * 1
    });

    it('총 아이템 수가 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      expect(screen.getByText('cart.totalItems')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // 2 + 1
    });
  });

  describe('접근성 테스트', () => {
    it('수량 조절 버튼들에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const increaseButtons = screen.getAllByLabelText(/cart.increaseQuantity/);
      const decreaseButtons = screen.getAllByLabelText(/cart.decreaseQuantity/);

      expect(increaseButtons).toHaveLength(2);
      expect(decreaseButtons).toHaveLength(2);
    });

    it('제거 버튼들에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const removeButtons = screen.getAllByLabelText(/cart.removeItem/);
      expect(removeButtons).toHaveLength(2);
    });
  });

  describe('반응형 테스트', () => {
    it('모바일 뷰에서 레이아웃이 적절히 조정되어야 한다', () => {
      // 모바일 뷰포트 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const cartContainer = screen.getByTestId('cart-container');
      expect(cartContainer).toHaveClass('px-4'); // 모바일 패딩
    });
  });

  describe('애니메이션 테스트', () => {
    it('아이템 추가 시 애니메이션 클래스가 적용되어야 한다', () => {
      render(
        <TestWrapper>
          <CartScreen />
        </TestWrapper>
      );

      const cartItems = screen.getAllByTestId(/^cart-item-/);
      cartItems.forEach(item => {
        expect(item).toHaveClass('animate-fade-in');
      });
    });
  });
}); 