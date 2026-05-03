'use strict';
module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    check_in_time: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'attendance',
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'date'] }]
  });

  Attendance.associate = function(models) {
    Attendance.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return Attendance;
};
