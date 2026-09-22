# SmartCampus ITCare — Academic Viva Presentation & Project Demo Guide

This guide prepares the project team for the final-year project viva examination and live demonstration.

---

## 1. Project Pitch (30-Second Summary for Evaluators)
> *"SmartCampus ITCare is a full-stack MERN & Socket.IO IT Support Management System built to replace informal email/call IT requests in universities with a centralized, SLA-monitored, real-time ticketing platform. It provides role-based workflows for Students, IT Staff, and Administrators, automated SLA escalation, a self-service knowledge base, and post-resolution CSAT feedback analytics."*

---

## 2. Live Demo Script (Step-by-Step Viva Walkthrough)

### Step 1: User Ticket Submission (`teststudent@smartcampus.edu`)
1. Log in as Student. Show the User Dashboard with personal ticket stats.
2. Click **"New Ticket"**. Submit a ticket for Wi-Fi or Software issue with priority `HIGH`.
3. Highlight auto-generated ticket ID (e.g. `IT-2026-00003`) and computed SLA deadline.

### Step 2: Real-Time Notification & Staff Assignment (`ravi.itstaff@smartcampus.edu`)
1. Log in as IT Support Staff on a separate browser window.
2. Show **Available Tickets Queue**. Click **"Self Assign"**.
3. Point out the real-time Socket.IO notification bell badge ringing on the Student's screen!

### Step 3: Ticket Resolution & Internal Remarks
1. As IT Staff, update status to `IN_PROGRESS` -> add internal investigation note -> update status to `RESOLVED` with resolution details.

### Step 4: Post-Resolution 5-Star CSAT Feedback
1. On the Student screen, open the resolved ticket.
2. Show the **Resolution Rating Modal** popping up. Select 5 stars, leave a comment, and submit.

### Step 5: SLA Engine & Admin System Analytics (`admin@smartcampus.edu`)
1. Log in as System Administrator.
2. Navigate to **"SLA Engine"** (`/admin/sla`). Show SLA target configurator (Response & Resolution target hours) and CSAT satisfaction score metrics (`100%`).
3. Show System Stats dashboard, user management, and department management.

---

## 3. Frequently Asked Viva Questions (Q&A)

**Q1: How do you handle real-time notifications?**  
*A: We use Socket.IO over WebSockets. Users automatically join targeted rooms on connection (`user:<id>`, `role:it_staff`, `role:admin`). When ticket status or assignments change, events are broadcast directly to these rooms without requiring manual page refresh.*

**Q2: How does the SLA Tracking & Escalation Engine work?**  
*A: SLA deadlines (`slaDueDate`) are computed upon ticket creation based on priority settings. A background cron job (`slaMonitor.js`) runs periodically to detect tickets within 1 hour of breach, issues Socket warnings, and automatically flags or force-escalates overdue tickets to CRITICAL priority.*

**Q3: How is security handled in authentication?**  
*A: Passwords are hashed using `bcryptjs` with salt factor 10. Access to protected routes requires a signed JSON Web Token (JWT) sent via standard HTTP Authorization Bearer headers, verified by role-based middleware (`authorize('admin', 'it_staff')`).*
