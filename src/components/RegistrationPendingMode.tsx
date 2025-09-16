import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Phone, Mail, Settings } from 'lucide-react';

interface RegistrationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'info_required';
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  estimatedApprovalTime?: string;
  allowedFeatures: string[];
  message: string;
  requiredInfo?: Array<{
    field: string;
    message: string;
  }>;
  rejectionReason?: string;
  supportContact?: string;
}

interface KioskInfo {
  kioskId: string;
  storeName: string;
  location: string;
  registeredAt: string;
}

interface RegistrationPendingModeProps {
  kioskInfo: KioskInfo;
  onApprovalComplete: () => void;
  onRegistrationUpdate: () => void;
  onSupportContact: () => void;
}

export const RegistrationPendingMode: React.FC<RegistrationPendingModeProps> = ({
  kioskInfo,
  onApprovalComplete,
  onRegistrationUpdate,
  onSupportContact
}) => {
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // 상태 확인 함수
  const checkRegistrationStatus = async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const cmsApiUrl = (window as any).ENV?.VITE_CMS_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${cmsApiUrl}/kiosks/${kioskInfo.kioskId}/approval-status`);
      
      if (!response.ok) {
        throw new Error(`상태 확인 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setRegistrationStatus(result.data);
        setLastChecked(new Date());
        
        // 승인 완료 시 콜백 호출
        if (result.data.status === 'approved') {
          // 승인 정보 로컬 저장
          const approvedInfo = {
            ...kioskInfo,
            approvalStatus: 'approved',
            approvedAt: result.data.approvedAt,
            approvedBy: result.data.approvedBy,
            updateChannel: result.data.updateChannel || 'stable'
          };
          localStorage.setItem('cvm_kiosk_approval', JSON.stringify(approvedInfo));
          
          // 잠시 후 승인 완료 콜백 호출
          setTimeout(() => {
            onApprovalComplete();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('상태 확인 오류:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초기 상태 확인 및 주기적 체크 설정
  useEffect(() => {
    // 즉시 상태 확인
    checkRegistrationStatus(true);

    // 10분마다 자동 체크 (10 * 60 * 1000 = 600000ms)
    const interval = setInterval(() => {
      checkRegistrationStatus();
    }, 10 * 60 * 1000);

    setCheckInterval(interval);

    // 클린업
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [kioskInfo.kioskId]);

  // 수동 새로고침
  const handleManualRefresh = () => {
    checkRegistrationStatus(true);
  };

  // 상태별 아이콘 및 색상
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'approved':
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'info_required':
        return <AlertTriangle className="h-8 w-8 text-orange-500" />;
      default:
        return <Clock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      case 'info_required':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '승인 대기 중';
      case 'approved':
        return '승인 완료';
      case 'rejected':
        return '승인 거부';
      case 'info_required':
        return '추가 정보 필요';
      default:
        return '상태 확인 중';
    }
  };

  // 허용된 기능 확인
  const isFeatureAllowed = (feature: string) => {
    return registrationStatus?.allowedFeatures.includes(feature) || 
           registrationStatus?.allowedFeatures.includes('all');
  };

  // 데모 상품 데이터
  const demoProducts = [
    { id: 1, name: '데모 로션', price: 25000, image: '/images/products/placeholder.svg' },
    { id: 2, name: '데모 립스틱', price: 18000, image: '/images/products/placeholder.svg' },
    { id: 3, name: '데모 선크림', price: 22000, image: '/images/products/placeholder.svg' }
  ];

  if (!registrationStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">상태 확인 중</h2>
          <p className="text-gray-600">등록 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CVM 키오스크</h1>
              <p className="text-sm text-gray-600">{kioskInfo.storeName} • {kioskInfo.location}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(registrationStatus.status)}`}>
                {getStatusText(registrationStatus.status)}
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="상태 새로고침"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 상태 카드 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                {getStatusIcon(registrationStatus.status)}
                <h2 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
                  {getStatusText(registrationStatus.status)}
                </h2>
                <p className="text-gray-600 text-lg">
                  {registrationStatus.message}
                </p>
              </div>

              {/* 상태별 추가 정보 */}
              {registrationStatus.status === 'pending' && (
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">진행 상황</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                      등록 요청 접수 완료
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                      관리자 검토 중
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      승인 대기
                    </div>
                  </div>
                  {registrationStatus.estimatedApprovalTime && (
                    <p className="mt-4 text-sm text-blue-800">
                      <strong>예상 승인 시간:</strong> {registrationStatus.estimatedApprovalTime}
                    </p>
                  )}
                </div>
              )}

              {registrationStatus.status === 'approved' && (
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">승인 완료</h3>
                  <p className="text-green-800">
                    축하합니다! 키오스크 승인이 완료되었습니다.
                    잠시 후 정상 서비스 모드로 전환됩니다.
                  </p>
                  {registrationStatus.approvedAt && (
                    <p className="mt-2 text-sm text-green-700">
                      승인 일시: {new Date(registrationStatus.approvedAt).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              )}

              {registrationStatus.status === 'rejected' && (
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-3">승인 거부</h3>
                  {registrationStatus.rejectionReason && (
                    <p className="text-red-800 mb-4">{registrationStatus.rejectionReason}</p>
                  )}
                  <button
                    onClick={onRegistrationUpdate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    재등록하기
                  </button>
                </div>
              )}

              {registrationStatus.status === 'info_required' && (
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-3">추가 정보 필요</h3>
                  {registrationStatus.requiredInfo && (
                    <div className="space-y-2 mb-4">
                      {registrationStatus.requiredInfo.map((info, index) => (
                        <div key={index} className="text-orange-800">
                          • {info.message}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={onRegistrationUpdate}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                  >
                    정보 업데이트
                  </button>
                </div>
              )}

              {/* 키오스크 정보 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">키오스크 정보</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">키오스크 ID:</span>
                    <div className="font-mono">{kioskInfo.kioskId}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">등록 일시:</span>
                    <div>{new Date(kioskInfo.registeredAt).toLocaleString('ko-KR')}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">마지막 상태 확인:</span>
                    <div>{lastChecked.toLocaleString('ko-KR')}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">다음 자동 체크:</span>
                    <div>{new Date(lastChecked.getTime() + 10 * 60 * 1000).toLocaleString('ko-KR')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 사용 가능한 기능 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">현재 사용 가능한 기능</h3>
              <div className="space-y-3">
                <div className={`flex items-center text-sm ${isFeatureAllowed('demo_mode') ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  데모 상품 보기
                </div>
                <div className={`flex items-center text-sm ${isFeatureAllowed('system_info') ? 'text-green-600' : 'text-gray-400'}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  시스템 정보 확인
                </div>
                <div className={`flex items-center text-sm ${isFeatureAllowed('basic_settings') ? 'text-green-600' : 'text-gray-400'}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  기본 설정
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <XCircle className="h-4 w-4 mr-2" />
                  실제 상품 판매 (승인 후 이용 가능)
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <XCircle className="h-4 w-4 mr-2" />
                  결제 기능 (승인 후 이용 가능)
                </div>
              </div>
            </div>

            {/* 고객 지원 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">고객 지원</h3>
              <div className="space-y-3">
                <button
                  onClick={onSupportContact}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  고객센터 문의
                </button>
                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  상태 새로고침
                </button>
              </div>
              
              {registrationStatus.supportContact && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-600 mb-1">문의 연락처:</p>
                  <p className="text-sm font-medium">{registrationStatus.supportContact}</p>
                </div>
              )}
            </div>

            {/* 데모 상품 (승인 대기 중일 때만) */}
            {registrationStatus.status === 'pending' && isFeatureAllowed('demo_mode') && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">데모 상품</h3>
                <div className="space-y-3">
                  {demoProducts.map(product => (
                    <div key={product.id} className="flex items-center space-x-3 p-2 border rounded-md">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.price.toLocaleString()}원</div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-3">
                    * 데모 상품은 실제 구매할 수 없습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPendingMode;
