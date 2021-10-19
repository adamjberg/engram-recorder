import aws from "aws-sdk";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import express from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import cookieParser from "cookie-parser";
import { DatabaseMiddleware } from "./middleware/DatabaseMiddleware.js";
import { getEnv } from "./env.js";
import jwt from "jsonwebtoken";
import { AuthMiddleware } from "./middleware/AuthMiddleware.js";
import { AuthRequiredMiddleware } from "./middleware/AuthRequiredMiddleware.js";

const app = express();
const s3 = new aws.S3({ endpoint: "https://sfo3.digitaloceanspaces.com" });

app.use(express.json());
app.use(cookieParser());
app.use(DatabaseMiddleware);
app.use(AuthMiddleware);

const BUCKET = "xyzdigital";

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileExt = path.extname(file.originalname);
      cb(
        null,
        `engram/uploads/5fa634ca7fd6d6c5e4eb1fb6/${Date.now().toString()}${fileExt}`
      );
    },
  }),
});

async function setToken(res, user) {
  const { jwtSecret, production } = getEnv();
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        user,
      },
      jwtSecret,
      function (err, token) {
        if (err) {
          return reject(err);
        }

        res.cookie("token", token, {
          secure: production,
          httpOnly: true,
          sameSite: false,
        });
        resolve();
      }
    );
  });
}

app.get("/api/users/self", async function (req, res, next) {
  const { db, user } = req;
  const userDoc = await db.collection("users").findOne({
    _id: ObjectId(user),
  });
  return res.json({
    data: {
      _id: user,
      email: userDoc.email,
    },
  });
});

app.post("/api/login", async function (req, res, next) {
  const { db } = req;
  const { username, password } = req.body;
  const user = await db.collection("users").findOne({
    $or: [{ username }, { email: username }],
  });

  const invalidLoginMessage =
    "You have entered an invalid username or password";

  if (!user) {
    return res.status(400).json({
      errors: [invalidLoginMessage],
    });
  }

  let passwordsMatch = false;

  if (user.hashedPassword) {
    passwordsMatch = await bcrypt.compare(password, user.hashedPassword);
  }

  if (passwordsMatch) {
    await setToken(res, String(user._id));

    res.json({
      success: true,
    });
  } else {
    return res.status(400).json({
      errors: [invalidLoginMessage],
    });
  }
});

app.get(
  "/api/recordings",
  AuthRequiredMiddleware,
  async function (req, res, next) {
    const { db, user } = req;

    const findOptions = {
      user: new ObjectId(user),
      type: "recording",
    };

    const recordings = await db
      .collection("notes")
      .find(findOptions)
      .sort({ _id: -1 })
      .limit(100)
      .toArray();
    if (!recordings.length) {
      return res.sendStatus(404);
    }

    const recordingsWithSignedUrl = recordings.map((recording) => {
      const signedUrlExpireSeconds = 60 * 5;
      const url = s3.getSignedUrl("getObject", {
        Bucket: BUCKET,
        Key: recording.key,
        Expires: signedUrlExpireSeconds,
      });
      return {
        ...recording,
        signedUrl: url,
      };
    });

    return res.json({
      data: recordingsWithSignedUrl,
    });
  }
);

app.get(
  "/api/recordings/:id",
  AuthRequiredMiddleware,
  async function (req, res, next) {
    const {
      db,
      user,
      params: { id },
    } = req;

    const findOptions = {
      _id: new ObjectId(id),
      user: new ObjectId(user),
      type: "recording",
    };
    const recording = await db.collection("notes").findOne(findOptions);

    return res.json({
      data: recording,
    });
  }
);

app.post(
  "/api/recordings",
  AuthRequiredMiddleware,
  upload.single("recording"),
  async function (req, res, next) {
    const { db, user } = req;
    const recording = await db.collection("notes").insertOne({
      user: new ObjectId(user),
      type: "recording",
      key: req.file.key,
      url: req.file.location,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      data: recording,
    });
  }
);

app.use(express.static("../fe/public"));
app.get("*", function (req, res, next) {
  res.sendFile(path.resolve("../fe/public/index.html"));
});

app.listen(3005, function () {
  console.log("Server listening on port 3005.");
});
