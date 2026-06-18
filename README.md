# Lead Management API

A robust, production-ready Lead Management RESTful API built with **Node.js, Express, TypeScript, and Prisma (PostgreSQL)**. 

## 🏗 Architecture Overview

The application follows a modular, object-oriented, three-tier architecture:
1. **Routes Layer**: Defines HTTP endpoints and applies global/route-specific middlewares (Authentication, RBAC, Validation).
2. **Controllers Layer**: Extracts HTTP request data (params, body, queries) and passes it strictly to the Service layer. Handles HTTP responses.
3. **Service Layer**: Contains the core business logic and database interactions using the Prisma ORM.

### Key Features
- **Authentication**: JWT-based authentication. Access tokens (15m) and Refresh tokens (7 days) are securely issued as `HTTP-Only` cookies. Refresh tokens are stored in the database for secure rotation and invalidation.
- **Role-Based Access Control (RBAC)**: Supports `ADMIN` and `SALES` roles. Sales reps can only view and create leads assigned to them. Admins have global access.
- **Soft Deletes**: Deleting a lead simply flags `isDeleted: true` in the database to preserve historical data.
- **Validation**: Strict runtime payload validation using `Zod`.
- **Rate Limiting**: Sliding-window rate limiter utilizing a local memory map to prevent abuse (e.g., max 100 requests per 15 minutes per IP/User).
- **CSV Exporting**: Bypasses pagination to export all leads natively as a streaming CSV file.

## 📂 Folder Structure

```text
src/
├── controllers/          # Handles incoming HTTP requests and responses
│   ├── auth.controller.ts
│   └── lead.controller.ts
├── middlewares/          # Custom Express middlewares
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── rateLimiter.middleware.ts
│   ├── rbac.middleware.ts
│   └── validate.middleware.ts
├── prisma/               # Prisma database connection and adapters
│   └── prisma.client.ts
├── routes/               # API route definitions
│   ├── auth.routes.ts
│   └── lead.routes.ts
├── schemas/              # Zod validation schemas
│   ├── auth.schema.ts
│   └── lead.schema.ts
├── services/             # Business logic and database operations
│   ├── auth.service.ts
│   └── lead.service.ts
├── app.ts                # Express application setup
└── main.ts               # Server entry point
```

---

## 🚀 API Documentation

All endpoints expect `application/json` and return responses in the following format:
```json
{
  "success": true,
  "data": { ... } // or "message" for actions without data
}
```
Errors return `success: false` along with an error message and status code.

---

### Authentication Endpoints

#### 1. Register User
- **URL**: `POST /auth/register`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@email.com",
    "password": "securepassword",
    "role": "SALES" // Optional. Defaults to "SALES". Enum: "ADMIN", "SALES"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": { "id": "uuid", "email": "john@email.com", "name": "John Doe", "role": "SALES" }
  }
  ```

#### 2. Login
- **URL**: `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "john@email.com",
    "password": "securepassword"
  }
  ```
- **Response** (`200 OK`): *Sets `access_token` and `refresh_token` cookies.*
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "data": { "id": "uuid", "email": "john@email.com", "role": "SALES" }
  }
  ```

#### 3. Refresh Token
- **URL**: `POST /auth/refresh`
- **Requirements**: Requires a valid `refresh_token` HTTP-Only cookie.
- **Response** (`200 OK`): *Rotates and sets new `access_token` and `refresh_token` cookies.*
  ```json
  {
    "success": true,
    "message": "Tokens refreshed successfully"
  }
  ```

#### 4. Logout
- **URL**: `POST /auth/logout`
- **Response** (`200 OK`): *Clears all JWT cookies.*
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### Lead Endpoints

*Note: All Lead endpoints require the `access_token` cookie.*

#### 1. Create Lead
- **URL**: `POST /leads`
- **Access**: `ADMIN` or `SALES`
- **Request Body**:
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@email.com",
    "phone": "1234567890",       // Optional
    "company": "Tech Corp",      // Optional
    "status": "NEW",             // Optional. Enum: "NEW", "CONTACTED", "QUALIFIED", "CLOSED"
    "notes": "Interested in premium plan", // Optional
    "assignedToId": "uuid"       // Optional. Defaults to the logged-in user. (Sales reps cannot assign to others).
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@email.com",
      "phone": "1234567890",
      "company": "Tech Corp",
      "status": "NEW",
      "notes": "Interested in premium plan",
      "assignedToId": "uuid",
      "isDeleted": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 2. Get Leads (List & Search)
- **URL**: `GET /leads`
- **Access**: `ADMIN` (sees all leads), `SALES` (sees only assigned leads)
- **Query Parameters**:
  - `page` (number): Pagination offset. Default `1`.
  - `limit` (number): Items per page. Default `10`.
  - `status` (string): Filter by status (e.g., `?status=NEW`).
  - `search` (string): Case-insensitive search across `name`, `email`, `phone`, and `company`.
  - `export` (string): Set to `?export=true` to bypass pagination and download results as a `text/csv` file.
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "leads": [
        {
          "id": "uuid",
          "name": "Jane Smith",
          "email": "jane@email.com",
          "phone": "1234567890",
          "company": "Tech Corp",
          "status": "NEW",
          "notes": "...",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  }
  ```

#### 3. Get Single Lead
- **URL**: `GET /leads/:id`
- **Access**: `ADMIN` or `SALES` (if assigned)
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
       // Single Lead Object
    }
  }
  ```

#### 4. Update Lead
- **URL**: `PATCH /leads/:id`
- **Access**: `ADMIN` only
- **Request Body** (All fields optional):
  ```json
  {
    "name": "Jane Smith Updated",
    "email": "newjane@email.com",
    "phone": "0987654321",
    "company": "New Tech Corp",
    "status": "QUALIFIED",
    "notes": "Ready to buy"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
       // Updated Lead Object
    }
  }
  ```

#### 5. Soft Delete Lead
- **URL**: `DELETE /leads/:id`
- **Access**: `ADMIN` only
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Lead soft deleted successfully"
  }
  ```
