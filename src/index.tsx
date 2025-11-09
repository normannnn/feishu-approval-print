import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 创建根元素
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// 渲染应用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 热模块替换支持
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <NextApp />
      </React.StrictMode>
    );
  });
}