<template>
  <Teleport to="body">
    <Transition name="slide-fade">
      <div v-if="aiStore.isPanelOpen" class="ai-panel-overlay" @click.self="aiStore.closePanel()">
        <div class="ai-panel">
          <!-- Header -->
          <div class="ai-panel-header">
            <h3>✨ AI Assistant</h3>
            <button class="close-btn" @click="aiStore.closePanel()">✕</button>
          </div>
          
          <!-- Operation Selector -->
          <div class="ai-panel-section">
            <label>Operation:</label>
            <select v-model="currentOperation" @change="onOperationChange">
              <option value="summarize">📝 Summarize</option>
              <option value="rewrite">✍️ Rewrite</option>
              <option value="expand">📖 Expand</option>
              <option value="translate">🌐 Translate</option>
              <option value="improveWriting">✨ Improve Writing</option>
              <option value="fixGrammar">✓ Fix Grammar</option>
              <option value="continueWriting">➡️ Continue Writing</option>
            </select>
          </div>
          
          <!-- Input -->
          <div class="ai-panel-section">
            <label>Input:</label>
            <textarea
              v-model="aiStore.inputText"
              placeholder="Selected text appears here..."
              rows="4"
            ></textarea>
          </div>
          
          <!-- Generate Button -->
          <button
            class="generate-btn"
            :disabled="!aiStore.inputText || aiStore.isLoading"
            @click="handleGenerate"
          >
            <span v-if="aiStore.isLoading">Generating...</span>
            <span v-else>Generate Response</span>
          </button>
          
          <!-- Output -->
          <div v-if="aiStore.aiResponse || aiStore.error" class="ai-panel-section">
            <label>Output:</label>
            <div class="ai-output" :class="{ streaming: aiStore.streaming }">
              <div v-if="aiStore.error" class="error-message">
                {{ aiStore.error }}
              </div>
              <div v-else class="response-content" v-html="formatResponse(aiStore.aiResponse)"></div>
              <div v-if="aiStore.streaming" class="streaming-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div v-if="aiStore.aiResponse && !aiStore.isLoading" class="ai-panel-actions">
            <button class="action-btn" @click="handleInsert">Insert</button>
            <button class="action-btn" @click="handleReplace">Replace</button>
            <button class="action-btn" @click="handleCopy">Copy</button>
            <button class="action-btn secondary" @click="aiStore.clearResponse()">Clear</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAIStore } from '@/stores/ai';
import { AIOperationType } from '@/types/ai';

const aiStore = useAIStore();
const emit = defineEmits<{
  insert: [text: string];
  replace: [text: string];
}>();

const currentOperation = ref<AIOperationType>('summarize');

watch(() => aiStore.isPanelOpen, (isOpen) => {
  if (isOpen && aiStore.currentOperation) {
    currentOperation.value = aiStore.currentOperation;
  }
});

function onOperationChange() {
  aiStore.setOperation(currentOperation.value);
}

function handleGenerate() {
  const pageId = new URLSearchParams(window.location.search).get('pageId') || undefined;
  aiStore.generateResponse(pageId);
}

function handleInsert() {
  emit('insert', aiStore.aiResponse);
  aiStore.closePanel();
}

function handleReplace() {
  emit('replace', aiStore.aiResponse);
  aiStore.closePanel();
}

function handleCopy() {
  navigator.clipboard.writeText(aiStore.aiResponse);
}

function formatResponse(text: string): string {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
</script>

<style scoped>
.ai-panel-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.ai-panel {
  width: 400px;
  background: var(--bg-editor, #ffffff);
  border-left: 1px solid var(--border-light, #e0e0e0);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.ai-panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px 8px;
}

.close-btn:hover {
  color: var(--text-primary, #333);
}

.ai-panel-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-panel-section label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.ai-panel-section select,
.ai-panel-section textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-default, #ccc);
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  background: var(--bg-input, #fafafa);
}

.ai-panel-section textarea {
  resize: vertical;
  min-height: 80px;
}

.generate-btn {
  padding: 12px;
  background: var(--color-active, #4a9eff);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: var(--color-active-hover, #357abd);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-output {
  min-height: 100px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-light, #e0e0e0);
  position: relative;
}

.ai-output.streaming {
  border-color: var(--color-active, #4a9eff);
}

.error-message {
  color: #e53e3e;
  font-size: 14px;
}

.response-content {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.streaming-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0 0;
}

.dot {
  width: 6px;
  height: 6px;
  background: var(--color-active, #4a9eff);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.ai-panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  background: var(--color-active, #4a9eff);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--color-active-hover, #357abd);
}

.action-btn.secondary {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  border: 1px solid var(--border-default, #ccc);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
