import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://adeleyepamilerin9:wmDWVg57w0lDZeI6@cluster0.bbg2mgg.mongodb.net/NwesletterApp");
    console.log("DB connected");
  } catch (error) {
    console.error("DB connection error:", error.message);
  }
};
