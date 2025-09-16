import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomeScreen from '../HomeScreen';

// Mock zustand store
const mockUseStore = {
  language: 'ko',
  setLanguage: jest.fn(),
  currentDistance: null,
  setCurrentDistance: jest.fn(),
  setCurrentStep: jest.fn(),
  resetIdleTimer: jest.fn(),
  startIdleTimer: jest.fn(),
  isMonitoring: false,
  setMonitoring: jest.fn(),
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

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.language = 'ko';
    mockUseStore.currentDistance = null;
    mockUseStore.isMonitoring = false;
  });

  describe('렌더링 테스트', () => {
    it('홈 화면이 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      expect(screen.getByText('home.welcome')).toBeInTheDocument();
      expect(screen.getByText('home.subtitle')).toBeInTheDocument();
      expect(screen.getByText('home.touchToStart')).toBeInTheDocument();
    });

    it('언어 선택 버튼들이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      expect(screen.getByText('한국어')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('비디오 플레이어가 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const videoElement = screen.getByTestId('ad-video');
      expect(videoElement).toBeInTheDocument();
      expect(videoElement).toHaveAttribute('autoPlay');
      expect(videoElement).toHaveAttribute('loop');
      expect(videoElement).toHaveAttribute('muted');
    });
  });

  describe('언어 변경 테스트', () => {
    it('한국어 버튼 클릭 시 언어가 변경되어야 한다', () => {
      mockUseStore.language = 'en';
      
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const koreanButton = screen.getByText('한국어');
      fireEvent.click(koreanButton);

      expect(mockUseStore.setLanguage).toHaveBeenCalledWith('ko');
    });

    it('영어 버튼 클릭 시 언어가 변경되어야 한다', () => {
      mockUseStore.language = 'ko';
      
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const englishButton = screen.getByText('English');
      fireEvent.click(englishButton);

      expect(mockUseStore.setLanguage).toHaveBeenCalledWith('en');
    });

    it('현재 선택된 언어 버튼이 하이라이트되어야 한다', () => {
      mockUseStore.language = 'ko';
      
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const koreanButton = screen.getByText('한국어');
      const englishButton = screen.getByText('English');

      expect(koreanButton).toHaveClass('bg-white', 'text-purple-600');
      expect(englishButton).toHaveClass('bg-purple-500/20', 'text-white');
    });
  });

  describe('근접 감지 테스트', () => {
    it('근접 감지 시 애니메이션이 활성화되어야 한다', () => {
      mockUseStore.currentDistance = 50; // 100cm 이내
      
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      expect(startButton.parentElement).toHaveClass('animate-bounce');
    });

    it('거리 감지 시 메시지가 표시되어야 한다', () => {
      mockUseStore.currentDistance = 30; // 50cm 이내
      
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      expect(screen.getByText('home.approachDetected')).toBeInTheDocument();
    });

    it('매우 가까운 거리에서 강한 애니메이션이 적용되어야 한다', () => {
      mockUseStore.currentDistance = 20; // 30cm 이내
      
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      expect(startButton.parentElement).toHaveClass('animate-pulse');
    });
  });

  describe('시작 버튼 테스트', () => {
    it('시작 버튼 클릭 시 제품 화면으로 이동해야 한다', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockUseStore.setCurrentStep).toHaveBeenCalledWith('products');
        expect(mockNavigate).toHaveBeenCalledWith('/products');
      });
    });

    it('시작 버튼 클릭 시 타이머가 리셋되어야 한다', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockUseStore.resetIdleTimer).toHaveBeenCalled();
      });
    });
  });

  describe('비디오 플레이어 테스트', () => {
    it('비디오 로드 에러 시 에러 메시지가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const videoElement = screen.getByTestId('ad-video');
      fireEvent.error(videoElement);

      await waitFor(() => {
        expect(screen.getByText('home.videoError')).toBeInTheDocument();
      });
    });

    it('비디오 로드 완료 시 에러 메시지가 숨겨져야 한다', async () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const videoElement = screen.getByTestId('ad-video');
      
      // 먼저 에러 발생
      fireEvent.error(videoElement);
      await waitFor(() => {
        expect(screen.getByText('home.videoError')).toBeInTheDocument();
      });

      // 비디오 로드 완료
      fireEvent.loadedData(videoElement);
      await waitFor(() => {
        expect(screen.queryByText('home.videoError')).not.toBeInTheDocument();
      });
    });
  });

  describe('컴포넌트 마운트/언마운트 테스트', () => {
    it('컴포넌트 마운트 시 모니터링이 시작되어야 한다', () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      expect(mockUseStore.setMonitoring).toHaveBeenCalledWith(true);
      expect(mockUseStore.startIdleTimer).toHaveBeenCalled();
    });

    it('컴포넌트 언마운트 시 모니터링이 중지되어야 한다', () => {
      const { unmount } = render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      unmount();

      expect(mockUseStore.setMonitoring).toHaveBeenCalledWith(false);
    });
  });

  describe('접근성 테스트', () => {
    it('시작 버튼에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const startButton = screen.getByText('home.touchToStart');
      expect(startButton).toHaveAttribute('aria-label', 'home.startShopping');
    });

    it('언어 선택 버튼들에 적절한 aria-label이 있어야 한다', () => {
      render(
        <TestWrapper>
          <HomeScreen />
        </TestWrapper>
      );

      const koreanButton = screen.getByText('한국어');
      const englishButton = screen.getByText('English');

      expect(koreanButton).toHaveAttribute('aria-label', 'home.selectKorean');
      expect(englishButton).toHaveAttribute('aria-label', 'home.selectEnglish');
    });
  });
}); 