# 📚 PaceLab LMS  

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)  
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)  
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)  
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-DB-4169E1?logo=postgresql)  
![Redis](https://img.shields.io/badge/Redis-Cache-D92D2A?logo=redis)  
![Docker](https://img.shields.io/badge/Docker-Production-2496ED?logo=docker)  
![License: MIT](https://img.shields.io/badge/License-MIT-green)  

*A production-ready, white-label Learning Management System built for modern education.*  

---

## 🚀 Overview  

**PaceLab LMS** is a scalable, secure, and white-label **Learning Management System (LMS)**.  
It provides **Admin-controlled user creation**, **YouTube video integration**, **real-time chat**, and **comprehensive course management**—built with **Next.js, NestJS, Prisma, and Redis**.  

Built for **educational institutions, academies, and corporate training platforms**.  

---

## ✨ Features  

### 🔑 Core  
- 👤 **Admin-only user creation** (No public signup)  
- 🔐 **Role-based authentication** (Admin, Instructor, Student)  
- 🎥 **YouTube video integration** with custom player controls  
- 💬 **Real-time chat & Q&A** (Socket.IO + Redis)  
- 📊 **Progress tracking & analytics** (watch time, completion, reports)  
- 🎨 **White-label branding** (logo, colors, emails, domain)  

### ⚙️ Tech Highlights  
- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui + Framer Motion  
- **Backend:** NestJS + PostgreSQL (Prisma ORM) + Redis + Socket.IO  
- **Auth:** JWT (access + refresh) with HttpOnly cookies  
- **Video:** YouTube API sync + custom progress tracking  
- **Infra:** Docker-based, production-ready configuration  

---

## 🏗️ Architecture  

```bash
pacelab-lms/
├── app/              # Next.js frontend (App Router)
│   ├── (auth)/       # Auth pages
│   ├── (admin)/      # Admin dashboard
│   ├── (student)/    # Student UI
│   └── course/[id]/  # Course player
├── apps/api/         # NestJS backend
│   ├── src/modules/  # Features (users, courses, progress, chat)
│   └── prisma/       # DB schema & migrations
├── components/       # Shared UI components
└── lib/              # Configs & utilities
```

---

## 🚦 Quick Start  

### 🔧 Prerequisites  
- Node.js 18+  
- Docker & Docker Compose  
- PostgreSQL & Redis (or run via Docker)  

### 🐳 Start with Docker  
```bash
git clone <repo-url>
cd pacelab-lms
cp .env.local.example .env.local
docker-compose up -d
```

- Frontend → http://localhost:3000  
- API Docs → http://localhost:3001/api/docs  

---

## 👤 Default Accounts  

```txt
Admin → admin@pacelab.in / password123  
Student → student@example.com / password123
```

---

## 🎯 Key Workflows  

### 🛠 Admin Dashboard  
- Manage **users, roles, and courses**  
- Organize **modules/lessons with YouTube videos**  
- Track **analytics & reports**  

### 🎓 Student Experience  
- Clean UI with **course grid + progress indicators**  
- **Custom YouTube player** with progress sync  
- **Live Q&A chat** for lessons  

---

## ⚙️ Configuration  

### Environment Variables  
```env
# Branding
BRAND_NAME=PaceLab LMS
BRAND_OWNER=Coxdo Solutions
NEXT_PUBLIC_PRIMARY_COLOR=#000000

# YouTube API
YOUTUBE_API_KEY=xxxx
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Database & Cache
DATABASE_URL=postgresql://user:pass@localhost:5432/pacelab_lms
REDIS_URL=redis://localhost:6379

# JWT Security
JWT_SECRET=your-secret
JWT_EXPIRES=15m
REFRESH_EXPIRES=7d
```

---

## 📊 Database Schema  

```sql
Users (id, email, name, role, status)
Courses (id, title, description, thumbnail, isActive)
Modules (id, title, order, courseId)
Lessons (id, title, type, content, duration, moduleId)
Enrollments (userId, courseId, expiresAt)
Progress (userId, lessonId, currentTime, completed)
Chats (id, content, userId, lessonId, parentId)
```

---

## 🔒 Security  

- ✅ JWT + HttpOnly cookies (refresh + access)  
- ✅ RBAC (Admin, Instructor, Student)  
- ✅ Input validation + SQL injection prevention  
- ✅ Redis session management  

---

## 📈 Analytics  

- 📊 **User metrics:** Active users, completion rates  
- 🎥 **Course insights:** Enrollment, drop-offs  
- ⏱ **Video analytics:** Watch time, engagement  
- ⚡ **System reports:** Usage & performance  

---

## 🚀 Deployment  

### Production with Docker Compose  
```bash
cp .env.production.example .env.production
docker-compose -f docker-compose.prod.yml up -d
```

- Supports **SSL with Let’s Encrypt**  
- Cloud options: **AWS / GCP / Azure / DigitalOcean**  

---

## 🤝 Contributing  

```bash
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
```

PRs welcome 🚀  

---

## 📄 License  

MIT License © [Coxdo Solutions](https://www.coxdo.in)  

---
