//! UltraIa Automation - VS Code Integration
// Adds commands to trigger the automation pipeline from VS Code.

import * as vscode from 'vscode';
import * as path from 'path';

export function registerAutomationCommands(context: vscode.ExtensionContext, rootPath: string): void {
  // Quick automation from input
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.automate', async () => {
      const task = await vscode.window.showInputBox({
        prompt: 'Describe what you want to build',
        placeHolder: 'e.g., Build a REST API with authentication',
      });
      
      if (!task) return;
      
      const model = await vscode.window.showQuickPick(
        ['qwen2.5-coder:1.5b-base', 'qwen2.5-coder:7b', 'llama3:8b', 'deepseek-coder:6.7b'],
        { placeHolder: 'Select LLM model' }
      );
      
      vscode.window.showInformationMessage(`🚀 Starting automation: ${task}`);
      
      // Run automation via terminal
      const terminal = vscode.window.createTerminal('UltraIa Automation');
      terminal.show();
      terminal.sendText(`cd "${rootPath}" && npx tsx automation/orchestrator.ts --model ${model || 'qwen2.5-coder:1.5b-base'} "${task}"`);
    })
  );

  // Run from tasks.json
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.automateTasks', async () => {
      const tasksFile = path.join(rootPath, 'tasks.json');
      
      if (!require('fs').existsSync(tasksFile)) {
        const create = await vscode.window.showErrorMessage(
          'No tasks.json found. Create one?',
          'Create Template'
        );
        
        if (create) {
          const template = {
            tasks: [
              {
                id: 't1',
                description: 'Example task',
                priority: 'medium',
                type: 'feature',
                acceptance: ['Criterion 1', 'Criterion 2'],
              },
            ],
          };
          require('fs').writeFileSync(tasksFile, JSON.stringify(template, null, 2));
          vscode.window.showInformationMessage('Created tasks.json template');
        }
        return;
      }
      
      vscode.window.showInformationMessage('🚀 Running automation from tasks.json');
      
      const terminal = vscode.window.createTerminal('UltraIa Automation');
      terminal.show();
      terminal.sendText(`cd "${rootPath}" && npx tsx automation/orchestrator.ts --tasks tasks.json`);
    })
  );

  // Run from markdown tasks
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.automateMarkdown', async () => {
      const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        filters: { Markdown: ['md'] },
        title: 'Select task file',
      });
      
      if (!files || files.length === 0) return;
      
      vscode.window.showInformationMessage(`🚀 Running automation from ${path.basename(files[0].fsPath)}`);
      
      const terminal = vscode.window.createTerminal('UltraIa Automation');
      terminal.show();
      terminal.sendText(`cd "${rootPath}" && npx tsx automation/orchestrator.ts --markdown "${files[0].fsPath}"`);
    })
  );

  // Quick single task
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.automateQuick', async () => {
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = [
        { label: 'Create feature', description: 'Build a new feature', detail: 'feature' },
        { label: 'Fix bug', description: 'Fix an existing bug', detail: 'bugfix' },
        { label: 'Refactor code', description: 'Improve code structure', detail: 'refactor' },
        { label: 'Write tests', description: 'Add test coverage', detail: 'test' },
        { label: 'Write docs', description: 'Add documentation', detail: 'docs' },
      ];
      quickPick.placeholder = 'What type of task?';
      
      quickPick.onDidAccept(async () => {
        const selected = quickPick.selectedItems[0];
        quickPick.hide();
        
        const task = await vscode.window.showInputBox({
          prompt: `Describe the ${selected.detail}`,
          placeHolder: `${selected.description}...`,
        });
        
        if (!task) return;
        
        vscode.window.showInformationMessage(`🚀 Starting: ${task}`);
        
        const terminal = vscode.window.createTerminal('UltraIa Automation');
        terminal.show();
        terminal.sendText(`cd "${rootPath}" && npx tsx automation/orchestrator.ts "${task}"`);
      });
      
      quickPick.show();
    })
  );

  // View automation history
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.automateHistory', async () => {
      const memFile = path.join(rootPath, '.ultraia', 'automation-memory.json');
      
      if (!require('fs').existsSync(memFile)) {
        vscode.window.showInformationMessage('No automation history yet');
        return;
      }
      
      const memories = JSON.parse(require('fs').readFileSync(memFile, 'utf-8'));
      const recent = memories.slice(-10).reverse();
      
      const items = recent.map((m: any) => ({
        label: `${m.success ? '✅' : '❌'} ${m.taskId}`,
        description: m.description,
        detail: new Date(m.timestamp).toLocaleString(),
      }));
      
      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Automation history (most recent)',
      });
      
      if (selected) {
        const memory = recent.find((m: any) => selected.includes(m.taskId));
        if (memory) {
          vscode.window.showInformationMessage(
            `${memory.taskId}: ${memory.description}\nSuccess: ${memory.success}\nLessons: ${(memory.lessons || []).join(', ') || 'None'}`
          );
        }
      }
    })
  );
}
