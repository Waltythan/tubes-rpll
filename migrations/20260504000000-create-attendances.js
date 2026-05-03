'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('attendances', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      clock_in: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      clock_out: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      clock_in_location: {
        type: Sequelize.STRING(100),
      },
      clock_out_location: {
        type: Sequelize.STRING(100),
      },
      qr_token: {
        type: Sequelize.STRING(200),
      },
      device_id: {
        type: Sequelize.STRING(120),
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'present',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addConstraint('attendances', {
      fields: ['user_id', 'date'],
      type: 'unique',
      name: 'attendances_user_date_unique',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('attendances');
  },
};
