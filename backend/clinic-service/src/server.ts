import app from "./app";

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Clinic Service running on port ${PORT}`);
});
