/**
 * Context 测试文件
 * 用于验证所有 Context 能否正常导入和使用
 */

import React from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { TaskProvider, useTaskContext } from './contexts/TaskContext';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { WebsiteProvider, useWebsiteContext } from './contexts/WebsiteContext';

// 测试组件：使用所有 Context
function TestContextConsumer() {
  const appContext = useAppContext();
  const taskContext = useTaskContext();
  const themeContext = useThemeContext();
  const websiteContext = useWebsiteContext();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>✅ Context 测试成功！</h1>

      <div style={{ marginTop: '20px' }}>
        <h2>AppContext</h2>
        <p>UI Language: {appContext.uiLanguage}</p>
        <p>Current Step: {appContext.currentStep}</p>
        <p>Archives: {appContext.archives.length}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>TaskContext</h2>
        <p>Tasks: {taskContext.tasks.length}</p>
        <p>Active Task ID: {taskContext.activeTaskId || 'None'}</p>
        <p>Max Tasks: {taskContext.maxTasks}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>ThemeContext</h2>
        <p>Dark Theme: {themeContext.isDarkTheme ? 'Yes' : 'No'}</p>
        <p>Sidebar Collapsed: {themeContext.isSidebarCollapsed ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>WebsiteContext</h2>
        <p>Selected Website: {websiteContext.selectedWebsite?.url || 'None'}</p>
        <p>Websites: {websiteContext.websites.length}</p>
      </div>
    </div>
  );
}

// 测试应用：嵌套所有 Context Providers
export function TestContextsApp() {
  return (
    <AppProvider>
      <TaskProvider>
        <ThemeProvider>
          <WebsiteProvider>
            <TestContextConsumer />
          </WebsiteProvider>
        </ThemeProvider>
      </TaskProvider>
    </AppProvider>
  );
}

export default TestContextsApp;
