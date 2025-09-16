import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import ErrorScreen from '@/components/ErrorScreen';
import RegistrationGateway from '@/components/RegistrationGateway';

// 페이지 컴포넌트들 import
import HomeScreen from '@/pages/HomeScreen';
import ProductsScreen from '@/pages/ProductsScreen';
import CartScreen from '@/pages/CartScreen';
import PaymentScreen from '@/pages/PaymentScreen';
import CompleteScreen from '@/pages/CompleteScreen';
import PhotoScreen from '@/pages/PhotoScreen';
import DispensingScreen from '@/pages/DispensingScreen';
import AdminScreen from '@/pages/AdminScreen';
import CameraTestScreen from '@/pages/CameraTestScreen';
import PrinterTestScreen from '@/pages/PrinterTestScreen';
import HardwareConfigScreen from '@/pages/HardwareConfigScreen';

const App: React.FC = () => {
  const { 
    error, 
    currentStep,
    systemStatus,
    setError, 
    setSystemStatus,
    setCurrentStep,
    startIdleTimer,
    setCurrentDistance
  } = useAppStore();

  // StrictMode 중복 실행 방지를 위한 ref
  const initializationRef = useRef(false);

  // 백그라운드 시스템 초기화 (로딩 없이)
  useEffect(() => {
    // StrictMode로 인한 중복 실행 방지
    if (initializationRef.current) {
      console.log('이미 초기화됨, 중복 실행 방지');
      return;
    }
    
    initializationRef.current = true;

    // 센서 기반 자동 홈 복귀 이벤트 리스너 설정
    if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
      const api = (window as any).beautiBoxAPI;
      
      // 🔍 센서 거리 데이터 리스너 설정
      api.sensor.onDistanceUpdate((data: any) => {
        console.log('📡 센서 거리 업데이트:', data);
        if (data && typeof data.distance === 'number') {
          setCurrentDistance(data.distance);
          
          // 💡 시스템 상태도 함께 업데이트
          setSystemStatus({
            overall: 'Connected',
            sensors: data.distance <= 50 ? 'Active' : 'Standby',
            hardware: 'Connected',
            lastUpdated: new Date().toISOString()
          });
        }
      });
      
      // 20초 무감지 시 자동 홈 복귀
      api.sensor.onAutoReturnHome(() => {
        console.log('센서: 20초 무감지 - 자동 홈 복귀');
        setCurrentStep('home');
      });
      
      // 정리 함수에서 리스너 제거
      return () => {
        api.sensor.removeDistanceListener();
        api.sensor.removeAutoReturnListener();
      };
    }

    const initializeSystem = async () => {
      console.log('=== CVM 시스템 백그라운드 초기화 시작 ===');
      
      try {
        // BeautiBox API 확인 (Electron 환경) - 백그라운드에서 처리
        if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
          console.log('Electron 모드: BeautiBox API 사용');
          
          try {
            const api = (window as any).beautiBoxAPI;
            const statusResponse = await Promise.race([
              api.system?.getStatus?.(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('타임아웃')), 1000))
            ]);
            
            if (statusResponse?.success && statusResponse?.data) {
              setSystemStatus(statusResponse.data);
              console.log('시스템 상태:', statusResponse.data);
            }
          } catch (apiError) {
            console.warn('BeautiBox API 호출 실패:', apiError);
          }
        } else {
          console.log('웹 모드: 시뮬레이션 모드로 실행');
        }

        // 센서 모니터링 시작 (하드웨어 연동)
        if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
          try {
            await (window as any).beautiBoxAPI.sensor.startMonitoring(1000);
            console.log('센서 모니터링 시작됨');
          } catch (sensorError) {
            console.warn('센서 모니터링 시작 실패:', sensorError);
          }
        }

        // 유휴 타이머 시작 (백업용 - 5분)
        try {
          startIdleTimer();
        } catch (timerError) {
          console.warn('유휴 타이머 시작 실패:', timerError);
        }
        
        console.log('=== CVM 시스템 백그라운드 초기화 완료 ===');
        
      } catch (err) {
        console.error('백그라운드 초기화 실패:', err);
        // 에러가 발생해도 앱은 계속 실행
      }
    };

    // 비동기 초기화 (UI 블로킹 없음)
    initializeSystem();

    // 정리 함수
    return () => {
      if (typeof window !== 'undefined' && (window as any).beautiBoxAPI) {
        try {
          const api = (window as any).beautiBoxAPI;
          api.sensor?.removeDistanceListener?.();
          api.sensor?.stopMonitoring?.();
        } catch (cleanupError) {
          console.warn('정리 작업 실패:', cleanupError);
        }
      }
    };
  }, [setError, setSystemStatus, startIdleTimer]);

  // 관리자 모드 체크 (Ctrl+Alt+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        setCurrentStep('admin');
      }
      // 하드웨어 설정 단축키 (Ctrl+Alt+H)
      if (e.ctrlKey && e.altKey && e.key === 'h') {
        e.preventDefault();
        setCurrentStep('hardware-config');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentStep]);

  // 디버깅 로그
  console.log('App 렌더링 상태:', { error, currentStep });

  // 에러 상태
  if (error) {
    console.log('에러 화면 표시 중:', error);
    return <ErrorScreen error={error} />;
  }

  // currentStep에 따른 페이지 렌더링
  const renderCurrentScreen = () => {
    switch (currentStep) {
      case 'home':
        return <HomeScreen />;
      case 'products':
        return <ProductsScreen />;
      case 'cart':
        return <CartScreen />;
      case 'payment':
        return <PaymentScreen />;
      case 'photo':
        return <PhotoScreen />;
      case 'dispensing':
        return <DispensingScreen />;
      case 'complete':
        return <CompleteScreen />;
      case 'admin':
        return <AdminScreen />;
      case 'camera-test':
        return <CameraTestScreen />;
      case 'printer-test':
        return <PrinterTestScreen />;
      case 'hardware-config':
        return <HardwareConfigScreen />;
      default:
        return <HomeScreen />;
    }
  };

  console.log('페이지 렌더링:', currentStep);
  
  // RegistrationGateway로 전체 앱을 감싸서 등록 승인 시스템 적용
  return (
    <RegistrationGateway>
      <div className="min-h-screen w-full">
        {renderCurrentScreen()}
      </div>
    </RegistrationGateway>
  );
};

export default App; 