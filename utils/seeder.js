/**
 * TechnoShop Database Seeder
 * Usage:
 *   node utils/seeder.js --import
 *   node utils/seeder.js --destroy
 */

const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Product = require("../models/Product");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "../.env") });

const rawProducts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "products.json"), "utf-8")
);

const seedProducts = rawProducts.map(({ id, specs, ...rest }) => ({
  ...rest,
  specs: specs || {},
}));

const importData = async () => {
  try {
    await Product.deleteMany();
    const created = await Product.insertMany(seedProducts);
    console.log(`\n${created.length} products seeded successfully.`);

    // Create admin user if not exists
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const admin = await User.create({
        name: "Admin User",
        email: "admin@technoshop.com",
        password: "admin123",
        role: "admin",
      });
      console.log(`Admin user created: ${admin.email} (password: admin123)`);
    } else {
      console.log("Admin user already exists.");
    }
    console.log("");
  } catch (err) {
    console.error(`Seeder error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

const destroyData = async () => {
  try {
    await Product.deleteMany();
    console.log("\nAll products deleted from database.\n");
  } catch (err) {
    console.error(`Destroy error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

const run = async () => {
  await connectDB();

  if (process.argv[2] === "--import") {
    await importData();
  } else if (process.argv[2] === "--destroy") {
    await destroyData();
  } else {
    console.log("\nPlease provide a flag:");
    console.log("  node utils/seeder.js --import");
    console.log("  node utils/seeder.js --destroy\n");
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
