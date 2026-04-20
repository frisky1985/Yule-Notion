/**
 * AI 状态管理（Pinia Store）
 *
 * 管理 AI 面板的状态、流式响应和操作历史。
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AIOperationType, AIStreamChunk, AIOperationRecord } from '@/types/ai';
import { aiFrontendService } from '@/services/ai.service';

export const useAIStore = defineStore('ai', () => {
  const isPanelOpen = ref(false);
  const currentOperation = ref<AIOperationType | null>(null);
  const inputText = ref('');
  const aiResponse = ref('');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const streaming = ref(false);
  const history = ref<AIOperationRecord[]>([]);
  const monthlyCost = ref(0);
  
  let streamController: AbortController | null = null;
  
  function openPanel(operation?: AIOperationType, text?: string) {
    isPanelOpen.value = true;
    if (operation) currentOperation.value = operation;
    if (text) inputText.value = text;
    aiResponse.value = '';
    error.value = null;
  }
  
  function closePanel() {
    isPanelOpen.value = false;
    cancelStream();
  }
  
  function setInputText(text: string) {
    inputText.value = text;
  }
  
  function setOperation(operation: AIOperationType) {
    currentOperation.value = operation;
  }
  
  async function generateResponse(pageId?: string) {
    if (!currentOperation.value || !inputText.value) return;
    
    isLoading.value = true;
    streaming.value = true;
    error.value = null;
    aiResponse.value = '';
    
    try {
      streamController = aiFrontendService.stream(
        {
          operation: currentOperation.value,
          text: inputText.value,
          pageId
        },
        (chunk: AIStreamChunk) => {
          if (chunk.token) {
            aiResponse.value += chunk.token;
          }
          if (chunk.done) {
            isLoading.value = false;
            streaming.value = false;
            loadHistory();
            loadMonthlyCost();
          }
          if (chunk.error) {
            error.value = chunk.error;
            isLoading.value = false;
            streaming.value = false;
          }
        }
      );
    } catch (err: any) {
      error.value = err.message || 'Failed to generate response';
      isLoading.value = false;
      streaming.value = false;
    }
  }
  
  function cancelStream() {
    if (streamController) {
      streamController.abort();
      streamController = null;
    }
    isLoading.value = false;
    streaming.value = false;
  }
  
  function clearResponse() {
    aiResponse.value = '';
    error.value = null;
  }
  
  async function loadHistory() {
    try {
      const result = await aiFrontendService.getHistory();
      history.value = result.history;
    } catch (err) {
      console.error('Failed to load AI history:', err);
    }
  }
  
  async function loadMonthlyCost() {
    try {
      const result = await aiFrontendService.getMonthlyCost();
      monthlyCost.value = result.monthlyCost;
    } catch (err) {
      console.error('Failed to load monthly cost:', err);
    }
  }
  
  return {
    isPanelOpen,
    currentOperation,
    inputText,
    aiResponse,
    isLoading,
    error,
    streaming,
    history,
    monthlyCost,
    openPanel,
    closePanel,
    setInputText,
    setOperation,
    generateResponse,
    cancelStream,
    clearResponse,
    loadHistory,
    loadMonthlyCost
  };
});
