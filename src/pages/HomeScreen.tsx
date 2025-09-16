import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import LanguageSelector from '@/components/LanguageSelector';

const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { 
    setCurrentStep, 
    currentDistance, 
    resetIdleTimer,
    systemStatus 
  } = useAppStore();

  const [isProximityDetected, setIsProximityDetected] = useState(false);
  const [adVideoIndex, setAdVideoIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);

  // 광고 영상 목록 (3개 비디오 파일)
  const adVideos = [
    {
      id: 1,
      title: t('ads.newProductLaunch'),
      url: "/videos/4cf90b61e78caca20628c41c510259ac.mp4",
      thumbnail: "/images/ads/ad1.jpg"
    },
    {
      id: 2,
      title: t('ads.kBeautyTrend'),
      url: "/videos/632f34d85df1243970ef07937bf654f6.mp4", 
      thumbnail: "/images/ads/ad2.jpg"
    },
    {
      id: 3,
      title: t('ads.beautySpecialEvent'),
      url: "/videos/ee36634da7289d2dcdfb2e92d965f1fa.mp4",
      thumbnail: "/images/ads/ad3.jpg"
    }
  ];

  // 근접 감지 로직
  useEffect(() => {
    const PROXIMITY_THRESHOLD = 50; // 50cm 이내 감지
    
    if (currentDistance !== null && currentDistance <= PROXIMITY_THRESHOLD) {
      if (!isProximityDetected) {
        setIsProximityDetected(true);
        console.log('사용자 접근 감지:', currentDistance + 'cm');
        
        // 3초 후 자동으로 다음 단계로 이동
        setTimeout(() => {
          setCurrentStep('products');
        }, 3000);
      }
    } else {
      setIsProximityDetected(false);
    }
  }, [currentDistance, isProximityDetected, setCurrentStep]);

  // 광고 영상 자동 전환 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setAdVideoIndex((prev) => (prev + 1) % adVideos.length);
      setVideoError(false); // 새 비디오 로드 시 에러 상태 초기화
    }, 30000);

    return () => clearInterval(interval);
  }, [adVideos.length]);

  // 화면 터치 시 구매 플로우 시작
  const handleScreenTouch = () => {
    resetIdleTimer();
    setCurrentStep('products');
  };

  // 비디오 에러 처리
  const handleVideoError = () => {
    console.error('비디오 로드 실패:', adVideos[adVideoIndex].url);
    setVideoError(true);
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* 언어 선택기 */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      {/* 하드웨어 설정 버튼은 상품페이지로 이동됨 */}

      {/* 광고 영상 배경 */}
      <div className="w-full h-full flex items-center justify-center">
        {/* 실제 비디오 재생 */}
        <div className="relative w-full h-full">
          {!videoError ? (
            <video 
              key={adVideos[adVideoIndex].id}
              src={adVideos[adVideoIndex].url}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              preload="auto"
              onError={handleVideoError}
              onLoadStart={() => console.log('비디오 로딩 시작:', adVideos[adVideoIndex].url)}
              onCanPlay={() => console.log('비디오 재생 가능:', adVideos[adVideoIndex].url)}
              onPlay={() => console.log('비디오 재생 중:', adVideos[adVideoIndex].url)}
            />
          ) : (
            // 비디오 로드 실패 시 대체 콘텐츠
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${adVideos[adVideoIndex].thumbnail})`
              }}
            >
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}
          
          {/* 비디오 위 오버레이 - 투명도 대폭 줄임 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
            {/* 브랜드 로고 영역 - 크기 줄이고 투명도 조정 */}
            <div className="text-white text-center mb-8 animate-fade-in bg-black/20 backdrop-blur-sm rounded-2xl p-6">
              <h1 className="text-6xl font-bold mb-4 tracking-wide bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                BeautyLab
              </h1>
              <p className="text-2xl mb-3 font-light text-white/90">{t('common.subtitle')}</p>
              <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto rounded-full" />
            </div>
            
            {/* 시작 안내 - 크기 줄이고 배경 추가 */}
            <div className="text-white text-center animate-bounce bg-black/30 backdrop-blur-sm rounded-xl p-4">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto mb-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16l13-8z" />
                </svg>
              </div>
              <p className="text-xl font-semibold mb-2">{t('home.touchToStart')}</p>
              <p className="text-base text-white/80">{t('home.touchInstruction')}</p>
            </div>
          </div>
          
          {/* 광고 제목 표시 */}
          <div className="absolute bottom-24 left-8 bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-xl border border-white/20">
            <p className="text-xl font-medium">{adVideos[adVideoIndex].title}</p>
          </div>
          
          {/* 특별 이벤트 배너 */}
          <div className="absolute top-8 left-8 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl shadow-lg">
            <p className="text-lg font-bold">{t('home.specialEvent')}</p>
          </div>
        </div>
      </div>

      {/* 근접 감지 오버레이 - 조건부 렌더링 제거하고 visibility로 제어 */}
      <div 
        className={`absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm transition-opacity duration-300 ${
          isProximityDetected ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="bg-white rounded-3xl p-12 text-center animate-scale-in shadow-2xl max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">{t('home.welcome')}</h2>
            <p className="text-lg text-gray-600">{t('home.startingShopping')}</p>
          </div>
          <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>

      {/* 시스템 상태 (좌측상단) */}
      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg text-sm backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">거리:</span>
            <span>{currentDistance !== null ? `${currentDistance}cm` : '측정 중...'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400">상태:</span>
            <span>{systemStatus?.overall || 'Unknown'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-purple-400">근접 감지:</span>
            <span>{isProximityDetected ? '✅' : '❌'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-yellow-400">현재 광고:</span>
            <span>{adVideoIndex + 1}/{adVideos.length}</span>
          </div>
        </div>
      </div>

      {/* 터치 영역 - z-index 낮춤 */}
      <div 
        className="absolute inset-0 cursor-pointer z-0"
        onClick={handleScreenTouch}
        onTouchStart={handleScreenTouch}
        aria-label={t('home.touchAreaLabel')}
        style={{ 
          paddingBottom: '80px', 
          paddingRight: '80px' 
        }}
      />

      {/* 하단 광고 인디케이터와 추가 정보 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
        {/* 광고 인디케이터 */}
        <div className="flex space-x-3">
          {adVideos.map((_, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                index === adVideoIndex 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        
        {/* 추가 정보 */}
        <div className="text-white/80 text-center">
          <p className="text-sm">{t('home.operatingHours')}</p>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen; 