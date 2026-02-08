# ⚡ Quick Start - Do These 3 Things First

## 1. Set Up Your Database (2 minutes)

Open your terminal and run:

```

# First, update your password in .env file:
# Open .env and replace [YOUR-PASSWORD] with your Supabase password

# Then run this:
npx prisma db push
```

**What this does:** Creates all the tables in your database where surveys and responses will be stored.

---

## 2. View Your Live Website (30 seconds)

Open your browser and go to:

**https://bank-engagment-platform.vercel.app**

You should see a homepage that says "Bank Engagement Survey Platform"

---

## 3. Create a Test Admin User (2 minutes)

Run this command:

```bash
npm run db:studio
```

This opens a database editor in your browser. Then:

1. Click on **"users"** table
2. Click **"Add record"** button
3. Fill in:
   - **email**: `admin@test.com`
   - **name**: `Test Admin`
   - **role**: Type `SUPER_ADMIN`
   - Leave other fields blank
4. Click **"Save 1 change"**

---

## ✅ You're Done with Basic Setup!

**What you can do now:**

- Your platform is live on the internet
- Your database is ready to store data
- You have an admin user (though login needs to be set up)

**What's NOT working yet:**

- Login (authentication system needs configuration)
- Survey creation (Sanity CMS needs surveys added)
- Email sending (needs Resend API setup)

---

## 🎯 Next Step: Read GETTING_STARTED.md

For a complete guide on how to use everything, open the file:

**GETTING_STARTED.md**

This has detailed instructions for:

- Creating surveys
- Sending invitations
- Viewing results
- Everything else you need to know

---

**Having trouble?** Just ask - describe what you're trying to do and where you're stuck.
