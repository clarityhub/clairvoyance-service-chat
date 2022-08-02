module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // rename the enum
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_Chats_status" RENAME TO "enum_Chats_status_old"',
        { transaction }
      );

      // create the new one
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_Chats_status\" AS ENUM ('open', 'closed', 'active')",
        { transaction }
      );

      // change the column to use the new one, mapping data
      await queryInterface.sequelize.query(`ALTER TABLE "Chats"
         ALTER COLUMN status DROP DEFAULT,
         ALTER COLUMN status TYPE "enum_Chats_status"
           USING (CASE
             WHEN status='open' THEN 'open'::text
             WHEN status='closed' THEN 'closed'::text
             ELSE status::text
           END)::"enum_Chats_status",
         ALTER COLUMN status SET DEFAULT 'open'
        `, { transaction });

      // drop the old enum
      await queryInterface.sequelize.query(
        'DROP TYPE "enum_Chats_status_old"',
        { transaction }
      );
    });


    // return queryInterface.changeColumn(
    //   'Chats',
    //   'status',
    //   {
    //     type: Sequelize.ENUM,
    //     values: ['open', 'closed', 'active'],
    //     defaultValue: 'open',
    //     validate: {
    //       notEmpty: true,
    //     },
    //   }
    // );
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // rename the enum
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_Chats_status" RENAME TO "enum_Chats_status_old"',
        { transaction }
      );

      // create the new one
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_Chats_status\" AS ENUM ('open', 'closed')",
        { transaction }
      );

      // change the column to use the new one, mapping data
      await queryInterface.sequelize.query(`ALTER TABLE "Chats"
         ALTER COLUMN status DROP DEFAULT,
         ALTER COLUMN status TYPE "enum_Chats_status"
           USING (CASE
             WHEN status='open' THEN 'open'::text
             WHEN status='closed' THEN 'closed'::text
             ELSE status::text
           END)::"enum_Chats_status",
         ALTER COLUMN status SET DEFAULT 'open'
        `, { transaction });

      // drop the old enum
      await queryInterface.sequelize.query(
        'DROP TYPE "enum_Chats_status_old"',
        { transaction }
      );
    });
    // return queryInterface.changeColumn(
    //   'Chats',
    //   'status',
    //   {
    //     type: Sequelize.ENUM,
    //     values: ['open', 'closed'],
    //     defaultValue: 'open',
    //     validate: {
    //       notEmpty: true,
    //     },
    //   }
    // );
  },
};
