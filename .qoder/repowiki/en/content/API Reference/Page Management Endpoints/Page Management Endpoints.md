# Page Management Endpoints

<cite>
**Referenced Files in This Document**
- [API-SPEC.md](file://api-spec/API-SPEC.md)
- [001_init.sql](file://db/001_init.sql)
- [20260319_init.ts](file://code/server/src/db/migrations/20260319_init.ts)
- [pages.ts](file://code/client/src/stores/pages.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive API documentation for page management endpoints in Yule Notion. It covers all CRUD operations for pages, including listing with tree or flattened modes, creating, retrieving, updating with optimistic locking, soft-deleting, and reorganizing page hierarchy. It also documents TipTap JSON content format, version control semantics, and recursive deletion behavior.

## Project Structure
The page management domain spans three primary areas:
- API specification defining endpoints, schemas, and behaviors
- Database schema and migration defining storage model and constraints
- Frontend store demonstrating client-side ordering and content creation patterns

```mermaid
graph TB
subgraph "API Specification"
A["API-SPEC.md<br/>Endpoints, schemas, validation rules"]
end
subgraph "Database"
B["001_init.sql<br/>DDL for pages table"]
C["20260319_init.ts<br/>Knex migration + indexes"]
end
subgraph "Client"
D["pages.ts<br/>Client store actions for create/update"]
end
A --> B
A --> C
A --> D
```

**Diagram sources**
- [API-SPEC.md:181-417](file://api-spec/API-SPEC.md#L181-L417)
- [001_init.sql:36-55](file://db/001_init.sql#L36-L55)
- [20260319_init.ts:46-101](file://code/server/src/db/migrations/20260319_init.ts#L46-L101)
- [pages.ts:73-104](file://code/client/src/stores/pages.ts#L73-L104)

**Section sources**
- [API-SPEC.md:181-417](file://api-spec/API-SPEC.md#L181-L417)
- [001_init.sql:36-55](file://db/001_init.sql#L36-L55)
- [20260319_init.ts:46-101](file://code/server/src/db/migrations/20260319_init.ts#L46-L101)
- [pages.ts:73-104](file://code/client/src/stores/pages.ts#L73-L104)

## Core Components
- Pages table schema defines content storage, hierarchy, ordering, soft-delete, and versioning.
- API specification defines endpoint contracts, request/response schemas, and validation rules.
- Client store demonstrates how the UI constructs initial content and ordering.

Key data model highlights:
- Content: JSONB field storing TipTap document structure
- Hierarchy: parent_id with self-referencing foreign key
- Ordering: integer order per user and parent grouping
- Soft delete: boolean flag with deleted_at timestamp
- Versioning: integer version incremented on updates

**Section sources**
- [001_init.sql:36-55](file://db/001_init.sql#L36-L55)
- [20260319_init.ts:46-101](file://code/server/src/db/migrations/20260319_init.ts#L46-L101)
- [API-SPEC.md:244-284](file://api-spec/API-SPEC.md#L244-L284)
- [API-SPEC.md:286-327](file://api-spec/API-SPEC.md#L286-L327)
- [API-SPEC.md:336-381](file://api-spec/API-SPEC.md#L336-L381)
- [API-SPEC.md:383-391](file://api-spec/API-SPEC.md#L383-L391)
- [API-SPEC.md:393-416](file://api-spec/API-SPEC.md#L393-L416)
- [pages.ts:73-104](file://code/client/src/stores/pages.ts#L73-L104)

## Architecture Overview
The page management endpoints follow a layered architecture:
- HTTP layer: Express routes receive requests
- Validation layer: Zod-based request validation
- Service layer: Business logic for CRUD, ordering, and hierarchy
- Persistence layer: Knex queries against PostgreSQL with JSONB content and indexes

```mermaid
graph TB
Client["Client Apps"] --> Routes["Express Routes<br/>GET/POST/PUT/DELETE /api/v1/pages/*"]
Routes --> Validator["Validation Middleware<br/>Zod schemas"]
Validator --> Service["Page Service<br/>CRUD + move + soft-delete"]
Service --> DB["PostgreSQL<br/>pages table + indexes"]
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

## Detailed Component Analysis

### Endpoint: GET /api/v1/pages
- Purpose: List pages with optional tree or flattened mode
- Authentication: Required
- Query parameters:
  - tree: boolean, default false
  - parentId: string (UUID), filter by parent (root when null)
  - includeDeleted: boolean, only effective when tree=false
- Response:
  - Flattened: array of page objects without nested children
  - Tree: array of root pages with nested children arrays
- Behavior:
  - Tree mode excludes content, tags, and timestamps for sidebar rendering
  - Pagination is not supported for this endpoint

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Routes"
participant S as "Service"
participant DB as "Database"
C->>R : "GET /api/v1/pages?tree=true&parentId=null"
R->>S : "listPages(tree, parentId, includeDeleted)"
S->>DB : "SELECT ... WHERE user_id=? AND parent_id=? AND is_deleted=?"
DB-->>S : "rows"
S-->>R : "flattened or tree structure"
R-->>C : "200 OK { data : [...] }"
```

**Section sources**
- [API-SPEC.md:183-242](file://api-spec/API-SPEC.md#L183-L242)

### Endpoint: POST /api/v1/pages
- Purpose: Create a new page
- Authentication: Required
- Request body fields:
  - title: string, default "无标题"
  - content: object (TipTap JSON), default empty doc
  - parentId: string (UUID), null for root
  - order: integer, default append to siblings
  - icon: string, default "📄"
- Response: 201 with created page object
- Validation:
  - parentId must belong to current user
  - order must be non-negative
  - icon must be a valid short string
  - content must be valid TipTap JSON

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Routes"
participant S as "Service"
participant DB as "Database"
C->>R : "POST /api/v1/pages { title, content, parentId, order, icon }"
R->>S : "createPage(params)"
S->>DB : "INSERT INTO pages (user_id, title, content, parent_id, order, icon, version)"
DB-->>S : "row"
S-->>R : "page"
R-->>C : "201 Created { data : page }"
```

**Section sources**
- [API-SPEC.md:244-284](file://api-spec/API-SPEC.md#L244-L284)
- [pages.ts:73-93](file://code/client/src/stores/pages.ts#L73-L93)

### Endpoint: GET /api/v1/pages/:id
- Purpose: Retrieve a single page by ID
- Authentication: Required
- Path parameter: id (UUID)
- Response: Full page object including content, tags, timestamps
- Error responses:
  - 404 RESOURCE_NOT_FOUND if page does not exist or is deleted
  - 403 FORBIDDEN if page belongs to another user

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Routes"
participant S as "Service"
participant DB as "Database"
C->>R : "GET /api/v1/pages/ : id"
R->>S : "getPageById(id)"
S->>DB : "SELECT * FROM pages WHERE id=? AND user_id=? AND is_deleted=false"
DB-->>S : "row or none"
alt found
S-->>R : "page"
R-->>C : "200 OK { data : page }"
else not found
R-->>C : "404 RESOURCE_NOT_FOUND"
end
```

**Section sources**
- [API-SPEC.md:286-327](file://api-spec/API-SPEC.md#L286-L327)

### Endpoint: PUT /api/v1/pages/:id
- Purpose: Update an existing page (partial update)
- Authentication: Required
- Path parameter: id (UUID)
- Request body fields:
  - title: string
  - content: object (TipTap JSON, whole document replacement)
  - icon: string
- Optimistic locking:
  - Client sets If-Match header with expected version
  - Server compares and increments version on success
  - On mismatch: 409 Conflict
- Response: Updated page object with incremented version and updated_at

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Routes"
participant S as "Service"
participant DB as "Database"
C->>R : "PUT /api/v1/pages/ : id { title?, content?, icon? }"
R->>S : "updatePage(id, payload, ifMatch)"
S->>DB : "SELECT version FROM pages WHERE id=?"
DB-->>S : "version"
alt version matches
S->>DB : "UPDATE pages SET title, content, icon, version=version+1, updated_at=now()"
DB-->>S : "updated row"
S-->>R : "page"
R-->>C : "200 OK { data : page }"
else mismatch
R-->>C : "409 Conflict"
end
```

**Section sources**
- [API-SPEC.md:336-381](file://api-spec/API-SPEC.md#L336-L381)

### Endpoint: DELETE /api/v1/pages/:id
- Purpose: Soft delete a page
- Authentication: Required
- Behavior:
  - Set is_deleted = true and deleted_at = now()
  - Recursively soft-delete all descendants
- Response: 204 No Content

```mermaid
flowchart TD
Start(["DELETE /api/v1/pages/:id"]) --> Load["Load page by id and user_id"]
Load --> Exists{"Exists and not deleted?"}
Exists --> |No| NotFound["Return 404 RESOURCE_NOT_FOUND"]
Exists --> |Yes| Mark["Set is_deleted=true, deleted_at=now()"]
Mark --> Cascade["Cascade soft-delete children recursively"]
Cascade --> Save["Persist changes"]
Save --> Done(["Return 204 No Content"])
```

**Section sources**
- [API-SPEC.md:383-391](file://api-spec/API-SPEC.md#L383-L391)

### Endpoint: PUT /api/v1/pages/:id/move
- Purpose: Reorganize page hierarchy and/or order
- Authentication: Required
- Request body fields:
  - parentId: string (UUID), null to move to root
  - order: integer, new position among siblings
- Validation rules:
  - Cannot move a page under itself or its descendants (no cycles)
  - parentId must belong to current user
  - order must be non-negative
- Response: Updated page object (same as GET single page)

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Routes"
participant S as "Service"
participant DB as "Database"
C->>R : "PUT /api/v1/pages/ : id/move { parentId?, order? }"
R->>S : "movePage(id, parentId, order)"
S->>DB : "Validate no cycle and user ownership"
S->>DB : "UPDATE pages SET parent_id, order, updated_at=now()"
DB-->>S : "updated row"
S-->>R : "page"
R-->>C : "200 OK { data : page }"
```

**Section sources**
- [API-SPEC.md:393-416](file://api-spec/API-SPEC.md#L393-L416)

### TipTap JSON Content Format
- Storage: JSONB column content
- Default: Empty document with type "doc" and empty content array
- Editing: Client-side TipTap editor produces this structure; server accepts full document replacement
- Search: Dedicated GIN index on content for efficient querying

```mermaid
erDiagram
PAGES {
uuid id PK
uuid user_id FK
string title
jsonb content
uuid parent_id FK
integer order
string icon
boolean is_deleted
timestamptz deleted_at
integer version
timestamptz created_at
timestamptz updated_at
}
```

**Diagram sources**
- [001_init.sql:36-55](file://db/001_init.sql#L36-L55)
- [20260319_init.ts:46-101](file://code/server/src/db/migrations/20260319_init.ts#L46-L101)

**Section sources**
- [API-SPEC.md:244-284](file://api-spec/API-SPEC.md#L244-L284)
- [API-SPEC.md:286-327](file://api-spec/API-SPEC.md#L286-L327)
- [20260319_init.ts:77-82](file://code/server/src/db/migrations/20260319_init.ts#L77-L82)

### Version Control Mechanism
- Field: integer version with default 1
- Increment: On successful update, version increments by 1
- Optimistic lock: If-Match header carries expected version; mismatch yields 409 Conflict
- Client behavior: Store maintains local updatedAt and uses version for conflict resolution

```mermaid
stateDiagram-v2
[*] --> Created : "Initial version=1"
Created --> Updated : "PUT with If-Match=current"
Updated --> Conflicted : "If-Match mismatch"
Conflicted --> Updated : "Retry with latest If-Match"
```

**Section sources**
- [API-SPEC.md:361](file://api-spec/API-SPEC.md#L361)
- [API-SPEC.md:336-381](file://api-spec/API-SPEC.md#L336-L381)
- [20260319_init.ts:56](file://code/server/src/db/migrations/20260319_init.ts#L56)

### Recursive Deletion Behavior
- Trigger: DELETE on a page cascades to all descendants
- Implementation: Foreign key with ON DELETE CASCADE on parent_id
- Effect: All child pages become soft-deleted with is_deleted=true and deleted_at set

**Section sources**
- [001_init.sql:41](file://db/001_init.sql#L41)
- [20260319_init.ts:51](file://code/server/src/db/migrations/20260319_init.ts#L51)
- [API-SPEC.md:389](file://api-spec/API-SPEC.md#L389)

## Dependency Analysis
- Client store creates pages with default content and order; relies on TipTap editor for content
- API specification defines strict schemas and validation rules
- Database enforces referential integrity, non-negative order, positive version, and cascade deletes
- Indexes support efficient listing, ordering, and search

```mermaid
graph LR
ClientStore["Client Store<br/>createPage(), updatePage()"] --> TipTap["TipTap Editor<br/>JSON content"]
ClientStore --> API["API Spec<br/>schemas & rules"]
API --> DB["Database<br/>pages table + constraints"]
DB --> Indexes["Indexes<br/>user_id, parent_id, order, search"]
```

**Diagram sources**
- [pages.ts:73-104](file://code/client/src/stores/pages.ts#L73-L104)
- [API-SPEC.md:244-284](file://api-spec/API-SPEC.md#L244-L284)
- [001_init.sql:36-55](file://db/001_init.sql#L36-L55)
- [20260319_init.ts:65-82](file://code/server/src/db/migrations/20260319_init.ts#L65-L82)

**Section sources**
- [pages.ts:73-104](file://code/client/src/stores/pages.ts#L73-L104)
- [API-SPEC.md:244-284](file://api-spec/API-SPEC.md#L244-L284)
- [001_init.sql:36-55](file://db/001_init.sql#L36-L55)
- [20260319_init.ts:65-82](file://code/server/src/db/migrations/20260319_init.ts#L65-L82)

## Performance Considerations
- Indexes:
  - Composite index on (user_id, parent_id) supports fast subtree queries
  - Composite index on (user_id, COALESCE(parent_id, ...), order) ensures O(1) sibling ordering scans
  - GIN index on content enables efficient TipTap content search
- Pagination:
  - Listing endpoints do not support pagination; use clientId-side filtering for large trees
- Soft delete:
  - Filtering by is_deleted=false in WHERE clauses leverages indexes

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- 400 Bad Request:
  - Validation errors for missing or invalid fields (parentId, order, icon, content)
- 401 Unauthorized / 403 Forbidden:
  - Missing or invalid auth token, or accessing another user’s page
- 404 Resource Not Found:
  - Page does not exist or was deleted
- 409 Conflict:
  - Optimistic lock mismatch (If-Match version mismatch)
- 422 Unprocessable Entity:
  - Business rule violations (e.g., moving under self/child, invalid order)

**Section sources**
- [API-SPEC.md:54-87](file://api-spec/API-SPEC.md#L54-L87)
- [API-SPEC.md:336-381](file://api-spec/API-SPEC.md#L336-L381)
- [API-SPEC.md:383-391](file://api-spec/API-SPEC.md#L383-L391)
- [API-SPEC.md:393-416](file://api-spec/API-SPEC.md#L393-L416)

## Conclusion
The page management endpoints in Yule Notion provide a robust foundation for hierarchical note-taking with strong validation, optimistic concurrency control, and efficient indexing. The TipTap JSON content model integrates seamlessly with PostgreSQL JSONB storage, while soft deletion and recursive behavior ensure safe data lifecycle management.