import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Upload, MapPin, User, Phone, Building, Key } from 'lucide-react';

interface RegistrationData {
  storeCode: string;
  storeName: string;
  location: string;
  region: string;
  installerName: string;
  installerContact: string;
  installationPhotoUrl?: string;
  adminPassword: string;
}

interface SystemInfo {
  platform: string;
  version: string;
  memory: string;
  cpu: string;
  macAddress: string;
  ipAddress: string;
}

interface RegistrationProps {
  onRegistrationComplete: (kioskId: string) => void;
  onCancel: () => void;
}

export const KioskRegistration: React.FC<RegistrationProps> = ({
  onRegistrationComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [formData, setFormData] = useState<RegistrationData>({
    storeCode: '',
    storeName: '',
    location: '',
    region: '서울',
    installerName: '',
    installerContact: '',
    installationPhotoUrl: '',
    adminPassword: ''
  });
  const [errors, setErrors] = useState<Partial<RegistrationData>>({});
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // 지역 옵션
  const regions = [
    '서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종',
    '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주'
  ];

  // 시스템 정보 수집
  useEffect(() => {
    collectSystemInfo();
  }, []);

  const collectSystemInfo = async () => {
    try {
      // Electron API 사용 가능한 경우
      if (window.beautiBoxAPI?.system?.getStatus) {
        const info = await window.beautiBoxAPI.system.getStatus();
        setSystemInfo({
          platform: info.platform || navigator.platform,
          version: info.version || 'Unknown',
          memory: info.memory || 'Unknown',
          cpu: info.cpu || 'Unknown',
          macAddress: info.macAddress || 'Unknown',
          ipAddress: info.ipAddress || 'Unknown'
        });
      } else {
        // 웹 환경 정보
        setSystemInfo({
          platform: navigator.platform,
          version: navigator.appVersion,
          memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : 'Unknown',
          cpu: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : 'Unknown',
          macAddress: 'Unknown',
          ipAddress: 'Unknown'
        });
      }
    } catch (error) {
      console.error('시스템 정보 수집 실패:', error);
    }
  };

  // 입력 필드 변경
  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 파일 업로드
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하로 업로드해주세요.');
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setPhotoFile(file);
    
    // TODO: 실제 환경에서는 서버에 업로드
    // 임시로 로컬 URL 생성
    const photoUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, installationPhotoUrl: photoUrl }));
  };

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: Partial<RegistrationData> = {};

    if (!formData.storeCode.trim()) {
      newErrors.storeCode = '매장 코드를 입력해주세요.';
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.storeCode)) {
      newErrors.storeCode = '매장 코드는 3-10자의 영문 대문자와 숫자로 입력해주세요.';
    }

    if (!formData.storeName.trim()) {
      newErrors.storeName = '매장명을 입력해주세요.';
    }

    if (!formData.location.trim()) {
      newErrors.location = '매장 위치를 입력해주세요.';
    }

    if (!formData.installerName.trim()) {
      newErrors.installerName = '설치자 이름을 입력해주세요.';
    }

    if (!formData.installerContact.trim()) {
      newErrors.installerContact = '연락처를 입력해주세요.';
    } else if (!/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/.test(formData.installerContact.replace(/-/g, ''))) {
      newErrors.installerContact = '올바른 휴대폰 번호를 입력해주세요.';
    }

    if (!formData.adminPassword.trim()) {
      newErrors.adminPassword = '관리자 임시 비밀번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 등록 요청
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setStep('submitting');
    setErrorMessage('');

    try {
      // 등록 데이터 구성
      const registrationPayload = {
        ...formData,
        systemInfo,
        appVersion: window.beautiBoxAPI?.app?.getVersion?.() || '1.0.0',
        registeredAt: new Date().toISOString()
      };

      // CMS API 호출 (환경변수에서 URL 가져오기)
      const cmsApiUrl = (window as any).ENV?.VITE_CMS_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${cmsApiUrl}/kiosks/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `등록 실패 (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStep('success');
        // 등록 정보 로컬 저장
        const registrationInfo = {
          kioskId: result.data.kioskId,
          registrationStatus: result.data.registrationStatus,
          registeredAt: new Date().toISOString(),
          ...formData
        };
        localStorage.setItem('cvm_kiosk_registration', JSON.stringify(registrationInfo));
        
        // 3초 후 완료 콜백 호출
        setTimeout(() => {
          onRegistrationComplete(result.data.kioskId);
        }, 3000);
      } else {
        throw new Error(result.message || '등록 처리 중 오류가 발생했습니다.');
      }

    } catch (error: any) {
      console.error('등록 요청 실패:', error);
      setErrorMessage(error.message || '네트워크 오류가 발생했습니다.');
      setStep('error');
    }
  };

  // 재시도
  const handleRetry = () => {
    setStep('form');
    setErrorMessage('');
  };

  // 등록 폼 렌더링
  const renderRegistrationForm = () => (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CVM 키오스크 등록</h1>
        <p className="text-gray-600">새로운 키오스크를 등록하여 서비스를 시작하세요</p>
      </div>

      <form className="space-y-6">
        {/* 매장 정보 섹션 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Building className="mr-2 h-5 w-5" />
            매장 정보
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                매장 코드 *
              </label>
              <input
                type="text"
                value={formData.storeCode}
                onChange={(e) => handleInputChange('storeCode', e.target.value.toUpperCase())}
                placeholder="STR001"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.storeCode ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.storeCode && (
                <p className="mt-1 text-sm text-red-600">{errors.storeCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지역 *
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                매장명 *
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                placeholder="강남 1호점"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.storeName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.storeName && (
                <p className="mt-1 text-sm text-red-600">{errors.storeName}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="mr-2 h-4 w-4" />
                매장 위치 *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="서울시 강남구 테헤란로 123, 1층"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>
          </div>
        </div>

        {/* 설치자 정보 섹션 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="mr-2 h-5 w-5" />
            설치자 정보
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설치자 이름 *
              </label>
              <input
                type="text"
                value={formData.installerName}
                onChange={(e) => handleInputChange('installerName', e.target.value)}
                placeholder="김설치"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.installerName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.installerName && (
                <p className="mt-1 text-sm text-red-600">{errors.installerName}</p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Phone className="mr-2 h-4 w-4" />
                연락처 *
              </label>
              <input
                type="tel"
                value={formData.installerContact}
                onChange={(e) => handleInputChange('installerContact', e.target.value)}
                placeholder="010-1234-5678"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.installerContact ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.installerContact && (
                <p className="mt-1 text-sm text-red-600">{errors.installerContact}</p>
              )}
            </div>
          </div>
        </div>

        {/* 설치 사진 업로드 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            설치 현장 사진 (선택사항)
          </h2>
          
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer transition-colors"
            >
              사진 선택
            </label>
            {photoFile && (
              <span className="text-sm text-gray-600">
                {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)}MB)
              </span>
            )}
          </div>
          
          {formData.installationPhotoUrl && (
            <div className="mt-4">
              <img
                src={formData.installationPhotoUrl}
                alt="설치 현장"
                className="w-full max-w-md h-48 object-cover rounded-md border"
              />
            </div>
          )}
        </div>

        {/* 관리자 인증 */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Key className="mr-2 h-5 w-5" />
            관리자 인증
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              임시 관리자 비밀번호 *
            </label>
            <input
              type="password"
              value={formData.adminPassword}
              onChange={(e) => handleInputChange('adminPassword', e.target.value)}
              placeholder="임시 비밀번호를 입력하세요"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.adminPassword ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.adminPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.adminPassword}</p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              관리자로부터 받은 임시 비밀번호를 입력해주세요.
            </p>
          </div>
        </div>

        {/* 시스템 정보 표시 */}
        {systemInfo && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">시스템 정보</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">플랫폼:</span> {systemInfo.platform}</div>
              <div><span className="font-medium">메모리:</span> {systemInfo.memory}</div>
              <div><span className="font-medium">CPU:</span> {systemInfo.cpu}</div>
              <div><span className="font-medium">MAC 주소:</span> {systemInfo.macAddress}</div>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex space-x-4 pt-6">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            등록 요청
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );

  // 제출 중 화면
  const renderSubmitting = () => (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 처리 중</h2>
      <p className="text-gray-600">키오스크 등록 요청을 처리하고 있습니다...</p>
    </div>
  );

  // 성공 화면
  const renderSuccess = () => (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 요청 완료</h2>
      <p className="text-gray-600 mb-4">
        키오스크 등록 요청이 성공적으로 접수되었습니다.
        관리자 승인을 기다려주세요.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          예상 승인 시간: 1-2 영업일<br />
          승인 완료 시 자동으로 정상 서비스가 시작됩니다.
        </p>
      </div>
    </div>
  );

  // 오류 화면
  const renderError = () => (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
      <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 실패</h2>
      <p className="text-gray-600 mb-4">등록 처리 중 오류가 발생했습니다.</p>
      {errorMessage && (
        <div className="bg-red-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}
      <div className="flex space-x-4">
        <button
          onClick={handleRetry}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );

  // 단계별 렌더링
  switch (step) {
    case 'submitting':
      return renderSubmitting();
    case 'success':
      return renderSuccess();
    case 'error':
      return renderError();
    default:
      return renderRegistrationForm();
  }
};

export default KioskRegistration;
