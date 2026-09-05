import React from 'react';
import {StyleSheet, Text, View, ScrollView} from 'react-native';
import {colors} from '../../constants/colors';

interface ReportDataTableProps {
  headers: string[];
  rows: (string | number)[][];
}

export function ReportDataTable({headers, rows}: ReportDataTableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          {headers.map((header) => (
            <Text key={header} style={[styles.cell, styles.headerCell]}>
              {header}
            </Text>
          ))}
        </View>
        {rows.length === 0 ? (
          <View style={styles.bodyRow}>
            <Text style={[styles.cell, styles.emptyCell]}>—</Text>
          </View>
        ) : (
          rows.map((row, rowIndex) => {
            const isTotal =
              String(row[0]).toUpperCase() === 'TOTAL' ||
              String(row[0]).toUpperCase() === 'ISSUED TOTAL';
            return (
              <View
                key={`row-${rowIndex}`}
                style={[styles.bodyRow, isTotal && styles.totalRow]}>
                {row.map((cell, cellIndex) => (
                  <Text
                    key={`cell-${rowIndex}-${cellIndex}`}
                    style={[styles.cell, isTotal && styles.totalCell]}>
                    {cell}
                  </Text>
                ))}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRow: {
    backgroundColor: colors.cream,
  },
  cell: {
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  headerCell: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  totalCell: {
    fontWeight: '700',
  },
  emptyCell: {
    color: colors.textSecondary,
  },
});
