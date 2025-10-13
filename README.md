# Multi-Service Marketplace: Delivery & Ride Booking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-%23E0234E.svg?&style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react-native&logoColor=61DAFB)](https://reactnative.dev/)
[![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A full multi-service marketplace connecting customers, vendors, and riders.
It supports food, groceries, and general goods delivery, plus ride bookings.
Includes three mobile apps, two web apps, and one backend API.

Built for scalability, speed, and maintainability.

---

## 🚀 Features

### Mobile Applications (Expo)

#### Customer App

- Authentication via email, phone, or social login
- Location-based vendor discovery
- Menu browsing and filtering
- Cart, checkout, and multiple payment options (Paystack)
- Real-time order tracking and ride booking
- Push notifications and order history
- Ratings, reviews, and profile management

#### Vendor App

- Authentication and verification
- Store setup and management
- Product and order management
- Sales analytics dashboard
- Withdrawals and notifications

#### Rider App

- Authentication and onboarding
- Live order and ride assignments
- Navigation with optimized routing
- Trip summaries and earnings
- Online/offline status and notifications

### Web Applications (Next.js)

#### Customer Web App

- All key features of the customer mobile app
- Fully responsive

#### Customer Care Web App

- Manage customers, vendors, and riders
- Handle orders, disputes, and withdrawals
- Approve new vendors and riders
- View analytics and reports
- Manage categories and products

### Integrations

- Google Maps for geolocation and routing
- Firebase Cloud Messaging for push notifications
- Paystack for secure payments and withdrawals
- Termii SMS for delivery and ride updates
- WebSockets (Socket.io) for real-time data sync

---

## 🛠 Technology Stack

- **Mobile**: React Native (Expo)
- **Web**: Next.js
- **Backend**: NestJS
- **Database**: PostgreSQL (AWS RDS)
- **Storage**: AWS S3
- **Hosting**:
  - Backend on AWS EC2
  - Web apps on Vercel

- **Payments**: Paystack
- **Real-time**: Socket.io
- **Queueing**: Bull (Redis)
- **Security**: JWT, RBAC, bcrypt, AES-256 encryption

---

## 📁 Folder Structure

```
multi-service-marketplace/
│
├── apps/
│   ├── vendor-app/           # Vendor mobile app (Expo)
│   ├── customer-app/         # Customer mobile app (Expo)
│   └── rider-app/            # Rider mobile app (Expo)
│
├── web/
│   ├── customer-web-app/     # Customer web app (Next.js)
│   └── customer-care-app/    # Customer support/admin web app (Next.js)
│
├── backend/                  # NestJS backend
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── orders/
│   │   ├── vendors/
│   │   ├── riders/
│   │   ├── payments/
│   │   ├── admin/
│   │   └── notifications/
│   ├── migrations/
│   └── package.json
│
├── .github/
│   └── workflows/            # CI/CD for web and backend
│
├── turbo.json
├── package.json
└── yarn.lock
```

---

## 🏗 Development Stages & Timeline

| Phase                    | Description                        | Duration    |
| ------------------------ | ---------------------------------- | ----------- |
| 1. Planning & Wireframes | Requirements, flow mapping         | 1 week      |
| 2. UI/UX Design          | Mockups and design system          | 1 week      |
| 3. Frontend Development  | Expo and Next.js apps              | 3 weeks     |
| 4. Backend Development   | NestJS, DB, APIs, payments         | 2 weeks     |
| 5. Integrations          | Maps, Paystack, Firebase, AWS      | -           |
| 6. Testing & QA          | Functional and performance tests   | 1 week      |
| 7. Deployment            | Play Store, App Store, AWS, Vercel | 1 week      |
| 8. Documentation         | Reports, docs, management          | -           |
| 9. Designer Fee          | External designer                  | -           |
| **Total**                |                                    | **8 weeks** |

---

## 👥 Team

**Enoch (Full-stack Developer)**

- Backend (NestJS)
- Database and API design
- Integrations and deployment
- Admin web app

**Paul (Frontend Developer)**

- React Native (Expo) apps
- Next.js web apps
- API integration and performance

**UI/UX Designer**

- Wireframes and mockups
- Design system

---

## 🔒 Security

### Backend

- JWT and RBAC for access control
- Bcrypt password hashing
- Input validation and sanitization
- HTTPS-only and CORS restrictions
- AES-256 encryption for sensitive data
- Logs and alerts for suspicious activity
- Paystack integration with PCI compliance
- AWS RDS restricted access and encrypted backups

### Frontend

- Secure token storage
- HttpOnly cookies and SSL pinning
- Session timeouts and forced logouts
- Input sanitization and XSS protection

### Infrastructure

- AWS VPC and IAM least-privilege
- HTTPS enforced everywhere
- DDoS and WAF protection
- MFA for admin dashboard
- Version-controlled deployments

### Maintenance

- Monthly OWASP scans
- Dependency audits
- Access log reviews
- Scheduled code reviews

---

## 📦 Deliverables

- Three Expo apps (Customer, Vendor, Rider)
- Two Next.js web apps (Customer, Customer Care)
- One NestJS backend
- PostgreSQL database
- Full technical documentation
- Production deployment

---

## 🛠 Quick Start (Development)

1. **Clone**

   ```
   git clone https://github.com/yourusername/multi-service-marketplace.git
   cd multi-service-marketplace
   ```

2. **Install dependencies**

   ```
   yarn install
   ```

3. **Backend**

   ```
   cd backend
   cp .env.example .env
   yarn migration:run
   yarn start:dev
   ```

4. **Mobile (Example: Customer App)**

   ```
   cd ../apps/customer-app
   yarn
   yarn start
   ```

5. **Web (Example: Customer Web App)**

   ```
   cd ../../web/customer-web-app
   yarn
   yarn dev
   ```

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/feature-name`)
3. Commit (`git commit -m "Add new feature"`)
4. Push (`git push origin feature/feature-name`)
5. Create a Pull Request

---

## 📄 License

Licensed under MIT. See [LICENSE](LICENSE).

---

## 📞 Support

- Two months post-deployment support
- Optional maintenance available
- Contact: [paul@example.com](mailto:paul@example.com) | [mail@enochphilip.site](mailto:mail@enochphilip.site)

---

_Project completed October 13, 2025. Maintained by Paul & Enoch._
