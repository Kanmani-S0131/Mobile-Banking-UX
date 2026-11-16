/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DatasetProvider } from './context/DatasetContext';
import { AddRecordPage } from './pages/AddRecordPage';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { ExportPage } from './pages/ExportPage';
import { GenerateDatasetPage } from './pages/GenerateDatasetPage';
import { RejectedRecordsPage } from './pages/RejectedRecordsPage';
import { RulesSettingsPage } from './pages/RulesSettingsPage';
import { UploadDataPage } from './pages/UploadDataPage';
import { ValidationTestCasesPage } from './pages/ValidationTestCasesPage';

export default function App() {
  return (
    <DatasetProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadDataPage />} />
            <Route path="/add" element={<AddRecordPage />} />
            <Route path="/generate" element={<GenerateDatasetPage />} />
            <Route path="/explorer" element={<DatasetExplorerPage />} />
            <Route path="/tests" element={<ValidationTestCasesPage />} />
            <Route path="/rejected" element={<RejectedRecordsPage />} />
            <Route path="/settings" element={<RulesSettingsPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DatasetProvider>
  );
}
