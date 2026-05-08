# Greenlit — Full Deployment on Oracle Cloud Free Tier

**What you get at the end:** Live backend at `https://api.yourdomain.com` + frontend at `https://your-app.vercel.app`. Total cost: $0/month forever.

**Time to complete:** ~90 minutes (first time)

**You need:** A credit/debit card with international transactions enabled (required for Oracle signup — not charged).

---

## Quick overview of all steps

1. Oracle Cloud signup → pick Mumbai region
2. Create Ampere A1 VM (24 GB RAM, 4 cores — free)
3. Open firewall ports on Oracle
4. SSH into the VM
5. Install Python, git, nginx on the VM
6. Clone your repo + install Python packages
7. Create `.env` with your API keys
8. Set up systemd (keeps the server running forever)
9. Set up nginx (routes traffic to the app)
10. Get free HTTPS with Certbot
11. Deploy frontend to Vercel (10 min, separate)
12. Wire frontend ↔ backend together
13. Test everything

---

## Part A — Oracle Cloud setup

### Step 1 — Sign up

1. Go to **cloud.oracle.com** → click **Start for free**
2. Enter your details
3. **Region selection — pick one of these (India):**
   - `ap-mumbai-1` (India West — Mumbai)
   - `ap-hyderabad-1` (India South — Hyderabad)
   
   > Pick the one closest to you. You CANNOT change the home region later.

4. **Payment page — tips if your card gets rejected:**
   - Use a Visa or Mastercard with international transactions enabled
   - Try a credit card over a debit card
   - If rejected: use a virtual card from Niyo Global or your bank's virtual card
   - Make sure your bank allows international online transactions (SMS your bank to enable)
   - Try the "Pay As You Go" option at signup — it has fewer card restrictions
   - Nothing is charged during signup; the ₹2–₹5 hold is released within a few days

5. Complete phone verification and email confirmation
6. Wait for the welcome email — can take 5–30 minutes

---

### Step 2 — Create the VM

1. Log in to **cloud.oracle.com**
2. Click the hamburger menu (☰) → **Compute** → **Instances**
3. Click **Create instance**
4. **Name:** `greenlit-server`
5. **Placement:** Keep default (your home region + first availability domain)
6. **Image and shape — this is the most important part:**
   - Click **Change image** → select **Ubuntu** → **Ubuntu 22.04** → Confirm
   - Click **Change shape** → 
     - Shape series: **Ampere** (not AMD, not Intel)
     - Shape: **VM.Standard.A1.Flex**
     - **OCPUs:** `4`
     - **Memory:** `24 GB`
     - Click **Select shape**
   
   > This is the Always Free Ampere shape. If you see "Out of capacity", try a different availability domain — Oracle often has capacity in AD-2 or AD-3 in the same region.

7. **Networking:** Keep defaults (a new VCN will be created)
8. **Add SSH keys:**
   - If you already have an SSH key pair, click **Upload public key file** and upload your `.pub` file
   - If you don't have one, click **Save Private Key** — Oracle generates one for you. Save the downloaded `.key` file somewhere safe — you need it to SSH in.
9. **Boot volume:** 
   - Default is 50 GB — change to **200 GB** (still within free tier)
10. Click **Create**
11. Wait 2–3 minutes for status to change from **Provisioning** to **Running**
12. Copy the **Public IP address** from the instance details page — you'll use it constantly

---

### Step 3 — Open firewall ports on Oracle

Oracle has two firewall layers. You need to open both.

