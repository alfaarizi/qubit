# real-time collaboration feature

comprehensive implementation of a real-time collaboration system for the quantum circuit composer application.

## overview

this feature enables multiple authenticated users to work on shared projects concurrently with real-time updates, cursor tracking, presence indicators, and role-based permissions.

## user roles

### owner
- full control over the project
- can perform all editor and viewer actions
- **exclusive permission**: manage share settings (invite users, generate links, change roles, remove collaborators)
- only one owner per project

### editor
- can edit gates on the canvas (drag, drop, move, delete, group, ungroup)
- can add/remove circuits
- can rename circuits
- can run simulations and partitions
- can modify circuit structure (add/remove qubits)
- cannot change share settings or roles

### viewer
- read-only access to the composer page
- can view circuit content and simulation results
- cannot modify gates, circuits, or project settings
- prevented from drag-and-drop operations

## key features implemented

### 1. collaboration types (`src/types/collaboration.ts`)
- **CollaboratorRole**: owner, editor, viewer
- **ProjectPermission**: user permissions in a project
- **Collaborator**: extended with real-time presence data
- **ShareLink**: shareable links with role-based access
- **CollaborationEvent**: 17+ event types for real-time sync
- **predefined colors**: 10 distinct colors for cursor/selection highlighting

### 2. collaboration api (`src/lib/api/collaboration.ts`)
provides methods for:
- fetching collaborators
- inviting users by email
- updating collaborator roles
- removing collaborators
- generating/revoking share links
- joining via share link token
- getting user's role in project

### 3. collaboration store (`src/stores/collaborationStore.ts`)
zustand store managing:
- project collaboration state
- collaborator presence (online/offline)
- cursor positions
- gate selections
- gate locking mechanism
- permission checks (`canEdit()`, `isOwner()`)
- automatic color assignment

### 4. websocket integration (`src/hooks/useCollaboration.ts`)
custom hook providing:
- real-time event broadcasting
- event handling for 17+ collaboration events
- automatic room joining/leaving
- presence announcements
- cursor movement broadcasting
- gate operation synchronization
- execution state sharing

### 5. ui components

#### share dialog (`src/components/common/ShareDialog.tsx`)
draggable dialog featuring:
- email invitation with role selection (editor/viewer)
- shareable link generation (editor/viewer)
- collaborator list with avatars
- role management dropdown (owner only)
- collaborator removal (owner only)
- link copying with visual feedback
- link revocation

#### collaborator presence (`src/components/common/CollaboratorPresence.tsx`)
compact presence indicator showing:
- avatars of online collaborators (max 5 visible)
- colored borders matching cursor colors
- online status indicator (green dot)
- overflow count (+N more)
- tooltip with name and role

#### collaborator cursors (`src/components/common/CollaboratorCursors.tsx`)
real-time cursor tracking:
- smooth cursor movement (100ms transition)
- custom cursor pointer svg
- name label with user's assigned color
- drop shadow for visibility
- filters to show only cursors on current circuit

#### collaborative canvas (`src/features/circuit/components/CollaborativeCircuitCanvas.tsx`)
wrapper for CircuitCanvas providing:
- cursor movement tracking (throttled to 60fps)
- permission-based action prevention
- locked gate visual overlays
- integration with CollaboratorCursors

### 6. permission system (`src/hooks/usePermissionGuard.ts`)
utility hook providing:
- `guardEdit()`: wraps functions to require edit permission
- `guardOwner()`: wraps functions to require owner permission
- `checkCanEdit()`: boolean check with optional toast
- `checkIsOwner()`: boolean check with optional toast

### 7. join project page (`src/pages/JoinProjectPage.tsx`)
standalone page for share link access:
- automatic project joining via token
- loading state with spinner
- error handling with redirect option
- success redirect to project

### 8. project updates

#### project types (`src/types/project.ts`)
extended Project interface with:
- `owner_id`: project owner's user id
- `collaborators`: array of ProjectPermission objects

