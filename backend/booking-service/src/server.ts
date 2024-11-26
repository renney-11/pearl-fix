import app from "./app";

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Booking Service running on port ${PORT}`);
});
