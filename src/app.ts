import express from "express";
import cors from "cors";
import routes from "./routes/index";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", routes);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
      errors: [],
    });
  },
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