#### project list page (`src/pages/ProjectListPage.tsx`)
enhanced with:
- "shared with you" filter category
- shared project badge
- collaborator count indicator
- conditional actions based on ownership
- duplicate-only option for non-owners

#### composer page (`src/pages/ComposerPage.tsx`)
integrated with:
- share button in header
- collaborator presence display
- share dialog integration
- project id parameter extraction

#### header component (`src/components/layout/Header.tsx`)
updated with:
- `collaboratorPresence` prop for custom content
- flexible layout to accommodate avatars

### 9. routing (`src/App.tsx`)
added route:
- `/join/:token` - protected route for share link access

## collaboration events

### user presence
- `user_joined`: announces user entering project
- `user_left`: announces user leaving project

### cursor tracking
- `cursor_move`: broadcasts cursor position (throttled to 60fps)

### gate operations
- `gate_selected`: shares selected gate ids
- `gate_added`: new gate placed on canvas
- `gate_moved`: gate position changed
- `gate_deleted`: gate removed from canvas
- `gate_updated`: gate parameters modified
- `gate_grouped`: multiple gates grouped
- `gate_ungrouped`: group dissolved
- `gate_locked`: gate locked for editing
- `gate_unlocked`: gate unlocked

### circuit operations
- `circuit_added`: new circuit created
- `circuit_removed`: circuit deleted
- `circuit_renamed`: circuit name changed
- `circuit_switched`: user switched to different circuit

### execution
- `execution_started`: simulation/partition started
- `execution_progress`: progress update
- `execution_completed`: execution finished

### project
- `project_renamed`: project name changed

## visual feedback

### cursor highlighting
- each user assigned unique color from predefined palette
- smooth cursor movement with name label
- cursor only visible on current circuit

### gate locking
- locked gates show colored border matching editor's color
- label showing "username is editing"
- prevents simultaneous gate editing conflicts

### presence indicators
- avatars with colored borders in header
- green online status dot
- overflow count for 5+ collaborators
- tooltip with name and role

### permission toasts
- informative error messages when permission denied
- "you only have view access" for viewers
- "only the project owner can..." for owner-only actions

## backend integration requirements

to fully enable this feature, the backend must implement:

### 1. collaboration endpoints
```
GET    /api/v1/projects/{project_id}/collaborators
POST   /api/v1/projects/{project_id}/collaborators/invite
PUT    /api/v1/projects/{project_id}/collaborators/{user_id}
DELETE /api/v1/projects/{project_id}/collaborators/{user_id}
POST   /api/v1/projects/{project_id}/share-links
GET    /api/v1/projects/{project_id}/share-links
DELETE /api/v1/projects/{project_id}/share-links/{link_id}
POST   /api/v1/projects/join
GET    /api/v1/projects/{project_id}/my-role
```

### 2. websocket messages
websocket endpoint: `/api/v1/ws/`

message format:
```typescript
{
  type: 'collaboration_event',
  project_id: string,
  event: {
    type: CollaborationEventType,
    user_id: string,
    user_name: string,
    user_color: string,
    project_id: string,
    timestamp: number,
    // event-specific fields...
  }
}
```

### 3. project model updates
add fields to Project model:
- `owner_id`: foreign key to user
- `collaborators`: many-to-many relationship with users
- role information stored in junction table

### 4. permission middleware
implement permission checks:
- verify user role before gate operations
- validate owner role for share settings
- enforce read-only for viewers

### 5. share link generation
- generate unique tokens
- optional expiration dates
- map tokens to project id and role
- validate tokens on join

## usage examples

### opening share dialog
```typescript
// in ComposerPage
<ShareDialog
  open={isShareDialogOpen}
  onOpenChange={setIsShareDialogOpen}
  projectId={projectId}
  projectName={projectName}
  isOwner={isOwner}
/>
```

