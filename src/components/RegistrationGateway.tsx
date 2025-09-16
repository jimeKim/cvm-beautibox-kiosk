import React, { useState } from 'react';
import { useRegistrationStatus } from '@/hooks/useRegistrationStatus';
import KioskRegistration from './KioskRegistration';
import RegistrationPendingMode from './RegistrationPendingMode';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RegistrationGatewayProps {
  children: React.ReactNode; // 승인 완료 후 보여줄 메인 앱
}

export const RegistrationGateway: React.FC<RegistrationGatewayProps> = ({ children }) => {
  const {
    registrationInfo,
    registrationStatus,
    isRegistered,
    isApproved,
    isPending,
    isRejected,
    needsInfo,
    loading,
    error,
    checkStatus,
    clearRegistration
  } = useRegistrationStatus();

  const [showRegistration, setShowRegistration] = useState(false);

  // 등록 완료 핸들러
  const handleRegistrationComplete = (kioskId: string) => {
    console.log('등록 완료:', kioskId);
    setShowRegistration(false);
    // 상태 새로고침
    setTimeout(() => {
      checkStatus();
    }, 1000);
  };

  // 등록 취소 핸들러
  const handleRegistrationCancel = () => {
    setShowRegistration(false);
  };

  // 등록 정보 업데이트 (재등록 또는 정보 추가)
  const handleRegistrationUpdate = () => {
    setShowRegistration(true);
  };

  // 고객센터 문의
  const handleSupportContact = () => {
    const supportContact = registrationStatus?.supportContact || 'support@cvm.com';
    
    // 이메일 클라이언트 열기
    const subject = encodeURIComponent(`키오스크 등록 문의 - ${registrationInfo?.kioskId || 'Unknown'}`);
    const body = encodeURIComponent(`
안녕하세요,

키오스크 등록과 관련하여 문의드립니다.

키오스크 ID: ${registrationInfo?.kioskId || 'Unknown'}
매장명: ${registrationInfo?.storeName || 'Unknown'}
위치: ${registrationInfo?.location || 'Unknown'}
등록 일시: ${registrationInfo?.registeredAt || 'Unknown'}
현재 상태: ${registrationStatus?.status || 'Unknown'}

문의 내용:
[여기에 문의 내용을 작성해주세요]

감사합니다.
    `);
    
    window.open(`mailto:${supportContact}?subject=${subject}&body=${body}`);
  };

  // 승인 완료 시 메인 앱 표시
  if (isApproved) {
    return <>{children}</>;
  }

  // 등록 화면 표시
  if (showRegistration || !isRegistered) {
    return (
      <KioskRegistration
        onRegistrationComplete={handleRegistrationComplete}
        onCancel={handleRegistrationCancel}
      />
    );
  }

  // 에러 상태
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">연결 오류</h2>
          <p className="text-gray-600 mb-4">서버와의 연결에 문제가 발생했습니다.</p>
          <div className="bg-red-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              다시 시도
            </button>
            <button
              onClick={() => setShowRegistration(true)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              재등록
            </button>
          </div>
          
          {/* 개발 모드에서만 표시 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  clearRegistration();
                  window.location.reload();
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                개발용: 등록 정보 초기화
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading && !registrationStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">시스템 확인 중</h2>
          <p className="text-gray-600">키오스크 등록 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // 등록은 되어 있지만 아직 승인되지 않은 상태
  if (registrationInfo && (isPending || isRejected || needsInfo)) {
    return (
      <RegistrationPendingMode
        kioskInfo={{
          kioskId: registrationInfo.kioskId,
          storeName: registrationInfo.storeName,
          location: registrationInfo.location,
          registeredAt: registrationInfo.registeredAt
        }}
        onApprovalComplete={() => {
          // 승인 완료 시 자동으로 메인 앱으로 전환
          // 실제로는 useRegistrationStatus에서 자동 처리됨
        }}
        onRegistrationUpdate={handleRegistrationUpdate}
        onSupportContact={handleSupportContact}
      />
    );
  }

  // 기본적으로 등록 화면 표시
  return (
    <KioskRegistration
      onRegistrationComplete={handleRegistrationComplete}
      onCancel={handleRegistrationCancel}
    />
  );
};

export default RegistrationGateway;
