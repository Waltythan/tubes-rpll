'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('profiles', {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE'
      },
      full_name: { type: Sequelize.STRING, allowNull: false },
      phone_number: { type: Sequelize.STRING },
      address: { type: Sequelize.TEXT },
      profile_picture_url: { type: Sequelize.TEXT },
      birth_date: { type: Sequelize.DATEONLY },
      bank_account_details: { type: Sequelize.TEXT },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('profiles');
  }
};
