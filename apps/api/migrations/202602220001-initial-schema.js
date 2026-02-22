"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      is_admin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("refresh_tokens", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE"
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("buildings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("locations", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      building_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "buildings", key: "id" },
        onDelete: "CASCADE"
      },
      path: { type: Sequelize.STRING(180), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("device_types", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      category: { type: Sequelize.STRING(60), allowNull: false },
      default_protocols: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("devices", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      device_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "device_types", key: "id" },
        onDelete: "RESTRICT"
      },
      location_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "locations", key: "id" },
        onDelete: "RESTRICT"
      },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "unknown" },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      tags: { type: Sequelize.ARRAY(Sequelize.TEXT), allowNull: false, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("network_interfaces", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      device_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "devices", key: "id" },
        onDelete: "CASCADE"
      },
      mac: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      interface_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: "ethernet" },
      vendor: { type: Sequelize.STRING(120), allowNull: true },
      last_ip: { type: "INET", allowNull: true },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") }
    });

    await queryInterface.createTable("ip_history", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      mac: { type: Sequelize.STRING(64), allowNull: false },
      ip: { type: "INET", allowNull: false },
      first_seen_at: { type: Sequelize.DATE, allowNull: false },
      last_seen_at: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.createTable("discovered_hosts", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      ip: { type: "INET", allowNull: false },
      mac: { type: Sequelize.STRING(64), allowNull: true },
      vendor: { type: Sequelize.STRING(120), allowNull: true },
      hostname: { type: Sequelize.STRING(180), allowNull: true },
      open_ports: { type: Sequelize.ARRAY(Sequelize.INTEGER), allowNull: false, defaultValue: [] },
      hints: { type: Sequelize.ARRAY(Sequelize.TEXT), allowNull: false, defaultValue: [] },
      first_seen_at: { type: Sequelize.DATE, allowNull: false },
      last_seen_at: { type: Sequelize.DATE, allowNull: false },
      registered_device_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "devices", key: "id" },
        onDelete: "SET NULL"
      }
    });

    await queryInterface.createTable("health_checks", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true
      },
      device_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "devices", key: "id" },
        onDelete: "CASCADE"
      },
      check_type: { type: Sequelize.STRING(40), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false },
      latency_ms: { type: Sequelize.INTEGER, allowNull: true },
      checked_at: { type: Sequelize.DATE, allowNull: false },
      details: { type: Sequelize.JSONB, allowNull: true }
    });

    await queryInterface.addIndex("devices", ["status"]);
    await queryInterface.addIndex("devices", ["last_seen_at"]);
    await queryInterface.addIndex("network_interfaces", ["device_id"]);
    await queryInterface.addIndex("network_interfaces", ["mac"]);
    await queryInterface.addIndex("ip_history", ["mac"]);
    await queryInterface.addIndex("discovered_hosts", ["mac"]);
    await queryInterface.addIndex("health_checks", ["device_id"]);
    await queryInterface.addIndex("health_checks", ["checked_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("health_checks");
    await queryInterface.dropTable("discovered_hosts");
    await queryInterface.dropTable("ip_history");
    await queryInterface.dropTable("network_interfaces");
    await queryInterface.dropTable("devices");
    await queryInterface.dropTable("device_types");
    await queryInterface.dropTable("locations");
    await queryInterface.dropTable("buildings");
    await queryInterface.dropTable("refresh_tokens");
    await queryInterface.dropTable("users");
  }
};
