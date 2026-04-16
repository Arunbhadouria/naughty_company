# Naughty Co. Backend Deep Dive: Part 5 - Freemium Gating & Scan Recovery

In this part, we explore the "One Freebie" system—a classic "Product-Led Growth" strategy implemented in your backend logic.

## 1. The Gatekeeper (`usage.middleware.js`)
We wanted a system where any user can perform **one scan for free**, but must register for the second one. To do this without forcing people to log in immediately, we use **Anonymous Tracking**.

### How it works:
1.  **Incoming Request**: A user hits `/api/v1/analyze`.
2.  **Cookie Check**: The middleware looks for a cookie called `naughty_freebie_used`.
3.  **The Block**: If the cookie is present, it returns a `403 Forbidden` with a code `LOGIN_REQUIRED`.
4.  **First-Time Pass**: If no cookie exists, it lets the request through but **intercepts the response**.

```javascript
const originalJson = res.json;
res.json = function (data) {
  if (data.success) {
    // Drop the "Used" anchor
    res.cookie("naughty_freebie_used", "true", { ...options });
    
    // Store the query results temporarily so we can "gift" them to the user later
    res.cookie("pending_scan_data", JSON.stringify({ query: req.body.query }), { ...options });
  }
  return originalJson.call(this, data); // Send original data to the user
};
```

## 2. Scan Recovery (The "Magic" Link)
Have you ever used a site that "remembers" what you were doing after you sign up? That's what we built in `auth.controller.js`.

When a user registers or logs in, we check the `pending_scan_data` cookie:
1.  **Extraction**: We parse the query the user just searched for.
2.  **Re-Analysis**: We run the analysis again (or look it up) to get the results.
3.  **Persistence**: We push that result directly into the new user's `scanHistory` in MongoDB.
4.  **Cleanup**: We clear the "Pending" cookies.

**Result**: The user feels like your app is "smart" because their first anonymous scan is already waiting for them in their history!

## 3. Why Cookies and not LocalStorage?
Since our gatekeeping logic happens on the **Server**, the server needs to know about the user's status *before* the code even runs. Cookies are the only storage mechanism sent automatically by the browser with every HTTP request, making them perfect for "Middlewares".

---
**Next up:** Part 6 - Building the "Cyber-Noir" Frontend with React.
