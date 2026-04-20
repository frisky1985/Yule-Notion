<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="ai-command-palette-overlay" @click.self="close()">
        <div class="ai-command-palette">
          <!-- Search -->
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Type an AI command..."
            class="palette-search"
            @keydown.escape="close()"
            @keydown.enter="executeSelected"
            @keydown.arrow-down="navigate(1)"
            @keydown.arrow-up="navigate(-1)"
          />
          
          <!-- Operations List -->
          <div class="palette-operations">
            <div
              v-for="(op, index) in filteredOperations"
              :key="op.value"
              class="palette-operation"
              :class="{ active: index === selectedIndex }"
              @click="execute(op.value)"
            >
              <span class="op-icon">{{ op.icon }}</span>
              <div class="op-info">
                <div class="op-name">{{ op.label }}</div>
                <div class="op-desc">{{ op.description }}</div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="palette-footer">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { AIOperationType } from '@/types/ai';
import { useAIStore } from '@/stores/ai';

const aiStore = useAIStore();
const emit = defineEmits<{ execute: [operation: AIOperationType, text: string] }>();

const isOpen = ref(false);
const searchQuery = ref('');
const selectedIndex = ref(0);
const searchInput = ref<HTMLInputElement | null>(null);

interface Operation {
  value: AIOperationType;
  label: string;
  description: string;
  icon: string;
}

const operations: Operation[] = [
  { value: 'summarize', label: 'Summarize', description: 'Create concise summary', icon: '📝' },
  { value: 'rewrite', label: 'Rewrite', description: 'Rewrite with different wording', icon: '✍️' },
  { value: 'expand', label: 'Expand', description: 'Add more details', icon: '📖' },
  { value: 'translate', label: 'Translate', description: 'Translate to another language', icon: '🌐' },
  { value: 'improveWriting', label: 'Improve Writing', description: 'Enhance clarity and style', icon: '✨' },
  { value: 'fixGrammar', label: 'Fix Grammar', description: 'Correct errors', icon: '✓' },
  { value: 'continueWriting', label: 'Continue Writing', description: 'Generate continuation', icon: '➡️' }
];

const filteredOperations = computed(() => {
  if (!searchQuery.value) return operations;
  const query = searchQuery.value.toLowerCase();
  return operations.filter(op => 
    op.label.toLowerCase().includes(query) ||
    op.description.toLowerCase().includes(query)
  );
});

watch(() => isOpen.value, async (open) => {
  if (open) {
    await nextTick();
    searchInput.value?.focus();
  }
});

function open() {
  isOpen.value = true;
  searchQuery.value = '';
  selectedIndex.value = 0;
}

function close() {
  isOpen.value = false;
}

function navigate(direction: number) {
  const max = filteredOperations.value.length - 1;
  selectedIndex.value = Math.max(0, Math.min(max, selectedIndex.value + direction));
}

function executeSelected() {
  if (filteredOperations.value[selectedIndex.value]) {
    execute(filteredOperations.value[selectedIndex.value].value);
  }
}

function execute(operation: AIOperationType) {
  const selectedText = window.getSelection()?.toString() || '';
  emit('execute', operation, selectedText);
  close();
}

defineExpose({ open, close });
</script>

<style scoped>
.ai-command-palette-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
}

.ai-command-palette {
  width: 600px;
  max-height: 60vh;
  background: var(--bg-editor, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.palette-search {
  width: 100%;
  padding: 16px 20px;
  border: none;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
  font-size: 16px;
  outline: none;
  background: transparent;
}

.palette-operations {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.palette-operation {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s;
}

.palette-operation:hover,
.palette-operation.active {
  background: var(--bg-hover, #f0f0f0);
}

.op-icon {
  font-size: 24px;
}

.op-info {
  flex: 1;
}

.op-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.op-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-top: 2px;
}

.palette-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-light, #e0e0e0);
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
