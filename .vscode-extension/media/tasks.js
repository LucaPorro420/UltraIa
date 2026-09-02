/**
 * UltraIa Tasks Panel — Webview JavaScript.
 * Displays active tasks with progress and controls.
 */

(function() {
  const vscode = acquireVsCodeApi();
  
  const tasksList = document.getElementById('tasks-list');
  const emptyState = document.getElementById('empty-state');
  const refreshBtn = document.getElementById('refresh-btn');

  let tasks = new Map();

  refreshBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'refresh' });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    
    switch (message.command) {
      case 'tasks':
        renderTasks(message.tasks);
        break;
    }
  });

  function renderTasks(taskArray) {
    tasks.clear();
    taskArray.forEach(t => tasks.set(t.id, t));
    
    if (taskArray.length === 0) {
      tasksList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');
    tasksList.innerHTML = taskArray.map(task => createTaskElement(task)).join('');
    
    // Add event listeners
    taskArray.forEach(task => {
      const cancelBtn = document.getElementById(`cancel-${task.id}`);
      const retryBtn = document.getElementById(`retry-${task.id}`);
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'cancelTask', taskId: task.id });
        });
      }
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'retryTask', taskId: task.id });
        });
      }
    });
  }

  function createTaskElement(task) {
    const statusClass = `status-${task.status}`;
    const progress = task.progress || 0;
    const time = new Date(task.updatedAt).toLocaleTimeString();
    const created = new Date(task.createdAt).toLocaleString();
    
    const statusIcons = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '⏹️'
    };

    const actions = (task.status === 'running' || task.status === 'pending') 
      ? `<button id="cancel-${task.id}" class="task-action cancel" title="Cancel">✕</button>`
      : (task.status === 'failed' 
        ? `<button id="retry-${task.id}" class="task-action retry" title="Retry">↻</button>`
        : '');

    return `
      <div class="task-item ${statusClass}" data-id="${escapeHtml(task.id)}">
        <div class="task-header">
          <span class="task-icon">${statusIcons[task.status] || '📋'}</span>
          <span class="task-type">${escapeHtml(task.type)}</span>
          <span class="task-status ${statusClass}">${escapeHtml(task.status)}</span>
        </div>
        <div class="task-meta">
          <span class="task-id">${escapeHtml(task.id.slice(0, 12))}...</span>
          <span class="task-time">${time}</span>
        </div>
        ${task.message ? `<div class="task-message">${escapeHtml(task.message)}</div>` : ''}
        ${task.progress > 0 && task.progress < 100 ? `
          <div class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text">${progress}%</span>
          </div>
        ` : ''}
        <div class="task-actions">${actions}</div>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  vscode.postMessage({ command: 'ready' });
})();