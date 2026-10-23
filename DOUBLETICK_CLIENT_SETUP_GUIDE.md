# 📱 Quick Guide: How to Get Your WhatsApp (DoubleTick) API Key
*A simple, step-by-step guide for non-technical users (Zero coding required)*

---

## 📌 Summary: What We Need From You
To connect WhatsApp automation with your CRM system, we only need **2 things**:
1. **DoubleTick API Key** (A secret code from your DoubleTick dashboard)
2. **Your Registered WhatsApp Business Mobile Number** (e.g., `+91 98765 43210`)

---

## 🗺️ Step-by-Step Flowchart

```
┌────────────────────────────────────────────────────────┐
│  STEP 1: Log in to DoubleTick                          │
│  👉 Visit https://web.doubletick.io                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 2: Open Developer Settings                       │
│  👉 Click Settings (⚙️) on bottom-left                  │
│  👉 Click "Developer API"                              │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 3: Copy Your API Key                             │
│  👉 Click "Generate New Key" or "Copy"                 │
│  👉 Looks like: key_live_abc12345...                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 4: Share With Our Technical Team                 │
│  👉 Send the key + your WhatsApp number                │
│  🎉 All Done! We handle the rest.                      │
└────────────────────────────────────────────────────────┘
```

---

## 📝 Detailed Steps (Click-by-Click)

### Step 1: Log in to DoubleTick
1. Open Google Chrome or any browser on your computer.
2. Go to: **[https://web.doubletick.io](https://web.doubletick.io)**
3. Log in with your registered phone number / email and OTP.

---

### Step 2: Navigate to Developer API
1. Look at the **bottom-left corner** of your DoubleTick screen.
2. Click on the **Settings (⚙️ Gear Icon)**.
3. In the menu that opens, click on **Developer API** (or API Settings).
   > 💡 *Direct shortcut link:* You can also directly click this link after logging in:  
   > 👉 **[https://web.doubletick.io/v1/settings/developer-api](https://web.doubletick.io/v1/settings/developer-api)**

---

### Step 3: Copy Your API Key
1. On the Developer API page, you will see a box labeled **API Key** or **Authentication Token**.
2. If the box is empty, click the blue button that says **"Generate API Key"**.
3. Click the **"Copy"** button next to the key.
   - It will look like a long random string of letters and numbers (for example: `dt_live_89f3a92b0c1...`).

---

### Step 4: Send It to Us
Just copy and paste the key and your mobile number in our WhatsApp chat or email:

```text
DoubleTick API Key: [Paste your copied key here]
WhatsApp Business Number: +91 [Your business phone number]
```

---

## 🔔 Optional: Webhook URL (For Real-Time Delivery Status & Inbound Replies)

If you want the CRM to automatically show when a client **Reads** or **Replies** to your WhatsApp messages:
1. In DoubleTick, go to **Settings** → **Webhooks** (`https://web.doubletick.io/v1/settings/webhooks`).
2. Click **Add Webhook** / **Edit Webhook**.
3. In **Webhook URL**, paste:
   ```
   https://YOUR-CRM-DOMAIN.com/api/whatsapp/webhook
   ```
4. Select all event checkboxes:
   - ✅ Message Sent
   - ✅ Message Delivered
   - ✅ Message Read
   - ✅ Incoming Message / Customer Reply
5. Click **Save**.

---

## 💬 What About Message Templates?

Meta/WhatsApp requires pre-approval for automated business messages (like payment reminders and invoice alerts). 

In DoubleTick, go to **Templates** → **Create/Manage Templates** and ensure you have these 3 simple templates ready (or our team can submit them for you):

1. **`payment_reminder_advance_10pct`** (Category: *Marketing / Utility*)
   - *Message Text:*  
     `Namaste {{1}}, thank you for choosing APS Enterprise. Please clear the pending advance payment of Rs. {{2}} to start factory production. Payment link: {{3}}`
2. **`order_booking_confirmation`** (Category: *Utility*)
   - *Message Text:*  
     `Namaste {{1}}, your order for {{2}} has been confirmed and transferred to our production line. Order ID: {{3}}.`
3. **`dispatch_tracking_alert`** (Category: *Utility*)
   - *Message Text:*  
     `Namaste {{1}}, your machinery batch has been dispatched via {{2}}. Tracking Docket No: {{3}}. Dispatch date: {{4}}.`

---

## ❓ Frequently Asked Questions (FAQ)

### Q1: Will my personal WhatsApp chat be affected?
**No.** DoubleTick works only on your official WhatsApp Business number and operates via official cloud servers. Your personal WhatsApp is 100% separate.

### Q2: Is any technical coding required from my side?
**Zero.** You only have to copy the API Key from the screen and send it to our team. Our engineers connect everything in the backend.

### Q3: What if I don't see "Developer API" in DoubleTick?
Make sure you are logged in using an **Admin** or **Owner** account on DoubleTick. Only account owners have access to the API keys.