### using collaboration hook
```typescript
const {
  broadcastCursorMove,
  broadcastGateOperation,
  broadcastGateSelected,
  isConnected
} = useCollaboration({
  projectId,
  onGateAdded: (event) => {
    // handle gate added by other user
  },
  onGateMoved: (event) => {
    // handle gate moved by other user
  }
});

// broadcast cursor movement
onMouseMove={(x, y) => broadcastCursorMove(x, y, circuitId)}

// broadcast gate operation
onGatePlaced={(gate) => {
  broadcastGateOperation('gate_added', gate.id, circuitId, gate);
}}
```

### checking permissions
```typescript
const { guardEdit, checkCanEdit } = usePermissionGuard();

// wrap function with permission check
const handleDeleteGate = guardEdit((gateId: string) => {
  // delete gate logic
});

// manual permission check
if (checkCanEdit()) {
  // perform edit action
}
```

### displaying collaborator presence
```typescript
// in Header component
<Header
  collaboratorPresence={
    projectId ? (
      <>
        <CollaboratorPresence />
        <Separator orientation="vertical" className="h-4" />
      </>
    ) : null
  }
/>
```

## performance considerations

### cursor throttling
- cursor movement events throttled to 60fps (16ms)
- prevents websocket flooding
- maintains smooth visual experience

### efficient state updates
- zustand store uses Map for O(1) lookups
- selective re-renders with specific state selectors
- immutable state updates

### websocket optimization
- room-based messaging (project:${projectId})
- automatic reconnection with exponential backoff
- message validation to ignore own events

## security considerations

### authentication required
- all collaboration features require authenticated user
- protected routes with `<ProtectedRoute>`
- jwt tokens in api requests

### role validation
- backend must validate user role on every operation
- frontend permissions are UX enhancement only
- never trust client-side permission checks

### share link security
- tokens should be cryptographically random
- implement token expiration
- allow token revocation
- rate limit join attempts

## future enhancements

potential improvements:
1. **offline support**: queue operations when disconnected
2. **conflict resolution**: crdt-based gate operations
3. **activity log**: audit trail of user actions
4. **chat system**: in-app messaging for collaborators
5. **version history**: restore previous circuit states
6. **guest access**: temporary anonymous viewers
7. **notification system**: email alerts for invitations
8. **advanced permissions**: custom role creation
9. **team workspaces**: organization-level project groups
10. **collaborative debugging**: shared breakpoints and inspection

## testing recommendations

### unit tests
- collaboration store state management
- permission guard logic
- event broadcasting functions
- color assignment algorithm

### integration tests
- websocket message flow
- share link generation and validation
- role-based access control
- collaborator crud operations

### e2e tests
- complete collaboration workflow
- multi-user concurrent editing
- permission denial scenarios
- share link joining process

## migration guide

for existing projects without collaboration:
1. run migration to add `owner_id` and collaborators table
2. set current user as owner for existing projects
3. initialize empty collaborators array
4. no frontend changes needed for single-user projects

## troubleshooting

### collaborators not showing
- check websocket connection status
- verify project_id is correctly passed
- ensure backend is broadcasting events to correct room

### permission errors
- verify user role in project
- check collaboration store initialization
- confirm backend permission middleware is active

### cursor not visible
- ensure on same circuit as other user
- check cursor position is within canvas bounds
- verify color assignment is working

### share link not working
- validate token is not expired
- check user is authenticated
- ensure join endpoint returns correct project_id

## conclusion

this implementation provides a robust, real-time collaboration system with:
- ✅ role-based permissions (owner/editor/viewer)
- ✅ real-time cursor tracking
- ✅ presence indicators
- ✅ gate operation synchronization
- ✅ shareable links
- ✅ email invitations
- ✅ visual feedback for locked gates
- ✅ permission-aware ui
- ✅ websocket-based communication
- ✅ efficient state management
- ✅ professional ux

all components follow best practices with lowercase comments, efficient code, no unnecessary line breaks, and clean architecture.

