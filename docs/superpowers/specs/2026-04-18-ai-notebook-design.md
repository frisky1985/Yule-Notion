# AI Notebook Design Specification

**Date:** 2026-04-18  
**Version:** 1.0  
**Status:** Approved for Implementation  
**Author:** AI Assistant (based on user request for AI notebook enhancement)

---

## 1. Overview

### 1.1 Purpose

Transform Yule Notion from a traditional note-taking app into an AI-powered intelligent notebook that helps users write better, organize smarter, and find information faster through integrated AI capabilities.

### 1.2 Vision

An embedded AI assistant that works alongside the user's writing workflow, providing context-aware operations without disrupting the natural flow of thought. Users maintain full control over when and how AI assists them.

### 1.3 Scope

This specification covers **Phase 1: AI Writing Assistant** with architecture designed to support future phases (Context-Aware Features, Advanced Intelligence).

**In Scope:**
- AI panel alongside editor
- Core writing operations (summarize, rewrite, expand, translate, improve writing, fix grammar, continue writing)
- Streaming response delivery
- Insert/Replace/Copy actions
- AI operation history and cost tracking
- OpenAI integration (GPT-4o-mini)
- Rate limiting and cost controls

**Out of Scope (Future Phases):**
- Semantic search with embeddings (Phase 3)
- Auto-tagging and smart linking (Phase 2)
- Q&A over notes (Phase 3)
- Multiple AI provider UI switching (Phase 3)

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Yule Notion                           │
├──────────────────┬──────────────────┬───────────────────────┤
│   Frontend       │   Backend        │   AI Services         │
│   (Vue 3)        │   (Node.js)      │   (External APIs)     │
│                  │                  │                       │
│  ┌────────────┐  │  ┌────────────┐  │  ┌───────────────┐   │
│  │AI Panel    │◄─┼─►│AI Controller│◄─┼─►│OpenAI API     │   │
│  │Component   │  │  │/api/ai/*   │  │  │(GPT-4o-mini)  │   │
│  └────────────┘  │  └────────────┘  │  └───────────────┘   │
│                  │                  │                       │
│  ┌────────────┐  │  ┌────────────┐  │  ┌───────────────┐   │
│  │TipTap AI   │◄─┼─►│Page Service│  │  │Anthropic API  │   │
│  │Extension   │  │  │(context)   │  │  │(future)       │   │
│  └────────────┘  │  └────────────┘  │  └───────────────┘   │
│                  │                  │                       │
│  ┌────────────┐  │  ┌────────────┐  │                       │
│  │AI Command  │◄─┼─►│AI History  │                          │
│  │Palette     │  │  │Service     │                          │
│  └────────────┘  │  └────────────┘                          │
└──────────────────┴──────────────────┴───────────────────────┘
```

### 2.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **AI Provider Abstraction** | Support multiple providers (OpenAI, Anthropic, Azure) through unified interface for flexibility and cost optimization |
| **Streaming Responses** | Real-time token streaming via Server-Sent Events for better UX (users see text as it's generated) |
| **Context-Aware Operations** | AI receives current page content + related pages (via tags) for more relevant responses |
| **Operation History** | Track all AI operations for undo/redo, cost tracking, and audit trail |
| **Rate Limiting** | Prevent abuse and control costs (10 requests/minute per user) |
| **Cost Controls** | Configurable monthly spending limits with user notifications |

### 2.3 Data Flow

```
User selects text → Chooses AI action → Frontend sends request
  ↓
Backend validates request + checks rate limit
  ↓
Backend gathers context (current page + related pages via tags)
  ↓
Backend calls AI provider with prompt + context
  ↓
AI streams response back via Server-Sent Events
  ↓
Frontend displays streaming text in real-time
  ↓
User chooses: Insert / Replace / Copy / Discard
  ↓
Response saved to editor + operation logged to database
```

---

## 3. Frontend Components

### 3.1 AIPanel.vue

**Location:** `code/client/src/components/ai/AIPanel.vue`

**Purpose:** Right sidebar panel displaying AI operations and responses

**State:**
```typescript
interface AIPanelState {
  isPanelOpen: boolean
  currentOperation: AIOperationType | null
  inputText: string
  aiResponse: string
  isLoading: boolean
  error: string | null
  streaming: boolean
}
```

**Features:**
- Operation type selector (dropdown)
- Input text area (pre-filled with selection)
- Streaming response display with markdown rendering
- Action buttons: Insert, Replace, Copy, Discard
- Loading indicator with progress
- Error display with retry option

**Props:**
- `pageId: string` - Current page ID for context
- `selectedText: string` - User's text selection

**Events:**
- `@insert` - Insert AI response at cursor
- `@replace` - Replace selection with AI response
- `@close` - Close panel

### 3.2 TipTapAIExtension.ts

**Location:** `code/client/src/components/editor/extensions/TipTapAIExtension.ts`

**Purpose:** Custom TipTap extension for AI integration

**Features:**
- `@ai` command trigger (type `@ai` to open AI panel)
- Selected text context capture
- Inline AI markers (highlight AI-generated content temporarily)
- Integration with existing slash command menu

**Commands:**
```typescript
editor.commands.openAIPanel(operation: AIOperationType)
editor.commands.insertAIResponse(text: string)
editor.commands.replaceSelectionWithAI(text: string)
```

### 3.3 AICommandPalette.vue

**Location:** `code/client/src/components/ai/AICommandPalette.vue`

**Purpose:** Modal dialog for quick AI command selection

**Trigger:** `Ctrl+Shift+A` or toolbar button

**Operations:**
| Operation | Description | Icon |
|-----------|-------------|------|
| Summarize | Create concise summary of selected text | 📝 |
| Rewrite | Rewrite text with different wording | ✍️ |
| Expand | Expand brief text into detailed content | 📖 |
| Translate | Translate text to another language | 🌐 |
| Improve Writing | Enhance clarity and style | ✨ |
| Fix Grammar | Correct grammar and spelling errors | ✓ |
| Continue Writing | Generate continuation of text | ➡️ |

**State:**
```typescript
interface AICommandState {
  isOpen: boolean
  selectedOperation: AIOperationType | null
  searchQuery: string
  recentOperations: AIOperationType[]
}
```

### 3.4 AIHistoryPanel.vue

**Location:** `code/client/src/components/ai/AIHistoryPanel.vue`

**Purpose:** Display past AI operations with cost tracking

**Features:**
- Chronological list of AI operations
- Operation type, timestamp, tokens used, cost
- Click to view full input/output
- Re-run operation with same parameters
- Filter by operation type or date range
- Monthly cost summary

---

## 4. Backend Components

### 4.1 AI Controller

**Location:** `code/server/src/controllers/ai.controller.ts`

**Endpoints:**

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/ai/complete | AI text completion (non-streaming) | Yes |
| POST | /api/v1/ai/stream | Streaming AI response (SSE) | Yes |
| GET | /api/v1/ai/history | Get AI operation history | Yes |
| POST | /api/v1/ai/cancel | Cancel ongoing AI request | Yes |
| GET | /api/v1/ai/cost | Get monthly AI cost | Yes |

**Request Schema - POST /api/v1/ai/stream:**
```typescript
interface AIStreamRequest {
  operation: AIOperationType
  text: string
  pageId?: string
  language?: string // for translate operation
  maxTokens?: number // default: 1000
}
```

**Response Schema (SSE):**
```
data: {"token": "Hello"}
data: {"token": " world"}
data: {"done": true, "tokensUsed": 45, "cost": 0.002}
```

**Error Responses:**
```typescript
interface AIErrorResponse {
  error: {
    code: 'RATE_LIMIT_EXCEEDED' | 'COST_LIMIT_REACHED' | 'AI_TIMEOUT' | 'INVALID_REQUEST'
    message: string
    retryAfter?: number // seconds
  }
}
```

### 4.2 AI Service

**Location:** `code/server/src/services/ai.service.ts`

**Responsibilities:**
- Provider abstraction (unified interface for OpenAI, Anthropic, etc.)
- Context gathering (fetch page content + related pages)
- Prompt engineering (build effective prompts for each operation)
- Rate limiting enforcement
- Cost tracking and limits
- Error handling and retries

**Core Functions:**
```typescript
class AIService {
  async complete(request: AIRequest): Promise<AIResponse>
  async stream(request: AIRequest): Promise<ReadableStream>
  async gatherContext(pageId: string): Promise<AIContext>
  async checkRateLimit(userId: string): Promise<boolean>
  async trackCost(userId: string, cost: number): Promise<void>
  async cancelRequest(requestId: string): Promise<void>
}
```

**Prompt Templates:**
```typescript
const PROMPT_TEMPLATES = {
  summarize: (text: string, context: string) => `
    Context: ${context}
    
    Please summarize the following text concisely while preserving key information:
    
    ${text}
    
    Summary:
  `,
  
  rewrite: (text: string, context: string) => `
    Context: ${context}
    
    Please rewrite the following text with different wording while maintaining the same meaning:
    
    ${text}
    
    Rewritten:
  `,
  
  expand: (text: string, context: string) => `
    Context: ${context}
    
    Please expand the following text with more details and examples:
    
    ${text}
    
    Expanded:
  `,
  
  translate: (text: string, targetLang: string) => `
    Please translate the following text to ${targetLang}:
    
    ${text}
    
    Translation:
  `,
  
  improveWriting: (text: string, context: string) => `
    Context: ${context}
    
    Please improve the following text for clarity, style, and readability:
    
    ${text}
    
    Improved:
  `,
  
  fixGrammar: (text: string) => `
    Please correct any grammar and spelling errors in the following text:
    
    ${text}
    
    Corrected:
  `,
  
  continueWriting: (text: string, context: string) => `
    Context: ${context}
    
    Please continue writing from the following text, maintaining the same style and tone:
    
    ${text}
    
    Continuation:
  `
}
```

### 4.3 AI Provider Interface

**Location:** `code/server/src/services/ai.providers.ts`

**Provider Interface:**
```typescript
interface AIProvider {
  name: string
  model: string
  
  complete(prompt: string, options: AIOptions): Promise<AIResponse>
  stream(prompt: string, options: AIOptions): Promise<ReadableStream>
  estimateCost(tokens: number): number
}
```

**OpenAI Provider (Default):**
```typescript
class OpenAIProvider implements AIProvider {
  name = 'openai'
  model = 'gpt-4o-mini'
  
  // Uses OpenAI API with streaming support
  // Cost: $0.15/1M input tokens, $0.60/1M output tokens
}
```

**Future Providers:**
- AnthropicProvider (Claude Haiku)
- AzureOpenAIProvider (enterprise deployment)

### 4.4 Database Schema

**Migration:** `code/server/src/db/migrations/20260418_ai_operations.ts`

**Table: ai_operations**
```sql
CREATE TABLE ai_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL, -- summarize, rewrite, expand, etc.
  input_text TEXT NOT NULL,
  output_text TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'openai',
  model VARCHAR(100) NOT NULL,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_operations_user_id ON ai_operations(user_id);
CREATE INDEX idx_ai_operations_created_at ON ai_operations(created_at);
CREATE INDEX idx_ai_operations_page_id ON ai_operations(page_id);
```

**Table: ai_usage_limits** (for cost controls)
```sql
CREATE TABLE ai_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_limit DECIMAL(10, 2) DEFAULT 10.00, -- $10/month default
  current_month_usage DECIMAL(10, 6) DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  UNIQUE(user_id, month, year)
);
```

---

## 5. Error Handling

### 5.1 Error Scenarios

| Error | Cause | User Action | Recovery |
|-------|-------|-------------|----------|
| **API Key Missing** | No AI provider configured | Show settings prompt | User adds API key |
| **Rate Limit Exceeded** | >10 requests/minute | Wait and retry | Auto-retry after delay |
| **AI Timeout** | Response >30s | Cancel or retry | Increase timeout or retry |
| **Invalid Response** | AI returns malformed output | Manual retry | Log error for debugging |
| **Network Error** | Connection lost | Auto-retry | Cache request, retry on reconnect |
| **Cost Limit Reached** | Monthly budget exceeded | Upgrade limit | User increases budget |
| **Context Too Large** | Page content exceeds token limit | Select smaller text | Truncate context intelligently |

### 5.2 Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'RATE_LIMIT_EXCEEDED', 'AI_TIMEOUT']
}
```

---

## 6. Security & Privacy

### 6.1 Data Protection

- **Encryption in Transit:** All AI requests use HTTPS
- **API Key Storage:** Encrypted in environment variables, never exposed to frontend
- **User Data Isolation:** Users only see their own AI operation history
- **Content Privacy:** Text sent to AI providers is not stored by them (per OpenAI/Anthropic privacy policies)

### 6.2 Rate Limiting

- **Per-User Limit:** 10 requests per minute
- **Global Limit:** 100 requests per minute (prevent abuse)
- **Implementation:** Redis-based sliding window counter

### 6.3 Cost Controls

- **Default Monthly Limit:** $10 per user
- **Configurable:** Users can increase limit in settings
- **Notifications:** Alert at 50%, 80%, 100% of limit
- **Hard Stop:** Block requests when limit reached (prevent surprise bills)

---

## 7. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI Response Latency (first token) | <2 seconds | Time from request to first streamed token |
| AI Response Latency (complete) | <10 seconds | Time from request to full response |
| Panel Open/Close Animation | <200ms | CSS transition time |
| History Panel Load | <500ms | Time to load last 50 operations |
| Streaming Update Frequency | 10-20 tokens/second | Real-time display updates |
| Context Gathering | <100ms | Time to fetch related page content |

---

## 8. UI/UX Design

### 8.1 AIPanel Layout

```
┌─────────────────────────────────┐
│ AI Assistant              [✕]   │
├─────────────────────────────────┤
│ Operation: [Summarize ▼]        │
│                                 │
│ Input:                          │
│ ┌─────────────────────────────┐ │
│ │ [Selected text appears here]│ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Generate Response]             │
│                                 │
│ Output:                         │
│ ┌─────────────────────────────┐ │
│ │ [AI response streams here]  │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Insert] [Replace] [Copy] [✕]  │
└─────────────────────────────────┘
```

### 8.2 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Open AI command palette |
| `Esc` | Close AI panel/palette |
| `Enter` | Generate response (when focused on Generate button) |
| `Ctrl+I` | Insert AI response at cursor |
| `Ctrl+Shift+R` | Replace selection with AI response |

### 8.3 Visual States

- **Idle:** Panel closed, AI icon in toolbar
- **Active:** Panel open, pulsing animation on generate button
- **Loading:** Streaming indicator (animated dots), disabled action buttons
- **Success:** Green highlight on AI response, enabled action buttons
- **Error:** Red error message with retry button

---

## 9. Testing Strategy

### 9.1 Unit Tests

- AI service prompt building
- Provider abstraction layer
- Rate limiting logic
- Cost calculation
- Context gathering

### 9.2 Integration Tests

- End-to-end AI request flow
- Streaming response handling
- Database operation logging
- Error recovery scenarios

### 9.3 UI Tests (Playwright)

- Panel open/close interactions
- Operation selection
- Streaming text display
- Insert/Replace/Copy actions
- Keyboard shortcuts
- Error state handling

### 9.4 Performance Tests

- Response latency under load
- Streaming smoothness
- Context gathering speed
- Memory usage with large documents

---

## 10. Implementation Plan

### Phase 1: AI Writing Assistant (Weeks 1-2)

**Week 1: Backend Foundation**
1. Database migration (ai_operations, ai_usage_limits)
2. AI service layer with OpenAI integration
3. AI controller with streaming endpoint
4. Rate limiting and cost controls
5. Unit tests for AI service

**Week 2: Frontend Integration**
1. AIPanel component
2. TipTap AI extension
3. AICommandPalette modal
4. Streaming response handling
5. Insert/Replace/Copy actions
6. Integration tests

### Phase 2: Context-Aware Features (Week 3)

1. Related page context gathering
2. AI operation history panel
3. Cost tracking display
4. Auto-tagging suggestions (optional)
5. Smart linking recommendations (optional)

### Phase 3: Advanced Intelligence (Weeks 4-5)

1. Semantic search with embeddings (pgvector)
2. Q&A over notes
3. Content analysis & insights
4. Multiple AI provider support
5. Custom prompt templates

---

## 11. Open Questions & Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Default AI provider? | OpenAI (GPT-4o-mini) | Best balance of quality, speed, and cost |
| 2 | Streaming or non-streaming? | Streaming (SSE) | Better UX, users see progress |
| 3 | Context window size? | 4000 tokens (~3000 words) | Fits most pages, cost-effective |
| 4 | Monthly cost limit? | $10 default | Reasonable for personal use |
| 5 | Rate limit? | 10 req/min | Prevent abuse, allow burst usage |
| 6 | Store AI responses? | Yes, in ai_operations table | Enable history, re-run, audit |
| 7 | Support offline AI? | No (Phase 1) | Requires local model, too complex |

---

## 12. Future Enhancements

### Phase 2+ Features
- **Auto-Tagging:** AI suggests relevant tags based on content
- **Smart Linking:** AI recommends links to related pages
- **Content Analysis:** AI identifies key themes, action items, decisions
- **Template Generation:** AI creates page templates from examples

### Phase 3+ Features
- **Semantic Search:** Vector embeddings for meaning-based search
- **Q&A over Notes:** Ask questions, get answers synthesized from multiple pages
- **Knowledge Graph:** Visual representation of note relationships
- **Multi-Modal AI:** Image analysis, diagram generation
- **Local AI Models:** Optional self-hosted AI for privacy-sensitive users

---

## 13. Cost Estimation

### API Costs (per user, monthly)

| Usage Level | Requests/Month | Tokens/Request | Monthly Cost |
|-------------|----------------|----------------|--------------|
| Light | 100 | 500 | ~$0.10 |
| Moderate | 500 | 1000 | ~$0.75 |
| Heavy | 2000 | 1500 | ~$4.00 |
| Power User | 5000 | 2000 | ~$12.00 |

**Conclusion:** Default $10/month limit covers 95% of users comfortably.

### Development Costs

| Component | Estimated Hours | Complexity |
|-----------|----------------|------------|
| Backend AI Service | 12h | Medium |
| Frontend Components | 16h | Medium-High |
| Database & Migration | 4h | Low |
| Testing | 8h | Medium |
| Documentation | 4h | Low |
| **Total** | **44h** | |

---

## 14. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI Feature Adoption | >40% of users use AI weekly | Analytics tracking |
| User Satisfaction | >4.5/5 rating | In-app survey |
| Response Quality | >90% useful responses | User feedback (thumbs up/down) |
| Cost Efficiency | <$5/month average per user | Cost tracking dashboard |
| Performance | <2s first token latency | Performance monitoring |

---

*Design Specification v1.0 | 2026-04-18 | Ready for Implementation*
