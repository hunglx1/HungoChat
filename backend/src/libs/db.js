import prisma from "./prisma.js";

export const connectDB = async () => {
  await prisma.$connect();
  console.log("Kết nối PostgreSQL thành công!");
};
