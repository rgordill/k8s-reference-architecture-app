import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ArchitectureDetailPage } from './pages/ArchitectureDetailPage';
import { ArchitectureListPage } from './pages/ArchitectureListPage';
import { ThemeProvider } from './theme/ThemeContext';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={basename === '/' ? undefined : basename}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<ArchitectureListPage />} />
            <Route
              path="architectures/:name"
              element={<ArchitectureDetailPage />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
