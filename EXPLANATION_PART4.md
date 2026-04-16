# Naughty Co. Backend Deep Dive: Part 4 - Secure Authentication & OAuth

Welcome to the fourth installment of the Naughty Co. explanation series! Now that we have a working frontend, it's the perfect time to look under the hood and see how we handle user identity securely.

## 1. The Strategy: JWT and Cookies
Instead of sending a "Token" header back and forth (which can be stolen by malicious scripts), we use **HTTP-Only Cookies**. 

When you log in, the server generates a JSON Web Token (JWT) that contains your `userId`. It then "bakes" this token into a cookie named `token`. 
*   **HttpOnly**: This flag ensures that JavaScript (even our own!) cannot read the cookie. This protects you from XSS (Cross-Site Scripting) attacks.
*   **Secure**: In production, this ensures the cookie is only sent over HTTPS.

## 2. Google OAuth 2.0 Integration
We use `passport.js` with the `google-oauth20` strategy. Here is how the "Handshake" works:

1.  **Request**: You click "Login with Google".
2.  **Redirect**: Our server sends you to Google’s secure login page.
3.  **Callback**: Once you agree, Google sends you back to our `/api/v1/auth/google/callback` with a temporary code.
4.  **Exchange**: Our server trades that code for your profile data (Email, Name, Google ID).
5.  **User Creation**: We check if you already exist in MongoDB. If not, we create a new `User` record **without a password**.
6.  **Session & Token**: We then generate a JWT for you and redirect you back to the frontend.

## 3. The `auth.middleware.js`
This is the "Bouncer" of our application. Every time you try to access a protected route (like `getMe`), this middleware runs:

```javascript
const protect = async (req, res, next) => {
  let token = req.cookies.token; // Look in the cookie jar
  
  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decrypt it
    req.user = await User.findById(decoded.id).select("-password"); // Attach user to request
    next(); // Valid! Proceed to the route
  } catch (error) {
    return res.status(401).json({ message: "Token failed" });
  }
};
```

## 4. Why no Password?
In `User.js`, we modified the `pre-save` hook to handle OAuth users:
```javascript
UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return; // Skip hashing if there is no password (OAuth)
  }
  // ... proceed with hashing for email/password users
});
```
This flexibility allows your app to support both traditional registration and modern social logins seamlessly.

---
**Next up:** Part 5 - The "One Freebie" Logic & Scam Recovery.
