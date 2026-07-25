import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';

ReactDOM.render(
    <React.StrictMode>
        <AppErrorBoundary>
            <App />
        </AppErrorBoundary>
    </React.StrictMode>,
    document.getElementById('root')
);