# Worklio — Collaborative Project Management

Worklio is a full-stack, real-time project management platform built in the style of Jira/Trello. Teams can organize work into Workspaces → Boards → Lists → Cards, run agile sprints, assign issues, track progress, and collaborate in real time — all from a single dark-themed, glassmorphism UI.

---

## Explaining This to an Interviewer (with Demo)

> *This section is written as a spoken walkthrough — the kind of explanation you'd give while screen-sharing the live app. Read it like you're talking, not presenting slides.*

---

### The 30-Second Pitch

"So I built Worklio — it's essentially a production-grade clone of Jira and Trello combined. The reason I built it is because I wanted to go beyond a typical CRUD app and actually solve some of the hard problems you hit in real collaborative software — things like real-time sync across multiple users, optimistic UI for drag-and-drop, and horizontal scaling using a pub/sub message broker. Let me show you how it works and then walk you through the architecture."

---

### Demo Walkthrough — What to Show and What to Say

#### 1. Login Page
*Open the app and show the login screen.*

"First thing you'll notice is the custom auth page — I deliberately designed it to not look like a template. The left side has a 3D-perspective mini kanban board that's built entirely with CSS transforms. The right side is a frosted glass card. No UI library — all of this is Tailwind with custom keyframe animations I defined in the config.

Authentication is JWT-based. On login the server signs a 7-day token, the frontend stores it in Redux and attaches it as a Bearer header on every Axios request via an interceptor."

---

#### 2. Dashboard
*Log in and land on the Dashboard.*

"This is the home screen. You can see the greeting changes based on the time of day — that's a small touch but it makes the app feel alive. The four stats at the top — Workspaces, Boards, Members, Starred — are all clickable. Clicking Members opens a modal listing every unique user across all your workspaces. Clicking Workspaces or Boards smooth-scrolls you to the relevant section below.

The workspace cards down here have a coloured left border that's unique per workspace — I compute that from the workspace name's char code so it's deterministic, no colour stored in the database.

Each board card shows a live mini kanban preview — three frosted columns with card bars — so you can see what the board looks like before opening it. That preview is the same component used in the Create Board modal, so it's consistent."

---

#### 3. Creating a Board
*Click '+ Board' on any workspace.*

"The Create Board modal has a theme picker. Each option is a fully rendered mini board preview — not just a colour swatch. You're actually seeing a tiny kanban with column headers and white card blocks rendered inside the gradient. The whole modal is scrollable — the preview banner at the top is pinned, and the form section below scrolls independently. When you pick a theme, the gradient CSS string gets saved directly to MongoDB as the board's `background` field, and then applied anywhere the board appears via `style={{ background: board.background }}`."

---

#### 4. The Board — Drag and Drop
*Open a board with some cards.*

"This is the core of the app. Lists are columns, cards are tasks. Drag and drop is powered by `@dnd-kit` — I chose it over `react-beautiful-dnd` because it has better accessibility support and isn't deprecated.

The drag is **optimistic** — when you pick up a card and drop it, the UI updates instantly without waiting for the server. In the background a `PATCH /boards/:id/move-card` request fires. If it fails, we have a rollback path. This makes the experience feel instant even on a slow connection.

Every card has a left border whose colour represents its priority — red for urgent, orange for high, yellow for medium, green for low. You can see the card type badge (Bug, Feature, Task, Epic) and a mini progress bar."

---

#### 5. Real-time Collaboration
*Open the same board in two browser windows side-by-side.*

"Here's where it gets interesting. If I move this card in the left window — watch the right window."

*Drag a card.*

"It moved on both screens simultaneously. That's Socket.io. When the card move API call succeeds, the server emits a `card:moved` event to the `board:<id>` room. Every client in that room receives it and updates their local Redux state.

Now here's the architecture question you might ask: what if I'm running two backend instances behind a load balancer? Socket.io rooms are in-memory per process, so users on different instances can't receive each other's events. I solve this with **Redis pub/sub**. Every `broadcast()` call publishes to a Redis channel called `trello:board-events`. All backend instances subscribe to that channel and re-emit to their local rooms. The payload includes the originating process's PID so the source instance doesn't double-deliver."

