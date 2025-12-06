
# Authentication API

This API provides user authentication and profile management with JWT tokens, built on Node.js, Express, and MongoDB.

## Features
- User registration with unique username and email
- Password hashing with bcryptjs
- User login with JWT token generation
- Secure routes to get and update user profile
- Profile image management

## Base URL
`/api/auth`

## Endpoints

### Register a new user
`POST /register`

**Request Body:**
``` json
{
"username": "string",
"email": "string",
"password": "string (min 6 characters)"
}
```

**Response:**
- Success (201):
``` json
{
"_id": "string",
"username": "string",
"email": "string",
"profile_image": "string",
"token": "JWT token string"
}
```

- User exists (400):
  ``` json
  { "msg": "User already exists with that email or username." }
  ```

  ---

### Login user
`POST /login`

**Request Body:**
``` json
{
"email": "string",
"password": "string"
}
```
**Response:**
- Success (200):
``` json
{
"_id": "string",
"username": "string",
"email": "string",
"profile_image": "string",
"token": "JWT token string"
}
```
- Invalid credentials (401):
``` json
{ "msg": "Invalid credentials" }
```
---

### Get current user data
`GET /me`

**Headers:**
``` 
Authorization: Bearer <token>
```
**Response:**
- Success (200):
``` json
{
"_id": "string",
"username": "string",
"email": "string",
"profile_image": "string"
}
```

---

### Update user profile image
`PUT /profile`

**Headers:**
```
Authorization: Bearer <token>
```
**Request Body:**
``` json
{
"profile_image": "string (URL or path)"
}
```
**Response:**
- Success (200):
```json
{
"_id": "string",
"username": "string",
"email": "string",
"profile_image": "string"
}
```
- User not found (404):
``` json
{ "msg": "User not found" }
```

---

## User Model Fields

| Field          | Type   | Required | Description                  |
|----------------|--------|----------|------------------------------|
| `username`     | String | Yes      | Unique username              |
| `email`        | String | Yes      | Unique, valid email          |
| `password`     | String | Yes      | Hashed, min length 6         |
| `profile_image`| String | No       | URL or path to avatar image  |
| `createdAt`    | Date   | Auto     | Creation timestamp           |
| `updatedAt`    | Date   | Auto     | Update timestamp             |

## Notes
- Passwords are hashed automatically before saving.
- JWT tokens expire based on environment configuration.
- Password is never returned in API responses.

## Setup
- Define environment variables `JWT_SECRET` and `JWT_EXPIRE`.
- Connect to MongoDB.
- Run the Express server.

## License
MIT License