**Layer 1 — Security list (Oracle's cloud firewall):**

1. On your instance page, click **Subnet** in the Primary VNIC section
2. Click **Default Security List**
3. Click **Add Ingress Rules** and add these one by one:

   | Source CIDR | Protocol | Port | Description |
   |-------------|----------|------|-------------|
   | `0.0.0.0/0` | TCP | `80` | HTTP |
   | `0.0.0.0/0` | TCP | `443` | HTTPS |

   (Port 22 for SSH should already be there)

4. Click **Add Ingress Rules** to save

**Layer 2 — OS-level firewall (inside the VM) — do this after Step 4 (SSH):**

```bash
# Run these commands after you SSH in (Step 5)
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save
```

---

## Part B — Server setup via SSH

### Step 4 — Connect via SSH

**On Windows (using PowerShell or Windows Terminal):**

```powershell
# First, fix the key file permissions (required, otherwise SSH refuses it)
icacls "C:\path\to\your-key.key" /inheritance:r /grant:r "$env:USERNAME`:R"

# Then connect (replace YOUR_IP with your Oracle VM public IP)
ssh -i "C:\path\to\your-key.key" ubuntu@YOUR_IP
```

**If using PuTTY (alternative):**
- Download PuTTYgen → load the `.key` file → Save as `.ppk`
- Open PuTTY → Host: `ubuntu@YOUR_IP` → SSH → Auth → browse to `.ppk`

**If the connection hangs:** The OS firewall is still blocking. You may need to click "Console connection" in the Oracle dashboard to open a web terminal and run the iptables commands from Step 3.

You should see a prompt like `ubuntu@greenlit-server:~$` — you're in.

---

### Step 5 — Open the OS firewall (run inside the VM)

```bash
sudo apt-get install -y iptables-persistent
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save
```

---

### Step 6 — Install system packages

```bash
# Update everything first
sudo apt-get update && sudo apt-get upgrade -y

# Install Python 3.11, pip, git, nginx, and build tools
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip git nginx certbot python3-certbot-nginx build-essential

# Verify Python version
python3.11 --version
```

---

### Step 7 — Clone the repo

```bash
# Clone from your GitHub (public repo — no token needed)
git clone https://github.com/LakshyaBetala/Greenlit.git
cd Greenlit/backend

# Verify the files are there
ls
```

---

### Step 8 — Install Python dependencies

This takes 10–20 minutes because of torch and sentence-transformers.

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate it
source venv/bin/activate

# Upgrade pip first (important for ARM wheel resolution)
pip install --upgrade pip

# Install all dependencies
# The --no-cache-dir flag avoids memory issues during install
pip install -r requirements.txt --no-cache-dir
```

**If torch installation fails (ARM wheel issue):**
```bash
# Install CPU-only torch first (ARM-compatible)
pip install torch --index-url https://download.pytorch.org/whl/cpu --no-cache-dir

# Then install the rest
pip install -r requirements.txt --no-deps --no-cache-dir
pip install -r requirements.txt --no-cache-dir  # run again to get skipped deps
```

**If onnxruntime fails:**
```bash
pip install onnxruntime --no-cache-dir
```

---

### Step 9 — Create the .env file

```bash
# Still inside ~/Greenlit/backend
nano .env
```

Paste this template and fill in your values (see Part C for how to get each key):

```bash
# ── Required (get these first — server won't work without them) ──
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
JWT_SECRET=your_64_char_random_string
GEMINI_API_KEY=your_gemini_api_key

# ── URLs (update these to your actual domain or IP) ──
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://your-app.vercel.app
# If no custom domain yet, use:
# BACKEND_URL=http://YOUR_ORACLE_IP:8000
# FRONTEND_URL=http://localhost:3000

# ── Database ──
DATABASE_PATH=/home/ubuntu/Greenlit/backend/.storage/greenlit.db

# ── Optional — add when ready ──
GITHUB_TOKEN=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
GITHUB_WEBHOOK_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER_USD=
STRIPE_PRICE_BUILDER_USD=
STRIPE_PRICE_STARTER_INR=
STRIPE_PRICE_BUILDER_INR=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_PLAN_STARTER=
RAZORPAY_PLAN_BUILDER=
```

Save: `Ctrl+X` → `Y` → `Enter`

**Generate your JWT_SECRET** (run this in the VM):
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copy the output and paste it as `JWT_SECRET`.

---

### Step 10 — Test the server manually

```bash
# Make sure venv is active
source venv/bin/activate

# Run the server
python -m app.main
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test it (open a new terminal or use Ctrl+C to stop and run this):
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", "active_scans": 0}
```

If it works, stop the server with `Ctrl+C` and proceed.

---

### Step 11 — Set up systemd (keeps server running forever)

```bash
sudo nano /etc/systemd/system/greenlit.service
```

Paste this exactly:

```ini
[Unit]
Description=Greenlit Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/Greenlit/backend
ExecStart=/home/ubuntu/Greenlit/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=10
StandardOutput=append:/var/log/greenlit.log
StandardError=append:/var/log/greenlit-error.log
Environment="PATH=/home/ubuntu/Greenlit/backend/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable greenlit
sudo systemctl start greenlit

# Check it started correctly
sudo systemctl status greenlit
```

You should see `Active: active (running)`.

**Useful commands for later:**
```bash
sudo systemctl restart greenlit    # restart the backend
sudo systemctl stop greenlit       # stop it
journalctl -u greenlit -f          # watch live logs
cat /var/log/greenlit-error.log    # see errors
```

---

### Step 12 — Set up nginx

```bash
sudo nano /etc/nginx/sites-available/greenlit
```

**If you have a domain (e.g., api.greenlit.dev):**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
        proxy_connect_timeout 60;
        client_max_body_size 10M;
    }
}
```

**If no domain yet (using IP directly):**
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
        proxy_connect_timeout 60;
        client_max_body_size 10M;
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable the site and test config
sudo ln -s /etc/nginx/sites-available/greenlit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# If test passes:
sudo systemctl restart nginx
sudo systemctl enable nginx
```

