'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('leave_requests', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'user_id' }, onDelete: 'SET NULL' },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      type: { type: Sequelize.STRING(40), allowNull: false },
      status: { type: Sequelize.ENUM('pending','approved','declined'), allowNull: false, defaultValue: 'pending' },
      attachment_url: { type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('leave_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leave_requests_status";');
  }
};
