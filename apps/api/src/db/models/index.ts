import { DataTypes, Model, Sequelize } from "sequelize";

export class User extends Model {}
export class RefreshToken extends Model {}
export class Building extends Model {}
export class Location extends Model {}
export class DeviceType extends Model {}
export class Device extends Model {}
export class NetworkInterface extends Model {}
export class IpHistory extends Model {}
export class DiscoveredHost extends Model {}
export class HealthCheck extends Model {}

export function initModels(sequelize: Sequelize): void {
  User.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      password_hash: { type: DataTypes.STRING, allowNull: false },
      is_admin: { type: DataTypes.BOOLEAN, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false }
    },
    { sequelize, tableName: "users", underscored: true, timestamps: true }
  );

  RefreshToken.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      token_hash: { type: DataTypes.STRING, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false }
    },
    { sequelize, tableName: "refresh_tokens", underscored: true, timestamps: false }
  );

  Building.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true }
    },
    { sequelize, tableName: "buildings", underscored: true, timestamps: true }
  );

  Location.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      building_id: { type: DataTypes.UUID, allowNull: false },
      path: { type: DataTypes.STRING, allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: true }
    },
    { sequelize, tableName: "locations", underscored: true, timestamps: true }
  );

  DeviceType.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: false },
      default_protocols: { type: DataTypes.JSONB, allowNull: false }
    },
    { sequelize, tableName: "device_types", underscored: true, timestamps: true }
  );

  Device.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      device_type_id: { type: DataTypes.UUID, allowNull: false },
      location_id: { type: DataTypes.UUID, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
      last_seen_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      tags: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false }
    },
    { sequelize, tableName: "devices", underscored: true, timestamps: true }
  );

  NetworkInterface.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      device_id: { type: DataTypes.UUID, allowNull: false },
      mac: { type: DataTypes.STRING, allowNull: false },
      interface_type: { type: DataTypes.STRING, allowNull: false },
      vendor: { type: DataTypes.STRING, allowNull: true },
      last_ip: { type: DataTypes.STRING, allowNull: true },
      last_seen_at: { type: DataTypes.DATE, allowNull: true }
    },
    { sequelize, tableName: "network_interfaces", underscored: true, timestamps: true }
  );

  IpHistory.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      mac: { type: DataTypes.STRING, allowNull: false },
      ip: { type: DataTypes.STRING, allowNull: false },
      first_seen_at: { type: DataTypes.DATE, allowNull: false },
      last_seen_at: { type: DataTypes.DATE, allowNull: false }
    },
    { sequelize, tableName: "ip_history", underscored: true, timestamps: false }
  );

  DiscoveredHost.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      ip: { type: DataTypes.STRING, allowNull: false },
      mac: { type: DataTypes.STRING, allowNull: true },
      vendor: { type: DataTypes.STRING, allowNull: true },
      hostname: { type: DataTypes.STRING, allowNull: true },
      open_ports: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: false },
      hints: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false },
      first_seen_at: { type: DataTypes.DATE, allowNull: false },
      last_seen_at: { type: DataTypes.DATE, allowNull: false },
      registered_device_id: { type: DataTypes.UUID, allowNull: true }
    },
    { sequelize, tableName: "discovered_hosts", underscored: true, timestamps: false }
  );

  HealthCheck.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      device_id: { type: DataTypes.UUID, allowNull: false },
      check_type: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
      latency_ms: { type: DataTypes.INTEGER, allowNull: true },
      checked_at: { type: DataTypes.DATE, allowNull: false },
      details: { type: DataTypes.JSONB, allowNull: true }
    },
    { sequelize, tableName: "health_checks", underscored: true, timestamps: false }
  );

  User.hasMany(RefreshToken, { foreignKey: "user_id" });
  RefreshToken.belongsTo(User, { foreignKey: "user_id" });

  Building.hasMany(Location, { foreignKey: "building_id" });
  Location.belongsTo(Building, { foreignKey: "building_id" });

  DeviceType.hasMany(Device, { foreignKey: "device_type_id" });
  Device.belongsTo(DeviceType, { foreignKey: "device_type_id" });

  Location.hasMany(Device, { foreignKey: "location_id" });
  Device.belongsTo(Location, { foreignKey: "location_id" });

  Device.hasMany(NetworkInterface, { foreignKey: "device_id", as: "interfaces" });
  NetworkInterface.belongsTo(Device, { foreignKey: "device_id" });
}
