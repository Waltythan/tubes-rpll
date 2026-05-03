'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reimbursements', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'user_id' }, onDelete: 'SET NULL' },
      payroll_id: { type: Sequelize.BIGINT, allowNull: true, references: { model: 'payrolls', key: 'id' }, onDelete: 'SET NULL' },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      attachment_url: { type: Sequelize.TEXT },
      status: { type: Sequelize.ENUM('pending','approved','rejected'), allowNull: false, defaultValue: 'pending' },
      request_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reimbursements');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reimbursements_status";');
  }
};
