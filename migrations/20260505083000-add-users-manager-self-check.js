'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE users ADD CONSTRAINT users_manager_not_self_ck CHECK (manager_id IS NULL OR manager_id <> user_id)'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_manager_not_self_ck'
    );
  }
};
