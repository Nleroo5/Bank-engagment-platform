# Getting Started Guide
## Bank Engagement Survey Platform

This guide will walk you through everything you need to know to use your survey platform.

---

## 📱 What This Platform Does

Your platform allows you to:
1. **Create surveys** for bank employees
2. **Send survey links** via email to employees
3. **Collect responses** through unique, secure links
4. **View results** in charts and reports
5. **Export data** to Excel or PDF

---

## 🌐 Accessing Your Platform

**Your live website:** https://bank-engagment-platform.vercel.app

**Three ways to access:**
1. **Homepage** - https://bank-engagment-platform.vercel.app/
2. **Admin Login** - https://bank-engagment-platform.vercel.app/admin/login
3. **Survey Link** - Unique link sent to each employee (example: `/s/abc123`)

---

## 🏗️ Setup Steps (Do Once)

### Step 1: Set Up Your Database

The database stores all your surveys, responses, and user information.

**On your computer, run these commands:**

```bash
# 1. Go to your project folder
cd ~/Desktop/Bank-engagment-platform

# 2. Update your .env file with your Supabase password
# Open .env and replace [YOUR-PASSWORD] with your actual password

# 3. Create database tables
npx prisma db push

# 4. (Optional) Add test data
npm run db:seed
```

**What this does:**
- Creates all the database tables your platform needs
- Optionally adds some test organizations and users

---

### Step 2: Set Up Sanity (Survey Content Manager)

Sanity is where you'll create and manage your survey questions.

**To access Sanity:**
1. Go to https://sanity.io/manage
2. Log in with your Sanity account
3. Click on your project (ID: `4z8cbios`)

**What you need to do in Sanity:**
- Upload your survey schemas (the questions and structure)
- Create your first survey
- Add questions to the survey

*Note: For now, your surveys are stored in the `sanity/schemas/` folder in your project. You'll need to configure Sanity Studio to manage them through a web interface.*

---

### Step 3: Create Your First Admin User

You need an admin account to log in and manage surveys.

**Option A: Using Prisma Studio (Easiest)**

```bash
# 1. Open Prisma Studio
npm run db:studio

# 2. In your browser (opens automatically):
#    - Click "User" table
#    - Click "Add record"
#    - Fill in:
#      - email: your-email@example.com
#      - name: Your Name
#      - role: SUPER_ADMIN
#      - passwordHash: (leave blank for now - we'll add login separately)
#    - Click "Save 1 change"
```

**Option B: Using SQL (Advanced)**

Run this in Supabase dashboard → SQL Editor:

```sql
INSERT INTO users (id, email, name, role)
VALUES (
  gen_random_uuid(),
  'admin@yourbank.com',
  'Admin User',
  'SUPER_ADMIN'
);
```

---

## 🚀 Using Your Platform

### How to Create a Survey Campaign

1. **Log in to Admin Dashboard**
   - Go to https://bank-engagment-platform.vercel.app/admin/login
   - (You'll need to set up authentication first)

2. **Create a Campaign**
   - Click "Campaigns" in the sidebar
   - Click "New Campaign"
   - Fill in:
     - Survey: Choose from your Sanity surveys
     - Organization: Select the bank/organization
     - Start Date: When to begin
     - End Date: When to close the survey
   - Click "Create"

3. **Add Respondents**
   - In your campaign, click "Add Respondents"
   - Upload a CSV of employee emails OR
   - Add employees one by one

4. **Send Invitations**
   - Click "Send Invitations"
   - Emails will be sent to all respondents
   - Each email contains a unique survey link

---

### How Employees Take Surveys

1. **They receive an email** with a unique link like:
   ```
   https://bank-engagment-platform.vercel.app/s/abc123-unique-token
   ```

2. **Click the link** - Opens the survey directly (no login required)

3. **Answer questions** - Progress is saved automatically

4. **Submit** - Responses are stored securely

5. **Get confirmation** - Thank you page appears

---

### How to View Results

1. **Go to Reports**
   - Admin Dashboard → Reports
   - Select your campaign

2. **View Charts and Statistics**
   - Overall response rate
   - Score breakdowns by category
   - Charts showing trends
   - Demographic comparisons

3. **Export Data**
   - Click "Export to Excel" for spreadsheets
   - Click "Export to PDF" for reports
   - Downloads start automatically

---

## 🔐 Important Security Notes

1. **Survey Links**
   - Each link works only once
   - Links expire after the campaign end date
   - Links cannot be shared (tied to specific employee)

2. **Anonymous Surveys**
   - Associate 180 surveys (Survey 7) are always anonymous
   - Individual responses are never shown
   - Reports require minimum 5 respondents

3. **Admin Access**
   - Only SUPER_ADMIN and ORG_ADMIN can create campaigns
   - VIEWER role can only see reports
   - RESPONDENT role can only take surveys

---

## 🆘 Common Issues & Solutions

### "Can't log in"
- Make sure you created an admin user (Step 3)
- Check that your email is correct
- Password functionality may need to be set up

### "Survey link doesn't work"
- Check if the campaign is ACTIVE
- Make sure the link hasn't been used already
- Verify the campaign hasn't expired

### "No data showing in reports"
- At least one person must complete the survey
- For anonymous surveys, need minimum 5 respondents
- Check that campaign status is not DRAFT

### "Can't create surveys in Sanity"
- Schemas need to be uploaded to your Sanity project
- You may need to deploy Sanity Studio first
- Check that API token has Editor permissions

---

## 📞 Next Steps

**To make your platform fully functional:**

1. ✅ Database is set up (you did this in Step 1)
2. ⏳ Set up authentication (login system)
3. ⏳ Configure Sanity Studio to manage surveys
4. ⏳ Add your survey questions to Sanity
5. ⏳ Set up email sending (Resend API)
6. ⏳ Create test campaign
7. ⏳ Send test survey to yourself

---

## 📚 Helpful Commands

```bash
# Start your local development server
npm run dev
# Visit: http://localhost:3000

# Open database manager
npm run db:studio

# View your data
# Visit: http://localhost:5555

# Run tests
npm test

# Format code
npm run format
```

---

## 🔗 Important Links

- **Your Live Site**: https://bank-engagment-platform.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Database**: https://supabase.com/dashboard
- **Sanity CMS**: https://sanity.io/manage

---

**Need more help?** Check the DEPLOYMENT_SUMMARY.md file or ask for specific instructions on any step above.
