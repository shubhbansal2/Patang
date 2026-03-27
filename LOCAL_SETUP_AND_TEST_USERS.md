# Local Setup and Test Users

## Run the Website Locally

### 1. Install dependencies

```bash
cd /Users/aarya/repo_main/backend
pnpm install

cd /Users/aarya/repo_main/frontend
pnpm install
```

### 2. Configure environment files

Backend example: [backend/.env.example](/Users/aarya/repo_main/backend/.env.example)

Frontend example: [frontend/.env.example](/Users/aarya/repo_main/frontend/.env.example)

Typical local setup:
- backend port: `5001`
- frontend dev port: `4174`
- frontend proxy target: `http://127.0.0.1:5001`

### 3. Start the backend

```bash
cd /Users/aarya/repo_main/backend
pnpm start
```

Backend runs at:
- `http://127.0.0.1:5001`

### 4. Start the frontend

```bash
cd /Users/aarya/repo_main/frontend
pnpm dev
```

Frontend runs at:
- `http://localhost:4174/`

### 5. Optional seed and repair commands

```bash
cd /Users/aarya/repo_main/backend
pnpm seed:dev
pnpm repair:cloud-data
pnpm seed:sports-caretakers
pnpm seed:dashboard-events
```

## Test Users

### Core scripted users

These are created or refreshed by `seed:dev` and `repair:cloud-data`.

| Role | Email | Password |
|---|---|---|
| Student | `student@iitk.ac.in` | `password123` |
| Caretaker | `caretaker@iitk.ac.in` | `password123` |
| Gym Admin | `gymadmin@iitk.ac.in` | `password123` |
| Executive | `executive@iitk.ac.in` | `password123` |

### Additional shared admin user

This account has been used in the shared DB setup even though it is not currently created by the repo seed scripts.

| Role | Email | Password |
|---|---|---|
| Swim Admin | `swimadmin@iitk.ac.in` | `password123` |

### Generated sports caretaker users

These are created by `pnpm seed:sports-caretakers` based on available sports facilities.

All of them use:
- password: `password123`

Current generated email pattern:
- `<sport>.caretaker@iitk.ac.in`

Common examples in this repo setup:
- `badminton.caretaker@iitk.ac.in`
- `basketball.caretaker@iitk.ac.in`
- `cricket.caretaker@iitk.ac.in`
- `football.caretaker@iitk.ac.in`
- `squash.caretaker@iitk.ac.in`
- `table.tennis.caretaker@iitk.ac.in`
- `tennis.caretaker@iitk.ac.in`

## Quick Verification

After both servers are running:

1. Open [http://localhost:4174/](http://localhost:4174/)
2. Log in with `student@iitk.ac.in / password123`
3. If needed, test admin views using `gymadmin@iitk.ac.in` or `swimadmin@iitk.ac.in`
