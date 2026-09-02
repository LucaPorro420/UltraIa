/**
 * UltraIa Chat Panel — Webview JavaScript.
 * Handles message sending, history display, and syntax highlighting.
 */

(function() {
  const vscode = acquireVsCodeApi();
  
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');

  // Send message on Ctrl+Enter or button click
  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    
    vscode.postMessage({ command: 'sendMessage', text });
    inputEl.value = '';
    inputEl.style.height = 'auto';
  }

  sendBtn.addEventListener('click', sendMessage);
  
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  // Clear history
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear chat history?')) {
      vscode.postMessage({ command: 'clearHistory' });
    }
  });

  // Handle messages from extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    
    switch (message.command) {
      case 'appendMessage':
        appendMessage(message.message);
        break;
      case 'history':
        renderHistory(message.messages);
        break;
      case 'clear':
        messagesEl.innerHTML = '';
        break;
    }
  });

  function renderHistory(msgs) {
    messagesEl.innerHTML = '';
    msgs.forEach(msg => appendMessage(msg));
  }

  function appendMessage(msg) {
    const div = document.createElement('div');
    div.className = `message message-${msg.role}`;
    
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const header = `<div class="message-header">
      <span class="message-role">${escapeHtml(msg.role)}</span>
      <span class="message-time">${time}</span>
    </div>`;
    
    let content = escapeHtml(msg.content);
    content = highlightCode(content);
    
    let editsHtml = '';
    if (msg.edits && msg.edits.length > 0) {
      editsHtml = '<div class="message-edits"><strong>Edits:</strong><ul>' +
        msg.edits.map(e => `<li>${escapeHtml(e.file)} — ${escapeHtml(e.action)}</li>`).join('') +
        '</ul></div>';
    }
    
    let gatesHtml = '';
    if (msg.gates) {
      const passed = Object.values(msg.gates).filter(v => v).length;
      const total = Object.keys(msg.gates).length;
      const status = passed === total ? '✅' : '❌';
      gatesHtml = `<div class="message-gates">${status} Gates: ${passed}/${total} passed</div>`;
    }
    
    div.innerHTML = header + `<div class="message-content">${content}</div>` + editsHtml + gatesHtml;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightCode(text) {
    // Simple code block highlighting
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>`;
    }).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // Notify extension we're ready
  vscode.postMessage({ command: 'ready' });
})();