---

#### 6. Card Detail Panel
*Click on a card.*

"The card detail opens as a slide-in panel from the right — rendered via a React Portal at `document.body` so it's never clipped by any parent's `overflow: hidden`. It's not a modal, it's a full-height drawer.

Let me walk through what a card holds:

- **Title** — click anywhere on it to edit inline
- **Type and Priority** — dropdown selectors, saved to the DB immediately on change
- **Progress** — that ring chart is a raw SVG with a `stroke-dasharray` that I animate on value change. You can click anywhere on the bar to set the percentage, or use the quick-pick buttons.
- **Pipeline strip** — those steps at the top represent the board's lists. You can click any step to move the card to that list directly.
- **Assignees** — pulls from workspace members, dispatches a POST to `/cards/:id/assignees`
- **Checklists** — sub-tasks with completion tracking
- **Linked Issues** — search and link other cards on the same board as dependencies
- **Sprint History** — every time a card is moved between sprints, it's logged here with who moved it, when, and a comment
- **Comments** — real-time, with a typing indicator"

---

#### 7. Sprint Management
*Open Sprint Manager from the board header.*

"Sprints live per board. You create a sprint with a title, goal, and date range. When you start a sprint, a banner appears at the top of the board showing the sprint name and a live countdown to the end date. Cards can be assigned to a sprint from the card detail panel.

When you complete a sprint, unfinished cards stay in the backlog — same as how Jira handles it. The sprint moves to `completed` status and a history record is written on each card that was in it."

---

#### 8. Notifications
*Click the bell icon.*

"The notification panel slides in from the right — also a portal. Notifications are generated server-side for events like being assigned to a card, receiving a comment, or being added to a workspace. They're pushed to the client over the socket room `user:<userId>`, which every connected user joins on login, so notifications arrive in real time without polling.

The panel splits notifications into Unread and Earlier sections. Clicking one marks it read, navigates to the linked resource, and closes the panel."

---

### Architecture Questions You Might Get

**Q: Why MongoDB and not PostgreSQL?**

"The card schema has several embedded arrays — checklists, labels, attachments, sprint history — that change shape frequently during development. MongoDB's document model meant I could iterate on the schema without migrations. In production, for a project management tool where reads are heavily document-centric (load a board → get all lists and cards), a document store actually maps well. If I needed complex reporting or billing, I'd add PostgreSQL for that specific slice."

**Q: Why Redux Toolkit instead of React Query / SWR?**

"Real-time apps have a different data model than request-response apps. React Query is brilliant for server state syncing via polling or cache invalidation, but here the server pushes updates via Socket.io. I need fine-grained control over how incoming socket events mutate specific slices of state — for example, a `card:moved` event needs to remove the card from one list's array and insert it into another's, preserving order. Redux Toolkit's reducers give me that control cleanly. React Query would fight me there."

**Q: How do you handle optimistic updates and rollback?**

"When a card is dragged, `moveCardOptimistic` dispatches immediately and updates the `lists` array in the board slice in memory. The API call fires in parallel. If the API fails, I'd dispatch a `revertCardMove` action with the original positions. The user sees the move succeed instantly; only if the network is down does it snap back."

**Q: How does the drag-and-drop actually track position order?**

"Each card has a `position` field — a float. When you drag a card between two others, the new position is calculated as the average of the two surrounding positions `(posA + posB) / 2`. This avoids renumbering every card in the list on every move. On the backend, `PATCH /lists/:id/reorder-cards` persists the final order."

**Q: What would you do differently at scale?**

"A few things. First, the board's GET endpoint returns the entire board + all lists + all cards in a single query — fine for small boards, but a board with 500 cards needs pagination or cursor-based loading per list. Second, file uploads go to local disk right now — I'd move that to S3 with pre-signed URLs so uploads don't touch the API server. Third, I'd add database indexes on `card.board`, `card.list`, `card.assignees`, and `card.sprint` — those are the most common query filters. Fourth, the Redis pub/sub currently has no message durability — if an instance goes down mid-broadcast, events are lost. I'd evaluate Redis Streams for at-least-once delivery."

---

### What This Project Demonstrates

| Skill | Where it shows |
|---|---|
| Full-stack architecture | Separate Express API + React SPA, connected by REST + WebSocket |
| Real-time systems | Socket.io rooms, Redis pub/sub, multi-instance awareness |
| State management | Redux Toolkit with optimistic updates and socket-driven mutations |
| Drag and drop | @dnd-kit with position arithmetic and cross-list moves |
| Database modeling | Embedded documents vs references, trade-off decisions |
| Authentication | JWT with middleware, token injection via Axios interceptor |
| UI engineering | Custom Tailwind animations, glassmorphism, CSS portal rendering |
| DevOps basics | Docker Compose orchestrating 4 services |
| Scalability thinking | Redis bridge, stateless backend, identified pagination gaps |

---

## What the Project Does

| Capability | Details |
|---|---|
| Kanban boards | Drag-and-drop cards across lists; lists auto-reorder by position |
| Agile sprints | Create sprints per board, start/complete them, move cards between sprints |
| Rich card detail | Title, description, priority, type, story points, progress %, due date, start date, assignees, labels, checklists, attachments, linked issues, sprint history, comments |
| Real-time sync | Every card move, edit, and comment is pushed to all connected users via Socket.io |
| Workspaces | Group boards into workspaces; invite members with admin / member / viewer roles |
| Notifications | In-app notifications for assignments, comments, due dates, and invites |
| File uploads | Attach files to cards; served as static assets from the backend |
| My Day panel | Personal daily focus view |
| Team view | See all cards grouped by assignee across a board |
| Activity log | Every board action is logged and viewable per card |

---

## Tech Stack

### Frontend (`/frontend`)
```
React 18          — UI framework
Vite              — dev server & build tool
Redux Toolkit     — global state (auth, board, workspaces, sprints, notifications)
React Router v6   — client-side routing
@dnd-kit          — drag-and-drop for cards and lists
Tailwind CSS v3   — utility-first styling with custom animations
Socket.io-client  — real-time event subscription
date-fns          — date formatting and comparison
lucide-react      — icon library
react-hot-toast   — toast notifications
```

### Backend (`/backend`)
```
Node.js + Express — HTTP server and REST API
Socket.io         — WebSocket server for real-time events
MongoDB + Mongoose — primary data store
Redis             — pub/sub channel for multi-instance Socket.io broadcasting
JWT               — stateless authentication (7-day tokens)
Multer            — file upload middleware
Nodemailer        — transactional email (invite, due-date reminders)
```

### Infrastructure
```
Docker Compose    — orchestrates MongoDB, Redis, backend, and frontend
```

---

## Data Model

```
User
 └── belongs to many Workspaces (via members array)

Workspace
 ├── owner: User
 ├── members: [{ user: User, role: admin|member|viewer }]
 └── has many Boards

Board
 ├── workspace: Workspace
 ├── background: CSS string (gradient)
 ├── members: [User]
 ├── starred: [User]
 └── has many Lists

List
 ├── board: Board
 ├── position: Number (sort order)
 └── has many Cards

Card
 ├── list: List
 ├── board: Board
 ├── position: Number
 ├── priority: urgent | high | medium | low
 ├── cardType: task | bug | feature | improvement | epic
 ├── storyPoints, progress (0-100), startDate, dueDate
 ├── assignees: [User]
 ├── labels: [{ color, text }]
 ├── checklists: [{ title, items: [{ text, completed }] }]
 ├── attachments: [{ filename, url, size, uploadedBy }]
 ├── dependencies: [Card]       ← linked issues
 ├── sprint: Sprint
 ├── sprintHistory: [{ sprintTitle, movedAt, comment, movedBy }]
 └── createdBy: User

Sprint
 ├── board: Board
 ├── status: planning | active | completed
 └── startDate, endDate, goal

Comment
 ├── card: Card
 ├── author: User
 └── text

Activity
 ├── board: Board, card: Card, user: User
 ├── type: card_created | card_moved | comment_added | ...
 └── data: {}

Notification
 ├── recipient: User, sender: User
 ├── type: assignment | comment | due_date | member_added | board_invite | mention
 ├── message: String
 └── link: String   ← e.g. /board/:id
```

---

## API Routes

All routes are prefixed with `/api`.

```
POST   /auth/register          Create account
POST   /auth/login             Login → returns JWT
GET    /auth/me                Get current user from token

GET    /workspaces             List user's workspaces
POST   /workspaces             Create workspace
PUT    /workspaces/:id         Update name/description
DELETE /workspaces/:id         Delete workspace
POST   /workspaces/:id/members Invite member
DELETE /workspaces/:id/members/:userId  Remove member

POST   /boards                 Create board (requires workspaceId, background)
GET    /boards/:id             Get board + all lists + all cards
PUT    /boards/:id             Update title / background
DELETE /boards/:id             Delete board and all its data
POST   /boards/:id/star        Toggle star for current user
PATCH  /boards/:id/reorder-lists  Persist list order after drag
PATCH  /boards/:id/move-card   Move card between lists

GET    /workspaces/:id/boards  List boards in a workspace

POST   /lists                  Create list
PUT    /lists/:id              Rename list
DELETE /lists/:id              Archive list
PATCH  /lists/:id/reorder-cards Persist card order after drag

POST   /cards                  Create card
GET    /cards/:id              Get card details
PUT    /cards/:id              Update any card fields
DELETE /cards/:id              Archive card
POST   /cards/:id/assignees    Assign user
DELETE /cards/:id/assignees/:userId  Unassign
POST   /cards/:id/checklists   Add checklist
PUT    /cards/:id/checklists/:clId  Update checklist
DELETE /cards/:id/checklists/:clId  Remove checklist
PATCH  /cards/:id/checklists/:clId/items/:itemId  Toggle checklist item

GET    /cards/:id/comments     Get comments
POST   /cards/:id/comments     Add comment
DELETE /cards/:id/comments/:commentId  Delete comment

GET    /notifications          List (max 50, newest first)
PATCH  /notifications/:id/read Mark one read
PATCH  /notifications/read-all Mark all read
DELETE /notifications/:id      Delete

POST   /uploads/card/:id       Attach file to card (multipart/form-data)
DELETE /uploads/card/:id/:fileId  Remove attachment

GET    /sprints?boardId=       List sprints for a board
POST   /sprints                Create sprint
PUT    /sprints/:id            Update sprint
PATCH  /sprints/:id/start      Start sprint (sets status → active)
PATCH  /sprints/:id/complete   Complete sprint
DELETE /sprints/:id            Delete sprint
POST   /sprints/:id/move-card  Move a card into/out of a sprint
```

---

## Real-time Events (Socket.io)

The client connects with its JWT in `socket.handshake.auth.token`. After authentication the server verifies the token and attaches the `User` document to the socket.

### Rooms
| Room | Joined when |
|---|---|
| `user:<userId>` | On every connection (personal notifications) |
| `board:<boardId>` | Client emits `board:join` when opening a board |

### Events the server emits
| Event | Payload | Trigger |
|---|---|---|
| `card:created` | card object | New card added |
| `card:updated` | card object | Any card field changed |
| `card:deleted` | `{ cardId, listId }` | Card archived |
| `card:moved` | `{ cardId, sourceListId, targetListId, position }` | Drag-drop or Move Sprint |
| `list:created` | list object | New list added |
| `list:updated` | list object | List renamed |
| `list:deleted` | `{ listId }` | List archived |
| `list:reordered` | `{ boardId, listOrders }` | Lists dragged |
| `board:updated` | `{ board }` | Board title/background changed |
| `comment:created` | comment object | Comment posted |
| `comment:deleted` | `{ commentId }` | Comment removed |
| `card:typing` | `{ user, cardId }` | User typing in comment box |
| `card:stop-typing` | `{ userId, cardId }` | User stopped typing |
| `user:joined` | `{ user, boardId }` | Someone opens a board |
| `user:left` | `{ userId, boardId }` | Someone leaves a board |
| `notification:new` | notification object | Any notification created |

### Events the client emits
| Event | Payload |
|---|---|
| `board:join` | `boardId` |
| `board:leave` | `boardId` |
| `card:typing` | `{ cardId, boardId }` |
| `card:stop-typing` | `{ cardId, boardId }` |

### Redis pub/sub
When multiple backend instances run (horizontal scaling), Socket.io rooms only exist per-process. Redis acts as a message broker: every `broadcast()` call publishes to the `trello:board-events` channel so all instances relay the event to their local clients. The `sourceId` (process PID) prevents double-delivery on the originating instance.

---

## Frontend State (Redux)

```
store
 ├── auth          { user, token, initialized }
 ├── board         { board, lists, activeCard, loading }
 ├── workspaces    { list[], boards{}, loading }
 ├── sprints       { sprints[], loading }
 └── notifications { list[], unreadCount, loading }
```

Key slices:

- **boardSlice** — holds the active board's full state (lists + embedded cards). Receives Socket.io events via `useEffect` listeners in `BoardPage.jsx` and dispatches optimistic updates for drag-drop.
- **workspaceSlice** — fetches workspaces on login and lazily loads boards per workspace. `starBoard` thunk updates the nested `starred[]` array in-place.
- **sprintSlice** — CRUD for sprints; `moveCardToSprint` mutates both the sprint and card state.
- **notificationSlice** — `addNotification` reducer is called by the socket listener; panel reads this state directly.

---

## Page & Component Map

```
/login               Login.jsx        Dark canvas auth, 3-D kanban preview, JWT login
/register            Register.jsx     Same canvas, perk tiles + testimonial, JWT register
/dashboard           Dashboard.jsx    Hero stats, starred boards, workspace grids,
                                      create board/workspace modals, notification panel
/board/:id           BoardPage.jsx    Full kanban; dnd-kit drag engine; sprint banner;
                                      team view; socket listener
/workspace/:id       WorkspacePage.jsx  Members, boards, settings for one workspace

Components
  Board/Board.jsx          DnDContext wrapper, list renderer
  Board/List.jsx           Column with droppable card area + AddCard
  Board/Card.jsx           Kanban card tile (priority stripe, mini meta, drag handle)
  Card/CardModal.jsx       Full-height slide-in detail panel (all card fields)
  Card/CardComments.jsx    Comment thread + typing indicator
  Card/CardChecklist.jsx   Checklist with item toggling
  Board/CreateBoardModal.jsx  Theme picker (mini board previews) + title + workspace
  Sprint/SprintBanner.jsx  Active sprint countdown ribbon on board
  Sprint/SprintManager.jsx Sprint CRUD drawer
  Notifications/NotificationPanel.jsx  Portal-based slide-in notification drawer
  MyDay/MyDayPanel.jsx     Personal task focus panel
  Board/TeamView.jsx       Cards grouped by assignee
  Workspace/WorkspaceSettings.jsx  Member management, role changes
```

---

## User Flow

```
1. Register / Login
   └── JWT stored in Redux (persisted via redux-persist or localStorage)

2. Dashboard
   ├── Create a Workspace (name + description)
   ├── Create a Board inside a workspace (pick a theme/gradient)
   └── Click a board card → navigate to /board/:id

3. Board Page
   ├── Board loads via GET /boards/:id (returns board + lists + cards in one call)
   ├── Socket joins room board:<id>
   ├── Drag card between lists → optimistic move + PATCH /boards/:id/move-card
   ├── Drag lists → PATCH /boards/:id/reorder-lists
   ├── Add list → POST /lists
   ├── Add card → POST /cards
   └── Click card → CardModal opens

4. Card Modal
   ├── Edit title (inline textarea)
   ├── Set priority, type, story points, progress
   ├── Set due date / start date
   ├── Assign team members
   ├── Add labels, checklists, attachments
   ├── Link dependent issues
   ├── View / add comments (live typing indicator)
   ├── Move to a sprint or back to backlog
   └── View sprint history timeline

5. Sprints
   ├── Open Sprint Manager → create sprint with goal + dates
   ├── Start sprint → SprintBanner appears with countdown
   ├── Move cards into sprint via card detail panel
   └── Complete sprint → cards without "Done" status stay in backlog

6. Notifications
   ├── Created server-side on: assignment, comment, due-date warning, invite
   ├── Pushed to client via socket room user:<id>
   └── Panel shows unread / earlier sections; click navigates to the relevant board/card

7. Real-time collaboration
   └── Any team member's card edits, moves, and comments appear instantly
       for all other users on the same board without a page refresh
```

---

## Running Locally

### With Docker (recommended)
```bash
docker-compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
# MongoDB:  localhost:27017
# Redis:    localhost:6379
```

### Without Docker
```bash
# 1. Start MongoDB and Redis locally

# 2. Backend
cd backend
cp .env.example .env          # fill in MONGODB_URI, REDIS_URL, JWT_SECRET
npm install
npm run dev                   # nodemon on port 5000

# 3. Frontend
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:5000
npm install
npm run dev                   # Vite on port 5173
```

### Environment Variables
```
Backend (.env)
  MONGODB_URI      mongodb://localhost:27017/trello-clone
  REDIS_URL        redis://localhost:6379
  JWT_SECRET       any long random string
  JWT_EXPIRES_IN   7d
  CLIENT_URL       http://localhost:5173
  EMAIL_HOST       smtp server (optional)
  EMAIL_PORT       587
  EMAIL_USER       smtp user (optional)
  EMAIL_PASS       smtp password (optional)

Frontend (.env)
  VITE_API_URL     http://localhost:5000
  VITE_SOCKET_URL  http://localhost:5000
```

---

## Project Structure

```
Worklio/
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── index.js              Express + Socket.io entry point
│       ├── config/
│       │   ├── db.js             Mongoose connection
│       │   └── redis.js          Redis client factory
│       ├── middleware/
│       │   ├── auth.js           JWT verify middleware
│       │   └── upload.js         Multer disk storage
│       ├── models/               Mongoose schemas (User, Workspace, Board,
│       │                         List, Card, Sprint, Comment, Activity, Notification)
│       ├── routes/               Express routers (one file per model)
│       ├── services/
│       │   ├── activity.js       logActivity() helper
│       │   ├── notification.js   createNotification() helper
│       │   └── email.js          Nodemailer wrapper
│       └── socket/
│           └── index.js          Socket.io auth middleware + event handlers + Redis bridge
│
└── frontend/
    ├── index.html
    ├── tailwind.config.js        Custom colors (primary), shadows, animations
    ├── vite.config.js
    └── src/
        ├── main.jsx              React root, Redux Provider, Router, Toaster
        ├── App.jsx               Route definitions + auth init
        ├── api/
        │   └── axios.js          Axios instance (baseURL + JWT header injection)
        ├── store/
        │   ├── index.js          Redux store setup
        │   └── slices/           authSlice, boardSlice, workspaceSlice,
        │                         sprintSlice, notificationSlice
        ├── pages/
        │   ├── Login.jsx         Dark canvas login
        │   ├── Register.jsx      Dark canvas register
        │   ├── Dashboard.jsx     Home with stats, workspaces, boards
        │   ├── BoardPage.jsx     Kanban view with socket listeners
        │   └── WorkspacePage.jsx Workspace detail + member management
        └── components/
            ├── Layout/           Navbar, ProtectedRoute
            ├── Board/            Board, List, Card, AddList, AddCard,
            │                     CreateBoardModal, TeamView
            ├── Card/             CardModal, CardComments, CardChecklist
            ├── Sprint/           SprintBanner, SprintManager
            ├── Notifications/    NotificationPanel
            ├── MyDay/            MyDayPanel
            └── Workspace/        WorkspaceSettings
```
