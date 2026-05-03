'use strict';
module.exports = (sequelize, DataTypes) => {
  const QrToken = sequelize.define('QrToken', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    token: DataTypes.TEXT,
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
    used: { type: DataTypes.BOOLEAN, defaultValue: false },
    expires_at: DataTypes.DATE
  }, {
    tableName: 'qr_tokens',
    timestamps: true
  });

  QrToken.associate = function(models) {
    QrToken.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return QrToken;
};
