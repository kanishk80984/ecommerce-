# React + Express + MySQL Login

## Setup

1. Create the database by running `database.sql` in MySQL.
2. Copy `server/.env.example` to `server/.env` and enter your MySQL details and a secure JWT secret.
3. Install packages from the project root: `npm run install:all`
4. Start the API: `npm run server`
5. In another terminal, start React: `npm run client`
6. Open `http://localhost:3011`.

The login endpoint is `POST /api/auth/login`. It looks up the email with a parameterized query, compares a bcrypt password hash, and returns a one-hour JWT on success.
