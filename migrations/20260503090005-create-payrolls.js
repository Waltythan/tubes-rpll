'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payrolls', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.BIGINT },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'user_id' }, onDelete: 'CASCADE' },
      period_start: { type: Sequelize.DATEONLY, allowNull: false },
      period_end: { type: Sequelize.DATEONLY, allowNull: false },
      total_allowance: { type: Sequelize.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
      total_deduction: { type: Sequelize.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
      net_salary: { type: Sequelize.DECIMAL(14,2), allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('generated','paid','cancelled'), allowNull: false, defaultValue: 'generated' },
      generated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });

    await queryInterface.addConstraint('payrolls', {
      fields: ['user_id','period_start','period_end'],
      type: 'unique',
      name: 'payroll_user_period_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payrolls');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payrolls_status";');
  }
};
