import { Routes, Route, Navigate } from 'react-router-dom';
import { DisplayBoard } from './components/DisplayBoard';
import { StaffPanel } from './components/StaffPanel';
import { TranslationProvider } from './contexts/TranslationContext';

export function App(): JSX.Element {
  return (
    <TranslationProvider>
      <Routes>
        <Route path="/display" element={<DisplayBoard />} />
        <Route path="/admin" element={<StaffPanel />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </TranslationProvider>
  );
}
