import { createBrowserRouter } from 'react-router'
import { AppLayout } from './AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { HomePage } from '../pages/HomePage'
import { ChangeDetailPage } from '../pages/ChangeDetailPage'
import { ComparisonNewPage } from '../pages/ComparisonNewPage'
import { ComparisonResultPage } from '../pages/ComparisonResultPage'
import { SwitchConfirmPage } from '../pages/SwitchConfirmPage'
import { HistoryPage } from '../pages/HistoryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { DiscoverPage } from '../pages/DiscoverPage'
import { CatalogAdminPage } from '../pages/CatalogAdminPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> }, // S-00
  { path: '/onboarding', element: <OnboardingPage /> }, // S-01
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> }, // S-02
      { path: 'changes/:changeId', element: <ChangeDetailPage /> }, // S-03
      { path: 'comparisons/new', element: <ComparisonNewPage /> }, // S-04 (?candidate=&match=)
      { path: 'comparisons/:comparisonId', element: <ComparisonResultPage /> }, // S-04 진행 / S-05 결과
      {
        path: 'comparisons/:comparisonId/switch',
        element: <SwitchConfirmPage />,
      }, // S-06
      { path: 'history', element: <HistoryPage /> }, // S-07
      { path: 'settings', element: <SettingsPage /> }, // S-08
      { path: 'discover', element: <DiscoverPage /> }, // 후보 둘러보기
      { path: 'discover/admin', element: <CatalogAdminPage /> }, // 후보 수집 관리 (운영자)
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
