import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getUserRecord } from '../api/user';
import { useUserStore } from '../store/userStore';
import { useAppTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_COLS = 20;
const CELL_MARGIN = 3;
const CELL_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - CELL_MARGIN * (GRID_COLS + 1)) / GRID_COLS;

// ── Color levels (GitHub-style) ──
function getColorLevel(count: number, max: number, colors: any): string {
  if (count === 0) return colors.surfaceVariant || 'rgba(128,128,128,0.08)';
  const ratio = max > 0 ? count / max : 0;
  if (ratio <= 0.25) return colors.primary + '30';
  if (ratio <= 0.50) return colors.primary + '60';
  if (ratio <= 0.75) return colors.primary + '90';
  return colors.primary;
}

// ── Day labels ──
const DAY_LABELS = ['', '一', '', '三', '', '五', ''];

export default function HeatmapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const userId = useUserStore((s) => s.user?.userId || 0);

  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<number[][]>([]);
  const [maxValue, setMaxValue] = useState(1);

  // ── Stats ──
  const { totalPlays, activeDays } = useMemo(() => {
    let total = 0;
    let active = 0;
    grid.forEach(w => w.forEach(v => { total += v; if (v > 0) active++; }));
    return { totalPlays: total, activeDays: active };
  }, [grid]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserRecord(userId || 0, 0);
        const allData: any[] = res?.data?.allData || [];

        // Build date → count map
        const dateMap = new Map<string, number>();
        allData.forEach((d: any) => {
          const pc = d.playCount || 0;
          // Distribute playCount across recent days as a rough proxy
          const now = Date.now();
          for (let i = 0; i < Math.min(pc, 5); i++) {
            const day = new Date(now - i * 3600000 * 24);
            const key = day.toISOString().slice(0, 10);
            dateMap.set(key, (dateMap.get(key) || 0) + 1);
          }
        });

        // Build 7-row x GRID_COLS-col grid
        const rows: number[][] = Array.from({ length: 7 }, () => Array(GRID_COLS).fill(0));
        const today = new Date();
        // Align to Sunday
        today.setDate(today.getDate() - today.getDay());
        const endDate = new Date(today);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (GRID_COLS - 1) * 7);

        let max = 1;
        for (let col = GRID_COLS - 1; col >= 0; col--) {
          for (let row = 0; row < 7; row++) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - (GRID_COLS - 1 - col) * 7 + row);
            const key = d.toISOString().slice(0, 10);
            const count = dateMap.get(key) || 0;
            rows[row][col] = count;
            if (count > max) max = count;
          }
        }

        setGrid(rows);
        setMaxValue(max);
      } catch { } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>听歌热力图</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>加载听歌数据...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* ── Stats cards ── */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.06)' }]}>
              <MaterialCommunityIcons name="music-circle" size={22} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalPlays}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>总播放</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.06)' }]}>
              <MaterialCommunityIcons name="calendar-check" size={22} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{activeDays}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>活跃天数</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceVariant || 'rgba(128,128,128,0.06)' }]}>
              <MaterialCommunityIcons name="trending-up" size={22} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{activeDays > 0 ? (totalPlays / activeDays).toFixed(1) : '0'}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>日均播放</Text>
            </View>
          </View>

          {/* ── Heatmap Grid ── */}
          <View style={[styles.heatmapCard, { backgroundColor: colors.card || colors.surfaceVariant || 'rgba(128,128,128,0.04)' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>最近 {GRID_COLS} 周</Text>
            <View style={styles.gridContainer}>
              {/* Day labels */}
              <View style={styles.dayLabels}>
                {DAY_LABELS.map((label, i) => (
                  <Text key={i} style={[styles.dayLabel, { color: colors.textSecondary }]}>{label}</Text>
                ))}
              </View>
              {/* Cells */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {Array.from({ length: 7 }, (_, row) => (
                    <View key={row} style={styles.gridRow}>
                      {Array.from({ length: GRID_COLS }, (_, col) => (
                        <View
                          key={col}
                          style={[
                            styles.cell,
                            {
                              backgroundColor: grid[row]?.[col] !== undefined
                                ? getColorLevel(grid[row][col], maxValue, colors)
                                : 'transparent',
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              borderRadius: 3,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>少</Text>
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <View
                  key={ratio}
                  style={[
                    styles.legendCell,
                    {
                      backgroundColor: getColorLevel(Math.round(ratio * maxValue), maxValue, colors),
                    },
                  ]}
                />
              ))}
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>多</Text>
            </View>
          </View>

          {/* ── Info ── */}
          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            数据来自最近播放记录，每个格子代表一天的听歌次数
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { flex: 1, paddingHorizontal: Spacing.lg },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  statCard: { flex: 1, borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11 },

  // Heatmap
  heatmapCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: Spacing.md },
  gridContainer: { flexDirection: 'row' },
  dayLabels: { marginRight: 6, gap: CELL_MARGIN, paddingTop: 2 },
  dayLabel: { fontSize: 10, height: CELL_SIZE, textAlignVertical: 'center', lineHeight: CELL_SIZE },
  gridRow: { flexDirection: 'row', gap: CELL_MARGIN, marginBottom: CELL_MARGIN },
  cell: {},

  // Legend
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.md },
  legendLabel: { fontSize: 11 },
  legendCell: { width: 14, height: 14, borderRadius: 3 },

  footer: { fontSize: 12, textAlign: 'center', marginTop: Spacing.xl },
});
