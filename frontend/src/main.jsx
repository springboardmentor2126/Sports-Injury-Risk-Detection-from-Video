import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { VideoAnalysisProvider } from "./contexts/VideoAnalysisContext";
import './styles/theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <VideoAnalysisProvider>
    <App />
  </VideoAnalysisProvider>
</StrictMode>
)
