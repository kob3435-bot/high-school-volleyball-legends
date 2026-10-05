import type { School } from '../engine/types';

export const SCHOOLS: School[] = [
  { id: 'karasawa', name: 'Karasuna High', short: 'KRN', primary: '#1a1a2e', secondary: '#e94560', accent: '#f5a623', style: 'Ultra-fast offense, momentum', logoShape: 'crest' },
  { id: 'nekoma', name: 'Nekomo High', short: 'NKM', primary: '#8B0000', secondary: '#111', accent: '#ffcc00', style: 'Defense, rally extension', logoShape: 'circle' },
  { id: 'aoba', name: 'Aoba Johsei', short: 'AJS', primary: '#2e8b57', secondary: '#fff', accent: '#87ceeb', style: 'Setter-controlled, serve pressure', logoShape: 'shield' },
  { id: 'shiratori', name: 'Shiratorizawo Academy', short: 'STZ', primary: '#4a0080', secondary: '#e0d4ff', accent: '#fff', style: 'Absolute ace, power', logoShape: 'star' },
  { id: 'inari', name: 'Inarizako High', short: 'INZ', primary: '#c45c26', secondary: '#1a1a1a', accent: '#ffd700', style: 'Serve pressure, creativity', logoShape: 'hex' },
  { id: 'fukuro', name: 'Fukurodano Academy', short: 'FKD', primary: '#2c3e50', secondary: '#e74c3c', accent: '#ecf0f1', style: 'Emotional ace, management', logoShape: 'diamond' },
  { id: 'date', name: 'Dateko Tech', short: 'DTK', primary: '#1e3a5f', secondary: '#f39c12', accent: '#fff', style: 'Iron wall blocking', logoShape: 'shield' },
  { id: 'kamome', name: 'Kamomedao High', short: 'KMD', primary: '#0984e3', secondary: '#dfe6e9', accent: '#00cec9', style: 'Blocking, serving, composure', logoShape: 'circle' },
  { id: 'mujina', name: 'Mujinazako High', short: 'MJZ', primary: '#5d4e37', secondary: '#f5f0e6', accent: '#c0392b', style: 'Heavy power offense', logoShape: 'crest' },
  { id: 'itachi', name: 'Itachiyamo Academy', short: 'ITY', primary: '#2d3436', secondary: '#fd79a8', accent: '#ffeaa7', style: 'Precision and receive', logoShape: 'star' },
  { id: 'legend', name: 'Special Legend Pool', short: 'LEG', primary: '#111', secondary: '#ffd700', accent: '#fff', style: 'All-star legends', logoShape: 'star' },
  // Extra schools for 32-team tournament
  { id: 'tsubame', name: 'Tsubame High', short: 'TSU', primary: '#6c5ce7', secondary: '#a29bfe', accent: '#fff', style: 'Balanced', logoShape: 'circle' },
  { id: 'ookami', name: 'Ookami Tech', short: 'OOK', primary: '#2d3436', secondary: '#636e72', accent: '#00b894', style: 'Physical power', logoShape: 'hex' },
  { id: 'sakura', name: 'Sakura Joshi', short: 'SAK', primary: '#e84393', secondary: '#fff', accent: '#fd79a8', style: 'Technical offense', logoShape: 'diamond' },
  { id: 'ryu', name: 'Ryu Academy', short: 'RYU', primary: '#d63031', secondary: '#2d3436', accent: '#fab1a0', style: 'Aggressive wings', logoShape: 'crest' },
  { id: 'hokuto', name: 'Hokuto High', short: 'HOK', primary: '#0984e3', secondary: '#74b9ff', accent: '#fff', style: 'Northern power', logoShape: 'shield' },
  { id: 'minami', name: 'Minami Coastal', short: 'MIN', primary: '#00b894', secondary: '#55efc4', accent: '#fff', style: 'Float serve specialists', logoShape: 'circle' },
  { id: 'kiba', name: 'Kiba Commerce', short: 'KIB', primary: '#e17055', secondary: '#ffeaa7', accent: '#2d3436', style: 'Serve-receive focused', logoShape: 'hex' },
  { id: 'shiro', name: 'Shirogane Prep', short: 'SHI', primary: '#b2bec3', secondary: '#2d3436', accent: '#fff', style: 'Elite fundamentals', logoShape: 'star' },
  { id: 'hayate', name: 'Hayate High', short: 'HAY', primary: '#00cec9', secondary: '#081c24', accent: '#81ecec', style: 'Speed and tip game', logoShape: 'diamond' },
  { id: 'tetsu', name: 'Tetsu Metal', short: 'TET', primary: '#636e72', secondary: '#dfe6e9', accent: '#e17055', style: 'Tall blockers', logoShape: 'shield' },
  { id: 'yama', name: 'Yama Ridge', short: 'YAM', primary: '#6d4c41', secondary: '#d7ccc8', accent: '#ffcc80', style: 'Stamina marathon', logoShape: 'crest' },
  { id: 'umi', name: 'Umi Blue', short: 'UMI', primary: '#1565c0', secondary: '#90caf9', accent: '#fff', style: 'Pipe and back attack', logoShape: 'circle' },
  { id: 'kaze', name: 'Kaze West', short: 'KAZ', primary: '#7e57c2', secondary: '#ede7f6', accent: '#ffd54f', style: 'Combination offense', logoShape: 'hex' },
  { id: 'hikari', name: 'Hikari Academy', short: 'HIK', primary: '#f9a825', secondary: '#fff8e1', accent: '#ff6f00', style: 'Clutch specialists', logoShape: 'star' },
  { id: 'midori', name: 'Midori High', short: 'MID', primary: '#2e7d32', secondary: '#c8e6c9', accent: '#fff', style: 'Balanced defense', logoShape: 'diamond' },
  { id: 'sora', name: 'Sora Sky', short: 'SOR', primary: '#0277bd', secondary: '#e1f5fe', accent: '#ff7043', style: 'Jump serve army', logoShape: 'circle' },
  { id: 'tsuki', name: 'Tsuki Night', short: 'TSK', primary: '#1a237e', secondary: '#9fa8da', accent: '#ff4081', style: 'Read blocking', logoShape: 'shield' },
  { id: 'fuji', name: 'Fuji Peak', short: 'FUJ', primary: '#37474f', secondary: '#cfd8dc', accent: '#ff5252', style: 'Power middles', logoShape: 'crest' },
  { id: 'nami', name: 'Nami Wave', short: 'NAM', primary: '#00695c', secondary: '#b2dfdb', accent: '#ffab00', style: 'Rally makers', logoShape: 'hex' },
  { id: 'akira', name: 'Akira Central', short: 'AKI', primary: '#c62828', secondary: '#ffcdd2', accent: '#212121', style: 'Star-driven', logoShape: 'star' },
  { id: 'genshi', name: 'Genshi Tech', short: 'GEN', primary: '#4527a0', secondary: '#d1c4e9', accent: '#00e676', style: 'Analytical play', logoShape: 'diamond' },
];

export function schoolById(id: string): School | undefined {
  return SCHOOLS.find((s) => s.id === id);
}
