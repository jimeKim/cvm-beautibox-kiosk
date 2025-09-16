# 🏪 CVM Kiosk Application

**Professional Cosmetic Vending Machine Solution**

[![GitHub Stars](https://img.shields.io/github/stars/jimeKim/cvm-kiosk)](https://github.com/jimeKim/cvm-kiosk/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/jimeKim/cvm-kiosk)](https://github.com/jimeKim/cvm-kiosk/network)
[![License](https://img.shields.io/github/license/jimeKim/cvm-kiosk)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.18.0-brightgreen)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/electron-34.0-blue)](https://electronjs.org/)

## ✨ Features

- 🎨 **Professional Interface**: Optimized for cosmetic vending machines
- 💳 **Multi-payment System**: Card, QR, Mobile pay support  
- 📱 **Touch-optimized UI**: Professional kiosk interface
- 🔄 **Auto-update System**: GitHub-based automatic updates
- 🛡️ **Security**: Advanced security and admin features
- 🌐 **Multi-language**: Korean/English support
- 🎯 **CMS Integration**: Centralized management system
- 📸 **Camera Integration**: Photo capture and printing
- 🖨️ **Printer Support**: Receipt and photo printing
- ⚡ **Hardware Control**: Arduino-based sensor and relay control

## 🚀 Quick Start

### Installation
```bash
# Download latest installer
# https://github.com/jimeKim/cvm-kiosk/releases/latest
# Run: CVM-Kiosk-2.0.0-Setup.exe
```

### Development
```bash
git clone https://github.com/jimeKim/cvm-kiosk.git
cd cvm-kiosk
npm install
npm run electron:dev
```

### Build
```bash
# Development build
npm run build

# Production build (Windows installer)  
npm run dist:win

# Release (with auto-update)
npm run release
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Desktop**: Electron 34 + Node.js 20.18.0  
- **State Management**: Zustand 4.4.0
- **Build Tool**: Vite 4.4.5 + Electron Builder
- **Testing**: Jest + React Testing Library
- **Hardware**: Arduino + SerialPort communication
- **Auto-update**: electron-updater + GitHub Releases

## 📦 Project Structure

```
cvm-kiosk/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── pages/             # Page components  
│   ├── services/          # Business logic services
│   ├── store/             # Zustand state management
│   └── types/             # TypeScript type definitions
├── electron/              # Electron main process
│   ├── main-kiosk.ts     # Kiosk mode main process
│   ├── preload.ts        # Preload script
│   └── autoUpdater.ts    # Auto-update logic
├── public/               # Static assets
├── cvm-app/              # Legacy app components
└── .github/workflows/    # GitHub Actions CI/CD
```

## 🔧 Configuration

### Environment Variables
Copy `env.example` to `.env` and configure:

```env
# Application
VITE_APP_NAME=CVM Kiosk
VITE_APP_VERSION=2.0.0

# Kiosk Identification  
VITE_KIOSK_ID=cvm_kiosk_001
VITE_STORE_ID=store_001

# CMS Integration
VITE_CMS_API_URL=http://cvm-cms-server.com:3000/api
VITE_CMS_API_KEY=your_api_key

# Kiosk Mode
VITE_KIOSK_MODE=true
VITE_FULLSCREEN=true
```

## 🎯 Key Features

### Kiosk Mode
- **Fullscreen operation** with kiosk-optimized UI
- **Auto-launch** on system startup
- **Crash recovery** and auto-restart
- **Remote monitoring** and management

### Payment Integration  
- **Card payment** support
- **QR code** payment integration
- **Mobile payment** compatibility
- **Receipt printing** for all transactions

### Hardware Control
- **Arduino integration** for sensors and relays
- **Camera control** for photo capture
- **Printer management** for receipts and photos
- **Touch screen** calibration and optimization

### Auto-update System
- **GitHub Releases** based updates
- **Silent installation** during off-hours
- **Mirror failover** for reliable updates
- **Version management** with rollback support

## 📖 Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [User Manual](docs/USER-MANUAL.md) 
- [Hardware Setup](docs/HARDWARE-SETUP.md)
- [API Documentation](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About CVM

CVM (Cosmetic Vending Machine) is a professional kiosk solution designed specifically for cosmetic retail environments. Our system provides a complete end-to-end solution including hardware integration, payment processing, inventory management, and customer experience optimization.

---

Made with ❤️ by the CVM Team