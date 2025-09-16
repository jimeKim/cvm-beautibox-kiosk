# CVM (Cosmetic Vending Machine) BeautiBox 키오스크 시스템

![GitHub stars](https://img.shields.io/github/stars/jimeKim/cvm-beautibox-kiosk?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/jimeKim/cvm-beautibox-kiosk?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/jimeKim/cvm-beautibox-kiosk?style=for-the-badge)
![License](https://img.shields.io/github/license/jimeKim/cvm-beautibox-kiosk?style=for-the-badge)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.18.0-brightgreen?style=for-the-badge&logo=node.js)
![Electron Version](https://img.shields.io/badge/electron-34.0-blue?style=for-the-badge&logo=electron)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/react-18.2-61dafb?style=for-the-badge&logo=react)

## 프로젝트 개요

**CVM BeautiBox**는 화장품 자동판매기용 Electron 기반 키오스크 애플리케이션입니다. React + TypeScript로 개발되었으며, 터치스크린 인터페이스를 통해 사용자가 쉽게 화장품을 구매할 수 있는 완전한 키오스크 솔루션을 제공합니다.

**Version:** 2.7.3  
**Release Date:** 2025-09-16  
**Development Team:** CVM Development Team

## 🚀 최신 업데이트 v2.7.3

### DVM Core SDK v2.0.0 완전 통합
- **실제 하드웨어 90% 통합**: Arduino, 카메라, 프린터, 센서 실제 제어
- **Arduino relay-simple.ino v3.0.0**: 115200 baud 시리얼 통신
- **Logitech C920**: 1920x1080@30fps 고화질 실시간 촬영
- **DP-QW410 열전사 프린터**: ESC/POS 명령어로 실제 영수증 출력
- **NPN 센서**: 50ms 방진 처리로 안정적인 사용자 감지
- **5x8 매트릭스**: 40개 버튼 실시간 제어 (7바이트 이진 패킷)

## 주요 기능

### 사용자 인터페이스
- **직관적인 터치 UI**: 대형 화면에 최적화된 사용자 친화적 인터페이스
- **다국어 지원**: 한국어/영어 언어 전환 기능
- **상품 검색 및 필터링**: 카테고리별, 브랜드별 상품 분류
- **장바구니 관리**: 실시간 장바구니 업데이트 및 수량 조절
- **사진 촬영**: 구매 기념 사진 촬영 기능

### 결제 시스템
- **다중 결제 방식**: 신용카드, QR결제, 현금 결제 지원
- **보안 결제**: 카드 정보 암호화 및 마스킹 처리
- **결제 검증**: 실시간 결제 상태 확인 및 오류 처리
- **영수증 발행**: 디지털 영수증 자동 생성

### 하드웨어 통합 (v2.7.3 신규)
- **Arduino 제어보드**: 자동판매기 하드웨어 완전 제어 (COM7, 115200 baud)
- **실시간 센서**: NPN 근접센서로 사용자 접근 감지 (50ms 방진)
- **고화질 카메라**: Logitech C920으로 실시간 사진 촬영
- **열전사 프린터**: DP-QW410으로 실제 영수증 및 사진 인쇄
- **매트릭스 제어**: 5x8 (40개) 버튼 실시간 제어

### 보안 및 관리
- **관리자 패널**: Ctrl+Alt+A로 접근 가능한 관리 인터페이스
- **실시간 모니터링**: 키오스크 상태 및 성능 추적
- **자동 업데이트**: 원격 콘텐츠 및 소프트웨어 업데이트
- **보안 로그**: 모든 거래 및 시스템 이벤트 기록

## 기술 스택

### 프론트엔드
- **React 18.2.0** - 사용자 인터페이스
- **TypeScript 5.0.2** - 타입 안전성
- **Vite 4.4.5** - 빌드 도구
- **Tailwind CSS 3.3.3** - 스타일링
- **Zustand 4.4.0** - 상태 관리
- **i18next 23.5.0** - 다국어 지원

### 백엔드 & 데스크톱
- **Electron 34.0.0** - 데스크톱 애플리케이션 프레임워크
- **Node.js ≥20.18.0** - 런타임 환경
- **Supabase** - 백엔드 서비스
- **SerialPort** - 하드웨어 통신

### 하드웨어 & 제어 (v2.7.3)
- **DVM Core SDK v2.0.0** - 실제 하드웨어 통합 SDK
- **Arduino relay-simple.ino v3.0.0** - 제어보드 펌웨어
- **Logitech C920** - USB 3.0 고화질 카메라
- **DP-QW410** - ESC/POS 열전사 프린터
- **NPN 센서** - 실시간 근접 감지

## 프로젝트 구조

```
CVM/
├── cvm-app/                     # 메인 키오스크 애플리케이션 (v2.7.3)
│   ├── src/                     # React 프론트엔드 소스
│   │   ├── components/          # 재사용 UI 컴포넌트
│   │   ├── pages/              # 화면 컴포넌트
│   │   ├── services/           # API 및 하드웨어 서비스
│   │   ├── store/              # Zustand 상태 관리
│   │   ├── hooks/              # 커스텀 훅
│   │   ├── utils/              # 유틸리티 함수
│   │   └── types/              # TypeScript 타입 정의
│   ├── electron/               # Electron 백엔드
│   ├── scripts/                # 빌드 및 유틸리티 스크립트
│   ├── build/                  # 빌드 리소스
│   └── docs/                   # 프로젝트 문서
├── dvm-core-sdk1/              # DVM Core SDK v2.0.0 (실제 하드웨어)
├── cvm-sdk1/                   # CVM SDK (ZIP 포함)
└── *.ps1, *.bat               # 실행 스크립트들
```

## 빠른 시작

### 시스템 요구사항
- **Node.js**: ≥20.18.0
- **npm**: ≥8.0.0
- **Windows**: 10 이상 (권장)
- **메모리**: 8GB RAM 이상
- **저장공간**: 2GB 이상

### 하드웨어 요구사항 (v2.7.3)
- **Arduino**: relay-simple.ino v3.0.0 펌웨어 (COM7 포트)
- **카메라**: Logitech C920 또는 호환 USB 카메라
- **프린터**: DP-QW410 열전사 프린터 (80mm 용지)
- **센서**: NPN 근접센서 (50cm 감지 범위)
- **매트릭스**: 5x8 (40개) 버튼 제어보드

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/jimeKim/cvm-beautibox-kiosk.git
cd cvm-beautibox-kiosk
```

2. **의존성 설치**
```bash
cd cvm-app
npm install
```

3. **하드웨어 테스트 (v2.7.3)**
```bash
# DVM Core SDK v2.0.0 하드웨어 테스트
node test-dvm-sdk.js

# Arduino 제어보드 테스트
node scripts/controller-optimized-test.js

# 프린터 테스트
node scripts/printer-advanced-test.js

# 카메라 테스트
node scripts/camera-test.js
```

4. **개발 모드 실행**
```bash
# 웹 개발 모드
npm run dev

# Electron 개발 모드
npm run electron:dev
```

5. **키오스크 모드 실행**
```bash
# 프로덕션 키오스크 모드 (실제 하드웨어 연동)
npm run electron:kiosk-simple
```

### 빠른 실행 (배치 파일)
프로젝트 루트에서 제공되는 배치 파일들을 사용할 수 있습니다:

- `start-electron-final.bat` - 키오스크 모드 실행
- `run-web-only.ps1` - 웹 개발 모드 실행

## 빌드 및 배포

### 개발용 빌드
```bash
npm run build
```

### 프로덕션 빌드
```bash
# Windows 실행 파일
npm run build:win

# 모든 플랫폼
npm run build:all

# 키오스크 전용 빌드
npm run build:kiosk
```

## 하드웨어 설정 가이드 (v2.7.3)

### Arduino 설정
```yaml
포트: COM7
Baud Rate: 115200
펌웨어: relay-simple.ino v3.0.0
기능: 40개 매트릭스 버튼 제어, 센서 감지
```

### 카메라 설정
```yaml
모델: Logitech C920
해상도: 1920x1080 @ 30fps
연결: USB 3.0
저장: ./photos 디렉토리
```

### 프린터 설정
```yaml
모델: DP-QW410
용지: 80mm 열전사 롤지
명령어: ESC/POS
기능: 영수증 출력, 자동 용지 절단
```

### 센서 설정
```yaml
타입: NPN 근접센서
감지 거리: 50cm (기본값)
방진 처리: 50ms
핀: Arduino PIN 8
```

## 관리 및 모니터링

### 관리자 모드 접근
키오스크 실행 중 `Ctrl + Alt + A`를 눌러 관리자 패널에 접근할 수 있습니다.

### 로그 확인
- 애플리케이션 로그: `logs/app.log`
- 하드웨어 로그: `logs/hardware.log`
- 거래 로그: `logs/transactions.log`

### 시스템 상태 모니터링 (v2.7.3)
```javascript
// DVM Core SDK v2.0.0 상태 확인
const dvm = new DVMSDK();
await dvm.initialize();
const status = dvm.getSystemStatus();
// { connected: true, sensor: true, camera: true, controller: true, printer: true }
```

## 개발 가이드

### 코드 스타일
```bash
npm run lint          # 린트 검사
npm run lint:fix      # 자동 수정
npm run format        # 코드 포맷팅
npm run type-check    # 타입 검사
```

### 테스트
```bash
npm test              # 테스트 실행
npm run test:watch    # 감시 모드 테스트
npm run test:coverage # 커버리지 확인
```

## 문서

- [시스템 사양서](cvm-app/CVM-SYSTEM-SPECIFICATION.md)
- [변경 로그](cvm-app/CHANGELOG.md) - **v2.7.3 DVM Core SDK v2.0.0 업데이트**
- [실행 가이드](cvm-app/CVM-실행가이드.txt)
- [GitHub 설정 가이드](cvm-app/QUICK-GITHUB-SETUP.md)
- [키오스크 통합 가이드](cvm-app/docs/KIOSK_INTEGRATION_GUIDE.md)

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 기여

기여는 언제나 환영합니다! 기여 가이드라인은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/jimeKim/cvm-beautibox-kiosk/issues)
- **개발 팀**: CVM Development Team
- **이메일**: support@cvm-dev.com

---

**CVM BeautiBox v2.7.3** - 실제 하드웨어 통합 완료! 차세대 화장품 자동판매기 키오스크 솔루션