Test from your local machine:
```bash
curl http://YOUR_ORACLE_IP/health
# Should return: {"status": "healthy", "active_scans": 0}
```

---

### Step 13 — HTTPS with Certbot (requires a domain)

You need a domain pointed at your Oracle IP before running this. If you don't have one yet, skip to Part D and come back.

```bash
# Get free SSL certificate from Let's Encrypt
sudo certbot --nginx -d api.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms (A)
# - Choose to redirect HTTP to HTTPS (2)

# Test auto-renewal
sudo certbot renew --dry-run
```

After certbot runs, your backend is available at `https://api.yourdomain.com`.

---

## Part C — API key setup (step by step for each key)

### Gemini API Key (free, 5 minutes)

1. Go to **aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **Create API Key**
4. Select **Create API key in new project** → click **Create API key**
5. Copy the key (starts with `AIza...`)
6. In your VM: `nano /home/ubuntu/Greenlit/backend/.env` → paste as `GEMINI_API_KEY=AIza...`
7. Restart: `sudo systemctl restart greenlit`

**Free limits:** 15 requests/minute, 1M tokens/day — plenty for launch.

---

### GitHub OAuth App (free, 10 minutes)

This enables the "Login with GitHub" button.

1. Go to **github.com/settings/developers** → click **New OAuth App**
2. Fill in:
   - **Application name:** `Greenlit`
   - **Homepage URL:** `https://your-app.vercel.app` *(use your Vercel URL from Part D)*
   - **Authorization callback URL:** `https://api.yourdomain.com/auth/github/callback`
   
   > If no domain yet: use `http://YOUR_ORACLE_IP/auth/github/callback`
   
3. Click **Register application**
4. On the next page, copy **Client ID**
5. Click **Generate a new client secret** → copy the secret (only shown once)
6. In your VM, update `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```
7. Restart: `sudo systemctl restart greenlit`

---

### GitHub Personal Access Token (for Auto-Fix PRs — optional)

1. Go to **github.com/settings/tokens** → **Generate new token (classic)**
2. Name: `Greenlit Auto-Fix`
3. Check: `repo` (full control of private repositories)
4. Set expiration: **No expiration** (or 1 year)
5. Click **Generate token** → copy it
6. In `.env`: `GITHUB_TOKEN=ghp_your_token_here`
7. Restart: `sudo systemctl restart greenlit`

---

### Resend (email alerts — optional, free)

1. Go to **resend.com** → Sign up (free)
2. Click **API Keys** → **Create API Key**
3. Name: `Greenlit`, Permission: **Sending access**
4. Copy the key
5. Go to **Domains** → **Add Domain** → add your domain (if you have one)
   - If no domain: use Resend's sandbox address `onboarding@resend.dev` for testing
6. In `.env`:
   ```
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM_EMAIL=alerts@yourdomain.com
   ```
7. Restart: `sudo systemctl restart greenlit`

---

### Stripe (payments — optional, add when ready)

**Test keys (safe to add now — no real money):**

1. Go to **dashboard.stripe.com** → sign up → verify email
2. Toggle **Test mode** on (top right)
3. Click **Developers** → **API keys**
4. Copy **Secret key** (`sk_test_...`)
5. Create products:
   - Products → **Add product** → name: `Greenlit Starter` → price: `$7.00`, recurring monthly → copy **Price ID** (`price_...`)
   - Repeat for Builder: `$29.00/month`
