'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Departments
    await queryInterface.bulkInsert('departments', [
      { dep_id: 1, name: 'Engineering', code: 'ENG', createdAt: now, updatedAt: now },
      { dep_id: 2, name: 'Human Resources', code: 'HR', createdAt: now, updatedAt: now }
    ], {});

    // Users (explicit IDs to allow manager relationships)
    await queryInterface.bulkInsert('users', [
      {
        user_id: 1,
        department_id: 2,
        email: 'admin@example.com',
        password: '$2b$10$oer9ofkNi/QFVSXJwcRJG.pgpS2Xip4Bn4t6tyYMHbbfGJZWBGoQe',
        role: 'admin',
        base_salary: 0,
        manager_id: null,
        createdAt: now,
        updatedAt: now
      },
      {
        user_id: 2,
        department_id: 1,
        email: 'manager@example.com',
        password: '$2b$10$rnZvsGnzsMKADimhC7LGse1tSwmM1XSpaLBkPrb/om4WvOy52Scgu',
        role: 'manager',
        base_salary: 8000000,
        manager_id: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        user_id: 3,
        department_id: 1,
        email: 'staff@example.com',
        password: '$2b$10$jbzWgAbLSnEXnEsOooCE7uEdj8N4hQEjQ.fpjfyLRADqD13rNpJ5i',
        role: 'staff',
        base_salary: 5000000,
        manager_id: 2,
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // Profiles
    await queryInterface.bulkInsert('profiles', [
      { user_id: 1, full_name: 'Admin User', phone_number: '081100000001', address: 'Head Office', profile_picture_url: null, birth_date: null, bank_account_details: null, createdAt: now, updatedAt: now },
      { user_id: 2, full_name: 'Manager User', phone_number: '081100000002', address: 'Head Office', profile_picture_url: null, birth_date: null, bank_account_details: null, createdAt: now, updatedAt: now },
      { user_id: 3, full_name: 'Staff User', phone_number: '081100000003', address: 'Head Office', profile_picture_url: null, birth_date: null, bank_account_details: null, createdAt: now, updatedAt: now }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('profiles', { user_id: [1,2,3] }, {});
    await queryInterface.bulkDelete('users', { user_id: [1,2,3] }, {});
    await queryInterface.bulkDelete('departments', { dep_id: [1,2] }, {});
  }
};
