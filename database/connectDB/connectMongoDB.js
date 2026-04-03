module.exports = async function (uriConnect) {
        // Use environment variable if available, fallback to config
        const mongoURI = process.env.MONGODB_URI || uriConnect;
        const mongoose = require("mongoose");

        const threadModel = require("../models/mongodb/thread.js");
        const userModel = require("../models/mongodb/user.js");
        const dashBoardModel = require("../models/mongodb/userDashBoard.js");
        const globalModel = require("../models/mongodb/global.js");
        const economyModel = require("../models/mongodb/economy.js");

        // Use clean connection without buffer settings to avoid compatibility issues
        await mongoose.connect(mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
        });

        return {
                threadModel,
                userModel,
                dashBoardModel,
                globalModel,
                economyModel
        };
};