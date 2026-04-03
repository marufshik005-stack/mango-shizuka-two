module.exports = function (sequelize) {
	const { Model, DataTypes } = require("sequelize");
	class economyModel extends Model { }
	economyModel.init({
		userID: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		bankBalance: {
			type: DataTypes.BIGINT,
			defaultValue: 0
		},
		investments: {
			type: DataTypes.JSON,
			defaultValue: {}
		},
		transactions: {
			type: DataTypes.JSON,
			defaultValue: []
		},
		lastDailyReward: {
			type: DataTypes.STRING,
			defaultValue: ""
		},
		bankLevel: {
			type: DataTypes.INTEGER,
			defaultValue: 1
		},
		investmentLevel: {
			type: DataTypes.INTEGER,
			defaultValue: 1
		},
		createdAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW
		},
		updatedAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW
		}
	}, {
		sequelize,
		modelName: "economy"
	});

	return economyModel;
};
