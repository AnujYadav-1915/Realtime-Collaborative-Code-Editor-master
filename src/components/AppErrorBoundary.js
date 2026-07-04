import React from 'react';

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, errorMessage: ''};
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            errorMessage: error?.message || 'Unknown runtime error',
        };
    }

    componentDidCatch(error) {
        console.error('App runtime error:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 24}}>
                    <h2 style={{marginTop: 0}}>Sync Code failed to load</h2>
                    <p style={{marginBottom: 8}}>A runtime error occurred while rendering the app.</p>
                    <p style={{marginTop: 0, color: '#93c5fd'}}>Error: {this.state.errorMessage}</p>
                    <p style={{color: '#cbd5e1'}}>Open browser DevTools Console for full stack trace.</p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppErrorBoundary;