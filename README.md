# PRISM - Public Relations Intelligence System for Media

PRISM is a comprehensive PR agency management platform that connects agencies with their clients for media opportunity management, real-time Q&A chat, and workflow automation.

## Features

### Agency Portal
- **Dashboard** - Overview of opportunities, client responses, and action items
- **Opportunity Management** - Create, assign, and track media opportunities
- **Client Management** - Manage client profiles and assignments
- **Action Items Queue** - Unified queue for escalated chats and restore requests
- **Real-time Chat** - Respond to client questions about opportunities

### Client Portal
- **Opportunity Dashboard** - View and respond to media opportunities
- **Q&A Chat** - Ask questions about opportunities with AI-assisted responses
- **Status Management** - Accept, decline, or express interest in opportunities
- **Unread Indicators** - See when agency has responded to questions

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Auth**: JWT with refresh tokens
- **Language**: TypeScript

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: React hooks
- **Language**: TypeScript

## Project Structure

```
prism/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── db/             # Schema, migrations, seeds
│   │   ├── middleware/     # Auth, tenancy middleware
│   │   ├── modules/        # Feature modules (auth, chat, etc.)
│   │   └── server.ts       # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   ├── components/     # React components
│   │   └── lib/            # API client, hooks, types
│   └── package.json
└── docs/                   # Documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (or Neon account)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ayishagisel/prism.git
   cd prism
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database URL and secrets
   npm run db:push
   npm run seed
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your API URL
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Agency Admin | amore@applesandorangespr.com | throne123 |
| Client (Glow Up) | ceo@glowup.com | shine123 |
| Client (The Cut) | founder@thecut.com | style123 |

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-64-chars-minimum
JWT_EXPIRY=7d
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment (Railway)

PRISM is designed for easy deployment on Railway:

### 1. Create Railway Project
- Go to https://railway.app
- Create new project from GitHub repo
- Select the `figma-driven-build` branch

### 2. Add Backend Service
- Click "New Service" → "GitHub Repo"
- Set **Root Directory**: `backend`
- Add environment variables (see above)
- Railway auto-detects build/start commands

### 3. Add Frontend Service
- Click "New Service" → "GitHub Repo"
- Set **Root Directory**: `frontend`
- Add `NEXT_PUBLIC_API_URL` pointing to backend URL

### 4. Generate Domains
- Settings → Domains → Generate Domain for each service

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Opportunities
- `GET /api/opportunities` - List opportunities
- `POST /api/opportunities` - Create opportunity
- `GET /api/opportunities/:id` - Get opportunity
- `PUT /api/opportunities/:id` - Update opportunity

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id/opportunities` - Get client opportunities

### Chat
- `POST /api/chat/:opportunityId/message` - Send message
- `GET /api/chat/:opportunityId/messages` - Get messages
- `GET /api/chat/unread-counts` - Get unread counts
- `POST /api/chat/:opportunityId/escalate` - Escalate to agency

## License

Private - All rights reserved.
