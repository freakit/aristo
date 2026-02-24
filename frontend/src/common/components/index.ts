// src/common/components/index.ts
// Common components barrel export

export { default as FormGroup } from './ui/FormGroup';
export { default as ErrorMessage } from './ui/ErrorMessage';
export { default as GlobalLanguageSwitcher } from './ui/GlobalLanguageSwitcher';
export { default as Modal } from './ui/Modal';
export { default as ProgressBar } from './ui/ProgressBar';

// Loading exports named exports, no default
export * from './ui/Loading';

// Layout components
export { default as PageHeader } from './layout/PageHeader';
export { default as Header } from './layout/Header';
export { default as ProtectedRoute } from './layout/ProtectedRoute';

// PageLayout exports named styled components, avoid exporting PageHeader conflict
export {
  PageContainer,
  PageTitle,
  PageSubtitle,
  HeaderAction,
} from './layout/PageLayout';

export { default as HandAndGazeTrackingModal } from './HandAndGazeTrackingModal/HandAndGazeTrackingModal';
