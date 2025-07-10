# DOOH React Frontend (Vite)

Modern React TypeScript frontend for the DOOH Analytics System, powered by Vite for fast development.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

The app will start at `http://localhost:3000`

## 📋 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally

## 🌐 Environment Variables

Create a `.env` file for custom configuration:

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

## 🏗️ Architecture

- **Vite** - Fast build tool and dev server
- **React 18** - UI library with hooks
- **TypeScript** - Type safety
- **WebSocket** - Real-time communication
- **Chart.js** - Analytics visualization
- **FontAwesome** - Professional icons

## 📱 Features

- **Digital Signage View** - Full-screen ad display
- **Analytics Dashboard** - Real-time metrics and controls
- **Camera Management** - Switch between multiple cameras
- **Ad Targeting** - Gender/age/emotion-based ad serving
- **Professional UI** - Rewardsy black/white branding

## 🎯 Deployment

### Build for Production
```bash
npm run build
```

The `dist/` folder contains the production build ready for deployment to:
- Vercel
- Netlify  
- Any static hosting service

### Environment Setup
Update environment variables for production deployment. 