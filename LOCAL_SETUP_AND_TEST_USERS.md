# Local Setup and Test Users

## Run the Website Locally

### 1. Install dependencies

Use `npm` as the team-standard package manager.

```bash
cd /Users/aarya/repo_main/backend
npm ci

cd /Users/aarya/repo_main/frontend
npm ci
```

### 2. Configure environment files

Backend example: [backend/.env.example](/Users/aarya/repo_main/backend/.env.example)

Frontend example: [frontend/.env.example](/Users/aarya/repo_main/frontend/.env.example)

Typical local setup:
- backend port: `5001`
- frontend dev port: `4174`
- frontend proxy target: `http://127.0.0.1:5001`

### 2.1 Configure MongoDB Atlas

Each teammate can use a separate MongoDB Atlas cluster.

In [backend/.env](/Users/aarya/repo_main/backend/.env), set:

```env
MONGO_URI=mongodb+srv://<db_user>:<db_password>@<cluster-host>/<db-name>?appName=<app-name>
```

Example structure:

```env
MONGO_URI=mongodb+srv://my_db_user:my_db_password@cluster0.example.mongodb.net/patang?appName=Cluster0
```

Recommended:
- use a dedicated database name like `patang`
- keep each teammate on their own cluster or DB for isolated testing
- rerun the seed commands after changing `MONGO_URI` so the new DB gets the required users and demo data

### 3. Start the backend

```bash
cd /Users/aarya/repo_main/backend
npm start
```

Backend runs at:
- `http://127.0.0.1:5001`

### 4. Start the frontend

```bash
cd /Users/aarya/repo_main/frontend
npm run dev
```

Frontend runs at:
- `http://localhost:4174/`

### 5. Run tests

Frontend:

```bash
cd /Users/aarya/repo_main/frontend
npm test
```

Backend:

```bash
cd /Users/aarya/repo_main/backend
npm test -- --pool forks
```

Note:
- Under the current Node 25 local environment, backend Vitest runs reliably with `--pool forks`.

### 6. Optional seed and repair commands

```bash
cd /Users/aarya/repo_main/backend
npm run seed:dev
npm run repair:cloud-data
npm run seed:sports-caretakers
npm run seed:dashboard-events
```

Recommended order for a fresh MongoDB setup:

```bash
cd /Users/aarya/repo_main/backend
npm run seed:dev
npm run seed:sports-caretakers
npm run seed:dashboard-events
npm run repair:cloud-data
```

## Test Users

All dedicated role accounts below are active, verified, and use:
- password: `password123`

### One dedicated account per role

| Role | Email | Mongo `_id` | Notes |
|---|---|---|---|
| Student | `student@iitk.ac.in` | `69b51a7d9bc8489f12afd866` | Primary student account for dashboard, booking, and subscriptions |
| Faculty | `faculty@iitk.ac.in` | `69b51a7d9bc8489f12afd86a` | Generic faculty account |
| Caretaker | `caretaker@iitk.ac.in` | `69b51a7d9bc8489f12afd86d` | Generic sports caretaker account |
| Captain | `captain.badminton@iitk.ac.in` | `69c6c4bff8a1bb465dcc8017` | Dedicated captain account, `captainOf = Badminton` |
| Coordinator | `coordinator@iitk.ac.in` | `69c6c4c0f8a1bb465dcc801a` | Dedicated coordinator account |
| Executive | `executive@iitk.ac.in` | `69b51a7d9bc8489f12afd870` | Executive portal account |
| Admin | `admin@iitk.ac.in` | `69b51a7e9bc8489f12afd873` | Full admin account |
| Gym Admin | `gymadmin@iitk.ac.in` | `69c57361cf993766a56dd0e9` | Gym dashboard / request review / scanner |
| Swim Admin | `swimadmin@iitk.ac.in` | `69c64a7465213dd459f6ca63` | Swimming dashboard / request review / scanner |

### Sports-specific caretaker accounts

The shared `caretaker@iitk.ac.in` account is currently assigned to all sports-related facilities in the shared DB for testing convenience. In production, caretakers would normally only be assigned to their own sport/facility scope.

Corresponding per-sport caretaker accounts also exist.

These are additionally created by `npm run seed:sports-caretakers`.

All of them use:
- password: `password123`

Common accounts in the shared DB:
- `badminton.caretaker@iitk.ac.in`
- `basketball.caretaker@iitk.ac.in`
- `cricket.caretaker@iitk.ac.in`
- `football.caretaker@iitk.ac.in`
- `squash.caretaker@iitk.ac.in`
- `table.tennis.caretaker@iitk.ac.in`
- `tennis.caretaker@iitk.ac.in`

### Notes on seeded role coverage

- The dedicated `captain` and `coordinator` accounts were seeded specifically so every role now has a known, shareable test login.
- Existing older ad-hoc users still exist in the shared DB, but the accounts listed above are the recommended ones to use for demos and testing.

## Quick Verification

After both servers are running:

1. Open [http://localhost:4174/](http://localhost:4174/)
2. Log in with `student@iitk.ac.in / password123`
3. For admin workflows, use `gymadmin@iitk.ac.in` or `swimadmin@iitk.ac.in`
4. For executive workflows, use `executive@iitk.ac.in`
5. For captain workflows, use `captain.badminton@iitk.ac.in`
