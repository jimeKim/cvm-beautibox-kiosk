import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductsScreen from '../ProductsScreen';

// Mock products data
const mockProducts = [
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
    tags: ['토너', '수분']
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
    tags: ['립스틱', '메이크업']
  }
];

// Mock zustand store
const mockUseStore = {
  language: 'ko',
  products: mockProducts,
  cart: [],
  addToCart: jest.fn(),
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

describe('ProductsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.cart = [];
    mockUseStore.products = mockProducts;
    mockUseStore.language = 'ko';
  });

  describe('렌더링 테스트', () => {
    it('제품 화면이 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('products.title')).toBeInTheDocument();
      expect(screen.getByText('products.selectProducts')).toBeInTheDocument();
    });

    it('제품 목록이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('테스트 토너')).toBeInTheDocument();
      expect(screen.getByText('테스트 립스틱')).toBeInTheDocument();
    });

    it('카테고리 필터가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('products.allCategories')).toBeInTheDocument();
      expect(screen.getByText('products.categories.skincare')).toBeInTheDocument();
      expect(screen.getByText('products.categories.makeup')).toBeInTheDocument();
    });

    it('검색 입력 필드가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('products.searchPlaceholder');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('제품 필터링 테스트', () => {
    it('카테고리 필터가 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const skincareFilter = screen.getByText('products.categories.skincare');
      fireEvent.click(skincareFilter);

      await waitFor(() => {
        expect(screen.getByText('테스트 토너')).toBeInTheDocument();
        expect(screen.queryByText('테스트 립스틱')).not.toBeInTheDocument();
      });
    });

    it('검색 기능이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('products.searchPlaceholder');
      fireEvent.change(searchInput, { target: { value: '토너' } });

      await waitFor(() => {
        expect(screen.getByText('테스트 토너')).toBeInTheDocument();
        expect(screen.queryByText('테스트 립스틱')).not.toBeInTheDocument();
      });
    });

    it('가격 필터가 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const priceFilter = screen.getByText('products.priceRange.under30k');
      fireEvent.click(priceFilter);

      await waitFor(() => {
        expect(screen.getByText('테스트 토너')).toBeInTheDocument();
        expect(screen.queryByText('테스트 립스틱')).not.toBeInTheDocument();
      });
    });
  });

  describe('제품 추가 테스트', () => {
    it('제품 추가 버튼 클릭 시 장바구니에 추가되어야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const addButtons = screen.getAllByText('products.addToCart');
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(mockUseStore.addToCart).toHaveBeenCalledWith(mockProducts[0], 1);
      });
    });

    it('재고 없는 제품은 비활성화되어야 한다', () => {
      const outOfStockProducts = [
        { ...mockProducts[0], stock: 0, isAvailable: false }
      ];
      mockUseStore.products = outOfStockProducts;

      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('products.outOfStock')).toBeInTheDocument();
    });
  });

  describe('정렬 기능 테스트', () => {
    it('가격 낮은 순 정렬이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const sortSelect = screen.getByDisplayValue('products.sortBy.name');
      fireEvent.change(sortSelect, { target: { value: 'price-low' } });

      await waitFor(() => {
        const productCards = screen.getAllByTestId(/^product-card-/);
        expect(productCards[0]).toHaveTextContent('테스트 토너');
        expect(productCards[1]).toHaveTextContent('테스트 립스틱');
      });
    });

    it('가격 높은 순 정렬이 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const sortSelect = screen.getByDisplayValue('products.sortBy.name');
      fireEvent.change(sortSelect, { target: { value: 'price-high' } });

      await waitFor(() => {
        const productCards = screen.getAllByTestId(/^product-card-/);
        expect(productCards[0]).toHaveTextContent('테스트 립스틱');
        expect(productCards[1]).toHaveTextContent('테스트 토너');
      });
    });
  });

  describe('장바구니 상태 테스트', () => {
    it('장바구니 아이템 수가 표시되어야 한다', () => {
      mockUseStore.cart = [
        { ...mockProducts[0], quantity: 2 },
        { ...mockProducts[1], quantity: 1 }
      ];

      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('3')).toBeInTheDocument(); // 총 수량
    });

    it('장바구니 버튼 클릭 시 장바구니 화면으로 이동해야 한다', async () => {
      mockUseStore.cart = [{ ...mockProducts[0], quantity: 1 }];

      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const cartButton = screen.getByText('products.viewCart');
      fireEvent.click(cartButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('cart');
        expect(mockNavigate).toHaveBeenCalledWith('/cart');
      });
    });
  });

  describe('네비게이션 테스트', () => {
    it('뒤로 가기 버튼 클릭 시 홈 화면으로 이동해야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const backButton = screen.getByText('common.back');
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('home');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('접근성 테스트', () => {
    it('제품 카드에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const productCard = screen.getByTestId('product-card-prod-001');
      expect(productCard).toHaveAttribute('aria-label');
    });

    it('필터 버튼들에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const categoryFilter = screen.getByText('products.categories.skincare');
      expect(categoryFilter).toHaveAttribute('aria-label');
    });
  });

  describe('에러 처리 테스트', () => {
    it('제품이 없을 때 메시지가 표시되어야 한다', () => {
      mockUseStore.products = [];

      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('products.noProducts')).toBeInTheDocument();
    });

    it('검색 결과가 없을 때 메시지가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ProductsScreen />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('products.searchPlaceholder');
      fireEvent.change(searchInput, { target: { value: '존재하지않는제품' } });

      await waitFor(() => {
        expect(screen.getByText('products.noResults')).toBeInTheDocument();
      });
    });
  });
}); 