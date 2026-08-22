# Crew

**Every workday, perfectly aligned.**

Crew started as a simple idea: HR tools shouldn’t feel heavy, broken, or stuck in 2012.

So we built an HRMS that actually helps people get through the workday — check in, apply for leave, see payroll, and let admins approve things without chasing spreadsheets.

This is **Crew**.

---

## Why we built this

Most HR systems are either:

- too complex for a small team, or  
- too basic to trust in a real demo

We wanted something in between.

Something modern.  
Something that works online *and* offline.  
Something where an employee dashboard and an admin dashboard actually feel different.

That’s Crew.

---

## What Crew can do

### For employees
- Log in with a company Login ID  
- Check in / check out  
- Apply for leave (with real balance checks)  
- See their own attendance history  
- View payroll breakdown  

### For HR / Admin
- See all employees  
- Approve or reject leave requests  
- Spot attendance risks (people who are often late or absent)  
- Review corrections  
- Track payroll anomalies  
- Read audit logs for important actions  

No clutter. Just the flows that matter in a real office.

---

## The stack (kept practical)

We didn’t add tech for the sake of it.

- **Next.js 15** — app + API in one place  
- **PostgreSQL + Prisma** — real database, real relations  
- **JWT + bcrypt** — simple, controllable auth  
- **Zod** — validation on the way in  
- **Docker** — so the whole thing can run locally without depending on the cloud  

If the internet drops during a demo, Crew can still run on a local Postgres container.

That mattered to us.

---

## Features we’re proud of

### 1. Leave that doesn’t lie
When someone applies for leave, Crew checks:
- overlapping dates  
- remaining balance  
- leave type  

Low-risk 1-day requests can even auto-approve.  
Everything else goes to HR.

### 2. Attendance with context
Not just present/absent.

Admins can open risk view and immediately see:
- who’s frequently late  
- who has high absences  

Useful in a demo. Useful in real life too.

### 3. Payroll connected to reality
Payroll isn’t a static number.

It looks at attendance, working days, and salary structure — then calculates what should actually be paid.

### 4. Offline mode
Run this with Docker:

```bash
docker-compose up -d
```

Same schema. Same app. No cloud required after setup.

---

## Run it yourself

### Quick local setup

```bash
git clone https://github.com/RAMANABOYANA-UK/Crew.git
cd Crew
npm install
cp .env.example .env.local
```

Put this in `.env.local` for local mode:

```env
JWT_SECRET=any-long-random-string
DATABASE_URL="postgresql://dayflow:dayflow123@localhost:5432/dayflow?schema=public"
```

Then:

```bash
docker-compose up -d
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Seeded demo world

The seed script creates a small company:

- one Admin  
- one HR  
- several employees across Engineering, Design, Marketing, Finance, Sales  

With attendance history, leave requests, and payroll data already there.

So you don’t demo an empty app.

> Temporary passwords are set in `prisma/seed.ts`.  
> First login may ask for a password change — that’s intentional.

---

## How auth works

We removed third-party auth complexity and kept it direct:

1. Admin/HR provisions the employee  
2. Employee logs in with Login ID + password  
3. Server returns a JWT in an HTTP-only cookie  
4. Protected routes use `requireAuth()` / `requireAdmin()`

Public self-signup is disabled on purpose.  
In real companies, HR creates accounts — not strangers on the internet.

---

## API map (short version)

| Area | What it covers |
|------|----------------|
| `/api/auth/*` | login, logout, me, change-password |
| `/api/profile` | view + update profile |
| `/api/employees` | directory + employee details |
| `/api/attendance/*` | check-in/out, history, risk, corrections |
| `/api/leave/*` | apply, list, approve/reject |
| `/api/payroll/*` | payslip, config, anomalies |
| `/api/notifications` | in-app notifications |
| `/api/analytics/*` | overview + summaries |
| `/api/audit` | immutable activity log |

Every response follows one shape:

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

Because consistency saves everyone time.

---

## Roles, simply

**Employee**  
Does their own work: attendance, leave, profile, own payroll.

**HR**  
Handles people operations: approvals, employee list, risk signals.

**Admin**  
Full control: config, audit, anomalies, system-level actions.

---

## Scripts you’ll actually use

```bash
npm run dev      # start developing
npm run seed     # fill the database
npm run test     # backend checks
npm run build    # production build
```

---

## Deploying

Crew deploys cleanly on Vercel.

You’ll need:
- a cloud Postgres URL  
- `JWT_SECRET`  
- `DATABASE_URL`

After deploy, run schema push + seed against the cloud database once.

---

## A good demo path

If you’re showing this in 3–4 minutes:

1. Login as employee  
2. Check in  
3. Apply leave  
4. Switch to admin  
5. Approve leave  
6. Show attendance risk  
7. Open payroll  
8. Mention offline Docker support  

That’s the whole story.

---

## What’s next

Possible improvements we’re thinking about:
- payslip PDF download  
- better notification center UI  
- tighter mobile layout  
- more polished admin insights  

But the core is already solid: real auth, real database, real workflows.

---



## Final note

Crew isn’t trying to be “every HR feature ever.”

It’s trying to be the HR system you’d actually use on a Monday morning.

That’s the goal.
