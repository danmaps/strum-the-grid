import { createRoot } from 'react-dom/client';
import App from './app/App';
import '@arcgis/core/assets/esri/themes/dark/main.css';
import './ui/styles.css';

createRoot(document.getElementById('root')!).render(<App />);
