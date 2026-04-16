const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      minlength: 6,
      select: false, // Don't return password by default
    },
    displayName: {
      type: String,
      required: [true, "Please provide a display name"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple users to have no googleId
    },
    scanCount: {
      type: Number,
      default: 0,
    },
    scanHistory: [
      {
        query: String,
        result: mongoose.Schema.Types.Mixed,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
