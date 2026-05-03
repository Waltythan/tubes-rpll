'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payroll_items', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
      payroll_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: 'payrolls', key: 'id' }, onDelete: 'CASCADE' },
      type: { type: Sequelize.ENUM('allowance','deduction'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(14,2), allowNull: false },
      description: { type: Sequelize.TEXT },
      reference_id: { type: Sequelize.STRING(80) }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payroll_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payroll_items_type";');
  }
};
