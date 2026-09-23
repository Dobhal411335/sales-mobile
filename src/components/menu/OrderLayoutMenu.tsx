import React, {useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Check,
  ChevronDown,
  Columns2,
  Columns3,
  List,
  SlidersHorizontal,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {GridCols, ItemStyle, PanelLayout} from '../../types/product';

interface OrderLayoutMenuProps {
  panelLayout: PanelLayout;
  itemStyle: ItemStyle;
  gridCols: GridCols;
  onPanelLayout: (layout: PanelLayout) => void;
  onItemStyle: (style: ItemStyle) => void;
  onGridCols: (cols: GridCols) => void;
}

export function OrderLayoutMenu({
  panelLayout,
  itemStyle,
  gridCols,
  onPanelLayout,
  onItemStyle,
  onGridCols,
}: OrderLayoutMenuProps) {
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const summary = useMemo(() => {
    const panels = panelLayout === '3' ? '3 panels' : '2 panels';
    if (panelLayout === '3' || itemStyle === 'list') {
      return `${panels} · List`;
    }
    return `${panels} · Tiles ${gridCols}`;
  }, [panelLayout, itemStyle, gridCols]);

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => {
          setOpen(true);
          setListOpen(false);
        }}
        accessibilityRole="button"
        accessibilityLabel="Layout options">
        <SlidersHorizontal size={14} color={colors.text} />
        <Text style={styles.triggerText}>Layout</Text>
        <Text style={styles.triggerSummary} numberOfLines={1}>
          · {summary}
        </Text>
        <ChevronDown size={14} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sectionLabel}>Screens</Text>
            <Pressable
              style={styles.row}
              onPress={() => {
                onPanelLayout('2');
                setOpen(false);
              }}>
              <Columns2 size={16} color={colors.text} />
              <Text style={styles.rowText}>2 panels</Text>
              {panelLayout === '2' ? (
                <Check size={16} color={colors.primary} style={styles.check} />
              ) : null}
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => {
                onPanelLayout('3');
                setOpen(false);
              }}>
              <Columns3 size={16} color={colors.text} />
              <Text style={styles.rowText}>3 panels</Text>
              {panelLayout === '3' ? (
                <Check size={16} color={colors.primary} style={styles.check} />
              ) : null}
            </Pressable>

                <View style={styles.separator} />
                <Text style={styles.sectionLabel}>Product view</Text>
                <Pressable
                  style={styles.row}
                  onPress={() => setListOpen((v) => !v)}>
                  <List size={16} color={colors.text} />
                  <Text style={styles.rowText}>List</Text>
                  {itemStyle === 'tiles' ? (
                    <Text style={styles.colsHint}>{gridCols}</Text>
                  ) : itemStyle === 'list' ? (
                    <Check size={16} color={colors.primary} style={styles.check} />
                  ) : null}
                  <ChevronDown
                    size={14}
                    color={colors.textSecondary}
                    style={listOpen ? styles.chevronOpen : undefined}
                  />
                </Pressable>
                {listOpen ? (
                  <View style={styles.subList}>
                    <Pressable
                      style={styles.subRow}
                      onPress={() => {
                        onItemStyle('list');
                        setOpen(false);
                      }}>
                      <Text style={styles.subRowText}>Cards</Text>
                      {itemStyle === 'list' ? (
                        <Check size={16} color={colors.primary} />
                      ) : null}
                    </Pressable>
                    {([2, 3, 4] as GridCols[]).map((n) => (
                      <Pressable
                        key={n}
                        style={styles.subRow}
                        onPress={() => {
                          onItemStyle('tiles');
                          onGridCols(n);
                          setOpen(false);
                        }}>
                        <Text style={styles.subRowText}>{n} columns</Text>
                        {itemStyle === 'tiles' && gridCols === n ? (
                          <Check size={16} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  triggerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  triggerSummary: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 72,
    paddingRight: 16,
  },
  sheet: {
    width: 220,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  check: {
    marginLeft: 'auto',
  },
  colsHint: {
    marginLeft: 'auto',
    marginRight: 4,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  chevronOpen: {
    transform: [{rotate: '180deg'}],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
    marginHorizontal: 8,
  },
  subList: {
    backgroundColor: '#FAFAFA',
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  subRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  subRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
