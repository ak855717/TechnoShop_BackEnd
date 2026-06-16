# TechnoShop Backend API

Node.js + Express + MongoDB REST API following the **MVC pattern**.

---

## Project Structure

```
technoshop-backend/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js      # Register, Login, Logout, Me
│   ├── productController.js   # CRUD + filters + search
│   ├── cartController.js      # Cart management
│   ├── wishlistController.js  # Wishlist toggle
│   ├── orderController.js     # Place & track orders
│   └── userController.js      # Admin user management
├── middleware/
│   ├── auth.js                # JWT protect + role authorize
│   ├── errorHandler.js        # Global error handler + AppError
│   └── validate.js            # express-validator wrapper
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Cart.js
│   ├── Wishlist.js
│   └── Order.js
├── routes/
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── cartRoutes.js
│   ├── wishlistRoutes.js
│   ├── orderRoutes.js
│   └── userRoutes.js
├── utils/
│   ├── seeder.js              # Seed/destroy products in DB
│   └── products.json          # Source seed data (your 24 products)
├── .env.example
├── package.json
└── server.js                  # App entry point
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Seed the database with your 24 products
```bash
npm run seed -- --import
```

### 4. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## API Endpoints

Base URL: `http://localhost:5000/api`

### 🔐 Auth  `/api/auth`

| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | `/register`           | Public  | Create account           |
| POST   | `/login`              | Public  | Login, receive JWT       |
| POST   | `/logout`             | Private | Clear cookie             |
| GET    | `/me`                 | Private | Get logged-in user       |
| PUT    | `/update-password`    | Private | Change password          |

**Register body:**
```json
{ "name": "Ayush", "email": "ayush@example.com", "password": "secret123" }
```

**Login body:**
```json
{ "email": "ayush@example.com", "password": "secret123" }
```

---

### 📦 Products  `/api/products`

| Method | Endpoint              | Access      | Description                        |
|--------|-----------------------|-------------|------------------------------------|
| GET    | `/`                   | Public      | All products (filter/sort/paginate)|
| GET    | `/:id`                | Public      | Single product                     |
| GET    | `/featured`           | Public      | Featured products                  |
| GET    | `/new-arrivals`       | Public      | New products                       |
| GET    | `/:id/related`        | Public      | Related products (same category)   |
| GET    | `/filters`            | Public      | All categories & brands            |
| POST   | `/`                   | Admin       | Create product                     |
| PUT    | `/:id`                | Admin       | Update product                     |
| DELETE | `/:id`                | Admin       | Delete product                     |

**Query Parameters for GET `/`:**

| Param       | Example              | Description                     |
|-------------|----------------------|---------------------------------|
| `search`    | `?search=iPhone`     | Full-text search                |
| `category`  | `?category=Laptops`  | Filter by category              |
| `brand`     | `?brand=Apple`       | Filter by brand                 |
| `minPrice`  | `?minPrice=500`      | Minimum price                   |
| `maxPrice`  | `?maxPrice=2000`     | Maximum price                   |
| `isNew`     | `?isNew=true`        | New arrivals only               |
| `isFeatured`| `?isFeatured=true`   | Featured only                   |
| `sortBy`    | `?sortBy=price`      | price, rating, reviews, name    |
| `order`     | `?order=asc`         | asc or desc (default: desc)     |
| `page`      | `?page=2`            | Page number (default: 1)        |
| `limit`     | `?limit=9`           | Items per page (default: 12)    |

---

### 🛒 Cart  `/api/cart`  *(Private)*

| Method | Endpoint         | Description                     |
|--------|------------------|---------------------------------|
| GET    | `/`              | Get user's cart                 |
| POST   | `/`              | Add item to cart                |
| PUT    | `/:itemId`       | Update item quantity            |
| DELETE | `/clear`         | Clear entire cart               |
| DELETE | `/:itemId`       | Remove single item              |

**Add to cart body:**
```json
{ "productId": "<mongoId>", "quantity": 1, "selectedColor": "Space Black" }
```

**Update cart item body:**
```json
{ "quantity": 3 }
```

---

### ❤️ Wishlist  `/api/wishlist`  *(Private)*

| Method | Endpoint    | Description                          |
|--------|-------------|--------------------------------------|
| GET    | `/`         | Get wishlist                         |
| POST   | `/toggle`   | Add or remove product (toggle)       |
| DELETE | `/`         | Clear wishlist                       |

**Toggle body:**
```json
{ "productId": "<mongoId>" }
```

---

### 📋 Orders  `/api/orders`  *(Private)*

| Method | Endpoint          | Access | Description               |
|--------|-------------------|--------|---------------------------|
| POST   | `/`               | User   | Place order from cart     |
| GET    | `/my-orders`      | User   | Get own order history     |
| GET    | `/:id`            | User   | Get single order          |
| PUT    | `/:id/cancel`     | User   | Cancel an order           |
| GET    | `/`               | Admin  | All orders                |
| PUT    | `/:id/status`     | Admin  | Update order status       |

**Create order body:**
```json
{
  "shippingAddress": {
    "fullName": "Ayush Kumar",
    "phone": "9876543210",
    "address": "123 Main Street",
    "city": "Delhi",
    "state": "Delhi",
    "postalCode": "110001",
    "country": "India"
  },
  "paymentMethod": "COD"
}
```

---

### 👤 Users  `/api/users`

| Method | Endpoint      | Access | Description             |
|--------|---------------|--------|-------------------------|
| PUT    | `/profile`    | User   | Update own profile      |
| GET    | `/`           | Admin  | All users               |
| GET    | `/:id`        | Admin  | Single user             |
| PUT    | `/:id/role`   | Admin  | Change user role        |
| DELETE | `/:id`        | Admin  | Delete user             |

---

## Authentication

All private routes require a JWT token. Send it as:

**Option A — Authorization Header (recommended for React):**
```
Authorization: Bearer <your_token>
```

**Option B — HTTP-only Cookie:**
The token is automatically set as a cookie on login.

---

## Connecting to React Frontend

Install axios in your React project:
```bash
npm install axios
```

Create `src/api/axios.js`:
```js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // send cookies
});

// Attach token from localStorage if using header-based auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

Example usage in `ShopContext.jsx` or any component:
```js
import api from "../api/axios";

// Login
const { data } = await api.post("/auth/login", { email, password });
localStorage.setItem("token", data.token);

// Get products
const { data } = await api.get("/products?category=Laptops&page=1&limit=9");

// Add to cart
await api.post("/cart", { productId, quantity: 1, selectedColor });

// Toggle wishlist
await api.post("/wishlist/toggle", { productId });
```

---

## Seeder Commands

```bash
# Import all 24 products from products.json into MongoDB
npm run seed -- --import

# Wipe all products from MongoDB
npm run seed -- --destroy
```
