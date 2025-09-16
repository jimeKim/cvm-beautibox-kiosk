import { useState, useEffect, useCallback } from 'react';

interface RegistrationInfo {
  kioskId: string;
  storeName: string;
  location: string;
  registeredAt: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'info_required';
}

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

interface UseRegistrationStatusReturn {
  registrationInfo: RegistrationInfo | null;
  registrationStatus: RegistrationStatus | null;
  isRegistered: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  needsInfo: boolean;
  loading: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
  clearRegistration: () => void;
}

export const useRegistrationStatus = (autoCheck = true, checkInterval = 10 * 60 * 1000): UseRegistrationStatusReturn => {
  const [registrationInfo, setRegistrationInfo] = useState<RegistrationInfo | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로컬 스토리지에서 등록 정보 로드
  const loadRegistrationInfo = useCallback(() => {
    try {
      const stored = localStorage.getItem('cvm_kiosk_registration');
      if (stored) {
        const info = JSON.parse(stored);
        setRegistrationInfo(info);
        return info;
      }
    } catch (error) {
      console.error('등록 정보 로드 실패:', error);
    }
    return null;
  }, []);

  // 서버에서 상태 확인
  const checkStatus = useCallback(async () => {
    const info = registrationInfo || loadRegistrationInfo();
    if (!info?.kioskId) return;

    setLoading(true);
    setError(null);

    try {
      const cmsApiUrl = (window as any).ENV?.VITE_CMS_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${cmsApiUrl}/kiosks/${info.kioskId}/approval-status`);
      
      if (!response.ok) {
        throw new Error(`상태 확인 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setRegistrationStatus(result.data);
        
        // 승인 상태가 변경되었을 때 로컬 정보 업데이트
        if (result.data.status !== info.approvalStatus) {
          const updatedInfo = {
            ...info,
            approvalStatus: result.data.status,
            lastStatusCheck: new Date().toISOString()
          };
          
          if (result.data.status === 'approved') {
            updatedInfo.approvedAt = result.data.approvedAt;
            updatedInfo.approvedBy = result.data.approvedBy;
          }
          
          localStorage.setItem('cvm_kiosk_registration', JSON.stringify(updatedInfo));
          setRegistrationInfo(updatedInfo);
        }
      } else {
        throw new Error(result.error || '상태 확인 실패');
      }
    } catch (err: any) {
      console.error('상태 확인 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [registrationInfo, loadRegistrationInfo]);

  // 등록 정보 초기화
  const clearRegistration = useCallback(() => {
    localStorage.removeItem('cvm_kiosk_registration');
    localStorage.removeItem('cvm_kiosk_approval');
    setRegistrationInfo(null);
    setRegistrationStatus(null);
    setError(null);
  }, []);

  // 초기 로드
  useEffect(() => {
    loadRegistrationInfo();
  }, [loadRegistrationInfo]);

  // 자동 상태 체크 설정
  useEffect(() => {
    if (!autoCheck || !registrationInfo?.kioskId) return;

    // 즉시 체크
    checkStatus();

    // 주기적 체크 (승인되지 않은 경우만)
    let interval: NodeJS.Timeout;
    
    if (registrationStatus?.status !== 'approved') {
      interval = setInterval(() => {
        checkStatus();
      }, checkInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoCheck, registrationInfo?.kioskId, registrationStatus?.status, checkInterval, checkStatus]);

  // 계산된 상태들
  const isRegistered = !!registrationInfo?.kioskId;
  const isApproved = registrationStatus?.status === 'approved';
  const isPending = registrationStatus?.status === 'pending';
  const isRejected = registrationStatus?.status === 'rejected';
  const needsInfo = registrationStatus?.status === 'info_required';

  return {
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
  };
};
