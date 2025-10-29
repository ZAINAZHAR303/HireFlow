# Hireflow backend (Phase 1)

This backend provides:

- JWT auth (/auth/signup, /auth/login)
- Resume upload and text extraction (/resumes/upload)
- Remotive job fetching and filtering (/jobs)

Environment variables (.env):

- MONGODB_URI - MongoDB connection string
- JWT_SECRET - JWT secret
- PORT - server port (default 4000)
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET - optional, used to store resumes

To run:

1. Install dependencies

   npm install

2. Create a .env file (see .env.example)

3. Start the server

   npm run dev
