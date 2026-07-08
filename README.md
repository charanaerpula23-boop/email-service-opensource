# SecureMail Platform

A fully free, self-hosted secure email platform with end-to-end encryption, running on your own domain. Zero paid services — 100% open-source stack.

## ✨ Features

- **Zero-Knowledge Architecture:** The server never sees plaintext email content. Everything is encrypted and decrypted in the browser using OpenPGP.js.
- **Premium UI:** A stunning dark mode interface featuring glassmorphism, smooth micro-animations, and a highly responsive design built with Vanilla JS and CSS.
- **Self-Hosted SMTP/IMAP:** Send and receive emails directly using your own domain via Nodemailer and ImapFlow. No third-party API dependencies (like AWS SES or SendGrid).
- **Embedded Database:** Uses SQLite (`better-sqlite3`) for zero-configuration, encrypted-at-rest data storage. No heavy database servers required.
- **In-Process Queue:** Reliable email delivery and inbox syncing without the need for external tools like Redis.
- **Domain Setup Wizard:** Built-in guidance for configuring your domain's SPF, DKIM, and DMARC records to ensure optimal deliverability.

## 🚀 Tech Stack

- **Frontend:** Vite, Vanilla JavaScript, Vanilla CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite
- **Encryption:** OpenPGP.js (client-side), bcrypt (auth)

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- A registered domain name (for email routing)

### 2. Installation
Clone the repository and install dependencies for both the client and server:

```bash
git clone https://github.com/charanaerpula23-boop/email-service-opensource.git
cd email-service-opensource

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Configuration
Copy the environment template and fill in your details:

```bash
cp .env.example .env
```
Edit the `.env` file to include your JWT secrets, domain configuration, and SMTP credentials.

### 4. Running the App
You can start both the frontend and backend servers concurrently from the root directory:

```bash
npm run dev
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000`

## 🔒 Security Principles

- **End-to-End Encryption:** Email subjects and bodies are encrypted before they ever leave the client.
- **Stateless Auth:** Uses short-lived JWT access tokens and secure refresh token rotation.
- **Hardened Server:** Implements strict rate limiting, Helmet headers (CSP, HSTS), and input sanitization (DOMPurify).

## 📄 License
This project is licensed under the MIT License.
