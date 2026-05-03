'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trusted_devices', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      device_id: { type: Sequelize.STRING(120), allowNull: false },
      device_name: { type: Sequelize.STRING(120) },
      is_trusted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_login: { type: Sequelize.DATE }
    });

    await queryInterface.addConstraint('trusted_devices', {
      fields: ['user_id','device_id'],
      type: 'unique',
      name: 'trusted_device_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trusted_devices');
  }
};
