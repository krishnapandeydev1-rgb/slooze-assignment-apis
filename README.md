## 🐳 Running the Backend with Docker

To run the backend server locally using Docker, follow these steps:

### 1️⃣ Start Docker Containers

Run the following command from the project root directory:

```bash
docker-compose up --build
```

- This builds all images (API and Database) the first time you run it.
- On subsequent runs, you can skip rebuilding by using:

  ```bash
  docker-compose up
  ```

---

### 2️⃣ Deploy Prisma Migrations

Once the containers are up and running, open a shell inside the API container:

```bash
docker exec -it nest_api sh
```

Now, run the Prisma migrations to sync the database schema:

```bash
npx prisma migrate deploy
```

---

### 3️⃣ Seed Initial Data

After migrations, seed your database with demo or default data:

```bash
npx ts-node prisma/seed.ts
```

> ⚠️ Make sure your working directory inside the container is `/usr/src/app` before running this command.

---

### 4️⃣ Exit the Container

Once seeding completes successfully, exit the container shell:

```bash
exit
```

---

### ✅ Done!

Your backend API server should now be running and connected to the database.

Access it locally at:

```
http://localhost:8080
```

---

### 🔧 Common Commands

| Command                       | Description                         |
| ----------------------------- | ----------------------------------- |
| `docker-compose up --build`   | Build and start containers          |
| `docker-compose up`           | Start containers without rebuilding |
| `docker exec -it nest_api sh` | Open a shell in the API container   |
| `docker logs nest_api -f`     | View API container logs             |
