import mongoose, { Schema } from 'mongoose';

// 1. Wallet Schema
const WalletSchema = new Schema({
  _id: { type: String, required: true }, // Wallet address (lowercase)
  firstTradeAt: { type: Date, default: null },
  lifetimeTrades: { type: Number, default: 0 },
}, { timestamps: true, _id: false });

// 2. Market Schema
const MarketSchema = new Schema({
  _id: { type: String, required: true }, // Market Condition ID (lowercase)
  title: { type: String, required: true },
  slug: { type: String },
  currentOddsYes: { type: Number },
  currentOddsNo: { type: Number },
  status: { type: String, default: 'active' },
}, { timestamps: true, _id: false });

// 3. Cluster Schema
const ClusterSchema = new Schema({
  marketId: { type: String, ref: 'Market', required: true },
  side: { type: String, enum: ['YES', 'NO'], required: true },
  oddsAtFlag: { type: Number, required: true },
  aggregateSize: { type: Number, required: true },
  memberCount: { type: Number, required: true },
  windowMinutes: { type: Number, required: true },
  detectedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

// 4. FlaggedBet Schema
const FlaggedBetSchema = new Schema({
  walletAddress: { type: String, ref: 'Wallet', required: true },
  marketId: { type: String, ref: 'Market', required: true },
  tier: { type: String, enum: ['SHARK', 'WHALE', 'MEGA_WHALE'], required: true },
  sizeUsd: { type: Number, required: true },
  odds: { type: Number, required: true },
  side: { type: String, enum: ['YES', 'NO'], required: true },
  alertScore: { type: Number, required: true },
  result: { type: String, enum: ['OPEN', 'WON', 'LOST'], default: 'OPEN' },
  pnl: { type: Number, default: null },
  txHash: { type: String, default: null },
  clusterId: { type: Schema.Types.ObjectId, ref: 'Cluster', default: null },
  betAt: { type: Date, required: true },
  flaggedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Indexes on FlaggedBet for faster query
FlaggedBetSchema.index({ betAt: -1 });
FlaggedBetSchema.index({ walletAddress: 1 });
FlaggedBetSchema.index({ tier: 1 });
FlaggedBetSchema.index({ clusterId: 1 });

// 5. ClusterMember Schema
const ClusterMemberSchema = new Schema({
  clusterId: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
  walletAddress: { type: String, ref: 'Wallet', required: true },
  flaggedBetId: { type: Schema.Types.ObjectId, ref: 'FlaggedBet', required: true },
  sizeUsd: { type: Number, required: true },
  betAt: { type: Date, required: true },
  note: { type: String },
});

// Export Models
export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
export const Market = mongoose.models.Market || mongoose.model('Market', MarketSchema);
export const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', ClusterSchema);
export const FlaggedBet = mongoose.models.FlaggedBet || mongoose.model('FlaggedBet', FlaggedBetSchema);
export const ClusterMember = mongoose.models.ClusterMember || mongoose.model('ClusterMember', ClusterMemberSchema);
