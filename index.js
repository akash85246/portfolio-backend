import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import passport from "passport";
import session from "express-session";
import LeeetCodeRouter from "./routes/leetCode.routes.js";
import ViewRouter from "./routes/view.routes.js"
import IpRouter from "./routes/ip.routes.js";
import http from 'http';
import { Server } from 'socket.io';
import { setupSocket } from './controllers/socket.controller.js'

dotenv.config();
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  })
);

// Handle Preflight Requests
app.options("*", (req, res) => {
  const allowedOrigins = [`${process.env.FRONTEND_URL}`];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', true);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

setupSocket(io);


app.use((req, res, next) => {
  console.log("Incoming Request:", req.method, req.url);
  console.log("Origin:", req.headers.origin);
  console.log("Cookies:", req.cookies);
  next();
});

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none"); // Allows window.close()
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none"); // Prevents resource isolation issues
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"); // Allows external resources
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/leetcode", LeeetCodeRouter);
app.use("/api/view", ViewRouter);
app.use("/api/ip", IpRouter);

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL;
server.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on ${BASE_URL}:${PORT}`);
});