6. For webhook: Developers → Webhooks → Add endpoint
   - URL: `https://api.yourdomain.com/api/payments/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy **Signing secret**
7. In `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER_USD=price_...
   STRIPE_PRICE_BUILDER_USD=price_...
   ```
8. Restart: `sudo systemctl restart greenlit`

---

### Razorpay (India payments — optional)

1. Go to **dashboard.razorpay.com** → sign up
2. In test mode: Settings → **API Keys** → **Generate Key**
3. Copy `rzp_test_...` (Key ID) and the secret
4. Create plans: Subscriptions → **Plans** → **+ Add Plan**
   - Starter: ₹299/month, monthly interval → copy Plan ID (`plan_...`)
   - Builder: ₹999/month → copy Plan ID
5. In `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=your_secret
   RAZORPAY_PLAN_STARTER=plan_...
   RAZORPAY_PLAN_BUILDER=plan_...
   ```
6. Restart: `sudo systemctl restart greenlit`

---

## Part D — Frontend on Vercel (10 minutes)

1. Go to **vercel.com** → **Add New Project**
2. Import from GitHub → select `LakshyaBetala/Greenlit`
3. **Root directory:** click **Edit** → type `frontend` → click outside to confirm
4. **Framework:** Next.js (auto-detected)
5. **Environment variables** — add these:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` (or `http://YOUR_ORACLE_IP` if no domain) |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

6. Click **Deploy** → wait ~3 minutes
7. Copy your Vercel URL: `https://greenlit-xyz.vercel.app`

---

## Part E — Wire everything together

After both backend and frontend are deployed:

### 1 — Update backend FRONTEND_URL

```bash
# In your Oracle VM
nano /home/ubuntu/Greenlit/backend/.env
```

Change `FRONTEND_URL` to your actual Vercel URL:
```
FRONTEND_URL=https://greenlit-xyz.vercel.app
```

```bash
sudo systemctl restart greenlit
```

### 2 — Update GitHub OAuth App

1. Go to **github.com/settings/developers** → click your Greenlit OAuth app
2. Update:
   - **Homepage URL:** your Vercel URL
   - **Authorization callback URL:** `https://api.yourdomain.com/auth/github/callback`
3. Click **Update application**

### 3 — Update Vercel env vars (if backend URL changed)

Vercel dashboard → your project → **Settings** → **Environment Variables** → update `NEXT_PUBLIC_API_URL` → **Redeploy**

---

## Part F — Final verification

Run all of these — every one should succeed before you post publicly:

```bash
# 1. Health check
curl https://api.yourdomain.com/health
# Expected: {"status":"healthy","active_scans":0}

# 2. Demo scan (returns instantly without GEMINI key — hardcoded demo report)
curl -X POST https://api.yourdomain.com/api/repos/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/octocat/Hello-World"}'
# Expected: {"status":"processing","scan_id":"..."}

# 3. Poll the scan result (replace SCAN_ID with the one from step 2)
curl https://api.yourdomain.com/api/repos/jobs/SCAN_ID
# Expected: {"status":"complete","result":{...}}

# 4. Platform stats
curl https://api.yourdomain.com/api/repos/stats
# Expected: {"total_repos":...,"total_scans":...}

# 5. Check frontend loads
# Open https://your-app.vercel.app in browser
# Paste https://github.com/octocat/Hello-World → click Analyze
# Should complete in 45-90 seconds (real scan) or instantly (demo mode)
```

---

## Part G — Keeping it updated

When you push code changes to GitHub:

```bash
# SSH into your VM, then:
cd ~/Greenlit
git pull origin main
cd backend
source venv/bin/activate

# If requirements changed:
pip install -r requirements.txt --no-cache-dir

sudo systemctl restart greenlit
sudo systemctl status greenlit
```

For frontend updates — Vercel auto-deploys on every `git push` to main. Nothing to do.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Oracle signup card rejected | Enable international transactions on your card. Try Niyo Global virtual card. Use PAY-AS-YOU-GO option instead of Free Tier during signup. |
| "Out of capacity" on Ampere A1 | Try a different Availability Domain (AD-2 or AD-3 in the same region). Try at a different time of day. Mumbai and Hyderabad both have A1 capacity. |
| SSH connection hangs | Oracle cloud firewall is blocking. Use the web console (Oracle dashboard → Console connection) to run the iptables commands. |
| Backend service fails to start | `cat /var/log/greenlit-error.log` — usually a missing .env variable or a Python import error. |
| `ModuleNotFoundError` | venv not activated. Make sure `ExecStart` in systemd points to the venv Python path. |
| torch install fails on ARM | Run `pip install torch --index-url https://download.pytorch.org/whl/cpu --no-cache-dir` first, then the rest. |
| CORS error in browser | `FRONTEND_URL` in `.env` doesn't match the Vercel URL. Update and restart. |
| GitHub login redirects to error | OAuth callback URL in GitHub settings doesn't match `BACKEND_URL/auth/github/callback`. |
| Scan stuck in "processing" | `sudo systemctl restart greenlit` — startup hook auto-resets stuck scans. |
| Certbot fails | Domain A record not pointing to your Oracle IP yet. DNS can take up to 24 hours to propagate. |
