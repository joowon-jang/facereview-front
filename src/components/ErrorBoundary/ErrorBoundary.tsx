import { Component, ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  backgroundColor: '#15151d',
  color: '#ffffff',
  textAlign: 'center',
  padding: '0 24px',
};

const buttonStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '12px 28px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#76FECE',
  color: '#15151d',
  fontWeight: 700,
  fontSize: '15px',
  cursor: 'pointer',
};

/**
 * 루트 오류 경계. 렌더 중 예외(배포 직후 lazy 청크 404 포함)로
 * 흰 화면이 되는 것을 막고 새로고침 안내를 보여준다.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={containerStyle} role="alert">
          <p style={{ fontSize: '40px' }} aria-hidden="true">
            😥
          </p>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>
            일시적인 오류가 발생했어요
          </h1>
          <p style={{ fontSize: '14px', color: '#A0A0B0', lineHeight: 1.6 }}>
            새로운 버전이 배포되었거나 네트워크 문제일 수 있어요.
            <br />
            새로고침하면 대부분 해결됩니다.
          </p>
          <button type="button" style={buttonStyle} onClick={this.handleReload}>
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
