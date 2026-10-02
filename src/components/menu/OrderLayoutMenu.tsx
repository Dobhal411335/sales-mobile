import React, {useMemo, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type View as RNView,
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

const DROPDOWN_WIDTH = 220;
const DROPDOWN_GAP = 6;

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
  const [anchor, setAnchor] = useState<{top: number; left: number} | null>(
    null,
  );
  const triggerRef = useRef<RNView>(null);
  const {width: windowWidth} = useWindowDimensions();

  const summary = useMemo(() => {
    const panels = panelLayout === '3' ? '3 panels' : '2 panels';
    if (itemStyle === 'list') {
      return `${panels} · List`;
    }
    return `${panels} · Tiles ${gridCols}`;
  }, [panelLayout, itemStyle, gridCols]);

  const close = () => {
    setOpen(false);
    setListOpen(false);
    setAnchor(null);
  };

  const openMenu = () => {
    setListOpen(false);
    const node = triggerRef.current;
    if (!node?.measureInWindow) {
      setAnchor({top: 72, left: 16});
      setOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const maxLeft = Math.max(8, windowWidth - DROPDOWN_WIDTH - 8);
      const left = Math.min(Math.max(8, x + width - DROPDOWN_WIDTH), maxLeft);
      setAnchor({top: y + height + DROPDOWN_GAP, left});
      setOpen(true);
    });
  };

  const dropdownBody = (
    <>
      <Text style={styles.sectionLabel}>Screens</Text>
      <Pressable
        style={styles.row}
        onPress={() => {
          onPanelLayout('2');
          close();
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
          close();
        }}>
        <Columns3 size={16} color={colors.text} />
        <Text style={styles.rowText}>3 panels</Text>
        {panelLayout === '3' ? (
          <Check size={16} color={colors.primary} style={styles.check} />
        ) : null}
      </Pressable>

      <View style={styles.separator} />
      <Text style={styles.sectionLabel}>Product view</Text>
      <Pressable style={styles.row} onPress={() => setListOpen((v) => !v)}>
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
              close();
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
                close();
              }}>
              <Text style={styles.subRowText}>{n} columns</Text>
              {itemStyle === 'tiles' && gridCols === n ? (
                <Check size={16} color={colors.primary} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.wrap}>
        <Pressable
          style={[styles.trigger, open && styles.triggerOpen]}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityState={{expanded: open}}
          accessibilityLabel="Layout options">
          <SlidersHorizontal size={14} color={colors.text} />
          <Text style={styles.triggerText}>Layout</Text>
          <Text style={styles.triggerSummary} numberOfLines={1}>
            · {summary}
          </Text>
          <ChevronDown
            size={14}
            color={colors.textSecondary}
            style={open ? styles.chevronOpen : undefined}
          />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          {anchor ? (
            <Pressable
              style={[
                styles.dropdown,
                {top: anchor.top, left: anchor.left},
              ]}
              onPress={(e) => e.stopPropagation()}>
              {dropdownBody}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
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
  triggerOpen: {
    borderColor: colors.primary,
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
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    width: DROPDOWN_WIDTH,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 12,
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
