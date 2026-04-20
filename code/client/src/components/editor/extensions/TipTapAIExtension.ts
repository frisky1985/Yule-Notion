/**
 * TipTap AI 扩展
 *
 * 为 TipTap 编辑器添加 AI 功能支持：
 * - 键盘快捷键 (Ctrl+Shift+A)
 * - AI 面板打开命令
 * - 插入/替换 AI 响应命令
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface TipTapAIExtensionOptions {
  onOpenAI: (operation: string, text: string) => void;
}

export const TipTapAIExtension = Extension.create<TipTapAIExtensionOptions>({
  name: 'aiExtension',
  
  addOptions() {
    return {
      onOpenAI: () => {}
    };
  },
  
  addProseMirrorPlugins() {
    const { onOpenAI } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey('ai-extension'),
        props: {
          handleKeyDown(view, event) {
            // Ctrl+Shift+A opens AI panel
            if (event.ctrlKey && event.shiftKey && event.key === 'A') {
              event.preventDefault();
              const { state } = view;
              const { from, to } = state.selection;
              const selectedText = state.doc.textBetween(from, to, ' ');
              onOpenAI('', selectedText);
              return true;
            }
            return false;
          }
        }
      })
    ];
  },
  
  addCommands() {
    return {
      openAIPanel: (operation: string) => ({ state }: { state: any }) => {
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');
        this.options.onOpenAI(operation, selectedText);
        return true;
      },
      
      insertAIResponse: (text: string) => ({ tr, state }: { tr: any; state: any }) => {
        const { $from } = state.selection;
        tr.insertText(text, $from.pos);
        return true;
      },
      
      replaceSelectionWithAI: (text: string) => ({ tr, state }: { tr: any; state: any }) => {
        const { from, to } = state.selection;
        tr.replaceWith(from, to, state.schema.text(text));
        return true;
      }
    };
  }
});
